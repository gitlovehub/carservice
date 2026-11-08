<?php

namespace App\Services;

use App\Mail\ConfirmationOtpMail;
use App\Models\Account;
use App\Models\ConfirmationOtp;
use App\Models\CustomerConfirmation;
use App\Models\Employee;
use App\Models\Quotation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Xác nhận của khách (D-005, D-008). Hai đường duy nhất:
 *  - ACCOUNT: khách tự bấm trong tài khoản của mình.
 *  - EMAIL_OTP: tại quầy; OTP gửi email chủ xe, gắn với đúng nội dung (báo giá + lựa chọn từng dòng).
 * Không có đường nào để nhân viên tự tạo xác nhận khi không có OTP hợp lệ.
 */
class ConfirmationService
{
    public function __construct(private readonly RepairOrderService $repairOrders) {}

    /**
     * Hash nội dung khách xác nhận: định danh + giá của báo giá và lựa chọn từng dòng.
     * Không gồm trạng thái/is_approved để hash ổn định trước và sau khi ghi phản hồi.
     *
     * @param  array<int, array{item_id: int|string, is_approved: bool|int|string}>  $responses
     */
    public function quotationContentHash(Quotation $quotation, array $responses): string
    {
        $quotation->loadMissing('items');
        $decisions = collect($responses)
            ->map(fn (array $r) => ['item_id' => (int) $r['item_id'], 'is_approved' => (bool) $r['is_approved']])
            ->sortBy('item_id')->values()->all();

        $payload = [
            'quotation_id' => $quotation->id,
            'quotation_code' => $quotation->quotation_code,
            'version' => (int) $quotation->version,
            'discount_amount' => (string) $quotation->discount_amount,
            'total_amount' => (string) $quotation->total_amount,
            'items' => $quotation->items->sortBy('id')->map(fn ($item) => [
                'id' => $item->id,
                'item_type' => $item->item_type,
                'service_id' => $item->service_id,
                'part_id' => $item->part_id,
                'description' => $item->description,
                'quantity' => (string) $item->quantity,
                'unit_price' => (string) $item->unit_price,
                'amount' => (string) $item->amount,
            ])->values()->all(),
            'decisions' => $decisions,
        ];

        return hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION));
    }

    /** Khách tự phản hồi trong tài khoản: ghi phản hồi (logic cũ) + bằng chứng ACCOUNT. */
    public function respondViaAccount(Quotation $quotation, array $responses, Request $request): Quotation
    {
        $hash = $this->quotationContentHash($quotation, $responses);

        return DB::transaction(function () use ($quotation, $responses, $request, $hash): Quotation {
            $result = $this->repairOrders->recordCustomerResponse($quotation, $responses);
            $this->record($quotation, CustomerConfirmation::METHOD_ACCOUNT, $hash, $request);

            return $result;
        });
    }

    /** Cố vấn yêu cầu gửi OTP tới email chủ xe, kèm đúng các lựa chọn khách vừa nói tại quầy. */
    public function requestQuotationOtp(Quotation $quotation, array $responses, Account $requestedBy): ConfirmationOtp
    {
        if ($quotation->status !== Quotation::SENT) {
            throw ValidationException::withMessages(['quotation' => 'Chỉ gửi OTP cho báo giá đang chờ khách duyệt.']);
        }
        $quotation->loadMissing('items', 'repairOrder.customer.account');
        $customer = $quotation->repairOrder->customer;
        $email = $customer->email ?: $customer->account?->email;
        if (! $email) {
            throw ValidationException::withMessages(['email' => 'Chủ xe chưa có email để nhận OTP. Hướng dẫn khách tự duyệt trong tài khoản.']);
        }

        $code = (string) random_int(100000, 999999);
        $otp = DB::transaction(function () use ($quotation, $responses, $requestedBy, $customer, $email, $code): ConfirmationOtp {
            // Chỉ một OTP còn hiệu lực cho mỗi báo giá.
            ConfirmationOtp::query()
                ->where('target_type', Quotation::class)->where('target_id', $quotation->id)
                ->where('purpose', ConfirmationOtp::PURPOSE_QUOTATION_RESPONSE)
                ->whereNull('used_at')->where('expires_at', '>', now())
                ->update(['expires_at' => now()]);

            return ConfirmationOtp::query()->create([
                'customer_id' => $customer->id,
                'purpose' => ConfirmationOtp::PURPOSE_QUOTATION_RESPONSE,
                'target_type' => Quotation::class,
                'target_id' => $quotation->id,
                'content_sha256' => $this->quotationContentHash($quotation, $responses),
                'code_hash' => Hash::make($code),
                'sent_to_email' => $email,
                'expires_at' => now()->addMinutes(ConfirmationOtp::TTL_MINUTES),
                'requested_by_account_id' => $requestedBy->id,
            ]);
        });

        $decisions = collect($responses)->mapWithKeys(fn ($r) => [(int) $r['item_id'] => (bool) $r['is_approved']]);
        Mail::to($email)->send(new ConfirmationOtpMail($code, $quotation, $decisions->all(), ConfirmationOtp::TTL_MINUTES));

        return $otp;
    }

    /** Khách đọc OTP cho cố vấn tại quầy → ghi phản hồi + bằng chứng EMAIL_OTP (nhân viên chứng kiến). */
    public function verifyQuotationOtp(Quotation $quotation, string $code, array $responses, ?Employee $witness, Request $request): Quotation
    {
        $otp = ConfirmationOtp::query()
            ->where('target_type', Quotation::class)->where('target_id', $quotation->id)
            ->where('purpose', ConfirmationOtp::PURPOSE_QUOTATION_RESPONSE)
            ->latest('id')->first();

        if (! $otp || ! $otp->isUsable()) {
            throw ValidationException::withMessages(['code' => 'OTP không còn hiệu lực. Gửi lại mã mới.']);
        }
        if (! hash_equals($otp->content_sha256, $this->quotationContentHash($quotation->fresh('items'), $responses))) {
            throw ValidationException::withMessages(['responses' => 'Nội dung khác với nội dung đã gửi cho khách qua email. Gửi lại OTP.']);
        }
        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');
            $left = max(0, ConfirmationOtp::MAX_ATTEMPTS - $otp->attempts);
            throw ValidationException::withMessages(['code' => $left > 0 ? "OTP không đúng. Còn {$left} lần thử." : 'Nhập sai quá số lần cho phép. Gửi lại mã mới.']);
        }

        return DB::transaction(function () use ($otp, $quotation, $responses, $witness, $request): Quotation {
            $locked = ConfirmationOtp::query()->lockForUpdate()->findOrFail($otp->id);
            if (! $locked->isUsable()) {
                throw ValidationException::withMessages(['code' => 'OTP đã được sử dụng.']);
            }
            $locked->update(['used_at' => now()]);

            $result = $this->repairOrders->recordCustomerResponse($quotation, $responses);
            $this->record($quotation, CustomerConfirmation::METHOD_EMAIL_OTP, $locked->content_sha256, $request, $locked, $witness);

            return $result;
        });
    }

    private function record(Quotation $quotation, string $method, string $hash, Request $request, ?ConfirmationOtp $otp = null, ?Employee $witness = null): CustomerConfirmation
    {
        return CustomerConfirmation::query()->create([
            'confirmable_type' => Quotation::class,
            'confirmable_id' => $quotation->id,
            'customer_id' => $quotation->repairOrder->customer_id,
            'method' => $method,
            'confirmation_otp_id' => $otp?->id,
            'content_sha256' => $hash,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1000),
            'witness_employee_id' => $witness?->id,
            'confirmed_at' => now(),
        ]);
    }
}

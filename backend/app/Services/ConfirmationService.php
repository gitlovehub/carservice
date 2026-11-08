<?php

namespace App\Services;

use App\Mail\ConfirmationOtpMail;
use App\Mail\HandoverOtpMail;
use App\Models\Account;
use App\Models\ConfirmationOtp;
use App\Models\Customer;
use App\Models\CustomerConfirmation;
use App\Models\Employee;
use App\Models\Quotation;
use App\Models\VehicleHandover;
use Illuminate\Contracts\Mail\Mailable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Xác nhận của khách (D-005, D-008). Hai đường duy nhất:
 *  - ACCOUNT: khách tự bấm trong tài khoản của mình.
 *  - EMAIL_OTP: tại quầy; OTP gửi email chủ xe, gắn với đúng nội dung (hash).
 * Không có đường nào để nhân viên tự tạo xác nhận khi không có OTP hợp lệ.
 */
class ConfirmationService
{
    public function __construct(private readonly RepairOrderService $repairOrders) {}

    /*
    |--------------------------------------------------------------------------
    | Báo giá
    |--------------------------------------------------------------------------
    */

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

        return $this->hash([
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
        ]);
    }

    /** Khách tự phản hồi trong tài khoản: ghi phản hồi (logic cũ) + bằng chứng ACCOUNT. */
    public function respondViaAccount(Quotation $quotation, array $responses, Request $request): Quotation
    {
        $hash = $this->quotationContentHash($quotation, $responses);

        return DB::transaction(function () use ($quotation, $responses, $request, $hash): Quotation {
            $result = $this->repairOrders->recordCustomerResponse($quotation, $responses);
            $this->record($quotation, $quotation->repairOrder->customer_id, CustomerConfirmation::METHOD_ACCOUNT, $hash, $request);

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
        $decisions = collect($responses)->mapWithKeys(fn ($r) => [(int) $r['item_id'] => (bool) $r['is_approved']])->all();

        return $this->issueOtp(
            $quotation, $quotation->repairOrder->customer, ConfirmationOtp::PURPOSE_QUOTATION_RESPONSE,
            $this->quotationContentHash($quotation, $responses), $requestedBy,
            fn (string $code) => new ConfirmationOtpMail($code, $quotation, $decisions, ConfirmationOtp::TTL_MINUTES),
        );
    }

    /** Khách đọc OTP cho cố vấn tại quầy → ghi phản hồi + bằng chứng EMAIL_OTP (nhân viên chứng kiến). */
    public function verifyQuotationOtp(Quotation $quotation, string $code, array $responses, ?Employee $witness, Request $request): Quotation
    {
        $otp = $this->checkOtp($quotation, ConfirmationOtp::PURPOSE_QUOTATION_RESPONSE,
            $this->quotationContentHash($quotation->fresh('items'), $responses), $code, 'responses');

        return DB::transaction(function () use ($otp, $quotation, $responses, $witness, $request): Quotation {
            $locked = $this->consumeOtp($otp);
            $result = $this->repairOrders->recordCustomerResponse($quotation, $responses);
            $this->record($quotation, $quotation->repairOrder->customer_id, CustomerConfirmation::METHOD_EMAIL_OTP, $locked->content_sha256, $request, $locked, $witness);

            return $result;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Biên bản giao nhận xe (nội dung đã khóa khi SUBMITTED: snapshot_sha256)
    |--------------------------------------------------------------------------
    */

    public function confirmHandoverViaAccount(VehicleHandover $handover, Request $request, ?string $comment = null): VehicleHandover
    {
        $this->assertHandoverAwaitingConfirmation($handover);

        return DB::transaction(function () use ($handover, $request, $comment): VehicleHandover {
            $locked = VehicleHandover::query()->lockForUpdate()->findOrFail($handover->id);
            $this->assertHandoverAwaitingConfirmation($locked);
            $this->record($locked, $locked->repairOrder->customer_id, CustomerConfirmation::METHOD_ACCOUNT, $locked->snapshot_sha256, $request, comment: $comment);

            return $this->markHandoverConfirmed($locked);
        });
    }

    public function requestHandoverOtp(VehicleHandover $handover, Account $requestedBy): ConfirmationOtp
    {
        $this->assertHandoverAwaitingConfirmation($handover);
        $handover->loadMissing('repairOrder.customer.account', 'checklistItems', 'vehicle');

        return $this->issueOtp(
            $handover, $handover->repairOrder->customer, $this->handoverPurpose($handover),
            $handover->snapshot_sha256, $requestedBy,
            fn (string $code) => new HandoverOtpMail($code, $handover, ConfirmationOtp::TTL_MINUTES),
        );
    }

    public function verifyHandoverOtp(VehicleHandover $handover, string $code, ?Employee $witness, Request $request): VehicleHandover
    {
        $this->assertHandoverAwaitingConfirmation($handover);
        $otp = $this->checkOtp($handover, $this->handoverPurpose($handover), (string) $handover->snapshot_sha256, $code, 'handover');

        return DB::transaction(function () use ($otp, $handover, $witness, $request): VehicleHandover {
            $locked = VehicleHandover::query()->lockForUpdate()->findOrFail($handover->id);
            $this->assertHandoverAwaitingConfirmation($locked);
            $usedOtp = $this->consumeOtp($otp);
            $this->record($locked, $locked->repairOrder->customer_id, CustomerConfirmation::METHOD_EMAIL_OTP, $usedOtp->content_sha256, $request, $usedOtp, $witness);

            return $this->markHandoverConfirmed($locked);
        });
    }

    private function handoverPurpose(VehicleHandover $handover): string
    {
        return $handover->type === VehicleHandover::TYPE_CHECK_OUT ? ConfirmationOtp::PURPOSE_CHECK_OUT : ConfirmationOtp::PURPOSE_CHECK_IN;
    }

    private function assertHandoverAwaitingConfirmation(VehicleHandover $handover): void
    {
        if ($handover->status !== VehicleHandover::STATUS_SUBMITTED || ! $handover->snapshot_sha256) {
            throw ValidationException::withMessages(['handover' => 'Biên bản chưa được gửi khách xác nhận hoặc đã được xử lý.']);
        }
    }

    private function markHandoverConfirmed(VehicleHandover $handover): VehicleHandover
    {
        $handover->forceFill(['status' => VehicleHandover::STATUS_CONFIRMED, 'confirmed_at' => now()])->save();

        return $handover->fresh(['checklistItems', 'confirmations']);
    }

    /*
    |--------------------------------------------------------------------------
    | Lõi OTP + bằng chứng
    |--------------------------------------------------------------------------
    */

    /** @param  callable(string): Mailable  $mail */
    private function issueOtp(Model $target, Customer $customer, string $purpose, string $hash, Account $requestedBy, callable $mail): ConfirmationOtp
    {
        $email = $customer->email ?: $customer->account?->email;
        if (! $email) {
            throw ValidationException::withMessages(['email' => 'Chủ xe chưa có email để nhận OTP. Hướng dẫn khách tự xác nhận trong tài khoản.']);
        }

        $code = (string) random_int(100000, 999999);
        $otp = DB::transaction(function () use ($target, $customer, $purpose, $hash, $requestedBy, $email, $code): ConfirmationOtp {
            // Chỉ một OTP còn hiệu lực cho mỗi đối tượng + mục đích.
            ConfirmationOtp::query()
                ->where('target_type', $target::class)->where('target_id', $target->getKey())
                ->where('purpose', $purpose)
                ->whereNull('used_at')->where('expires_at', '>', now())
                ->update(['expires_at' => now()]);

            return ConfirmationOtp::query()->create([
                'customer_id' => $customer->id,
                'purpose' => $purpose,
                'target_type' => $target::class,
                'target_id' => $target->getKey(),
                'content_sha256' => $hash,
                'code_hash' => Hash::make($code),
                'sent_to_email' => $email,
                'expires_at' => now()->addMinutes(ConfirmationOtp::TTL_MINUTES),
                'requested_by_account_id' => $requestedBy->id,
            ]);
        });

        Mail::to($email)->send($mail($code));

        return $otp;
    }

    /** Kiểm OTP còn hiệu lực, nội dung khớp, mã đúng. Sai mã thì tăng số lần thử (không rollback). */
    private function checkOtp(Model $target, string $purpose, string $currentHash, string $code, string $contentField): ConfirmationOtp
    {
        $otp = ConfirmationOtp::query()
            ->where('target_type', $target::class)->where('target_id', $target->getKey())
            ->where('purpose', $purpose)
            ->latest('id')->first();

        if (! $otp || ! $otp->isUsable()) {
            throw ValidationException::withMessages(['code' => 'OTP không còn hiệu lực. Gửi lại mã mới.']);
        }
        if (! hash_equals($otp->content_sha256, $currentHash)) {
            throw ValidationException::withMessages([$contentField => 'Nội dung khác với nội dung đã gửi cho khách qua email. Gửi lại OTP.']);
        }
        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');
            $left = max(0, ConfirmationOtp::MAX_ATTEMPTS - $otp->attempts);
            throw ValidationException::withMessages(['code' => $left > 0 ? "OTP không đúng. Còn {$left} lần thử." : 'Nhập sai quá số lần cho phép. Gửi lại mã mới.']);
        }

        return $otp;
    }

    /** Gọi trong transaction: khóa và đánh dấu đã dùng (chống dùng lại đồng thời). */
    private function consumeOtp(ConfirmationOtp $otp): ConfirmationOtp
    {
        $locked = ConfirmationOtp::query()->lockForUpdate()->findOrFail($otp->id);
        if (! $locked->isUsable()) {
            throw ValidationException::withMessages(['code' => 'OTP đã được sử dụng.']);
        }
        $locked->update(['used_at' => now()]);

        return $locked;
    }

    private function record(Model $confirmable, int $customerId, string $method, string $hash, Request $request, ?ConfirmationOtp $otp = null, ?Employee $witness = null, ?string $comment = null): CustomerConfirmation
    {
        return CustomerConfirmation::query()->create([
            'confirmable_type' => $confirmable::class,
            'confirmable_id' => $confirmable->getKey(),
            'customer_id' => $customerId,
            'method' => $method,
            'confirmation_otp_id' => $otp?->id,
            'content_sha256' => $hash,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1000),
            'witness_employee_id' => $witness?->id,
            'confirmed_at' => now(),
            'comment' => $comment,
        ]);
    }

    /** SHA-256 của JSON chuẩn hóa (giữ Unicode, giữ số thập phân). */
    public function hash(array $payload): string
    {
        return hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION));
    }
}

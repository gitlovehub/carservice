<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\LostConnectionDetector;
use Illuminate\Database\QueryException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PDOException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Định dạng lỗi JSON duy nhất của API: { success, code, message, errors?, reference? }.
 * Chi tiết kỹ thuật chỉ nằm trong log (kèm `error_reference`), không bao giờ trả về trình duyệt, kể cả khi APP_DEBUG=true.
 */
final class ApiExceptionRenderer
{
    /** @var array<int, array{0: string, 1: string}> */
    private const ERRORS = [
        400 => ['BAD_REQUEST', 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại và thử lại.'],
        401 => ['UNAUTHENTICATED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'],
        403 => ['FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'],
        404 => ['NOT_FOUND', 'Không tìm thấy dữ liệu. Dữ liệu có thể đã bị xóa hoặc đường dẫn không đúng.'],
        405 => ['METHOD_NOT_ALLOWED', 'Thao tác này không được hỗ trợ.'],
        409 => ['CONFLICT', 'Dữ liệu vừa được thay đổi. Vui lòng tải lại rồi thử lại.'],
        413 => ['PAYLOAD_TOO_LARGE', 'Dữ liệu gửi lên quá lớn. Vui lòng giảm dung lượng rồi thử lại.'],
        419 => ['SESSION_EXPIRED', 'Phiên làm việc đã hết hạn. Vui lòng tải lại trang.'],
        422 => ['VALIDATION_ERROR', 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.'],
        429 => ['TOO_MANY_REQUESTS', 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.'],
        500 => ['SERVER_ERROR', 'Hệ thống gặp sự cố. Vui lòng thử lại sau ít phút.'],
        503 => ['SERVICE_UNAVAILABLE', 'Hệ thống đang tạm gián đoạn. Vui lòng thử lại sau ít phút.'],
    ];

    public static function render(Throwable $exception, Request $request): ?JsonResponse
    {
        if ((! $request->is('api/*') && ! $request->expectsJson()) || $exception instanceof HttpResponseException) {
            return null;
        }

        if ($exception instanceof ValidationException) {
            if ($exception->response !== null) {
                return null;
            }
            $errors = $exception->errors();
            $first = collect($errors)->flatten()->first();

            return self::json($exception->status, is_string($first) ? $first : null, ['errors' => $errors]);
        }

        if ($exception instanceof AuthenticationException) {
            return self::json(401);
        }

        if ($exception instanceof HttpExceptionInterface) {
            $status = $exception->getStatusCode();
            $message = $status < 500 ? self::authoredMessage($exception->getMessage()) : null;
            $headers = $exception->getHeaders();
            if ($status === 429 && $message === null && is_numeric($headers['Retry-After'] ?? null)) {
                $message = 'Bạn thao tác quá nhanh. Vui lòng thử lại sau '.(int) $headers['Retry-After'].' giây.';
            }

            return self::json($status, $message, [], $headers);
        }

        return self::json(self::isDatabaseUnavailable($exception) ? 503 : 500);
    }

    /** Mã tra cứu gắn vào log và phản hồi 5xx để người dùng báo lại cho kỹ thuật. */
    public static function reference(): ?string
    {
        if (! app()->bound('request')) {
            return null;
        }
        $request = app('request');
        if (! $request->attributes->has('error_reference')) {
            $request->attributes->set('error_reference', Str::upper(Str::random(10)));
        }

        return $request->attributes->get('error_reference');
    }

    /**
     * @param  array<string, mixed>  $extra
     * @param  array<string, mixed>  $headers
     */
    private static function json(int $status, ?string $message = null, array $extra = [], array $headers = []): JsonResponse
    {
        [$code, $default] = self::ERRORS[$status] ?? ($status >= 500 ? self::ERRORS[500] : self::ERRORS[400]);

        return response()->json([
            'success' => false,
            'code' => $code,
            'message' => $message ?? $default,
            ...$extra,
            ...($status >= 500 ? ['reference' => self::reference()] : []),
        ], $status, $headers);
    }

    /** Chỉ giữ thông báo nghiệp vụ tiếng Việt do code viết; thông báo mặc định của framework có thể lộ tên model, route. */
    private static function authoredMessage(string $message): ?string
    {
        $message = trim($message);
        $isVietnamese = $message !== '' && mb_strlen($message) !== strlen($message);
        $isTechnical = preg_match('/SQLSTATE|stack trace|\bselect\b.+\bfrom\b|[A-Za-z]:[\\\\\/]|vendor[\\\\\/]|App\\\\|Illuminate\\\\/iu', $message) === 1;

        return $isVietnamese && ! $isTechnical ? $message : null;
    }

    private static function isDatabaseUnavailable(Throwable $exception): bool
    {
        if (! $exception instanceof QueryException && ! $exception instanceof PDOException) {
            return false;
        }

        return str_contains($exception->getMessage(), '[2002]')
            || (new LostConnectionDetector)->causedByLostConnection($exception);
    }
}

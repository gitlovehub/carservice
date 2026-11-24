<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Review;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Phản hồi đánh giá dùng chung cho Admin và Cố vấn: mỗi đánh giá chỉ có một phản hồi hiện hành,
 * mỗi lần ghi đều lưu lịch sử trong cùng transaction.
 */
class ReviewReplyService
{
    public function __construct(private CustomerNotifier $notifier) {}

    public function create(Review $review, string $reply, Account $actor): void
    {
        $reply = $this->normalize($reply);

        DB::transaction(function () use ($review, $reply, $actor): void {
            $locked = Review::query()->lockForUpdate()->findOrFail($review->id);
            abort_if($locked->reply !== null, 409, 'Đánh giá này đã có phản hồi. Vui lòng tải lại và dùng chức năng sửa phản hồi.');

            $now = now();
            $locked->update(['reply' => $reply, 'replied_at' => $now]);
            $this->recordRevision($locked, null, $reply, $actor, $now);
        });

        $this->notifyCustomer($review);
    }

    /** @param  bool  $onlyAuthor  Cố vấn chỉ được sửa phản hồi do chính mình tạo; kiểm tra sau khi đã khoá bản ghi. */
    public function update(Review $review, string $reply, string $expectedReply, Account $actor, bool $onlyAuthor = false): void
    {
        $reply = $this->normalize($reply);

        DB::transaction(function () use ($review, $reply, $expectedReply, $actor, $onlyAuthor): void {
            $locked = Review::query()->lockForUpdate()->findOrFail($review->id);
            abort_if($locked->reply === null, 409, 'Đánh giá này chưa có phản hồi để sửa.');
            abort_if($onlyAuthor && ! $this->isAuthor($locked, $actor), 403, 'Bạn chỉ được sửa phản hồi do chính mình tạo.');

            $current = $this->normalize($locked->reply);
            abort_if($current !== $this->normalize($expectedReply), 409, 'Phản hồi vừa được thay đổi ở phiên khác. Vui lòng mở lại để xem nội dung mới nhất.');
            if ($current === $reply) {
                throw ValidationException::withMessages(['reply' => 'Nội dung phản hồi chưa có thay đổi.']);
            }

            $now = now();
            $oldReply = $locked->reply;
            $locked->update(['reply' => $reply, 'reply_edited_at' => $now]);
            $this->recordRevision($locked, $oldReply, $reply, $actor, $now);
        });

        $this->notifyCustomer($review);
    }

    /**
     * Các phiên bản từ mới đến cũ. Phản hồi có trước khi bật lịch sử được trả về như bản gốc, không rõ người gửi.
     *
     * @return list<array{version: int, content: string, old_content: ?string, edited_by: ?string, edited_at: ?string}>
     */
    public function history(Review $review): array
    {
        $revisions = $review->replyRevisions()->orderBy('id')->get();
        $versions = [];

        $legacyOriginal = $revisions->isEmpty() ? $review->reply : $revisions->first()->old_reply;
        if ($legacyOriginal !== null) {
            $versions[] = ['content' => $legacyOriginal, 'old_content' => null, 'edited_by' => null, 'edited_at' => $review->replied_at?->toIso8601String()];
        }
        foreach ($revisions as $revision) {
            $versions[] = [
                'content' => $revision->new_reply,
                'old_content' => $revision->old_reply,
                'edited_by' => $revision->edited_by_name,
                'edited_at' => $revision->edited_at->toIso8601String(),
            ];
        }

        $numbered = array_map(fn (array $version, int $index) => ['version' => $index + 1, ...$version], $versions, array_keys($versions));

        return array_reverse($numbered);
    }

    /** Người tạo là người ghi bản đầu tiên; phản hồi cũ chưa có lịch sử không xác định được người tạo. */
    public function isAuthor(Review $review, Account $account): bool
    {
        $first = $review->firstReplyRevision;

        return $first !== null && $first->old_reply === null && (int) $first->edited_by_account_id === (int) $account->id;
    }

    /** Bỏ khoảng trắng hai đầu và thống nhất xuống dòng để so sánh đúng nội dung. */
    public function normalize(string $reply): string
    {
        return trim(str_replace("\r\n", "\n", $reply));
    }

    private function recordRevision(Review $review, ?string $oldReply, string $newReply, Account $editor, CarbonInterface $editedAt): void
    {
        $editor->loadMissing('employee:id,account_id,full_name');

        $review->replyRevisions()->create([
            'old_reply' => $oldReply,
            'new_reply' => $newReply,
            'edited_by_account_id' => $editor->id,
            'edited_by_name' => $editor->employee?->full_name ?? $editor->email,
            'edited_at' => $editedAt,
        ]);
    }

    /** Thông báo chạy sau commit: lỗi gửi thông báo không được làm phản hồi đã lưu bị báo là thất bại. */
    private function notifyCustomer(Review $review): void
    {
        if ($review->repairOrder) {
            rescue(fn () => $this->notifier->reviewReplied($review->repairOrder));
        }
    }
}

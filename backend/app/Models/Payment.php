<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'invoice_id', 'amount', 'payment_method', 'transaction_code', 'qr_reference', 'status', 'paid_at',
    'gateway_txn_ref', 'gateway_response_code', 'gateway_transaction_status', 'bank_code', 'gateway_payload', 'expires_at',
])]
#[Hidden(['gateway_payload'])]
class Payment extends Model
{
    public const DIRECT = 'DIRECT';

    public const QR = 'QR';

    public const VNPAY = 'VNPAY';

    public const PENDING = 'PENDING';

    public const SUCCESS = 'SUCCESS';

    public const FAILED = 'FAILED';

    public const CANCELLED = 'CANCELLED';

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'expires_at' => 'datetime',
            'gateway_payload' => 'array',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}

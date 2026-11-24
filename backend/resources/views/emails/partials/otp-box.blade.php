{{-- Ô mã xác nhận dùng chung. Biến: code, minutes, once (mặc định true: ghi "chỉ dùng một lần"). --}}
<div style="background-color: #FEF2F3; border: 2px dashed #E11D2E; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0 0;">
    <div style="font-size: 34px; line-height: 1.2; font-weight: 800; letter-spacing: 8px; color: #C8102E; font-family: 'Courier New', Courier, monospace;">{{ $code }}</div>
    <p style="margin: 8px 0 0; font-size: 13px; color: #6B7785;">Mã có hiệu lực trong <strong>{{ $minutes }} phút</strong>{{ ($once ?? true) ? ' và chỉ dùng một lần' : '' }}.</p>
</div>

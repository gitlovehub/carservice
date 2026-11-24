{{-- Nút hành động chính, căn giữa. Biến: href, label. --}}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 28px;">
    <tr>
        <td align="center">
            @include('emails.partials.neon-button', ['href' => $href, 'label' => $label])
        </td>
    </tr>
</table>

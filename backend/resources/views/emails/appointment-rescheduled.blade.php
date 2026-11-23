@extends('emails.layout')

@section('title', 'Lịch hẹn đã được đổi')
@section('subtitle', 'Mã lịch hẹn '.$appointment->appointment_code)

@section('content')
    @php
        $vehicle = $appointment->vehicle;
        $car = trim(implode(' ', array_filter([$vehicle?->model?->brand?->name, $vehicle?->model?->name])));
    @endphp
    <p style="margin: 0 0 8px;">Xe: <strong style="color: #20252B;">{{ $car !== '' ? $car : 'Xe của bạn' }} · {{ $vehicle?->license_plate ?: 'chưa có biển số' }}</strong></p>
    <p style="margin: 0 0 8px;">Giờ cũ: <s>{{ substr($old['appointment_time'], 0, 5) }} - {{ \Carbon\Carbon::parse($old['appointment_date'])->format('d/m/Y') }}</s></p>
    <p style="margin: 0 0 8px;">Giờ mới: <strong style="color: #20252B;">{{ substr((string) $appointment->appointment_time, 0, 5) }} - {{ \Carbon\Carbon::parse($appointment->appointment_date)->format('d/m/Y') }}</strong></p>
    <p style="margin: 0 0 16px;">Lý do: {{ $reason }}</p>
    <p style="margin: 0; font-size: 13px; color: #7B8794;">Nếu giờ mới không phù hợp, vui lòng liên hệ gara để được hỗ trợ.</p>
@endsection

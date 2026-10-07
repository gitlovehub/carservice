import React, { useState } from 'react';

export default function RegisterPage() {
    const [step, setStep] = useState<1 | 2>(1);
    const [otp, setOtp] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            alert('Mật khẩu xác nhận không khớp!');
            return;
        }
        console.log('Submitting register, moving to OTP:', formData);
        setStep(2);
    };

    const handleOtpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Verifying OTP:', otp, 'for', formData.phone);
        alert('Đăng ký thành công!');
        // Chuyển hướng tới trang đăng nhập hoặc dashboard
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-900 text-white font-bold text-lg mb-2 shadow-sm">
                    CS
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                    Tạo tài khoản <span className="text-red-600">CarService</span>
                </h2>
                <p className="mt-1.5 text-xs text-gray-500">
                    Theo dõi lịch bảo dưỡng và quản lý phương tiện của bạn dễ dàng
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
                <div className="bg-white py-8 px-6 shadow-sm border border-gray-200 rounded-2xl sm:px-10 overflow-hidden relative">
                    
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <form className="space-y-3.5" onSubmit={handleSubmit}>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Họ và tên (*)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        placeholder="Nguyễn Văn A"
                                        className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Số điện thoại (*)</label>
                                        <input
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="0912 345 678"
                                            className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="name@email.com"
                                            className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu (*)</label>
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Tối thiểu 6 ký tự"
                                        className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Xác nhận mật khẩu (*)</label>
                                    <input
                                        type="password"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        placeholder="Nhập lại mật khẩu"
                                        className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                                    />
                                </div>

                                <div className="pt-1">
                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            required
                                            checked={formData.agreeTerms}
                                            onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                                            className="mt-0.5 w-3.5 h-3.5 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                                        />
                                        <span className="text-[11px] text-gray-600 leading-tight">
                                            Tôi đồng ý với điều khoản sử dụng và chính sách của CarService.
                                        </span>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full mt-2 py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all duration-150 active:scale-[0.99]"
                                >
                                    Đăng ký tài khoản
                                </button>
                            </form>

                            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                                <p className="text-xs text-gray-500">
                                    Đã có tài khoản?{' '}
                                    <a href="#" className="font-semibold text-red-600 hover:underline">
                                        Đăng nhập tại đây
                                    </a>
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Xác thực số điện thoại</h3>
                            <p className="text-xs text-gray-500 mb-6 px-4">
                                Vui lòng nhập mã OTP gồm 6 chữ số vừa được gửi đến số điện thoại <span className="font-bold text-gray-900">{formData.phone}</span>
                            </p>

                            <form className="space-y-4" onSubmit={handleOtpSubmit}>
                                <div>
                                    <input
                                        type="text"
                                        required
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="0 0 0 0 0 0"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all text-center tracking-[0.5em] font-mono"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all duration-150 active:scale-[0.99]"
                                >
                                    Xác nhận & Hoàn tất
                                </button>
                            </form>

                            <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-2">
                                <p className="text-xs text-gray-500">
                                    Chưa nhận được mã?{' '}
                                    <button className="font-semibold text-gray-900 hover:underline">
                                        Gửi lại OTP
                                    </button>
                                </p>
                                <button
                                    onClick={() => setStep(1)}
                                    className="text-xs text-red-600 hover:underline mx-auto font-medium"
                                >
                                    Sửa lại số điện thoại
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
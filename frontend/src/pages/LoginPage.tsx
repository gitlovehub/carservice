import React, { useState } from 'react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [formData, setFormData] = useState({ emailOrPhone: '', password: '', rememberMe: false });
  const [forgotData, setForgotData] = useState({ emailOrPhone: '' });
  const [resetData, setResetData] = useState({ otp: '', newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting login:', formData);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Requesting OTP for:', forgotData.emailOrPhone);
    setMode('reset');
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetData.newPassword !== resetData.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }
    console.log('Resetting password:', resetData);
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-900 text-white font-bold text-lg mb-2 shadow-sm">
          CS
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Đăng nhập vào <span className="text-red-600">CarService</span>
        </h2>
        <p className="mt-1.5 text-xs text-gray-500">
          Hệ thống Quản lý Dịch vụ & Bảo dưỡng Ô tô chuyên nghiệp
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-200 rounded-2xl sm:px-10 overflow-hidden relative">
          
          {/* LOGIN FORM */}
          {mode === 'login' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email hoặc Số điện thoại
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.emailOrPhone}
                    onChange={(e) => setFormData({ ...formData, emailOrPhone: e.target.value })}
                    placeholder="advisor@carservice.vn hoặc 0987..."
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Mật khẩu</label>
                    <button type="button" onClick={() => setMode('forgot')} className="text-[11px] font-medium text-red-600 hover:underline">
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                      className="w-3.5 h-3.5 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                    />
                    <span className="text-xs text-gray-600">Ghi nhớ đăng nhập</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all duration-150 active:scale-[0.99]"
                >
                  Đăng nhập
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500">
                  Chưa có tài khoản khách hàng?{' '}
                  <a href="#" className="font-semibold text-red-600 hover:underline">
                    Đăng ký ngay
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Quên mật khẩu?</h3>
              <p className="text-xs text-gray-500 mb-6">
                Nhập email hoặc số điện thoại của bạn, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
              </p>
              <form className="space-y-4" onSubmit={handleForgotSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email hoặc Số điện thoại
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotData.emailOrPhone}
                    onChange={(e) => setForgotData({ ...forgotData, emailOrPhone: e.target.value })}
                    placeholder="Nhập thông tin..."
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="flex-1 py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-sm transition-all duration-150 active:scale-[0.99]"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all duration-150 active:scale-[0.99]"
                  >
                    Gửi mã OTP
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* RESET PASSWORD FORM */}
          {mode === 'reset' && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Đặt lại mật khẩu</h3>
              <p className="text-xs text-gray-500 mb-6">
                Mã OTP đã được gửi đến <span className="font-semibold text-gray-900">{forgotData.emailOrPhone}</span>. Vui lòng nhập mã để tạo mật khẩu mới.
              </p>
              <form className="space-y-4" onSubmit={handleResetSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Mã OTP
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetData.otp}
                    onChange={(e) => setResetData({ ...resetData, otp: e.target.value })}
                    placeholder="Nhập 6 số..."
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all text-center tracking-widest font-mono text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    required
                    value={resetData.newPassword}
                    onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    type="password"
                    required
                    value={resetData.confirmPassword}
                    onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="flex-1 py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-sm transition-all duration-150 active:scale-[0.99]"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all duration-150 active:scale-[0.99]"
                  >
                    Cập nhật
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
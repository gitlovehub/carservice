import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import api, { axiosInstance } from "../../services/api";

function Register() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState("");
  
  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  
  // Flashlight state
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const flashlightRef = useRef<HTMLButtonElement>(null);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.full_name.trim()) newErrors.full_name = "Vui lòng nhập họ và tên";
    
    if (!formData.phone) {
      newErrors.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(formData.phone)) {
      newErrors.phone = "Số điện thoại không đúng định dạng VN";
    }

    if (!formData.email) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email không đúng định dạng";
    }
    
    if (!formData.password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else {
      if (formData.password.length < 10) newErrors.password = "Mật khẩu chưa đủ mạnh";
      if (!/[A-Z]/.test(formData.password)) newErrors.password = "Mật khẩu chưa đủ mạnh";
      if (!/[a-z]/.test(formData.password)) newErrors.password = "Mật khẩu chưa đủ mạnh";
      if (!/[0-9]/.test(formData.password)) newErrors.password = "Mật khẩu chưa đủ mạnh";
      if (!/[^A-Za-z0-9]/.test(formData.password)) newErrors.password = "Mật khẩu chưa đủ mạnh";
      if (/\s/.test(formData.password)) newErrors.password = "Mật khẩu chưa đủ mạnh";
    }

    if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = "Mật khẩu xác nhận không khớp";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    if (!validateForm()) return;

    setLoading(true);
    try {
      await api.post("/register", { ...formData, device_name: "web" });
      setStep(2);
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const beErrors = err.response.data.errors;
        const mappedErrors: any = {};
        Object.keys(beErrors).forEach(key => { mappedErrors[key] = beErrors[key][0]; });
        setErrors(mappedErrors);
      } else {
        setErrors({ form: err.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại sau." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    if (!otp || otp.length !== 6) {
        setErrors({ form: "Mã OTP phải có 6 chữ số." });
        return;
    }

    setLoading(true);
    try {
        await api.post("/verify-email-otp", { email: formData.email, otp: otp });
        alert("Xác thực OTP thành công! Bạn có thể đăng nhập.");
        navigate("/login");
    } catch (err: any) {
        setErrors({ form: err.response?.data?.message || "Mã OTP không hợp lệ hoặc đã hết hạn." });
    } finally {
        setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
        await api.post("/resend-email-otp", { email: formData.email });
        alert("Đã gửi lại mã OTP mới vào email của bạn.");
    } catch (err: any) {
        alert(err.response?.data?.message || "Không thể gửi lại mã OTP. Vui lòng thử lại.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: undefined as any }));
    }
  };

  const passwordRules = [
    { id: 'length', label: 'Tối thiểu 10 ký tự', isValid: formData.password.length >= 10 },
    { id: 'uppercase', label: 'Tối thiểu 1 chữ cái viết hoa', isValid: /[A-Z]/.test(formData.password) },
    { id: 'lowercase', label: 'Tối thiểu 1 chữ cái thường', isValid: /[a-z]/.test(formData.password) },
    { id: 'number', label: 'Tối thiểu 1 số', isValid: /[0-9]/.test(formData.password) },
    { id: 'special', label: 'Tối thiểu 1 ký tự đặc biệt', isValid: /[^A-Za-z0-9]/.test(formData.password) },
    { id: 'valid', label: 'Không có khoảng trắng', isValid: formData.password.length > 0 && !/\s/.test(formData.password) },
  ];

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [flashlightPos, setFlashlightPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isFlashlightOn || !flashlightRef.current) return;
    
    const updatePositions = () => {
      const btnRect = flashlightRef.current!.getBoundingClientRect();
      setFlashlightPos({
        x: btnRect.left + btnRect.width / 2,
        y: btnRect.top + btnRect.height / 2
      });
    };
    updatePositions();
    window.addEventListener('resize', updatePositions);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    
    // Default mouse pos slightly to the left of the button to start
    setMousePos({
        x: flashlightPos.x - 200,
        y: flashlightPos.y
    });

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', updatePositions);
    };
  }, [isFlashlightOn]);

  const getMaskStyle = () => {
    const dx = mousePos.x - flashlightPos.x;
    const dy = mousePos.y - flashlightPos.y;
    const angleRad = Math.atan2(dy, dx);
    const cssAngle = angleRad * (180 / Math.PI) + 90;
    
    // Spread 60 degrees, 15 degrees soft fade on each side
    const startAngle = cssAngle - 30;

    const mask = `conic-gradient(from ${startAngle}deg at ${flashlightPos.x}px ${flashlightPos.y}px, transparent 0deg, black 15deg, black 45deg, transparent 60deg)`;
    return {
        maskImage: mask,
        WebkitMaskImage: mask,
    };
  };

  const renderApp = (isDark: boolean, isMasked: boolean) => {
    return (
      <div 
        className={`w-full min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-[#0a0d14]' : 'bg-[#eef2f5]'}`}
        style={isMasked ? { 
            ...getMaskStyle(),
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 50,
            background: 'transparent'
        } : {}}
        aria-hidden={isMasked}
      >
        {isMasked && (
            <div 
                className="absolute inset-0 pointer-events-none mix-blend-overlay z-0"
                style={{ 
                    background: `radial-gradient(circle at ${flashlightPos.x}px ${flashlightPos.y}px, rgba(255,235,50,0.9) 0%, rgba(255,235,50,0.3) 30%, transparent 70%)`
                }}
            />
        )}
        
        {isMasked && (
            <div className="absolute inset-0 pointer-events-none bg-[#ffe066] opacity-10 mix-blend-color-dodge z-0" />
        )}

        <div className={`relative flex flex-col md:flex-row w-full max-w-[850px] min-h-[600px] rounded-[32px] overflow-hidden shadow-2xl z-10 ${isDark ? 'bg-[#0f1419]' : 'bg-[#f4f7f9]'}`}>
          
          {/* Left Side: Illustration */}
          <div className={`relative w-full md:w-[40%] min-h-[200px] md:min-h-full overflow-hidden ${isDark ? 'bg-gradient-to-b from-[#1c2431] to-[#0f1419]' : 'bg-gradient-to-b from-[#b5d6d6] to-[#e6eceb]'} p-8 flex flex-col justify-end`}>
            {/* Sky Elements */}
            <div className="absolute top-0 left-0 w-full h-full">
              {/* Sun / Moon */}
              <div className={`absolute left-10 ${isDark ? 'top-10 scale-100 opacity-100' : 'top-16 scale-110 opacity-100'}`}>
                <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-[#e2e8f0] shadow-[0_0_20px_#e2e8f0]' : 'bg-gradient-to-br from-[#fff7c2] to-[#ffd700] shadow-[0_0_40px_#ffd700]'}`} />
              </div>
              
              {/* Stars */}
              <div className={`absolute top-6 left-24 text-white text-[10px] ${isDark ? 'opacity-100' : 'opacity-0'}`}>✨</div>
              <div className={`absolute top-20 right-10 text-white text-[8px] ${isDark ? 'opacity-60' : 'opacity-0'}`}>✨</div>
              <div className={`absolute top-12 left-1/2 text-white text-[12px] ${isDark ? 'opacity-80' : 'opacity-0'}`}>✦</div>
            </div>

            {/* Mountains */}
            <div className="absolute bottom-0 left-0 w-full h-[60%]">
              <div className={`absolute bottom-0 -left-10 w-0 h-0 border-l-[150px] border-r-[150px] border-b-[200px] border-l-transparent border-r-transparent ${isDark ? 'border-b-[#2c384a]' : 'border-b-[#8ea7aa]'}`} />
              <div className={`absolute bottom-0 left-20 w-0 h-0 border-l-[120px] border-r-[120px] border-b-[160px] border-l-transparent border-r-transparent ${isDark ? 'border-b-[#1c2633]' : 'border-b-[#759093]'}`} />
              <div className={`absolute bottom-0 right-[-50px] w-0 h-0 border-l-[180px] border-r-[180px] border-b-[250px] border-l-transparent border-r-transparent ${isDark ? 'border-b-[#232e3d]' : 'border-b-[#9fb9bc]'}`} />
            </div>

            {/* Ground */}
            <div className={`absolute bottom-0 left-0 w-full h-[35%] bg-gradient-to-t from-black/60 to-transparent ${isDark ? 'opacity-80' : 'opacity-40'}`} />
            
            <div className="relative z-10 text-center pb-6">
              <h2 className="text-white text-xl font-bold mb-2 tracking-wide">Gia nhập đội ngũ</h2>
              <p className="text-white/80 text-xs px-4">
                Khởi đầu hành trình mới tại CarService. Tạo tài khoản ngay hôm nay.
              </p>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className={`w-full md:w-[60%] flex flex-col justify-center relative p-10 overflow-y-auto max-h-[80vh] md:max-h-full scrollbar-hide ${isDark ? 'bg-[#0f1419]' : 'bg-[#f4f7f9]'}`}>
              {/* Owl */}
              <div className={`absolute top-6 left-12 transform ${!isDark ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-0 opacity-20 scale-100'}`}>
                <div className="text-4xl filter drop-shadow-lg" title="Owl">🦉</div>
              </div>

              <h2 className={`text-2xl font-bold mb-6 text-center mt-4 ${!isDark ? 'text-[#1d2633]' : 'text-white'}`}>
                {step === 1 ? 'Tạo tài khoản' : 'Xác thực tài khoản'}
              </h2>

              {errors.form && (
                <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-500 border border-red-500/20 text-center">
                  {errors.form}
                </div>
              )}

              {step === 1 && (
              <form onSubmit={handleSubmit} className="space-y-4 max-w-[360px] mx-auto w-full relative z-10 pb-4">
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Họ tên */}
                  <div>
                    <input
                      type="text"
                      name="full_name"
                      placeholder="Họ và tên"
                      value={formData.full_name}
                      onChange={handleChange}
                      className={`w-full rounded-[14px] px-4 py-3 text-sm outline-none border ${!isDark ? 'bg-transparent border-[#d1dbdb] text-[#1d2633] focus:border-[#8ea7aa]' : 'bg-[#1c2431]/50 border-[#2c384a] text-white/50 focus:border-[#405269]'}`}
                      tabIndex={isMasked ? -1 : 0}
                    />
                    {errors.full_name && <p className="text-red-500 text-[10px] mt-1 ml-2">{errors.full_name}</p>}
                  </div>

                  {/* SĐT */}
                  <div>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Số điện thoại"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full rounded-[14px] px-4 py-3 text-sm outline-none border ${!isDark ? 'bg-transparent border-[#d1dbdb] text-[#1d2633] focus:border-[#8ea7aa]' : 'bg-[#1c2431]/50 border-[#2c384a] text-white/50 focus:border-[#405269]'}`}
                      tabIndex={isMasked ? -1 : 0}
                    />
                    {errors.phone && <p className="text-red-500 text-[10px] mt-1 ml-2">{errors.phone}</p>}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email đăng nhập"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full rounded-[14px] px-4 py-3 text-sm outline-none border ${!isDark ? 'bg-transparent border-[#d1dbdb] text-[#1d2633] focus:border-[#8ea7aa]' : 'bg-[#1c2431]/50 border-[#2c384a] text-white/50 focus:border-[#405269]'}`}
                    tabIndex={isMasked ? -1 : 0}
                  />
                  {errors.email && <p className="text-red-500 text-[10px] mt-1 ml-2">{errors.email}</p>}
                </div>

                {/* Password Field with Flashlight Effect */}
                <div className="relative group">
                  <div className={`relative w-full rounded-[14px] border overflow-hidden flex items-center ${!isDark ? 'border-[#d1dbdb] bg-transparent focus-within:border-[#8ea7aa]' : 'border-[#2c384a] bg-[#1c2431]/50'}`}>
                    <input
                      ref={!isMasked ? inputRef : null}
                      type={isMasked ? "text" : "password"}
                      name="password"
                      placeholder="Mật khẩu"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 text-sm outline-none bg-transparent font-mono ${!isDark ? 'text-[#1d2633] tracking-widest' : 'text-white/30 tracking-[0.3em]'}`}
                      tabIndex={isMasked ? -1 : 0}
                    />
                    
                    <button
                      ref={!isMasked ? flashlightRef : null}
                      type="button"
                      onClick={() => setIsFlashlightOn(!isFlashlightOn)}
                      className={`px-4 text-lg hover:scale-110 relative z-50 ${!isDark ? 'text-[#8ea7aa]' : 'text-white/30'}`}
                      style={{ pointerEvents: isMasked ? 'none' : 'auto' }}
                      tabIndex={-1}
                    >
                      {isFlashlightOn ? '🔦' : '👁️'}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-[10px] mt-1 ml-2">{errors.password}</p>}
                  
                  {/* Password Validation Rules UI */}
                  {formData.password.length > 0 && (
                    <div className={`mt-3 p-3 rounded-xl grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] ${!isDark ? 'bg-white border border-[#e1e4e6]' : 'bg-[#1c2431]/80 border border-[#2c384a]'}`}>
                      {passwordRules.map((rule) => (
                        <div key={rule.id} className="flex items-center gap-2">
                          {rule.isValid ? (
                            <svg className={`w-3.5 h-3.5 ${!isDark ? 'text-[#21817f]' : 'text-[#299593]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className={`w-3.5 h-3.5 ${!isDark ? 'text-[#8a949e]' : 'text-white/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          <span className={`${rule.isValid ? (!isDark ? 'text-[#20252b]' : 'text-white/90') : (!isDark ? 'text-[#8a949e]' : 'text-white/40')}`}>
                            {rule.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Confirm Password */}
                <div>
                  <div className={`relative w-full rounded-[14px] border overflow-hidden flex items-center ${!isDark ? 'border-[#d1dbdb] bg-transparent focus-within:border-[#8ea7aa]' : 'border-[#2c384a] bg-[#1c2431]/50'}`}>
                    <input
                      type={isMasked ? "text" : "password"}
                      name="password_confirmation"
                      placeholder="Xác nhận mật khẩu"
                      value={formData.password_confirmation}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 text-sm outline-none bg-transparent font-mono ${!isDark ? 'text-[#1d2633] tracking-widest' : 'text-white/30 tracking-[0.3em]'}`}
                      tabIndex={isMasked ? -1 : 0}
                    />
                  </div>
                  {errors.password_confirmation && <p className="text-red-500 text-[10px] mt-1 ml-2">{errors.password_confirmation}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full mt-4 rounded-[14px] px-4 py-3 text-sm font-semibold text-white ${!isDark ? 'bg-[#21817f] hover:bg-[#1a6664]' : 'bg-[#299593] hover:bg-[#207c7a]'} disabled:opacity-70 disabled:cursor-not-allowed`}
                  tabIndex={isMasked ? -1 : 0}
                >
                  {loading ? "Đang xử lý..." : "Tạo tài khoản →"}
                </button>
              </form>
              )}

              {step === 2 && (
              <form onSubmit={handleOtpSubmit} className="space-y-4 max-w-[360px] mx-auto w-full relative z-10 pb-4">
                <p className={`text-xs text-center px-4 ${!isDark ? 'text-gray-600' : 'text-white/80'}`}>
                    Vui lòng nhập mã OTP vừa được gửi đến số điện thoại <span className="font-bold">{formData.phone}</span> (Hoặc kiểm tra email {formData.email})
                </p>
                <div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="000000"
                    className={`w-full rounded-[14px] px-4 py-3 text-2xl tracking-[0.5em] text-center font-mono outline-none border ${!isDark ? 'bg-transparent border-[#d1dbdb] text-[#1d2633] focus:border-[#8ea7aa]' : 'bg-transparent border-[#2c384a] text-white focus:border-[#405269]'}`}
                    tabIndex={isMasked ? -1 : 0}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full mt-4 rounded-[14px] px-4 py-3 text-sm font-semibold text-white ${!isDark ? 'bg-[#21817f] hover:bg-[#1a6664]' : 'bg-[#299593] hover:bg-[#207c7a]'} disabled:opacity-70 disabled:cursor-not-allowed`}
                  tabIndex={isMasked ? -1 : 0}
                >
                  {loading ? "Đang xác thực..." : "Xác nhận OTP"}
                </button>

                <div className="flex flex-col items-center gap-2 mt-4">
                    <button type="button" onClick={handleResendOtp} className={`text-xs font-semibold ${!isDark ? 'text-[#1d2633] hover:text-[#21817f]' : 'text-white hover:text-[#299593]'}`} tabIndex={isMasked ? -1 : 0}>
                        Gửi lại mã OTP
                    </button>
                    <button type="button" onClick={() => setStep(1)} className="text-[10px] text-red-500 hover:underline" tabIndex={isMasked ? -1 : 0}>
                        Quay lại / Đổi thông tin
                    </button>
                </div>
              </form>
              )}

              {step === 1 && (
              <div className="mt-4 text-center relative z-20">
                <p className={`text-[11px] ${!isDark ? 'text-[#5a6b73]' : 'text-white/60'}`}>
                  Đã có tài khoản?{' '}
                  <Link to="/login" className={`font-semibold relative z-30 ${!isDark ? 'text-[#1d2633] hover:text-[#21817f]' : 'text-white hover:text-[#299593]'}`} tabIndex={isMasked ? -1 : 0}>
                    Đăng nhập
                  </Link>
                </p>
              </div>
              )}

              <button onClick={() => navigate('/')} className={`absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center ${!isDark ? 'bg-[#eef2f5] text-[#1d2633]/50 hover:text-[#1d2633]' : 'bg-[#1c2431] text-white/50 hover:text-white'}`} tabIndex={isMasked ? -1 : 0}>
                ✕
              </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {!isFlashlightOn ? (
        renderApp(false, false)
      ) : (
        <div className="relative w-full min-h-screen">
          <div className="absolute inset-0 z-0">
            {renderApp(true, false)}
          </div>
          <div className="absolute inset-0 z-10 pointer-events-none">
            {renderApp(false, true)}
          </div>
        </div>
      )}
      
      {/* Hide scrollbar styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </>
  );
}

export default Register;
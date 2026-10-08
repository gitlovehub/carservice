import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // Validation errors
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  
  // Flashlight state
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  
  // Refs to calculate beam position
  const flashlightRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Validate form
  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email không đúng định dạng";
    }
    
    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else if (password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
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
      const response = await api.post("/login", { email, password, device_name: "web" });
      const { token, account } = response.data;
      if (token && account) {
        login(token, account);
        if (account.role === 'ADMIN') navigate('/admin');
        else if (account.role === 'ADVISOR') navigate('/advisor/customers');
        else if (account.role === 'TECHNICIAN') navigate('/technician');
        else navigate('/customer');
      } else {
        setErrors({ form: "Đăng nhập thất bại, không nhận được token." });
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setErrors({ form: err.response?.data?.message || "Email hoặc mật khẩu không chính xác." });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    if (!forgotEmail) {
      setErrors({ form: "Vui lòng nhập email." });
      return;
    }
    setLoading(true);
    try {
      await api.post("/forgot-password", { email: forgotEmail });
      setMode('reset');
      alert("Đã gửi mã OTP. Vui lòng kiểm tra email.");
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setErrors({ form: err.response?.data?.message || "Lỗi. Vui lòng thử lại sau." });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    if (!otp || !newPassword) {
      setErrors({ form: "Vui lòng điền đầy đủ thông tin." });
      return;
    }
    if (otp.length !== 6) {
      setErrors({ form: "Mã OTP phải có 6 chữ số." });
      return;
    }
    if (newPassword.length < 10 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword) || /\s/.test(newPassword)) {
      setErrors({ form: "Mật khẩu chưa đủ mạnh. Vui lòng kiểm tra lại các điều kiện." });
      return;
    }
    setLoading(true);
    try {
      await api.post("/reset-password", { email: forgotEmail, otp, new_password: newPassword });
      alert("Cập nhật mật khẩu thành công! Vui lòng đăng nhập lại.");
      setMode('login');
      setOtp("");
      setNewPassword("");
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const errorMessage = err.response?.data?.errors?.new_password?.[0] || err.response?.data?.errors?.otp?.[0] || err.response?.data?.message || "Mã OTP không hợp lệ.";
      setErrors({ form: errorMessage });
    } finally {
      setLoading(false);
    }
  };

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
  }, [isFlashlightOn, flashlightPos.x, flashlightPos.y]);

  const passwordRules = [
    { id: 'length', label: 'Tối thiểu 10 ký tự', isValid: newPassword.length >= 10 },
    { id: 'uppercase', label: 'Tối thiểu 1 chữ cái viết hoa', isValid: /[A-Z]/.test(newPassword) },
    { id: 'lowercase', label: 'Tối thiểu 1 chữ cái thường', isValid: /[a-z]/.test(newPassword) },
    { id: 'number', label: 'Tối thiểu 1 số', isValid: /[0-9]/.test(newPassword) },
    { id: 'special', label: 'Tối thiểu 1 ký tự đặc biệt', isValid: /[^A-Za-z0-9]/.test(newPassword) },
    { id: 'valid', label: 'Không có khoảng trắng', isValid: newPassword.length > 0 && !/\s/.test(newPassword) },
  ];

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
        {/* Yellow glowing light beam effect (Only on the masked layer) */}
        {isMasked && (
            <div 
                className="absolute inset-0 pointer-events-none mix-blend-overlay z-0"
                style={{ 
                    background: `radial-gradient(circle at ${flashlightPos.x}px ${flashlightPos.y}px, rgba(255,235,50,0.9) 0%, rgba(255,235,50,0.3) 30%, transparent 70%)`
                }}
            />
        )}
        
        {/* Yellow fog to give it more body */}
        {isMasked && (
            <div className="absolute inset-0 pointer-events-none bg-[#ffe066] opacity-10 mix-blend-color-dodge z-0" />
        )}

        <div className={`relative flex flex-col md:flex-row w-full max-w-[800px] h-[500px] rounded-[32px] overflow-hidden shadow-2xl z-10 ${isDark ? 'bg-[#0f1419]' : 'bg-[#f4f7f9]'}`}>
          
          {/* Left Side: Illustration */}
          <div className={`relative w-full md:w-[45%] h-[200px] md:h-full overflow-hidden ${isDark ? 'bg-gradient-to-b from-[#1c2431] to-[#0f1419]' : 'bg-gradient-to-b from-[#b5d6d6] to-[#e6eceb]'} p-8 flex flex-col justify-end`}>
            {/* Sky Elements */}
            <div className="absolute top-0 left-0 w-full h-full">
              {/* Sun / Moon */}
              <div className={`absolute left-10 ${isDark ? 'top-10 scale-100 opacity-100' : 'top-16 scale-110 opacity-100'}`}>
                <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-[#e2e8f0] shadow-[0_0_20px_#e2e8f0]' : 'bg-gradient-to-br from-[#fff7c2] to-[#ffd700] shadow-[0_0_40px_#ffd700]'}`} />
              </div>
              
              {/* Stars (Only in dark mode) */}
              <div className={`absolute top-6 left-24 text-white text-[10px] ${isDark ? 'opacity-100' : 'opacity-0'}`}>✨</div>
              <div className={`absolute top-20 right-10 text-white text-[8px] ${isDark ? 'opacity-60' : 'opacity-0'}`}>✨</div>
              <div className={`absolute top-12 left-1/2 text-white text-[12px] ${isDark ? 'opacity-80' : 'opacity-0'}`}>✦</div>
            </div>

            {/* Mountains (Abstract Triangles) */}
            <div className="absolute bottom-0 left-0 w-full h-[60%]">
              <div className={`absolute bottom-0 -left-10 w-0 h-0 border-l-[150px] border-r-[150px] border-b-[200px] border-l-transparent border-r-transparent ${isDark ? 'border-b-[#2c384a]' : 'border-b-[#8ea7aa]'}`} />
              <div className={`absolute bottom-0 left-20 w-0 h-0 border-l-[120px] border-r-[120px] border-b-[160px] border-l-transparent border-r-transparent ${isDark ? 'border-b-[#1c2633]' : 'border-b-[#759093]'}`} />
              <div className={`absolute bottom-0 right-[-50px] w-0 h-0 border-l-[180px] border-r-[180px] border-b-[250px] border-l-transparent border-r-transparent ${isDark ? 'border-b-[#232e3d]' : 'border-b-[#9fb9bc]'}`} />
            </div>

            {/* Ground & Text overlay */}
            <div className={`absolute bottom-0 left-0 w-full h-[35%] bg-gradient-to-t from-black/60 to-transparent ${isDark ? 'opacity-80' : 'opacity-40'}`} />
            
            <div className="relative z-10 text-center">
              <h2 className="text-white text-xl font-bold mb-2 tracking-wide">Quản lý công việc</h2>
              <p className="text-white/80 text-xs px-4">
                Đăng nhập để quản lý công việc, theo dõi tiến độ dự án và phối hợp cùng đội ngũ.
              </p>
            </div>
          </div>

          {/* Right Side: Form Container */}
          <div className={`w-full md:w-[55%] flex flex-col justify-center relative p-10 ${isDark ? 'bg-[#0f1419]' : 'bg-[#f4f7f9]'}`}>
              {/* Owl */}
              <div className={`absolute top-6 left-12 transform translate-y-0 scale-100 ${!isDark ? 'opacity-100 brightness-100' : 'opacity-20'}`}>
                <div className="text-4xl filter drop-shadow-lg" title="Owl">🦉</div>
              </div>

              <h2 className={`text-2xl font-bold mb-8 text-center ${!isDark ? 'text-[#1d2633]' : 'text-white'}`}>
                {mode === 'login' ? 'Đăng nhập' : mode === 'forgot' ? 'Quên mật khẩu' : 'Đặt lại mật khẩu'}
              </h2>

              {errors.form && (
                <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-500 border border-red-500/20 text-center">
                  {errors.form}
                </div>
              )}

              {mode === 'login' && (
              <form onSubmit={handleSubmit} className="space-y-4 max-w-[320px] mx-auto w-full relative z-10">
                {/* Email Field */}
                <div>
                  <input
                    type="email"
                    placeholder="Email đăng nhập"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors({...errors, email: undefined}); }}
                    className={`w-full rounded-[14px] px-4 py-3 text-sm outline-none border ${!isDark ? 'bg-transparent border-[#d1dbdb] text-[#1d2633] focus:border-[#8ea7aa]' : 'bg-[#1c2431]/50 border-[#2c384a] text-white/50 focus:border-[#405269]'}`}
                    tabIndex={isMasked ? -1 : 0}
                  />
                  {errors.email && <p className="text-red-500 text-[10px] mt-1 ml-2">{errors.email}</p>}
                </div>

                {/* Password Field */}
                <div className="relative group">
                  <div className={`relative w-full rounded-[14px] border overflow-hidden flex items-center ${!isDark ? 'border-[#d1dbdb] bg-transparent focus-within:border-[#8ea7aa]' : 'border-[#2c384a] bg-[#1c2431]/50'}`}>
                    <input
                      ref={!isMasked ? inputRef : null}
                      type={isMasked ? "text" : "password"}
                      placeholder="Mật khẩu"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors({...errors, password: undefined}); }}
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
                </div>

                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className={`text-[10px] hover:underline ${!isDark ? 'text-[#5a6b73] hover:text-[#1d2633]' : 'text-[#8a949e] hover:text-white'}`}
                    tabIndex={isMasked ? -1 : 0}
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full mt-2 rounded-[14px] px-4 py-3 text-sm font-semibold text-white ${!isDark ? 'bg-[#21817f] hover:bg-[#1a6664]' : 'bg-[#299593] hover:bg-[#207c7a]'} disabled:opacity-70 disabled:cursor-not-allowed`}
                  tabIndex={isMasked ? -1 : 0}
                >
                  {loading ? "Đang xử lý..." : "Đăng nhập →"}
                </button>
              </form>
              )}

              {mode === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-4 max-w-[320px] mx-auto w-full relative z-10">
                  <p className={`text-xs mb-4 text-center ${!isDark ? 'text-gray-600' : 'text-white/50'}`}>
                    Nhập email để nhận mã OTP khôi phục mật khẩu
                  </p>
                  <div>
                    <input
                      type="email"
                      required
                      placeholder="Email của bạn"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className={`w-full rounded-[14px] px-4 py-3 text-sm outline-none border ${!isDark ? 'bg-transparent border-[#d1dbdb] text-[#1d2633] focus:border-[#8ea7aa]' : 'bg-[#1c2431]/50 border-[#2c384a] text-white/50 focus:border-[#405269]'}`}
                      tabIndex={isMasked ? -1 : 0}
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className={`w-1/3 rounded-[14px] px-4 py-3 text-sm font-semibold border ${!isDark ? 'text-[#1d2633] border-[#d1dbdb] hover:bg-[#eef2f5]' : 'text-white border-[#2c384a] hover:bg-[#2c384a]'}`}
                      tabIndex={isMasked ? -1 : 0}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className={`w-2/3 rounded-[14px] px-4 py-3 text-sm font-semibold text-white ${!isDark ? 'bg-[#21817f] hover:bg-[#1a6664]' : 'bg-[#299593] hover:bg-[#207c7a]'}`}
                      tabIndex={isMasked ? -1 : 0}
                    >
                      Gửi mã
                    </button>
                  </div>
                </form>
              )}

              {mode === 'reset' && (
                <form onSubmit={handleResetPassword} className="space-y-4 max-w-[320px] mx-auto w-full relative z-10">
                  <p className={`text-xs mb-4 text-center ${!isDark ? 'text-gray-600' : 'text-white/50'}`}>
                    Nhập mã OTP đã gửi đến {forgotEmail}
                  </p>
                  <div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="Nhập mã OTP (6 số)"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className={`w-full rounded-[14px] px-4 py-3 text-sm outline-none border text-center tracking-widest font-mono ${!isDark ? 'bg-transparent border-[#d1dbdb] text-[#1d2633] focus:border-[#8ea7aa]' : 'bg-[#1c2431]/50 border-[#2c384a] text-white/50 focus:border-[#405269]'}`}
                      tabIndex={isMasked ? -1 : 0}
                    />
                  </div>
                  <div className="relative group">
                    <div className={`relative w-full rounded-[14px] border overflow-hidden flex items-center ${!isDark ? 'border-[#d1dbdb] bg-transparent focus-within:border-[#8ea7aa]' : 'border-[#2c384a] bg-[#1c2431]/50'}`}>
                      <input
                        ref={!isMasked ? inputRef : null}
                        type={isMasked ? "text" : "password"}
                        required
                        placeholder="Mật khẩu mới"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
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
                  </div>

                  {newPassword.length > 0 && (
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
                  <button
                    type="submit"
                    className={`w-full mt-2 rounded-[14px] px-4 py-3 text-sm font-semibold text-white ${!isDark ? 'bg-[#21817f] hover:bg-[#1a6664]' : 'bg-[#299593] hover:bg-[#207c7a]'}`}
                    tabIndex={isMasked ? -1 : 0}
                  >
                    Cập nhật mật khẩu
                  </button>
                </form>
              )}

              {mode === 'login' && (
              <div className="mt-6 text-center relative z-20">
                <p className={`text-[11px] ${!isDark ? 'text-[#5a6b73]' : 'text-white/60'}`}>
                  Bạn chưa có tài khoản?{' '}
                  <Link to="/register" tabIndex={isMasked ? -1 : 0} className={`font-semibold relative z-30 ${!isDark ? 'text-[#1d2633] hover:text-[#21817f]' : 'text-white hover:text-[#299593]'}`}>
                    Đăng ký
                  </Link>
                </p>
              </div>
              )}

              <button onClick={() => navigate('/')} tabIndex={isMasked ? -1 : 0} className={`absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center ${!isDark ? 'bg-[#eef2f5] text-[#1d2633]/50 hover:text-[#1d2633]' : 'bg-[#1c2431] text-white/50 hover:text-white'}`}>
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
    </>
  );
}

export default Login;
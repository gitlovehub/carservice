import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import api, { axiosInstance } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Validation errors
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  
  // Flashlight and Dark mode state
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
      await axiosInstance.get('/sanctum/csrf-cookie');
      
      const response = await api.post("/login", {
        email,
        password,
        device_name: "web",
      });

      const { token, user } = response.data;
      if (token && user) {
        login(token, user);
        if (user.role === 'ADMIN') navigate('/admin');
        else if (user.role === 'ADVISOR') navigate('/advisor/customers');
        else if (user.role === 'TECHNICIAN') navigate('/technician');
        else navigate('/customer');
      } else {
        setErrors({ form: "Đăng nhập thất bại, không nhận được token." });
      }
    } catch (err: any) {
      setErrors({ form: err.response?.data?.message || "Email hoặc mật khẩu không chính xác." });
    } finally {
      setLoading(false);
    }
  };

  const isDark = isFlashlightOn;

  return (
    <div className={`min-h-screen transition-colors duration-700 flex items-center justify-center p-6 ${isDark ? 'bg-[#1a1f24]' : 'bg-[#eef2f5]'}`}>
      <div className={`relative flex flex-col md:flex-row w-full max-w-[800px] h-[500px] rounded-[32px] overflow-hidden transition-colors duration-700 shadow-2xl ${isDark ? 'bg-[#0f1419]' : 'bg-[#f4f7f9]'}`}>
        
        {/* Left Side: Illustration */}
        <div className={`relative w-full md:w-[45%] h-[200px] md:h-full overflow-hidden transition-all duration-700 ${isDark ? 'bg-gradient-to-b from-[#1c2431] to-[#0f1419]' : 'bg-gradient-to-b from-[#b5d6d6] to-[#e6eceb]'} p-8 flex flex-col justify-end`}>
          
          {/* Sky Elements */}
          <div className="absolute top-0 left-0 w-full h-full">
            {/* Sun / Moon */}
            <div className={`absolute left-10 transition-all duration-700 ${isDark ? 'top-10 scale-100 opacity-100' : 'top-16 scale-110 opacity-100'}`}>
              <div className={`w-12 h-12 rounded-full transition-all duration-700 ${isDark ? 'bg-[#e2e8f0] shadow-[0_0_20px_#e2e8f0]' : 'bg-gradient-to-br from-[#fff7c2] to-[#ffd700] shadow-[0_0_40px_#ffd700]'}`} />
            </div>
            
            {/* Stars (Only in dark mode) */}
            <div className={`absolute top-6 left-24 text-white text-[10px] transition-opacity duration-700 ${isDark ? 'opacity-100' : 'opacity-0'}`}>✨</div>
            <div className={`absolute top-20 right-10 text-white text-[8px] transition-opacity duration-700 ${isDark ? 'opacity-60' : 'opacity-0'}`}>✨</div>
            <div className={`absolute top-12 left-1/2 text-white text-[12px] transition-opacity duration-700 ${isDark ? 'opacity-80' : 'opacity-0'}`}>✦</div>
          </div>

          {/* Mountains (Abstract Triangles) */}
          <div className="absolute bottom-0 left-0 w-full h-[60%]">
            <div className={`absolute bottom-0 -left-10 w-0 h-0 border-l-[150px] border-r-[150px] border-b-[200px] border-l-transparent border-r-transparent transition-colors duration-700 ${isDark ? 'border-b-[#2c384a]' : 'border-b-[#8ea7aa]'}`} />
            <div className={`absolute bottom-0 left-20 w-0 h-0 border-l-[120px] border-r-[120px] border-b-[160px] border-l-transparent border-r-transparent transition-colors duration-700 ${isDark ? 'border-b-[#1c2633]' : 'border-b-[#759093]'}`} />
            <div className={`absolute bottom-0 right-[-50px] w-0 h-0 border-l-[180px] border-r-[180px] border-b-[250px] border-l-transparent border-r-transparent transition-colors duration-700 ${isDark ? 'border-b-[#232e3d]' : 'border-b-[#9fb9bc]'}`} />
          </div>

          {/* Ground & Text overlay */}
          <div className={`absolute bottom-0 left-0 w-full h-[35%] bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-700 ${isDark ? 'opacity-80' : 'opacity-40'}`} />
          
          <div className="relative z-10 text-center">
            <h2 className="text-white text-xl font-bold mb-2 tracking-wide">Quản lý công việc</h2>
            <p className="text-white/80 text-xs px-4">
              Đăng nhập để quản lý công việc, theo dõi tiến độ dự án và phối hợp cùng đội ngũ.
            </p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-[55%] p-10 flex flex-col justify-center relative">
          
          {/* Owl that appears in dark mode */}
          <div className={`absolute top-6 left-12 transition-all duration-700 transform ${isDark ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-90'}`}>
             <div className="text-4xl filter drop-shadow-lg animate-pulse" title="Owl">🦉</div>
          </div>

          <h2 className={`text-2xl font-bold mb-8 text-center transition-colors duration-700 ${isDark ? 'text-white' : 'text-[#1d2633]'}`}>
            Đăng nhập
          </h2>

          {errors.form && (
            <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-500 border border-red-500/20 text-center">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 max-w-[320px] mx-auto w-full relative z-10">
            {/* Email Field */}
            <div>
              <input
                type="email"
                placeholder="Email đăng nhập"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors({...errors, email: undefined}); }}
                className={`w-full rounded-[14px] px-4 py-3 text-sm outline-none transition-all duration-500 border
                  ${isDark ? 'bg-transparent border-[#2c384a] text-white focus:border-[#405269]' : 'bg-transparent border-[#d1dbdb] text-[#1d2633] focus:border-[#8ea7aa]'}
                `}
              />
              {errors.email && <p className="text-red-500 text-[10px] mt-1 ml-2">{errors.email}</p>}
            </div>

            {/* Password Field with Flashlight Effect */}
            <div className="relative group">
              {/* Flashlight Beam effect (CSS only, shown when flashlight is ON) */}
              <div 
                className={`absolute top-1/2 right-4 h-[200px] w-[500px] pointer-events-none transition-all duration-700 origin-right
                  ${isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                style={{
                  background: 'linear-gradient(270deg, rgba(255,255,200,0.15) 0%, rgba(255,255,200,0) 100%)',
                  clipPath: 'polygon(0 0, 100% 40%, 100% 60%, 0 100%)',
                  transform: 'translate(0, -50%)',
                  zIndex: -1
                }}
              />

              <div className={`relative w-full rounded-[14px] border transition-all duration-500 overflow-hidden flex items-center
                ${isDark ? 'border-transparent shadow-[0_0_15px_rgba(255,255,200,0.1)] bg-[#1c2431]' : 'border-[#d1dbdb] bg-transparent focus-within:border-[#8ea7aa]'}
              `}>
                <input
                  ref={inputRef}
                  type={isFlashlightOn ? "text" : "password"}
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors({...errors, password: undefined}); }}
                  className={`w-full px-4 py-3 text-sm outline-none bg-transparent transition-all duration-700
                    ${isDark ? 'text-[#ffffe0] font-medium tracking-wider' : 'text-[#1d2633] tracking-widest'}
                  `}
                />
                
                <button
                  ref={flashlightRef}
                  type="button"
                  onClick={() => setIsFlashlightOn(!isFlashlightOn)}
                  className={`px-4 text-lg transition-all duration-300 hover:scale-110 ${isDark ? 'text-[#ffd700]' : 'text-[#8ea7aa]'}`}
                  title={isFlashlightOn ? "Tắt đèn pin (Ẩn mật khẩu)" : "Bật đèn pin (Hiện mật khẩu)"}
                >
                  {isFlashlightOn ? '🔦' : '👁️'}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-[10px] mt-1 ml-2">{errors.password}</p>}
            </div>

            <div className="text-right">
              <Link to="#" className={`text-[10px] transition-colors duration-300 font-medium ${isDark ? 'text-white/60 hover:text-white' : 'text-[#5a6b73] hover:text-[#1d2633]'}`}>
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-2 rounded-[14px] px-4 py-3 text-sm font-semibold text-white transition-all duration-500 
                ${isDark ? 'bg-[#299593] hover:bg-[#207c7a] shadow-[0_4px_15px_rgba(41,149,147,0.3)]' : 'bg-[#21817f] hover:bg-[#1a6664]'} 
                disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {loading ? "Đang xử lý..." : "Đăng nhập →"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className={`text-[11px] ${isDark ? 'text-white/60' : 'text-[#5a6b73]'}`}>
              Bạn chưa có tài khoản?{' '}
              <Link to="/register" className={`font-semibold transition-colors duration-300 ${isDark ? 'text-white hover:text-[#299593]' : 'text-[#1d2633] hover:text-[#21817f]'}`}>
                Đăng ký
              </Link>
            </p>
          </div>

          {/* Close button (top right) */}
          <button onClick={() => navigate('/')} className={`absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-[#1c2431] text-white/50 hover:text-white' : 'bg-[#eef2f5] text-[#1d2633]/50 hover:text-[#1d2633]'}`}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
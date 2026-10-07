import { Link, useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
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
  
  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  
  // Flashlight and Dark mode state
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

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
    } else if (formData.password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự";
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
      await axiosInstance.get('/sanctum/csrf-cookie');
      
      await api.post("/register", {
        ...formData,
        device_name: "web",
      });

      // Nếu thành công, chuyển về login
      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        // Validation errors từ Backend trả về (Ví dụ: Email đã tồn tại)
        const beErrors = err.response.data.errors;
        const mappedErrors: any = {};
        Object.keys(beErrors).forEach(key => {
            mappedErrors[key] = beErrors[key][0];
        });
        setErrors(mappedErrors);
      } else {
        setErrors({ form: err.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại sau." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear lỗi khi user gõ lại
    if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: undefined as any }));
    }
  };

  const isDark = isFlashlightOn;

  return (
    <div className={`min-h-screen transition-colors duration-700 flex items-center justify-center p-6 ${isDark ? 'bg-[#1a1f24]' : 'bg-[#eef2f5]'}`}>
      <div className={`relative flex flex-col md:flex-row w-full max-w-[850px] min-h-[600px] rounded-[32px] overflow-hidden transition-colors duration-700 shadow-2xl ${isDark ? 'bg-[#0f1419]' : 'bg-[#f4f7f9]'}`}>
        
        {/* Left Side: Illustration */}
        <div className={`relative w-full md:w-[40%] min-h-[200px] md:min-h-full overflow-hidden transition-all duration-700 ${isDark ? 'bg-gradient-to-b from-[#1c2431] to-[#0f1419]' : 'bg-gradient-to-b from-[#b5d6d6] to-[#e6eceb]'} p-8 flex flex-col justify-end`}>
          
          {/* Sky Elements */}
          <div className="absolute top-0 left-0 w-full h-full">
            {/* Sun / Moon */}
            <div className={`absolute left-10 transition-all duration-700 ${isDark ? 'top-10 scale-100 opacity-100' : 'top-16 scale-110 opacity-100'}`}>
              <div className={`w-12 h-12 rounded-full transition-all duration-700 ${isDark ? 'bg-[#e2e8f0] shadow-[0_0_20px_#e2e8f0]' : 'bg-gradient-to-br from-[#fff7c2] to-[#ffd700] shadow-[0_0_40px_#ffd700]'}`} />
            </div>
            
            {/* Stars */}
            <div className={`absolute top-6 left-24 text-white text-[10px] transition-opacity duration-700 ${isDark ? 'opacity-100' : 'opacity-0'}`}>✨</div>
            <div className={`absolute top-20 right-10 text-white text-[8px] transition-opacity duration-700 ${isDark ? 'opacity-60' : 'opacity-0'}`}>✨</div>
            <div className={`absolute top-12 left-1/2 text-white text-[12px] transition-opacity duration-700 ${isDark ? 'opacity-80' : 'opacity-0'}`}>✦</div>
          </div>

          {/* Mountains */}
          <div className="absolute bottom-0 left-0 w-full h-[60%]">
            <div className={`absolute bottom-0 -left-10 w-0 h-0 border-l-[150px] border-r-[150px] border-b-[200px] border-l-transparent border-r-transparent transition-colors duration-700 ${isDark ? 'border-b-[#2c384a]' : 'border-b-[#8ea7aa]'}`} />
            <div className={`absolute bottom-0 left-20 w-0 h-0 border-l-[120px] border-r-[120px] border-b-[160px] border-l-transparent border-r-transparent transition-colors duration-700 ${isDark ? 'border-b-[#1c2633]' : 'border-b-[#759093]'}`} />
            <div className={`absolute bottom-0 right-[-50px] w-0 h-0 border-l-[180px] border-r-[180px] border-b-[250px] border-l-transparent border-r-transparent transition-colors duration-700 ${isDark ? 'border-b-[#232e3d]' : 'border-b-[#9fb9bc]'}`} />
          </div>

          {/* Ground */}
          <div className={`absolute bottom-0 left-0 w-full h-[35%] bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-700 ${isDark ? 'opacity-80' : 'opacity-40'}`} />
          
          <div className="relative z-10 text-center pb-6">
            <h2 className="text-white text-xl font-bold mb-2 tracking-wide">Gia nhập đội ngũ</h2>
            <p className="text-white/80 text-xs px-4">
              Khởi đầu hành trình mới tại CarService. Tạo tài khoản ngay hôm nay.
            </p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-[60%] p-10 flex flex-col justify-center relative overflow-y-auto max-h-[80vh] md:max-h-full scrollbar-hide">
          
          {/* Owl */}
          <div className={`absolute top-6 left-12 transition-all duration-700 transform ${isDark ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-90'}`}>
             <div className="text-4xl filter drop-shadow-lg animate-pulse" title="Owl">🦉</div>
          </div>

          <h2 className={`text-2xl font-bold mb-6 text-center mt-4 transition-colors duration-700 ${isDark ? 'text-white' : 'text-[#1d2633]'}`}>
            Tạo tài khoản
          </h2>

          {errors.form && (
            <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-500 border border-red-500/20 text-center">
              {errors.form}
            </div>
          )}

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
                  className={`w-full rounded-[14px] px-4 py-3 text-sm outline-none transition-all duration-500 border
                    ${isDark ? 'bg-transparent border-[#2c384a] text-white focus:border-[#405269]' : 'bg-transparent border-[#d1dbdb] text-[#1d2633] focus:border-[#8ea7aa]'}
                  `}
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
                  className={`w-full rounded-[14px] px-4 py-3 text-sm outline-none transition-all duration-500 border
                    ${isDark ? 'bg-transparent border-[#2c384a] text-white focus:border-[#405269]' : 'bg-transparent border-[#d1dbdb] text-[#1d2633] focus:border-[#8ea7aa]'}
                  `}
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
                className={`w-full rounded-[14px] px-4 py-3 text-sm outline-none transition-all duration-500 border
                  ${isDark ? 'bg-transparent border-[#2c384a] text-white focus:border-[#405269]' : 'bg-transparent border-[#d1dbdb] text-[#1d2633] focus:border-[#8ea7aa]'}
                `}
              />
              {errors.email && <p className="text-red-500 text-[10px] mt-1 ml-2">{errors.email}</p>}
            </div>

            {/* Password Field with Flashlight Effect */}
            <div className="relative group">
              {/* Flashlight Beam effect */}
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
                  name="password"
                  placeholder="Mật khẩu"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 text-sm outline-none bg-transparent transition-all duration-700
                    ${isDark ? 'text-[#ffffe0] font-medium tracking-wider' : 'text-[#1d2633] tracking-widest'}
                  `}
                />
                
                <button
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
            
            {/* Confirm Password */}
            <div>
              <div className={`relative w-full rounded-[14px] border transition-all duration-500 overflow-hidden flex items-center
                ${isDark ? 'border-[#2c384a] bg-transparent focus-within:border-[#405269]' : 'border-[#d1dbdb] bg-transparent focus-within:border-[#8ea7aa]'}
              `}>
                <input
                  type={isFlashlightOn ? "text" : "password"}
                  name="password_confirmation"
                  placeholder="Xác nhận mật khẩu"
                  value={formData.password_confirmation}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 text-sm outline-none bg-transparent transition-all duration-700
                    ${isDark ? 'text-[#ffffe0] font-medium tracking-wider' : 'text-[#1d2633] tracking-widest'}
                  `}
                />
              </div>
              {errors.password_confirmation && <p className="text-red-500 text-[10px] mt-1 ml-2">{errors.password_confirmation}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-4 rounded-[14px] px-4 py-3 text-sm font-semibold text-white transition-all duration-500 
                ${isDark ? 'bg-[#299593] hover:bg-[#207c7a] shadow-[0_4px_15px_rgba(41,149,147,0.3)]' : 'bg-[#21817f] hover:bg-[#1a6664]'} 
                disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {loading ? "Đang xử lý..." : "Tạo tài khoản →"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className={`text-[11px] ${isDark ? 'text-white/60' : 'text-[#5a6b73]'}`}>
              Đã có tài khoản?{' '}
              <Link to="/login" className={`font-semibold transition-colors duration-300 ${isDark ? 'text-white hover:text-[#299593]' : 'text-[#1d2633] hover:text-[#21817f]'}`}>
                Đăng nhập
              </Link>
            </p>
          </div>

          <button onClick={() => navigate('/')} className={`absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-[#1c2431] text-white/50 hover:text-white' : 'bg-[#eef2f5] text-[#1d2633]/50 hover:text-[#1d2633]'}`}>
            ✕
          </button>
        </div>
      </div>
      
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
    </div>
  );
}

export default Register;
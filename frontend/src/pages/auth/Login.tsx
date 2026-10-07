import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/login", {
        email,
        password,
        device_name: "web",
      });

      // Kiểm tra cấu trúc response tùy theo backend trả về
      const { token, user } = response.data;
      if (token && user) {
        login(token, user);
        
        // Điều hướng dựa trên role
        if (user.role === 'ADMIN') navigate('/admin');
        else if (user.role === 'ADVISOR') navigate('/advisor/customers');
        else if (user.role === 'TECHNICIAN') navigate('/technician');
        else navigate('/customer');
      } else {
        setError("Đăng nhập thất bại, không nhận được token.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi đăng nhập. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <header className="border-b border-[#E1E4E6] bg-white">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F2933] text-white">
              🚗
            </div>
            <div>
              <p className="text-sm font-bold">CarService</p>
              <p className="text-[9px] text-[#8A949E]">
                Dịch vụ chăm sóc ô tô
              </p>
            </div>
          </Link>
          <Link
            to="/"
            className="text-[11px] font-semibold text-[#66717C] hover:text-[#20252B]"
          >
            ← Trang chủ
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-10">
        <div className="w-full max-w-[430px]">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E8D2] text-xl">
              👤
            </div>
            <h1 className="text-2xl font-bold text-[#20252B]">
              Đăng nhập
            </h1>
            <p className="mt-2 text-xs text-[#66717C]">
              Đăng nhập để quản lý lịch hẹn và thông tin xe của bạn.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-sm"
          >
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">
                {error}
              </div>
            )}
            
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-[11px] font-semibold text-[#20252B]">
                  Email đăng nhập
                </label>
                <input
                  type="email"
                  placeholder="Nhập email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E1E4E6] px-4 py-3 text-xs outline-none transition focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold text-[#20252B]">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E1E4E6] px-4 py-3 text-xs outline-none transition focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#1F2933] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#151D24] disabled:opacity-70"
              >
                {loading ? "Đang xử lý..." : "Đăng nhập"}
              </button>
            </div>

            <div className="mt-6 border-t border-[#E1E4E6] pt-5 text-center">
              <p className="text-[11px] text-[#66717C]">
                Chưa có tài khoản?
              </p>
              <Link
                to="/register"
                className="mt-2 inline-block text-[11px] font-semibold text-[#3A3020] hover:text-[#D6A85F]"
              >
                Đăng ký tài khoản
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Login;
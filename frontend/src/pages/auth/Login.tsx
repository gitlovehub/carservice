import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const [apiError, setApiError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });
    setApiError("");
  };

  const validate = () => {
    const newErrors = {
      email: "",
      password: "",
    };

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Email không hợp lệ.";
    }

    if (!form.password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    }

    setErrors(newErrors);

    return !Object.values(newErrors).some(
      (error) => error !== ""
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setApiError("");

    try {
      const response = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.message || "Đăng nhập thất bại. Vui lòng thử lại.");
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.account));
        localStorage.setItem("isLoggedIn", "true");
        
        if (data.account.role === "CUSTOMER") {
          navigate("/customer");
        } else {
          navigate("/"); // or admin dashboard
        }
      } else {
        setApiError(data.message || "Tài khoản chưa xác thực email. Vui lòng nhập mã OTP.");
      }
    } catch (error) {
      setApiError("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (error: string) =>
    `h-12 w-full rounded-xl border px-4 text-sm text-[#20252B] outline-none transition placeholder:text-[#8A949E] ${
      error
        ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100"
        : "border-[#D9DDE1] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
    }`;

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
              <p className="text-[10px] text-[#8A949E]">
                Dịch vụ chăm sóc ô tô
              </p>
            </div>
          </Link>

          <Link
            to="/"
            className="text-sm font-medium text-[#66717C] transition hover:text-[#20252B]"
          >
            ← Trang chủ
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-6 text-center">
            <h1 className="text-[28px] font-bold tracking-tight text-[#20252B]">
              Đăng nhập
            </h1>

            <p className="mt-2 text-sm text-[#66717C]">
              Đăng nhập để quản lý lịch hẹn và thông tin xe của bạn.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_4px_20px_rgba(31,41,51,0.06)]"
          >
            {apiError && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-100">
                {apiError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Địa chỉ email"
                  className={inputClass(errors.email)}
                />

                {errors.email && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Mật khẩu"
                    className={`${inputClass(errors.password)} pr-16`}
                  />

                  <button
                     type="button"
                     onClick={() =>
                       setShowPassword(!showPassword)
                     }
                     className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#66717C] transition hover:text-[#20252B]"
                   >
                     {showPassword ? "Ẩn" : "Hiện"}
                   </button>
                 </div>

                 {errors.password && (
                   <p className="mt-1.5 text-xs font-medium text-red-600">
                     {errors.password}
                   </p>
                 )}
               </div>

               <button
                 type="submit"
                 disabled={isLoading}
                 className="h-12 w-full flex items-center justify-center rounded-xl bg-[#1F2933] text-sm font-semibold text-white transition hover:bg-[#151D24] disabled:opacity-70 disabled:cursor-not-allowed"
               >
                 {isLoading ? "Đang xử lý..." : "Đăng nhập"}
               </button>
             </div>

             <div className="mt-5 text-center">
               <Link
                 to="/forgot-password"
                 className="text-sm font-medium text-[#66717C] transition hover:text-[#D6A85F]"
               >
                 Quên mật khẩu?
               </Link>
             </div>

             <div className="my-6 border-t border-[#E5E7E9]" />

             <div className="text-center">

               <Link
                 to="/register"
                 className="mt-3 inline-flex h-11 items-center justify-center w-full rounded-xl border border-[#D6A85F] px-6 text-sm font-semibold text-[#3A3020] transition hover:bg-[#F3E8D2]"
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
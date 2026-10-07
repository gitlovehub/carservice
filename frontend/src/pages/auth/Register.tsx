import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const [errors, setErrors] = useState({
    fullName: "",
    phone: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    agree: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });
  };

  const validate = () => {
    const newErrors = {
      fullName: "",
      phone: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      agree: "",
    };

    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;
    const passwordUppercase = /[A-Z]/;
    const passwordLowercase = /[a-z]/;
    const passwordNumber = /[0-9]/;

    if (!form.fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên.";
    } else if (form.fullName.trim().length < 2) {
      newErrors.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!phoneRegex.test(form.phone.trim())) {
      newErrors.phone = "Số điện thoại không đúng định dạng.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập email.";
    } else if (!emailRegex.test(form.email.trim())) {
      newErrors.email = "Email không đúng định dạng.";
    }

    if (!form.username.trim()) {
      newErrors.username = "Vui lòng nhập tên đăng nhập.";
    } else if (!usernameRegex.test(form.username)) {
      newErrors.username =
        "Tên đăng nhập gồm 4-20 ký tự, chỉ dùng chữ, số và dấu _.";
    }

    if (!form.password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (form.password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự.";
    } else if (!passwordUppercase.test(form.password)) {
      newErrors.password =
        "Mật khẩu phải có ít nhất 1 chữ cái viết hoa.";
    } else if (!passwordLowercase.test(form.password)) {
      newErrors.password =
        "Mật khẩu phải có ít nhất 1 chữ cái viết thường.";
    } else if (!passwordNumber.test(form.password)) {
      newErrors.password = "Mật khẩu phải có ít nhất 1 chữ số.";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword =
        "Vui lòng xác nhận lại mật khẩu.";
    } else if (form.confirmPassword !== form.password) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không trùng khớp.";
    }

    if (!form.agree) {
      newErrors.agree =
        "Bạn cần đồng ý với Chính sách và Điều khoản dịch vụ.";
    }

    setErrors(newErrors);

    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    navigate("/login");
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
        <div className="w-full max-w-[440px]">
          <div className="mb-6 text-center">
            <h1 className="text-[28px] font-bold tracking-tight text-[#20252B]">
              Tạo tài khoản
            </h1>

            <p className="mt-2 text-sm text-[#66717C]">
              Đăng ký tài khoản khách hàng để sử dụng dịch vụ
              CarService.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_4px_20px_rgba(31,41,51,0.06)]"
          >
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Họ và tên"
                  className={inputClass(errors.fullName)}
                />

                {errors.fullName && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Số điện thoại"
                  className={inputClass(errors.phone)}
                />

                {errors.phone && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className={inputClass(errors.email)}
                />

                {errors.email && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Tên đăng nhập"
                  className={inputClass(errors.username)}
                />

                {errors.username && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    {errors.username}
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
                    className={`${inputClass(
                      errors.password
                    )} pr-16`}
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

              <div>
                <div className="relative">
                  <input
                    type={
                      showConfirmPassword ? "text" : "password"
                    }
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Xác nhận mật khẩu"
                    className={`${inputClass(
                      errors.confirmPassword
                    )} pr-16`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#66717C] transition hover:text-[#20252B]"
                  >
                    {showConfirmPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>

                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <div
                className={`rounded-xl border p-3 transition ${
                  errors.agree
                    ? "border-red-400 bg-red-50"
                    : "border-transparent bg-[#F7F7F5]"
                }`}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    name="agree"
                    checked={form.agree}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#1F2933]"
                  />

                  <span
                    className={`text-sm leading-5 ${
                      errors.agree
                        ? "text-red-600"
                        : "text-[#66717C]"
                    }`}
                  >
                    Tôi đã đọc và đồng ý với{" "}
                    <span
                      className={
                        errors.agree
                          ? "font-medium text-red-700"
                          : "font-medium text-[#20252B]"
                      }
                    >
                      Chính sách và Điều khoản dịch vụ
                    </span>{" "}
                    của CarService.
                  </span>
                </label>

                {errors.agree && (
                  <p className="mt-2 pl-7 text-xs font-medium text-red-600">
                    {errors.agree}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="h-12 w-full rounded-xl bg-[#1F2933] text-sm font-semibold text-white transition hover:bg-[#151D24]"
              >
                Đăng ký
              </button>
            </div>

            <div className="my-6 border-t border-[#E5E7E9]" />

            <div className="text-center">
              <p className="text-sm text-[#66717C]">
                Đã có tài khoản?
              </p>

              <Link
                to="/login"
                className="mt-3 inline-flex h-11 items-center justify-center rounded-xl border border-[#D6A85F] px-6 text-sm font-semibold text-[#3A3020] transition hover:bg-[#F3E8D2]"
              >
                Đăng nhập
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Register;
/**
 * Kiểu dùng chung cho 3 trang Đăng nhập / Đăng ký / Quên mật khẩu — đổi ở đây là cả 3 trang đổi theo.
 */
export const authFieldClass =
  "block w-full min-w-0 min-h-12 rounded-xl border border-[#e9e9e6] bg-white px-3.5 py-3 text-sm text-[#191919] outline-none placeholder:text-[#999] focus:border-[#cf2935] focus:ring-[3px] focus:ring-[#cf2935]/10 aria-invalid:border-[#d34953] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]";

export const authPrimaryClass =
  "flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#cf2935] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#b92430] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] disabled:cursor-not-allowed disabled:opacity-55";

/** Dòng phụ dưới form (gửi lại OTP, quay lại…). */
export const authLinkRowClass =
  "mt-5 grid gap-3 text-xs text-cs-muted [&_button]:cursor-pointer [&_button]:text-left [&_button]:font-extrabold [&_button]:text-[#cf2935] [&_button:disabled]:cursor-not-allowed";

const BookingButton = () => {
  const handleClick = () => {
    console.log("Đặt lịch");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
    >
      Đặt lịch ngay
    </button>
  );
};

export default BookingButton;
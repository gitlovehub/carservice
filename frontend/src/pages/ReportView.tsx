export function ReportView() {
  const reportCards = [
    "Thống kê doanh thu",
    "Thống kê số lượng xe, dịch vụ",
    "Báo cáo tồn kho",
    "Báo cáo hiệu suất nhân viên",
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">GARA / BÁO CÁO & THỐNG KÊ</div>
          <h1>Báo cáo & thống kê</h1>
          <p>Tổng hợp các chỉ số hoạt động theo use case quản trị.</p>
        </div>
      </div>
      <div className="report-grid">
        {reportCards.map((title, idx) => (
          <section key={title} className="panel report-card">
            <span className="eyebrow">BÁO CÁO 0{idx + 1}</span>
            <h2>{title}</h2>
            <div className="chart-placeholder" aria-label={`Biểu đồ minh họa ${title}`}>
              <span style={{ height: "32%" }} />
              <span style={{ height: "56%" }} />
              <span style={{ height: "43%" }} />
              <span style={{ height: "77%" }} />
              <span style={{ height: "61%" }} />
              <span style={{ height: "88%" }} />
            </div>
            <p>Biểu đồ sẽ hiển thị theo dữ liệu thực tế.</p>
          </section>
        ))}
      </div>
    </>
  );
}

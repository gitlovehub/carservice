export function Footer({ onOpenReviewModal }: { onOpenReviewModal: () => void }) {
  return (
    <footer className="site-footer">
      <span>© CarService · Quản lý dịch vụ ô tô</span>
      <button type="button" onClick={onOpenReviewModal}>
        Mở checklist Review & Test
      </button>
    </footer>
  );
}

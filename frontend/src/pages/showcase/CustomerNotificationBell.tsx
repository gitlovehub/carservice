import { formatDateTime } from "../../services/customerApi";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveRefresh } from '../../services/liveSync';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import {
  getCustomerNotifications,
  notificationTarget,
  readAllCustomerNotifications,
  readCustomerNotification,
  type CustomerNotification,
} from '../../services/customerNotifications';
import { userErrorMessage } from "../../services/apiError";

/** "5 phút trước", "Hôm qua"… — xem nhanh dễ hơn ngày giờ đầy đủ (ngày đầy đủ ở tooltip). */
function relativeTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (Number.isNaN(minutes)) return '';
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

const REFRESH_MS = 60_000;

/**
 * Chuông thông báo của khách: mọi việc cố vấn / admin làm liên quan tới khách (xác nhận / hủy / đổi lịch, báo giá,
 * bắt đầu sửa, chờ phụ tùng, xong xe, biên bản, hóa đơn, nhận tiền, đánh giá…) — dữ liệu từ backend CustomerNotifier.
 * Mở chuông = xem nhanh; bấm một thông báo = đánh dấu đã đọc và mở đúng chỗ chi tiết (modal / phiếu tương ứng).
 */
export default function CustomerNotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const holderRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Làm mới nền (lúc vào trang, định kỳ, realtime): không bật lại "Đang tải" để chuông không nháy.
  // State chỉ đổi trong callback khi có kết quả (không đổi đồng bộ lúc gọi).
  const refresh = useCallback(() => getCustomerNotifications()
    .then(response => {
      setItems(response.items);
      setUnread(response.unreadCount);
      setError('');
    })
    .catch((cause: unknown) => setError(userErrorMessage(cause, 'Không thể lấy thông báo.')))
    .finally(() => setLoading(false)), []);

  // Người dùng chủ động tải lại (mở chuông / Thử lại): hiện trạng thái đang tải.
  const reload = () => { setLoading(true); setError(''); void refresh(); };

  // Đọc số lượng khi vào website và tự làm mới mỗi phút (chỉ khi tab đang mở) — không tạo badge giả nếu Backend lỗi.
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);
  // Có thông báo mới / đọc ở trang Hồ sơ → số chuông cập nhật ngay.
  useLiveRefresh(() => void refresh());
  // Đổi trang → đóng chuông ngay khi render (không cần effect).
  const [menuPath, setMenuPath] = useState(location.pathname);
  if (menuPath !== location.pathname) { setMenuPath(location.pathname); setOpen(false); }
  useEffect(() => {
    if (!open) return;
    const onOutside = (event: PointerEvent) => {
      if (holderRef.current && !holderRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  async function selectNotification(item: CustomerNotification) {
    if (!item.read_at) {
      try {
        await readCustomerNotification(item.id);
        setItems(current => current.map(row => row.id === item.id ? {...row, read_at: new Date().toISOString()} : row));
        setUnread(current => Math.max(0, current - 1));
      } catch (cause) {
        // Không hiển thị là đã đọc khi API thất bại; vẫn cho khách đi tới trang liên quan.
        setError(userErrorMessage(cause, 'Không thể đánh dấu đã đọc.'));
      }
    }
    setOpen(false);
    navigate(notificationTarget(item).to);
  }

  async function readAll() {
    try {
      await readAllCustomerNotifications();
      const now = new Date().toISOString();
      setItems(current => current.map(row => row.read_at ? row : {...row, read_at: now}));
      setUnread(0);
    } catch (cause) {
      setError(userErrorMessage(cause, 'Không thể đánh dấu đã đọc.'));
    }
  }

  return <div className="v3ref-notification" ref={holderRef}>
    <button type="button" className="v3ref-notification-trigger" title="Thông báo của bạn"
      aria-label={unread ? `Thông báo (${unread} chưa đọc)` : 'Thông báo'} aria-expanded={open}
      aria-haspopup="dialog" onClick={() => { setOpen(value => !value); if (!open) reload(); }}>
      {/* Còn tin chưa đọc → chuông lắc theo nhịp; đang mở bảng thì tạm dừng; đọc hết (unread = 0) thì thôi lắc. */}
      <span className={`v3ref-notification-bell${unread > 0 && !open ? ' is-ringing' : ''}`}><Icon name="bell" size={21}/></span>
      {unread > 0 && <span className="v3ref-notification-count">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <section className="v3ref-notification-panel" role="dialog" aria-label="Thông báo CarService">
      <div className="v3ref-notification-panel-heading">
        <div><strong>Thông báo</strong><small>{unread > 0 ? `${unread} thông báo chưa đọc` : 'Cập nhật mới nhất từ gara'}</small></div>
        {unread > 0 && <button type="button" onClick={() => void readAll()}>Đánh dấu đã đọc hết</button>}
      </div>
      {loading && items.length === 0 ? <p className="v3ref-notification-empty">Đang tải thông báo...</p>
        : error && items.length === 0 ? <p className="v3ref-notification-error" role="alert">{error} <button type="button" onClick={reload}>Thử lại</button></p>
        : items.length === 0 ? <div className="v3ref-notification-empty"><span className="v3ref-notification-empty-icon"><Icon name="bell" size={23}/></span><strong>Chưa có thông báo</strong><p>Khi gara xác nhận lịch, gửi báo giá, sửa xong xe hay lập hóa đơn, tin mới sẽ xuất hiện ở đây.</p></div>
        : <div className="v3ref-notification-list">
          {items.map(item => {
            const target = notificationTarget(item);
            return <button type="button" className={`v3ref-notification-item${!item.read_at ? ' is-unread' : ''}`}
              key={item.id} onClick={() => void selectNotification(item)}>
              <span className="v3ref-notification-item-icon"><Icon name={target.icon} size={18}/></span>
              <span className="v3ref-notification-item-copy">
                <strong>{item.title}</strong>
                <span>{item.content}</span>
                <span className="v3ref-notification-item-meta">
                  <small title={item.created_at ? formatDateTime(item.created_at) : undefined}>{relativeTime(item.created_at)}</small>
                  <em>{target.action} →</em>
                </span>
              </span>
              {!item.read_at && <span className="v3ref-unread-dot" aria-label="Chưa đọc"/>}
            </button>;
          })}
        </div>}
      {error && items.length > 0 && <p className="v3ref-notification-error" role="alert">{error}</p>}
      <button type="button" className="v3ref-notification-all" onClick={() => { setOpen(false); navigate('/customer/account?tab=notifications'); }}>
        Xem tất cả thông báo <Icon name="arrow" size={15}/>
      </button>
    </section>}
  </div>;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import {
  getCustomerNotifications,
  readCustomerNotification,
  type CustomerNotification,
} from '../../services/customerNotifications';

function notificationDestination(item: CustomerNotification): string {
  if (item.appointment_id) return '/customer/appointments';
  if (item.repair_order_id) return `/repair-status?orderId=${item.repair_order_id}`;
  return '/customer/appointments';
}

function dateLabel(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'});
}

/** Thay liên kết Đánh giá ở header bằng chuông đọc thông báo WEB từ Laravel. */
export default function CustomerNotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const holderRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getCustomerNotifications();
      setItems(response.items);
      setUnread(response.unreadCount);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lấy thông báo.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Đọc số lượng thông báo khi vào website, không tạo badge giả nếu Backend lỗi.
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { setOpen(false); }, [location.pathname]);
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
        setError(cause instanceof Error ? cause.message : 'Không thể đánh dấu đã đọc.');
      }
    }
    setOpen(false);
    navigate(notificationDestination(item));
  }

  return <div className="v3ref-notification" ref={holderRef}>
    <button type="button" className="v3ref-notification-trigger" title="Thông báo của bạn"
      aria-label={unread ? `Thông báo (${unread} chưa đọc)` : 'Thông báo'} aria-expanded={open}
      aria-haspopup="dialog" onClick={() => { setOpen(value => !value); if (!open) void refresh(); }}>
      <Icon name="bell" size={21}/>
      {unread > 0 && <span className="v3ref-notification-count">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <section className="v3ref-notification-panel" role="dialog" aria-label="Thông báo CarService">
      <div className="v3ref-notification-panel-heading">
        <div><strong>Thông báo</strong><small>{unread > 0 ? `${unread} thông báo chưa đọc` : 'Cập nhật mới nhất từ gara'}</small></div>
        <button type="button" onClick={() => void refresh()} disabled={loading}>Làm mới</button>
      </div>
      {loading && items.length === 0 ? <p className="v3ref-notification-empty">Đang tải thông báo...</p>
        : error && items.length === 0 ? <p className="v3ref-notification-error" role="alert">{error} <button type="button" onClick={() => void refresh()}>Thử lại</button></p>
        : items.length === 0 ? <div className="v3ref-notification-empty"><span className="v3ref-notification-empty-icon"><Icon name="bell" size={23}/></span><strong>Chưa có thông báo</strong><p>Khi gara đổi lịch hẹn hoặc cập nhật phụ tùng, tin mới sẽ xuất hiện ở đây.</p></div>
        : <div className="v3ref-notification-list">
          {items.map(item => <button type="button" className={`v3ref-notification-item${!item.read_at ? ' is-unread' : ''}`}
            key={item.id} onClick={() => void selectNotification(item)}>
            <span className="v3ref-notification-item-icon"><Icon name={item.appointment_id ? 'calendar' : 'wrench'} size={18}/></span>
            <span className="v3ref-notification-item-copy"><strong>{item.title}</strong><span>{item.content}</span><small>{dateLabel(item.created_at)}</small></span>
            {!item.read_at && <span className="v3ref-unread-dot" aria-label="Chưa đọc"/>}
          </button>)}
        </div>}
      {error && items.length > 0 && <p className="v3ref-notification-error" role="alert">{error}</p>}
    </section>}
  </div>;
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/buttons.css'
import App from './App.tsx'
import './styles/v3-polish.css'
import { expireUnrememberedSession } from './services/authPersistence'

// "Ghi nhớ đăng nhập" không tích + trình duyệt đã đóng → xoá phiên trước khi app đọc trạng thái đăng nhập.
expireUnrememberedSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

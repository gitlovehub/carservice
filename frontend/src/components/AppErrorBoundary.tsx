import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "./ui/Button";
import { ErrorState } from "./ui/States";

type BoundaryProps = { children: ReactNode; resetKey: string };
type State = { crashed: boolean };

/** Lớp chặn cuối: một thành phần lỗi không được để lại trang trắng. Chuyển trang thì tự thử hiển thị lại. */
class RouteErrorBoundary extends Component<BoundaryProps, State> {
  state: State = { crashed: false };
  static getDerivedStateFromError(): State { return { crashed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("CarService render error:", error, info.componentStack);
  }
  componentDidUpdate(previous: BoundaryProps) {
    if (this.state.crashed && previous.resetKey !== this.props.resetKey) this.setState({ crashed: false });
  }
  render() {
    if (!this.state.crashed) return this.props.children;
    // Trang lỗi nằm ngoài layout: giữ màu nhấn vàng đồng của khu Cố vấn.
    return <main data-area={this.props.resetKey.startsWith("/advisor") ? "advisor" : undefined} className="grid min-h-dvh place-items-center bg-cs-surface-2 p-4 text-cs-text">
      <section className="w-full max-w-xl rounded-card border border-cs-border bg-cs-surface shadow-card">
        <ErrorState title="Không thể hiển thị trang này"
          description="Trang gặp sự cố ngoài dự kiến. Vui lòng tải lại trang; nếu vẫn lỗi, hãy quay về trang chủ hoặc liên hệ gara để được hỗ trợ."
          action={<>
            <Button variant="primary" icon="refresh" onClick={() => window.location.reload()}>Tải lại trang</Button>
            <Button variant="secondary" icon="home" onClick={() => window.location.assign("/")}>Về trang chủ</Button>
          </>}/>
      </section>
    </main>;
  }
}

export default function AppErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <RouteErrorBoundary resetKey={pathname}>{children}</RouteErrorBoundary>;
}

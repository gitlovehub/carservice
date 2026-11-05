import { Outlet } from "react-router-dom";
import { AtelierPublicFooter, AtelierPublicHeader } from "../components/AtelierPublic";
import PageTransition from "../components/PageTransition";

/** Layout dùng chung cho trang công khai: header/footer giữ nguyên khi chuyển trang. */
export default function PublicLayout() {
  return <div className="flex min-h-dvh flex-col bg-cs-bg text-cs-text">
    <AtelierPublicHeader />
    <PageTransition className="flex flex-1 flex-col"><Outlet /></PageTransition>
    <AtelierPublicFooter />
  </div>;
}


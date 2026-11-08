import { Outlet } from "react-router-dom";
import { GaragePublicFooter, GaragePublicHeader } from "../components/GaragePublic";
import PageTransition from "../components/PageTransition";

/** Layout dùng chung cho trang công khai: header/footer giữ nguyên khi chuyển trang. */
export default function PublicLayout() {
  return <div className="flex min-h-dvh flex-col bg-cs-bg text-cs-text">
    <GaragePublicHeader />
    <PageTransition className="flex flex-1 flex-col"><Outlet /></PageTransition>
    <GaragePublicFooter />
  </div>;
}


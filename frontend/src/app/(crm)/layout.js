import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AnnouncementPopup from "@/components/AnnouncementPopup";

export default function CRMLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0b1120] transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 ml-80 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8 pb-12 overflow-x-hidden animate-fade-in relative z-10">
          {children}
        </main>
      </div>
      <AnnouncementPopup />
    </div>
  );
}

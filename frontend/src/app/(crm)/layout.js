import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AnnouncementPopup from "@/components/AnnouncementPopup";

export default function CRMLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0b1120] transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 ml-0 md:ml-72 flex flex-col min-h-screen pb-20 md:pb-0 relative">
        <Header />
        <main className="flex-1 p-4 md:p-8 pb-12 overflow-x-hidden animate-fade-in relative z-10">
          {children}
        </main>
      </div>
      <AnnouncementPopup />
    </div>
  );
}

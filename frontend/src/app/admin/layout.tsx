"use client";

import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    
    const user = JSON.parse(userStr);
    if (user.role !== 'admin' && user.role !== 'promotora') {
      router.push('/simulador');
      return;
    }
    
    setAuthorized(true);
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
           <div className="w-12 h-12 bg-blue-100 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
           <span className="text-slate-400 font-bold text-sm uppercase tracking-widest italic">Autenticando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 lg:ml-80 flex flex-col">
        <Header />
        <main className="p-4 max-w-[98%] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export default function StatsCard({ title, value, icon, trend, trendUp }: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-xl flex flex-col hover:shadow-2xl transition-all duration-300 group cursor-default">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 opacity-70 group-hover:opacity-100 transition-opacity">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:scale-105 transition-transform origin-left">{value}</h3>
          
          {trend && (
            <div className={`flex items-center gap-1.5 mt-2 text-[9px] font-black uppercase tracking-wider ${trendUp ? 'text-emerald-500' : 'text-slate-400'}`}>
              <span className={`flex items-center justify-center w-4 h-4 rounded-full ${trendUp ? 'bg-emerald-500/10' : 'bg-slate-500/10'}`}>
                {trendUp ? '↑' : '•'}
              </span>
              {trend}
              <span className="text-slate-400 font-bold ml-1 opacity-60">vs. mês</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-slate-100 dark:border-white/5 shrink-0 group-hover:rotate-12 transition-transform duration-500 group-hover:bg-blue-600/10 group-hover:text-blue-600">
          <div className="group-hover:scale-110 transition-transform">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

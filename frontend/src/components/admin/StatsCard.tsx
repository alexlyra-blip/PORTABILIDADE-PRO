interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  trendUp?: boolean;
}

export default function StatsCard({ title, value, icon, trend, trendUp }: StatsCardProps) {
  return (
    <div className="admin-card p-4 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-xl font-black text-slate-900">{value}</h3>
          
          {trend && (
            <div className={`flex items-center gap-1 mt-1 text-[9px] font-black uppercase ${trendUp ? 'text-emerald-600' : 'text-slate-400'}`}>
              {trendUp ? '↑' : ''} {trend}
              <span className="text-slate-400 font-bold ml-1">vvs. mês</span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl shadow-inner border border-slate-100 shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

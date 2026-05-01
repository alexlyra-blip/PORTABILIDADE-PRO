interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  trendUp?: boolean;
}

export default function StatsCard({ title, value, icon, trend, trendUp }: StatsCardProps) {
  return (
    <div className="admin-card p-6 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
          <h3 className="text-3xl font-extrabold text-slate-900">{value}</h3>
          
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trendUp ? 'text-emerald-600' : 'text-slate-400'}`}>
              {trendUp ? '↑' : ''} {trend}
              <span className="text-slate-400 font-normal ml-1">vvs. último mês</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-slate-100">
          {icon}
        </div>
      </div>
    </div>
  );
}

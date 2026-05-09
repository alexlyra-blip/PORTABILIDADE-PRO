import Link from "next/link";

const actions = [
  { name: "Regras Bancos", href: "/admin/banks", color: "bg-blue-500", icon: "🏦" },
  { name: "Nova Tabela", href: "/admin/tables", color: "bg-emerald-500", icon: "📋" },
  { name: "Configurar Regras", href: "/admin/rules", color: "bg-amber-500", icon: "⚖️" },
  { name: "Gerenciar Usuários", href: "/admin/users", color: "bg-purple-500", icon: "👥" },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
      {actions.map((action) => (
        <Link 
          key={action.name}
          href={action.href}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden shadow-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900 hover:-translate-y-1 hover:shadow-2xl"
          style={{
            backgroundImage: `linear-gradient(135deg, ${action.color.replace('bg-', '') === 'blue-500' ? '#3b82f6' : 
                               action.color.replace('bg-', '') === 'emerald-500' ? '#10b981' : 
                               action.color.replace('bg-', '') === 'amber-500' ? '#f59e0b' : 
                               '#8b5cf6'} 0%, rgba(15, 23, 42, 0.9) 100%)`,
          }}
        >
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-xl flex items-center justify-center text-xl shadow-lg border border-white/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shrink-0 relative z-10">
            {action.icon}
          </div>
          <div className="min-w-0 flex-1 relative z-10">
            <span className="block font-black text-white text-[10px] uppercase tracking-wider truncate group-hover:translate-x-1 transition-transform">{action.name}</span>
            <span className="text-[8px] text-white/50 uppercase font-bold tracking-widest mt-0.5 block italic">Acesso Rápido</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

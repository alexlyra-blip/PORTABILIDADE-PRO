import Link from "next/link";

const actions = [
  { name: "Regras Bancos", href: "/admin/banks", color: "bg-blue-500", icon: "🏦" },
  { name: "Nova Tabela", href: "/admin/tables", color: "bg-emerald-500", icon: "📋" },
  { name: "Configurar Regras", href: "/admin/rules", color: "bg-amber-500", icon: "⚖️" },
  { name: "Gerenciar Usuários", href: "/admin/users", color: "bg-purple-500", icon: "👥" },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      {actions.map((action) => (
        <Link 
          key={action.name}
          href={action.href}
          className="admin-card p-3 flex items-center gap-3 hover:border-blue-200 hover:bg-blue-50/10 transition-all group"
        >
          <div className={`w-10 h-10 ${action.color} text-white rounded-xl flex items-center justify-center text-lg shadow-lg shadow-black/5 group-hover:scale-110 transition-transform shrink-0`}>
            {action.icon}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block font-bold text-slate-800 text-xs truncate">{action.name}</span>
            <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Atalho Rápido</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

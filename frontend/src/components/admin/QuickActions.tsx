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
          className="admin-card p-4 flex items-center gap-4 hover:border-blue-200 hover:bg-blue-50/10 transition-all group"
        >
          <div className={`w-12 h-12 ${action.color} text-white rounded-xl flex items-center justify-center text-xl shadow-lg shadow-black/5 group-hover:scale-110 transition-transform`}>
            {action.icon}
          </div>
          <div>
            <span className="block font-bold text-slate-800 text-sm">{action.name}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Atalho Rápido</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

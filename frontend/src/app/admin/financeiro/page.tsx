"use client";

// CARD_SALE_CALCULATOR_POPUP_V2

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/utils/api";
import { Icons } from "@/components/Icons";
import MercadoPagoFeeSimulator from "@/components/admin/MercadoPagoFeeSimulator";
import PaymentManagementPanel from "@/components/admin/PaymentManagementPanel";
import CardSaleFinancePanel from "@/components/admin/CardSaleFinancePanel";

const initialForm = {
  customer_name: "",
  customer_email: "",
  customer_document: "",
  customer_phone: "",
  description: "Pacote Portabilidade PRO",
  package_name: "",
  consultation_quantity: "",
  amount: "",
  expiration_days: 7,
  internal_note: "",
  max_installments: 12,
  default_installments: "",
  installment_mode: "customer",
};

const money = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const dateTime = (value) => {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const statusConfig = {
  approved: {
    label: "Pago",
    className: "bg-emerald-100 text-emerald-700",
  },
  pending: {
    label: "Pendente",
    className: "bg-amber-100 text-amber-700",
  },
  created: {
    label: "Aguardando",
    className: "bg-blue-100 text-blue-700",
  },
  rejected: {
    label: "Recusado",
    className: "bg-red-100 text-red-700",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-slate-200 text-slate-700",
  },
  refunded: {
    label: "Estornado",
    className: "bg-purple-100 text-purple-700",
  },
};

function StatusBadge({ status }) {
  const config = statusConfig[status] || {
    label: status || "Desconhecido",
    className: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide shadow-sm ring-1 ring-inset ring-black/5 ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// FINANCE_PREMIUM_ACTIONS_V3
function PremiumActionIcon({
  type,
}: {
  type:
    | "edit"
    | "copy"
    | "whatsapp"
    | "open"
    | "cancel"
    | "trash"
    | "refresh";
}) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (type === "edit") {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </svg>
    );
  }

  if (type === "copy") {
    return (
      <svg {...common}>
        <rect
          x="9"
          y="9"
          width="11"
          height="11"
          rx="2"
        />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    );
  }

  if (type === "whatsapp") {
    return (
      <svg {...common}>
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-3.8-.8L3 21l1.8-5A8.7 8.7 0 1 1 21 11.5Z" />
        <path d="M8.5 8.5c.8 3 3 5.2 6 6" />
      </svg>
    );
  }

  if (type === "open") {
    return (
      <svg {...common}>
        <path d="M14 3h7v7" />
        <path d="m10 14 11-11" />
        <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
      </svg>
    );
  }

  if (type === "cancel") {
    return (
      <svg {...common}>
        <circle
          cx="12"
          cy="12"
          r="9"
        />
        <path d="m9 9 6 6" />
        <path d="m15 9-6 6" />
      </svg>
    );
  }

  if (type === "trash") {
    return (
      <svg {...common}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="m19 6-1 15H6L5 6" />
        <path d="M10 11v5" />
        <path d="M14 11v5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}


function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="group rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/70 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_42px_rgba(37,99,235,0.10)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
            <Icon size={22} />
          </div>
        )}
      </div>

                </div>
  );
}

export default function FinanceiroPage() {
  const [payments, setPayments] = useState([]);

  // CARD_SALE_FINANCE_PANEL_V1
  const [cardSalesFinance, setCardSalesFinance] = useState([]);
  const [cardSalesFinanceStats, setCardSalesFinanceStats] = useState({});
  const [stats, setStats] = useState({
    total_cobrancas: 0,
    pagamentos_aprovados: 0,
    valor_recebido: 0,
    cobrancas_pendentes: 0,
    valor_pendente: 0,
    pagamentos_rejeitados: 0,
    pagamentos_estornados: 0,
    pagamentos_cancelados: 0,
    ticket_medio: 0,
  });

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [filter, setFilter] = useState("all");
  const [editingPayment, setEditingPayment] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);

  const [freeLinks, setFreeLinks] = useState([]);
  const [creatingFreeLink, setCreatingFreeLink] = useState(false);
  const [freeLinkResult, setFreeLinkResult] = useState(null);
  const [editingFreeLink, setEditingFreeLink] = useState(null);
  const [savingFreeLinkEdit, setSavingFreeLinkEdit] = useState(false);

  const [freeLinkForm, setFreeLinkForm] = useState({
    title: "Pagamento Portabilidade PRO",
    description: "",
    package_name: "",
    consultation_quantity: "",
    expiration_days: 30,
    max_installments: 12,
    default_installments: "",
    installment_mode: "customer",
  });

  const loadData = useCallback(async () => {
    try {
      setError("");

      const [
        paymentsResponse,
        statsResponse,
        freeLinksResponse,
        cardSalesFinanceResponse,
      ] = await Promise.all([
        api.get("/payments/admin?limit=500"),
        api.get("/payments/admin/stats"),
        api.get("/payments/admin/free-links"),
        api.get("/card-sales/admin/finance?limit=500"),
      ]);

      setPayments(paymentsResponse?.payments || []);
      setStats(statsResponse || {});
      setFreeLinks(freeLinksResponse?.links || []);
      setCardSalesFinance(
        cardSalesFinanceResponse?.sales || []
      );
      setCardSalesFinanceStats(
        cardSalesFinanceResponse?.stats || {}
      );
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Não foi possível carregar os dados financeiros."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const interval = setInterval(loadData, 30000);

    return () => clearInterval(interval);
  }, [loadData]);

  const filteredPayments = useMemo(() => {
    if (filter === "all") return payments;

    if (filter === "pending") {
      return payments.filter((payment) =>
        ["created", "pending"].includes(payment.status)
      );
    }

    return payments.filter(
      (payment) => payment.status === filter
    );
  }, [payments, filter]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.customer_name.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }

    const amount = Number(
      String(form.amount).replace(",", ".")
    );

    if (!amount || amount < 1) {
      setError("Informe um valor válido.");
      return;
    }

    setCreating(true);
    setError("");
    setSuccess(null);

    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_email:
          form.customer_email.trim() || null,
        customer_document:
          form.customer_document.trim() || null,
        customer_phone:
          form.customer_phone.trim() || null,
        description:
          form.description.trim() ||
          "Pacote Portabilidade PRO",
        amount,
        package_name:
          form.package_name.trim() || null,
        consultation_quantity:
          form.consultation_quantity !== ""
            ? Number(form.consultation_quantity)
            : null,
        expiration_days:
          Number(form.expiration_days) || 7,
        internal_note:
          form.internal_note.trim() || null,
        max_installments:
          Number(form.max_installments) || 12,
        default_installments:
          form.default_installments !== ""
            ? Number(form.default_installments)
            : null,
        installment_mode:
          form.installment_mode || "customer",
      };

      const response = await api.post(
        "/payment-orders/admin/create-link",
        payload
      );

      setSuccess(response);
      setForm(initialForm);

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Não foi possível gerar o link de pagamento."
      );
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (url) => {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);

      setCopiedLink(url);

      window.setTimeout(() => {
        setCopiedLink((current) =>
          current === url ? null : current
        );
      }, 2200);
    } catch (error) {
      console.error("Erro ao copiar link:", error);

      setError(
        "Não foi possível copiar o link."
      );
    }
  };

  const startEdit = (payment) => {
    setEditingPayment(payment);

    setEditForm({
      customer_name: payment.customer_name || "",
      customer_email: payment.customer_email || "",
      customer_document: payment.customer_document || "",
      customer_phone: payment.customer_phone || "",
      description:
        payment.description || "Pacote Portabilidade PRO",
      package_name: payment.package_name || "",
      consultation_quantity:
        payment.consultation_quantity ?? "",
      amount: String(payment.amount || "").replace(".", ","),
      expiration_days: 7,
      internal_note: payment.internal_note || "",
      max_installments: 12,
      default_installments: "",
      installment_mode: "customer",
    });
  };

  const closeEdit = () => {
    if (savingEdit) return;

    setEditingPayment(null);
    setEditForm(null);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const saveEdit = async () => {
    if (!editingPayment || !editForm) return;

    const amount = Number(
      String(editForm.amount).replace(",", ".")
    );

    if (!amount || amount < 1) {
      setError("Informe um valor válido para a cobrança.");
      return;
    }

    setSavingEdit(true);
    setError("");

    try {
      await api.patch(
        `/payments/admin/${editingPayment.id}`,
        {
          customer_name:
            editForm.customer_name.trim(),
          customer_email:
            editForm.customer_email.trim() || null,
          customer_document:
            editForm.customer_document.trim() || null,
          customer_phone:
            editForm.customer_phone.trim() || null,
          description:
            editForm.description.trim() ||
            "Pacote Portabilidade PRO",
          amount,
          package_name:
            editForm.package_name.trim() || null,
          consultation_quantity:
            editForm.consultation_quantity !== ""
              ? Number(editForm.consultation_quantity)
              : null,
          expiration_days:
            Number(editForm.expiration_days) || 7,
          internal_note:
            editForm.internal_note.trim() || null,
          max_installments:
            Number(editForm.max_installments) || 12,
          default_installments:
            editForm.default_installments !== ""
              ? Number(editForm.default_installments)
              : null,
          installment_mode:
            editForm.installment_mode || "customer",
        }
      );

      setEditingPayment(null);
      setEditForm(null);

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Não foi possível editar a cobrança."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const cancelPayment = async (payment) => {
    const confirmed = window.confirm(
      `Cancelar a cobrança de ${money(payment.amount)} para ${payment.customer_name}?`
    );

    if (!confirmed) return;

    const reason = window.prompt(
      "Motivo do cancelamento (opcional):",
      ""
    );

    setActionLoading(payment.id);
    setError("");

    try {
      await api.post(
        `/payments/admin/${payment.id}/cancel`,
        {
          reason: reason || null,
        }
      );

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Não foi possível cancelar a cobrança."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const deletePayment = async (payment) => {
    const confirmed = window.confirm(
      [
        "Excluir esta cobrança permanentemente?",
        "",
        `Cliente: ${payment.customer_name}`,
        `Valor: ${money(payment.amount)}`,
        "",
        "Esta opção só funciona para cobranças sem pagamento registrado.",
      ].join("\n")
    );

    if (!confirmed) return;

    setActionLoading(payment.id);
    setError("");

    try {
      await api.delete(
        `/payments/admin/${payment.id}`
      );

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Não foi possível excluir a cobrança."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleFreeLinkChange = (event) => {
    const { name, value } = event.target;

    setFreeLinkForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const createFreeLink = async () => {
    setCreatingFreeLink(true);
    setError("");
    setFreeLinkResult(null);

    try {
      const response = await api.post(
        "/payments/admin/free-links",
        {
          title:
            freeLinkForm.title.trim() ||
            "Pagamento Portabilidade PRO",
          description:
            freeLinkForm.description.trim() || null,
          package_name:
            freeLinkForm.package_name.trim() || null,
          consultation_quantity:
            freeLinkForm.consultation_quantity !== ""
              ? Number(
                  freeLinkForm.consultation_quantity
                )
              : null,
          expiration_days:
            Number(freeLinkForm.expiration_days) || 30,
          max_installments:
            Number(freeLinkForm.max_installments) || 12,
          default_installments:
            freeLinkForm.default_installments !== ""
              ? Number(
                  freeLinkForm.default_installments
                )
              : null,
          installment_mode:
            freeLinkForm.installment_mode ||
            "customer",
        }
      );

      setFreeLinkResult(response);

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Não foi possível criar o Link Livre."
      );
    } finally {
      setCreatingFreeLink(false);
    }
  };

  const startEditFreeLink = (link) => {
    setEditingFreeLink({
      ...link,
      expiration_days: 30,
      default_installments:
        link.default_installments ?? "",
    });
  };

  const closeEditFreeLink = () => {
    if (savingFreeLinkEdit) return;
    setEditingFreeLink(null);
  };

  const saveFreeLinkEdit = async () => {
    if (!editingFreeLink) return;

    setSavingFreeLinkEdit(true);
    setError("");

    try {
      await api.patch(
        `/payments/admin/free-links/${editingFreeLink.id}`,
        {
          title:
            editingFreeLink.title?.trim() ||
            "Pagamento Portabilidade PRO",
          description:
            editingFreeLink.description?.trim() || null,
          package_name:
            editingFreeLink.package_name?.trim() || null,
          consultation_quantity:
            editingFreeLink.consultation_quantity !== ""
              && editingFreeLink.consultation_quantity != null
              ? Number(
                  editingFreeLink.consultation_quantity
                )
              : null,
          expiration_days:
            Number(
              editingFreeLink.expiration_days
            ) || 30,
          max_installments:
            Number(
              editingFreeLink.max_installments
            ) || 12,
          default_installments:
            editingFreeLink.default_installments !== ""
              && editingFreeLink.default_installments != null
              ? Number(
                  editingFreeLink.default_installments
                )
              : null,
          installment_mode:
            editingFreeLink.installment_mode ||
            "customer",
          active: editingFreeLink.active,
        }
      );

      setEditingFreeLink(null);
      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Não foi possível editar o Link Livre."
      );
    } finally {
      setSavingFreeLinkEdit(false);
    }
  };

  const toggleFreeLink = async (link) => {
    setError("");

    try {
      await api.patch(
        `/payments/admin/free-links/${link.id}`,
        {
          active: !link.active,
        }
      );

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Não foi possível alterar o status do Link Livre."
      );
    }
  };

  const deleteFreeLink = async (link) => {
    const confirmed = window.confirm(
      `Excluir o Link Livre "${link.title}"?`
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/payments/admin/free-links/${link.id}`
      );

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Não foi possível excluir o Link Livre."
      );
    }
  };

  const sendWhatsApp = (payment) => {
    if (!payment?.checkout_url) return;

    const text = [
      "Olá!",
      "",
      `Segue seu link de pagamento do Portabilidade PRO.`,
      "",
      `Valor: ${money(payment.amount)}`,
      payment.package_name
        ? `Pacote: ${payment.package_name}`
        : null,
      payment.external_reference
        ? `Referência: ${payment.external_reference}`
        : null,
      "",
      payment.checkout_url,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6 lg:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                <Icons.Wallet size={26} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                  Financeiro
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Mercado Pago • cobranças e pagamentos
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)]"
          >
            <PremiumActionIcon type="refresh" />
            Atualizar
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Valor recebido"
            value={money(stats.valor_recebido)}
            subtitle={`${stats.pagamentos_aprovados || 0} pagamentos aprovados`}
            icon={Icons.Banknote}
          />

          <StatCard
            title="Valor pendente"
            value={money(stats.valor_pendente)}
            subtitle={`${stats.cobrancas_pendentes || 0} cobranças aguardando`}
            icon={Icons.Wallet}
          />

          <StatCard
            title="Total de cobranças"
            value={stats.total_cobrancas || 0}
            subtitle="Links registrados"
            icon={Icons.Receipt}
          />

          <StatCard
            title="Ticket médio"
            value={money(stats.ticket_medio)}
            subtitle="Pagamentos aprovados"
            icon={Icons.CreditCard}
          />
        </div>



        <CardSaleFinancePanel
          sales={cardSalesFinance}
          stats={cardSalesFinanceStats}
          onRefresh={loadData}
        />

        <PaymentManagementPanel
          payments={payments}
          cardSalesFinance={cardSalesFinance}
          stats={stats}
          onRefresh={loadData}
        />

        <div className="mb-6">
          <div className="mb-4 flex justify-end">
            <a
              href="/calculadora-taxas"
              data-calculator-popup="true"

              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-h-11 items-center gap-2 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-2.5 text-sm font-black text-blue-700 shadow-[0_7px_20px_rgba(37,99,235,0.09)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_12px_28px_rgba(37,99,235,0.16)]"
            >
              Abrir Calculadora do Vendedor
              <span aria-hidden="true">
                ↗
              </span>
            </a>
          </div>

          <MercadoPagoFeeSimulator />
        </div>


        <div className="mb-6 overflow-hidden rounded-3xl border border-violet-200/80 bg-white shadow-[0_16px_42px_rgba(109,40,217,0.08)]">
          <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <Icons.Wallet size={20} />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Links Livres
                    </h2>

                    <p className="text-sm text-slate-500">
                      Crie um link sem valor definido. O cliente informa
                      o valor antes de acessar o Mercado Pago.
                    </p>
                  </div>
                </div>
              </div>

              <span className="w-fit rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                {freeLinks.length} link{freeLinks.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="grid gap-6 p-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div>
                <h3 className="font-bold text-slate-900">
                  Novo Link Livre
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  O valor será informado pelo cliente.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Título
                </label>

                <input
                  value={freeLinkForm.title}
                  onChange={(event) =>
                    setFreeLinkForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Pagamento Portabilidade PRO"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Descrição
                </label>

                <input
                  value={freeLinkForm.description}
                  onChange={(event) =>
                    setFreeLinkForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Ex.: Pagamento de serviços"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Pacote
                </label>

                <input
                  value={freeLinkForm.package_name}
                  onChange={(event) =>
                    setFreeLinkForm((current) => ({
                      ...current,
                      package_name: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Consultas
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={freeLinkForm.consultation_quantity}
                    onChange={(event) =>
                      setFreeLinkForm((current) => ({
                        ...current,
                        consultation_quantity:
                          event.target.value,
                      }))
                    }
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Validade
                  </label>

                  <select
                    value={freeLinkForm.expiration_days}
                    onChange={(event) =>
                      setFreeLinkForm((current) => ({
                        ...current,
                        expiration_days:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none"
                  >
                    <option value="7">7 dias</option>
                    <option value="15">15 dias</option>
                    <option value="30">30 dias</option>
                    <option value="60">60 dias</option>
                    <option value="90">90 dias</option>
                    <option value="180">180 dias</option>
                    <option value="365">1 ano</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-violet-100 bg-white p-3">
                <p className="mb-3 text-sm font-bold text-slate-800">
                  Parcelamento
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Máximo
                    </label>

                    <select
                      value={freeLinkForm.max_installments}
                      onChange={(event) =>
                        setFreeLinkForm((current) => ({
                          ...current,
                          max_installments:
                            event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      {Array.from(
                        { length: 12 },
                        (_, index) => index + 1
                      ).map((number) => (
                        <option key={number} value={number}>
                          Até {number}x
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Sugerida
                    </label>

                    <select
                      value={freeLinkForm.default_installments}
                      onChange={(event) =>
                        setFreeLinkForm((current) => ({
                          ...current,
                          default_installments:
                            event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">Automático</option>

                      {Array.from(
                        {
                          length:
                            Number(
                              freeLinkForm.max_installments
                            ) || 12,
                        },
                        (_, index) => index + 1
                      ).map((number) => (
                        <option key={number} value={number}>
                          {number}x
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFreeLinkForm((current) => ({
                        ...current,
                        installment_mode: "customer",
                      }))
                    }
                    className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                      freeLinkForm.installment_mode ===
                      "customer"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    Cliente
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFreeLinkForm((current) => ({
                        ...current,
                        installment_mode: "seller",
                      }))
                    }
                    className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                      freeLinkForm.installment_mode ===
                      "seller"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    Vendedor
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={createFreeLink}
                disabled={creatingFreeLink}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-4 py-3 font-black text-white shadow-[0_10px_24px_rgba(109,40,217,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(109,40,217,0.32)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icons.Wallet size={19} />

                {creatingFreeLink
                  ? "Criando..."
                  : "Criar Link Livre"}
              </button>
            </div>

            <div className="min-w-0">
              <div className="mb-4">
                <h3 className="font-bold text-slate-900">
                  Links disponíveis
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Compartilhe o link para o cliente informar
                  o valor e realizar o pagamento.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Link</th>
                      <th className="px-4 py-3">
                        Parcelamento
                      </th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {freeLinks.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
                          Nenhum Link Livre criado.
                        </td>
                      </tr>
                    ) : (
                      freeLinks.map((link) => (
                        <tr
                          key={link.id}
                          className="border-b border-slate-100 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-violet-50/40"
                        >
                          <td className="px-4 py-4">
                            <p className="font-bold text-slate-900">
                              {link.title}
                            </p>

                            <p className="mt-1 max-w-[280px] truncate text-xs text-slate-500">
                              {link.url}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            Até {link.max_installments || 12}x
                            <p className="text-xs text-slate-400">
                              {link.installment_mode ===
                              "seller"
                                ? "Vendedor"
                                : "Cliente"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                link.active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {link.active
                                ? "Ativo"
                                : "Inativo"}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="grid min-w-[300px] grid-cols-2 gap-2.5 [&>button]:inline-flex [&>button]:min-h-11 [&>button]:w-full [&>button]:items-center [&>button]:justify-center [&>button]:gap-2 [&>button]:whitespace-nowrap [&>button]:rounded-xl [&>button]:font-black [&>button]:shadow-sm [&>button]:transition-all [&>button]:duration-200 [&>button:hover]:-translate-y-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  startEditFreeLink(link)
                                }
                                className="group inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-gradient-to-b from-white to-blue-50 px-3.5 py-2 text-xs font-black text-blue-700 shadow-[0_4px_12px_rgba(37,99,235,0.08)] transition-all duration-200 hover:border-blue-300 hover:shadow-[0_8px_18px_rgba(37,99,235,0.16)]"
                              >
                                <PremiumActionIcon type="edit" />
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  copyLink(link.url)
                                }
                                className={`group inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-black shadow-sm transition-all duration-200 ${
                                  copiedLink === link.url
                                    ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                                    : "border-violet-200 text-violet-700 hover:bg-violet-50"
                                }`}
                              >
                                <PremiumActionIcon type="copy" />
                                {copiedLink === link.url
                                  ? "✓ Copiado"
                                  : "Copiar"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  window.open(
                                    link.url,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                                className="group inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-gradient-to-b from-white to-blue-50 px-3.5 py-2 text-xs font-black text-blue-700 shadow-[0_4px_12px_rgba(37,99,235,0.08)] transition-all duration-200 hover:border-blue-300 hover:shadow-[0_8px_18px_rgba(37,99,235,0.16)]"
                              >
                                <PremiumActionIcon type="open" />
                                Abrir
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleFreeLink(link)
                                }
                                className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                                  link.active
                                    ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                }`}
                              >
                                {link.active
                                  ? "Desativar"
                                  : "Ativar"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteFreeLink(link)
                                }
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.07)]">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-bold text-slate-900">
                Nova cobrança
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Gere um link com qualquer valor.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-5"
            >
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Cliente *
                </label>

                <input
                  name="customer_name"
                  value={form.customer_name}
                  onChange={handleChange}
                  placeholder="Nome do cliente ou empresa"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  E-mail
                </label>

                <input
                  type="email"
                  name="customer_email"
                  value={form.customer_email}
                  onChange={handleChange}
                  placeholder="cliente@email.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    CPF/CNPJ
                  </label>

                  <input
                    name="customer_document"
                    value={form.customer_document}
                    onChange={handleChange}
                    placeholder="CPF ou CNPJ"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Telefone
                  </label>

                  <input
                    name="customer_phone"
                    value={form.customer_phone}
                    onChange={handleChange}
                    placeholder="DDD + número"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Pacote
                </label>

                <input
                  name="package_name"
                  value={form.package_name}
                  onChange={handleChange}
                  placeholder="Ex.: Pacote 1.000 consultas"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Consultas
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="consultation_quantity"
                    value={form.consultation_quantity}
                    onChange={handleChange}
                    placeholder="1000"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Validade
                  </label>

                  <select
                    name="expiration_days"
                    value={form.expiration_days}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value={1}>1 dia</option>
                    <option value={3}>3 dias</option>
                    <option value={7}>7 dias</option>
                    <option value={15}>15 dias</option>
                    <option value={30}>30 dias</option>
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Parcelamento
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Configure quantas parcelas o Checkout Pro poderá oferecer.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Máximo de parcelas
                    </label>

                    <select
                      name="max_installments"
                      value={form.max_installments}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none"
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map(
                        (number) => (
                          <option key={number} value={number}>
                            Até {number}x
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Parcela sugerida
                    </label>

                    <select
                      name="default_installments"
                      value={form.default_installments}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none"
                    >
                      <option value="">Automático</option>
                      {Array.from(
                        { length: Number(form.max_installments) || 12 },
                        (_, index) => index + 1
                      ).map((number) => (
                        <option key={number} value={number}>
                          {number}x
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Regra de parcelamento
                  </label>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className={`cursor-pointer rounded-xl border p-3 transition ${
                      form.installment_mode === "customer"
                        ? "border-blue-500 bg-white ring-2 ring-blue-100"
                        : "border-slate-200 bg-white"
                    }`}>
                      <input
                        type="radio"
                        name="installment_mode"
                        value="customer"
                        checked={form.installment_mode === "customer"}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <span className="text-sm font-bold text-slate-800">
                        Parcelado cliente
                      </span>
                      <p className="mt-1 text-xs text-slate-500">
                        O comprador poderá ver acréscimos conforme as condições do Mercado Pago.
                      </p>
                    </label>

                    <label className={`cursor-pointer rounded-xl border p-3 transition ${
                      form.installment_mode === "seller"
                        ? "border-emerald-500 bg-white ring-2 ring-emerald-100"
                        : "border-slate-200 bg-white"
                    }`}>
                      <input
                        type="radio"
                        name="installment_mode"
                        value="seller"
                        checked={form.installment_mode === "seller"}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <span className="text-sm font-bold text-slate-800">
                        Parcelado vendedor
                      </span>
                      <p className="mt-1 text-xs text-slate-500">
                        Usa a condição sem acréscimo configurada na sua conta Mercado Pago.
                      </p>
                    </label>
                  </div>

                  {form.installment_mode === "seller" && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      O custo do parcelamento vendedor é definido pelo Mercado Pago
                      na configuração da sua conta. O Portabilidade PRO não altera
                      essas taxas.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Valor da cobrança *
                </label>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                    R$
                  </span>

                  <input
                    name="amount"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="0,00"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-3.5 text-lg font-bold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Descrição
                </label>

                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Observação interna
                </label>

                <textarea
                  name="internal_note"
                  value={form.internal_note}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Opcional"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 font-black text-white shadow-[0_10px_24px_rgba(5,150,105,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(5,150,105,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icons.CreditCard size={20} />

                {creating
                  ? "Gerando cobrança..."
                  : "Gerar link de pagamento"}
              </button>
            </form>

            {success?.payment_url && (
              <div className="border-t border-emerald-100 bg-emerald-50 p-5">
                <p className="font-bold text-emerald-800">
                  Cobrança criada com sucesso!
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  {success.reference}
                </p>

                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {money(success.amount)}
                </p>

                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyLink(success.payment_url)
                    }
                    className={`rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-all ${
                      copiedLink === success.payment_url
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-slate-700"
                    }`}
                  >
                    <PremiumActionIcon type="copy" />
                    {copiedLink === success.payment_url
                      ? "✓ Copiado"
                      : "Copiar link"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        success.payment_url,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    <PremiumActionIcon type="open" />
                    Abrir Checkout
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.07)]">
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Cobranças
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Histórico de links e pagamentos
                </p>
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium outline-none"
              >
                <option value="all">Todos</option>
                <option value="approved">Pagos</option>
                <option value="pending">Pendentes</option>
                <option value="rejected">Recusados</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">Pacote</th>
                    <th className="px-5 py-3">Valor</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Criado</th>
                    <th className="px-5 py-3 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        Carregando cobranças...
                      </td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        Nenhuma cobrança encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-slate-100 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-violet-50/40"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {payment.customer_name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {payment.customer_email ||
                              payment.external_reference}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {payment.package_name || "-"}
                          </p>

                          {payment.consultation_quantity !=
                            null && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {payment.consultation_quantity} consultas
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold text-slate-900">
                          {money(payment.amount)}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={payment.status}
                          />
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {dateTime(payment.created_at)}
                        </td>

                        <td className="px-5 py-4">
                          {/* FINANCE_HISTORY_ACTIONS_V2 */}
                          <div className="grid min-w-[300px] grid-cols-2 gap-2.5 [&>button]:inline-flex [&>button]:min-h-11 [&>button]:w-full [&>button]:items-center [&>button]:justify-center [&>button]:gap-2 [&>button]:whitespace-nowrap [&>button]:rounded-xl [&>button]:font-black [&>button]:shadow-sm [&>button]:transition-all [&>button]:duration-200 [&>button:hover]:-translate-y-0.5">
                            {payment.status !== "approved" &&
                              !payment.paid_at &&
                              payment.status !== "cancelled" && (
                                <button
                                  type="button"
                                  onClick={() => startEdit(payment)}
                                  disabled={actionLoading === payment.id}
                                  className="group inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-gradient-to-b from-white to-blue-50 px-3.5 py-2 text-xs font-black text-blue-700 shadow-[0_4px_12px_rgba(37,99,235,0.08)] transition-all duration-200 hover:border-blue-300 hover:shadow-[0_8px_18px_rgba(37,99,235,0.16)] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <PremiumActionIcon type="edit" />
                                  Editar
                                </button>
                              )}

                            {payment.status !== "approved" &&
                              !payment.paid_at &&
                              payment.status !== "cancelled" && (
                                <button
                                  type="button"
                                  onClick={() => cancelPayment(payment)}
                                  disabled={actionLoading === payment.id}
                                  className="group inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-gradient-to-b from-white to-amber-50 px-3.5 py-2 text-xs font-black text-amber-700 shadow-[0_4px_12px_rgba(217,119,6,0.08)] transition-all duration-200 hover:border-amber-300 hover:shadow-[0_8px_18px_rgba(217,119,6,0.16)] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <PremiumActionIcon type="cancel" />
                                  Cancelar
                                </button>
                              )}

                            {payment.status !== "approved" &&
                              !payment.paid_at && (
                                <button
                                  type="button"
                                  onClick={() => deletePayment(payment)}
                                  disabled={actionLoading === payment.id}
                                  className="group inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-gradient-to-b from-white to-red-50 px-3.5 py-2 text-xs font-black text-red-700 shadow-[0_4px_12px_rgba(220,38,38,0.08)] transition-all duration-200 hover:border-red-300 hover:shadow-[0_8px_18px_rgba(220,38,38,0.16)] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <PremiumActionIcon type="trash" />
                                  Excluir
                                </button>
                              )}

                            {payment.checkout_url && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyLink(
                                      payment.checkout_url
                                    )
                                  }
                                  className={`group inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-black shadow-sm transition-all duration-200 ${
                                    copiedLink === payment.checkout_url
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <PremiumActionIcon type="copy" />
                                  {copiedLink === payment.checkout_url
                                    ? "✓ Copiado"
                                    : "Copiar"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    sendWhatsApp(payment)
                                  }
                                  className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                                >
                                  <PremiumActionIcon type="whatsapp" />
                                  WhatsApp
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      payment.checkout_url,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                                >
                                  <PremiumActionIcon type="open" />
                                  Abrir
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {editingFreeLink && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Editar Link Livre
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  O cliente continuará informando o valor.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditFreeLink}
                disabled={savingFreeLinkEdit}
                className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Título
                </label>

                <input
                  value={editingFreeLink.title || ""}
                  onChange={(event) =>
                    setEditingFreeLink((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Descrição
                </label>

                <input
                  value={editingFreeLink.description || ""}
                  onChange={(event) =>
                    setEditingFreeLink((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Pacote
                </label>

                <input
                  value={editingFreeLink.package_name || ""}
                  onChange={(event) =>
                    setEditingFreeLink((current) => ({
                      ...current,
                      package_name: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Consultas
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      editingFreeLink.consultation_quantity ??
                      ""
                    }
                    onChange={(event) =>
                      setEditingFreeLink((current) => ({
                        ...current,
                        consultation_quantity:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Máximo de parcelas
                  </label>

                  <select
                    value={
                      editingFreeLink.max_installments || 12
                    }
                    onChange={(event) =>
                      setEditingFreeLink((current) => ({
                        ...current,
                        max_installments:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  >
                    {Array.from(
                      { length: 12 },
                      (_, index) => index + 1
                    ).map((number) => (
                      <option key={number} value={number}>
                        Até {number}x
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Parcela sugerida
                  </label>

                  <select
                    value={
                      editingFreeLink.default_installments ??
                      ""
                    }
                    onChange={(event) =>
                      setEditingFreeLink((current) => ({
                        ...current,
                        default_installments:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <option value="">
                      Automático
                    </option>

                    {Array.from(
                      {
                        length:
                          Number(
                            editingFreeLink.max_installments
                          ) || 12,
                      },
                      (_, index) => index + 1
                    ).map((number) => (
                      <option key={number} value={number}>
                        {number}x
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Encargos
                  </label>

                  <select
                    value={
                      editingFreeLink.installment_mode ||
                      "customer"
                    }
                    onChange={(event) =>
                      setEditingFreeLink((current) => ({
                        ...current,
                        installment_mode:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <option value="customer">
                      Cliente
                    </option>
                    <option value="seller">
                      Vendedor
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Nova validade
                  </label>

                  <select
                    value={
                      editingFreeLink.expiration_days || 30
                    }
                    onChange={(event) =>
                      setEditingFreeLink((current) => ({
                        ...current,
                        expiration_days:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <option value="7">7 dias</option>
                    <option value="15">15 dias</option>
                    <option value="30">30 dias</option>
                    <option value="60">60 dias</option>
                    <option value="90">90 dias</option>
                    <option value="180">180 dias</option>
                    <option value="365">1 ano</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeEditFreeLink}
                disabled={savingFreeLinkEdit}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveFreeLinkEdit}
                disabled={savingFreeLinkEdit}
                className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {savingFreeLinkEdit
                  ? "Salvando..."
                  : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPayment && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Editar cobrança
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingPayment.external_reference}
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={savingEdit}
                className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Cliente
                  </label>

                  <input
                    name="customer_name"
                    value={editForm.customer_name}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    E-mail
                  </label>

                  <input
                    name="customer_email"
                    type="email"
                    value={editForm.customer_email}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    CPF / CNPJ
                  </label>

                  <input
                    name="customer_document"
                    value={editForm.customer_document}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    WhatsApp
                  </label>

                  <input
                    name="customer_phone"
                    value={editForm.customer_phone}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Descrição
                </label>

                <input
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Valor
                  </label>

                  <input
                    name="amount"
                    value={editForm.amount}
                    onChange={handleEditChange}
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Quantidade de consultas
                  </label>

                  <input
                    name="consultation_quantity"
                    type="number"
                    min="0"
                    value={editForm.consultation_quantity}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Validade
                  </label>

                  <select
                    name="expiration_days"
                    value={editForm.expiration_days}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="1">1 dia</option>
                    <option value="3">3 dias</option>
                    <option value="7">7 dias</option>
                    <option value="15">15 dias</option>
                    <option value="30">30 dias</option>
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900">
                    Parcelamento
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Configure novamente as condições do link.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Máximo
                    </label>

                    <select
                      name="max_installments"
                      value={editForm.max_installments}
                      onChange={handleEditChange}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      {Array.from(
                        { length: 12 },
                        (_, index) => index + 1
                      ).map((number) => (
                        <option
                          key={number}
                          value={number}
                        >
                          {number}x
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Parcela sugerida
                    </label>

                    <select
                      name="default_installments"
                      value={editForm.default_installments}
                      onChange={handleEditChange}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <option value="">
                        Cliente escolhe
                      </option>

                      {Array.from(
                        {
                          length:
                            Number(
                              editForm.max_installments
                            ) || 12,
                        },
                        (_, index) => index + 1
                      ).map((number) => (
                        <option
                          key={number}
                          value={number}
                        >
                          {number}x
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Encargos
                    </label>

                    <select
                      name="installment_mode"
                      value={editForm.installment_mode}
                      onChange={handleEditChange}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <option value="customer">
                        Cliente
                      </option>

                      <option value="seller">
                        Vendedor
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Observação interna
                </label>

                <textarea
                  name="internal_note"
                  value={editForm.internal_note}
                  onChange={handleEditChange}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeEdit}
                disabled={savingEdit}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingEdit
                  ? "Salvando..."
                  : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

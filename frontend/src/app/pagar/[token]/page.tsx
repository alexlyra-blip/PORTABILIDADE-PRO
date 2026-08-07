"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PublicPaymentPage() {
  const params = useParams();
  const token = String(params?.token || "");

  const [linkData, setLinkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    amount: "",
    customer_name: "",
    customer_email: "",
    customer_document: "",
    customer_phone: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(
          `/api/payments/free/${token}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail || "Link de pagamento inválido."
          );
        }

        setLinkData(data);
      } catch (err: any) {
        setError(
          err?.message ||
            "Não foi possível carregar este link."
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) load();
  }, [token]);

  const handleChange = (event: any) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: any) => {
    event.preventDefault();

    const amount = Number(
      String(form.amount).replace(",", ".")
    );

    if (!amount || amount < 1) {
      setError("Informe um valor válido.");
      return;
    }

    if (!form.customer_name.trim()) {
      setError("Informe seu nome.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response = await fetch(
        `/api/payments/free/${token}/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            customer_name: form.customer_name.trim(),
            customer_email:
              form.customer_email.trim() || null,
            customer_document:
              form.customer_document.trim() || null,
            customer_phone:
              form.customer_phone.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Não foi possível iniciar o pagamento."
        );
      }

      if (!data?.payment_url) {
        throw new Error(
          "O Mercado Pago não retornou o checkout."
        );
      }

      window.location.href = data.payment_url;
    } catch (err: any) {
      setError(
        err?.message ||
          "Não foi possível iniciar o pagamento."
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Carregando pagamento...
      </div>
    );
  }

  if (error && !linkData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full rounded-3xl bg-white p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-black text-slate-900">
            Link indisponível
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl bg-white shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-8 text-white">
            <p className="text-xs font-black uppercase tracking-[0.25em] opacity-70">
              Portabilidade PRO
            </p>

            <h1 className="mt-2 text-3xl font-black">
              {linkData?.title ||
                "Pagamento Online"}
            </h1>

            {linkData?.description && (
              <p className="mt-2 text-sm text-white/80">
                {linkData.description}
              </p>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 p-6"
          >
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Valor que deseja pagar
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                  R$
                </span>

                <input
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded-2xl border border-slate-200 py-4 pl-12 pr-4 text-2xl font-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Nome
              </label>

              <input
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                placeholder="Seu nome"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                E-mail
              </label>

              <input
                name="customer_email"
                value={form.customer_email}
                onChange={handleChange}
                type="email"
                placeholder="email@exemplo.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                CPF/CNPJ
              </label>

              <input
                name="customer_document"
                value={form.customer_document}
                onChange={handleChange}
                placeholder="CPF ou CNPJ"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Telefone
              </label>

              <input
                name="customer_phone"
                value={form.customer_phone}
                onChange={handleChange}
                placeholder="DDD + número"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-base font-black text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating
                ? "Abrindo Mercado Pago..."
                : "Continuar para pagamento"}
            </button>

            <p className="text-center text-xs text-slate-400">
              Pagamento processado com segurança pelo
              Mercado Pago.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

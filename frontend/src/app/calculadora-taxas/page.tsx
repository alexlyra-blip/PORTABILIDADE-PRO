"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

type Channel =
  | "checkout"
  | "payment_link"
  | "point";

type FeeChannelMeta = {
  label: string;
  maxInstallments: number;
};

type FeeMeta = Record<
  Channel,
  FeeChannelMeta
>;

const DEFAULT_FEE_META: FeeMeta = {
  checkout: {
    label: "Checkout",
    maxInstallments: 12,
  },
  payment_link: {
    label: "Link de Pagamento",
    maxInstallments: 12,
  },
  point: {
    label: "Maquininha",
    maxInstallments: 18,
  },
};

const CHANNEL_ORDER: Channel[] = [
  "point",
  "payment_link",
  "checkout",
];

type SimulationResult = {
  success: boolean;
  channel: Channel;
  channel_label: string;
  max_installments: number;
  commission_table: number;
  commission_table_label: string;
  reference_amount: number;
  installments: number;
  sale_fee_percent: number;
  installment_fee_percent: number;
  mp_total_fee_percent: number;
  sale_fee_amount: number;
  installment_fee_amount: number;
  mp_total_fee_amount: number;
  customer_total: number;
  installment_value: number;
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function percent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function parseBrazilianMoney(value: string) {
  const clean = value
    .trim()
    .replace(/\s/g, "");

  if (!clean) {
    return 0;
  }

  if (clean.includes(",")) {
    return Number(
      clean
        .replace(/\./g, "")
        .replace(",", ".")
    );
  }

  return Number(clean);
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        d="M12 3 19 6v5c0 4.65-2.84 8.72-7 10-4.16-1.28-7-5.35-7-10V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m9.3 12 1.7 1.7 3.8-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 10V7.5a4 4 0 0 1 8 0V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SellerFeeCalculatorPage() {
  const [amount, setAmount] = useState("");

  const [channel, setChannel] =
    useState<Channel>("checkout");

  const [feeMeta, setFeeMeta] =
    useState<FeeMeta>(
      DEFAULT_FEE_META
    );
  const [commissionTable, setCommissionTable] =
    useState(1);
  const [installments, setInstallments] =
    useState(12);

  const [result, setResult] =
    useState<SimulationResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const currentChannel =
    feeMeta[channel];

  /*
   * Carrega apenas metadados públicos:
   * nome do canal e limite de parcelas.
   *
   * As taxas e as comissões continuam
   * sendo calculadas exclusivamente
   * no backend.
   */
  useEffect(() => {
    const loadFeeMeta = async () => {
      try {
        const response = await fetch(
          "/api/payment-fees/public",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (!data?.fees) {
          return;
        }

        setFeeMeta((current) => ({
          checkout: {
            label:
              data.fees.checkout?.label ||
              current.checkout.label,
            maxInstallments:
              Number(
                data.fees.checkout
                  ?.maxInstallments
              ) ||
              current.checkout
                .maxInstallments,
          },

          payment_link: {
            label:
              data.fees.payment_link
                ?.label ||
              current.payment_link.label,
            maxInstallments:
              Number(
                data.fees.payment_link
                  ?.maxInstallments
              ) ||
              current.payment_link
                .maxInstallments,
          },

          point: {
            label:
              data.fees.point?.label ||
              current.point.label,
            maxInstallments:
              Number(
                data.fees.point
                  ?.maxInstallments
              ) ||
              current.point
                .maxInstallments,
          },
        }));
      } catch (err) {
        console.error(
          "Erro ao carregar configuração "
          + "das taxas:",
          err
        );
      }
    };

    loadFeeMeta();
  }, []);

  /*
   * Se mudar para um canal com limite
   * menor de parcelas, ajusta
   * automaticamente.
   */
  useEffect(() => {
    if (
      installments >
      currentChannel.maxInstallments
    ) {
      setInstallments(
        currentChannel.maxInstallments
      );
    }

    setResult(null);
    setCopied(false);
  }, [
    channel,
    currentChannel.maxInstallments,
  ]);

  const simulate = async (
    event?: FormEvent
  ) => {
    event?.preventDefault();

    const numericAmount =
      parseBrazilianMoney(amount);

    if (
      !numericAmount ||
      numericAmount <= 0
    ) {
      setError(
        "Informe um valor válido para a proposta."
      );
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setCopied(false);

    try {
      const response = await fetch(
        "/api/seller-calculator/simulate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            amount: numericAmount,
            commission_table:
              commissionTable,
            installments,
            channel,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Não foi possível realizar a simulação."
        );
      }

      setResult(data);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Não foi possível realizar a simulação."
      );

      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const copySimulation = async () => {
    if (!result) {
      return;
    }

    const parcelText =
      result.installments === 1
        ? `À vista: ${money(
            result.customer_total
          )}`
        : (
            `${result.installments}x de ` +
            `aprox. ${money(
              result.installment_value
            )}`
          );

    const message = [
      "💳 Simulação de Pagamento",
      "",
      `Forma: ${result.channel_label}`,
      `Valor total: ${money(
        result.customer_total
      )}`,
      `Parcelamento: ${parcelText}`,
      "",
      "Valores calculados conforme as "
      + "taxas vigentes da forma de "
      + "pagamento selecionada.",
      "",
      "🔒 Pagamento processado com "
      + "segurança pelo Mercado Pago.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(
        message
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2200);
    } catch {
      setError(
        "Não foi possível copiar a simulação."
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7">
          <div className="flex items-center gap-3 text-blue-400">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10">
              <ShieldIcon />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em]">
                Portabilidade PRO
              </p>

              <p className="text-xs text-slate-500">
                Ferramenta comercial
              </p>
            </div>
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Calculadora de Pagamento
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Calcule o valor final e o
            parcelamento para apresentar ao
            cliente.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form
            onSubmit={simulate}
            className="rounded-[28px] border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-7"
          >
            <div>
              <p className="mb-3 text-sm font-bold text-slate-300">
                Forma de pagamento
              </p>

              <div className="grid grid-cols-3 gap-2">
                {CHANNEL_ORDER.map(
                  (option) => {
                    const active =
                      channel === option;

                    const label =
                      feeMeta[option].label;

                    return (
                      <button
                        type="button"
                        key={option}
                        onClick={() => {
                          setChannel(option);
                          setError("");
                        }}
                        className={
                          active
                            ? "rounded-2xl border border-blue-400 bg-blue-500 px-2 py-4 text-center text-xs font-black text-white shadow-lg shadow-blue-500/20 sm:text-sm"
                            : "rounded-2xl border border-slate-700 bg-slate-950 px-2 py-4 text-center text-xs font-bold text-slate-400 transition hover:border-slate-600 hover:text-white sm:text-sm"
                        }
                      >
                        {label}
                      </button>
                    );
                  }
                )}
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Taxas sincronizadas com as
                configurações do Financeiro.
              </p>
            </div>

            <div className="mt-7">
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Valor da proposta
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-500">
                  R$
                </span>

                <input
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value
                    )
                  }
                  inputMode="decimal"
                  placeholder="1.000,00"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-4 pl-12 pr-4 text-2xl font-black text-white outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="mt-7">
              <p className="mb-3 text-sm font-bold text-slate-300">
                Tabela
              </p>

              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(
                  (table) => {
                    const active =
                      commissionTable ===
                      table;

                    return (
                      <button
                        type="button"
                        key={table}
                        onClick={() =>
                          setCommissionTable(
                            table
                          )
                        }
                        className={
                          active
                            ? "rounded-2xl border border-blue-400 bg-blue-500 px-3 py-4 text-center text-sm font-black text-white shadow-lg shadow-blue-500/20"
                            : "rounded-2xl border border-slate-700 bg-slate-950 px-3 py-4 text-center text-sm font-bold text-slate-400 transition hover:border-slate-600 hover:text-white"
                        }
                      >
                        Tabela {table}
                      </button>
                    );
                  }
                )}
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Selecione a tabela comercial
                correspondente.
              </p>
            </div>

            <div className="mt-7">
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Parcelamento
              </label>

              <select
                value={installments}
                onChange={(event) =>
                  setInstallments(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 font-bold text-white outline-none transition focus:border-blue-500"
              >
                {Array.from(
                  {
                    length:
                      currentChannel
                        .maxInstallments,
                  },
                  (_, index) =>
                    index + 1
                ).map((value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value === 1
                      ? "1x - à vista"
                      : `${value}x`}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-2xl bg-blue-600 px-5 py-4 text-base font-black text-white shadow-xl shadow-blue-950/50 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Calculando..."
                : "Calcular pagamento"}
            </button>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
              <LockIcon />
              Cálculo seguro Portabilidade PRO
            </div>
          </form>

          <section className="overflow-hidden rounded-[28px] bg-white shadow-2xl">
            {!result ? (
              <div className="flex min-h-[560px] flex-col items-center justify-center p-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                  <ShieldIcon />
                </div>

                <h2 className="mt-5 text-2xl font-black text-slate-900">
                  Sua simulação aparecerá aqui
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Escolha a forma de pagamento,
                  informe o valor, selecione a
                  tabela e o número de parcelas
                  para visualizar as condições
                  para o cliente.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white sm:p-8">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-blue-100">
                    <ShieldIcon />
                    Resultado da simulação
                  </div>

                  <div className="mt-6 inline-flex rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-50">
                    {result.channel_label}
                  </div>

                  <p className="mt-4 text-sm font-bold text-blue-100">
                    Valor para o cliente
                  </p>

                  <p className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">
                    {money(
                      result.customer_total
                    )}
                  </p>

                  <div className="mt-5 inline-flex rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                    <span className="font-black">
                      {result.installments ===
                      1
                        ? "Pagamento à vista"
                        : (
                            `${result.installments}x de aprox. ` +
                            money(
                              result.installment_value
                            )
                          )}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Taxa de venda
                      </p>

                      <p className="mt-2 text-xl font-black text-slate-900">
                        {percent(
                          result.sale_fee_percent
                        )}
                        %
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Parcelamento
                      </p>

                      <p className="mt-2 text-xl font-black text-slate-900">
                        {percent(
                          result.installment_fee_percent
                        )}
                        %
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Taxa total MP
                      </p>

                      <p className="mt-2 text-xl font-black text-blue-700">
                        {percent(
                          result.mp_total_fee_percent
                        )}
                        %
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-500">
                        Forma de pagamento
                      </span>

                      <span className="font-black text-slate-900">
                        {result.channel_label}
                      </span>
                    </div>

                    <div className="my-4 border-t border-dashed border-slate-200" />

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-500">
                        Valor da proposta
                      </span>

                      <span className="font-black text-slate-900">
                        {money(
                          result.reference_amount
                        )}
                      </span>
                    </div>

                    <div className="my-4 border-t border-dashed border-slate-200" />

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-500">
                        Tabela selecionada
                      </span>

                      <span className="font-black text-slate-900">
                        {
                          result.commission_table_label
                        }
                      </span>
                    </div>

                    <div className="my-4 border-t border-dashed border-slate-200" />

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-500">
                        Parcelamento
                      </span>

                      <span className="font-black text-slate-900">
                        {
                          result.installments
                        }
                        x
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex gap-3">
                      <div className="mt-0.5 text-emerald-600">
                        <ShieldIcon />
                      </div>

                      <div>
                        <p className="font-black text-emerald-900">
                          Pagamento protegido
                        </p>

                        <p className="mt-1 text-sm leading-6 text-emerald-700">
                          A condição foi calculada
                          conforme a forma de pagamento
                          selecionada e as taxas atuais
                          configuradas no Financeiro,
                          com processamento pelo
                          Mercado Pago.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={copySimulation}
                    className={
                      copied
                        ? "mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-4 font-black text-white shadow-lg transition"
                        : "mt-6 w-full rounded-2xl bg-slate-900 px-5 py-4 font-black text-white shadow-lg transition hover:bg-slate-800"
                    }
                  >
                    {copied
                      ? "✓ Simulação copiada"
                      : "Copiar simulação"}
                  </button>

                  <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                    O valor da parcela é uma
                    estimativa. A condição final é
                    exibida no momento do
                    pagamento.
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

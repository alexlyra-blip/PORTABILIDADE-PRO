"use client";

import { useEffect, useMemo, useState } from "react";

type Channel = "checkout" | "payment_link" | "point";
type SimulationType = "charge" | "receive";
type InstallmentMode = "seller" | "customer";

type FeeChannel = {
  label: string;
  saleFee: number;
  maxInstallments: number;
  installments: Record<number, number>;
};

type FeeConfig = Record<Channel, FeeChannel>;

const STORAGE_KEY = "portabilidade-pro-mp-fees-v1";

const DEFAULT_FEES: FeeConfig = {
  checkout: {
    label: "Checkout",
    saleFee: 2.99,
    maxInstallments: 12,
    installments: {
      1: 0,
      2: 2.27,
      3: 2.85,
      4: 3.47,
      5: 4.06,
      6: 4.64,
      7: 4.78,
      8: 5.40,
      9: 6.02,
      10: 6.47,
      11: 7.09,
      12: 7.72,
    },
  },

  payment_link: {
    label: "Link de Pagamento",
    saleFee: 2.99,
    maxInstallments: 12,
    installments: {
      1: 0,
      2: 2.12,
      3: 3.02,
      4: 3.76,
      5: 4.55,
      6: 5.23,
      7: 6.21,
      8: 6.90,
      9: 7.52,
      10: 8.18,
      11: 8.82,
      12: 9.49,
    },
  },

  point: {
    label: "Maquininha",
    saleFee: 2.99,
    maxInstallments: 18,
    installments: {
      1: 0,
      2: 5.39,
      3: 6.49,
      4: 7.26,
      5: 8.04,
      6: 8.79,
      7: 9.73,
      8: 10.53,
      9: 10.98,
      10: 11.19,
      11: 11.94,
      12: 12.59,
      13: 13.45,
      14: 14.39,
      15: 15.40,
      16: 16.51,
      17: 17.70,
      18: 19.00,
    },
  },
};

const cloneDefaults = (): FeeConfig =>
  JSON.parse(JSON.stringify(DEFAULT_FEES));

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);

const percent = (value: number) =>
  `${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;

const parseMoney = (value: string) => {
  const clean = String(value || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const result = Number(clean);

  return Number.isFinite(result) ? result : 0;
};

export default function MercadoPagoFeeSimulator() {
  const [simulationType, setSimulationType] =
    useState<SimulationType>("receive");

  const [channel, setChannel] =
    useState<Channel>("point");

  const [installmentMode, setInstallmentMode] =
    useState<InstallmentMode>("seller");

  const [installments, setInstallments] = useState(12);
  const [amount, setAmount] = useState("1.000,00");

  const [fees, setFees] =
    useState<FeeConfig>(cloneDefaults());

  const [showSettings, setShowSettings] =
    useState(false);

  const [showDetails, setShowDetails] =
    useState(true);

  useEffect(() => {
    const loadFees = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          "/api/payment-fees/admin",
          {
            cache: "no-store",
            headers: {
              ...(token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
                : {}),
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              "Não foi possível carregar as taxas."
          );
        }

        if (data?.fees) {
          setFees(data.fees);
        }
      } catch (error) {
        console.error(
          "Erro ao carregar taxas do Mercado Pago:",
          error
        );

        /*
         * Em caso de indisponibilidade da API,
         * mantém os defaults apenas como fallback
         * visual. A fonte oficial continua sendo
         * o backend.
         */
        setFees(cloneDefaults());
      }
    };

    loadFees();
  }, []);

  const current = fees[channel];

  useEffect(() => {
    if (installments > current.maxInstallments) {
      setInstallments(current.maxInstallments);
    }
  }, [
    channel,
    current.maxInstallments,
    installments,
  ]);

  const simulation = useMemo(() => {
    const inputValue = parseMoney(amount);

    const saleFeePercent =
      Number(current.saleFee || 0);

    const installmentFeePercent =
      Number(
        current.installments[installments] || 0
      );

    /*
     * PARCELADO VENDEDOR
     * A taxa da venda + taxa do parcelamento
     * são descontadas do vendedor.
     *
     * PARCELADO CLIENTE
     * A taxa de venda permanece como custo do
     * vendedor e o parcelamento é repassado
     * ao cliente como estimativa.
     */

    if (installmentMode === "seller") {
      const totalFeePercent =
        saleFeePercent + installmentFeePercent;

      const totalFeeDecimal =
        totalFeePercent / 100;

      let grossAmount = 0;
      let netAmount = 0;

      if (simulationType === "receive") {
        netAmount = inputValue;

        grossAmount =
          totalFeeDecimal < 1
            ? inputValue / (1 - totalFeeDecimal)
            : 0;
      } else {
        grossAmount = inputValue;

        netAmount =
          grossAmount * (1 - totalFeeDecimal);
      }

      const saleFeeAmount =
        grossAmount * (saleFeePercent / 100);

      const installmentFeeAmount =
        grossAmount *
        (installmentFeePercent / 100);

      const totalFees =
        saleFeeAmount + installmentFeeAmount;

      const customerTotal = grossAmount;

      const installmentValue =
        installments > 0
          ? customerTotal / installments
          : customerTotal;

      return {
        inputValue,
        grossAmount,
        netAmount,
        customerTotal,
        installmentValue,
        saleFeePercent,
        saleFeeAmount,
        installmentFeePercent,
        installmentFeeAmount,
        totalFeePercent,
        totalFees,
      };
    }

    /*
     * Parcelado cliente:
     * usamos a taxa configurada como acréscimo
     * estimado ao comprador.
     *
     * O simulador identifica esse resultado
     * como estimativa porque a condição final
     * é determinada pelo Mercado Pago.
     */

    const saleFeeDecimal =
      saleFeePercent / 100;

    let baseAmount = 0;
    let netAmount = 0;

    if (simulationType === "receive") {
      netAmount = inputValue;

      baseAmount =
        saleFeeDecimal < 1
          ? inputValue / (1 - saleFeeDecimal)
          : 0;
    } else {
      baseAmount = inputValue;

      netAmount =
        baseAmount * (1 - saleFeeDecimal);
    }

    const saleFeeAmount =
      baseAmount * saleFeeDecimal;

    const customerTotal =
      baseAmount *
      (1 + installmentFeePercent / 100);

    const installmentFeeAmount =
      customerTotal - baseAmount;

    const installmentValue =
      installments > 0
        ? customerTotal / installments
        : customerTotal;

    return {
      inputValue,
      grossAmount: baseAmount,
      netAmount,
      customerTotal,
      installmentValue,
      saleFeePercent,
      saleFeeAmount,
      installmentFeePercent,
      installmentFeeAmount,
      totalFeePercent:
        saleFeePercent + installmentFeePercent,
      totalFees:
        saleFeeAmount + installmentFeeAmount,
    };
  }, [
    amount,
    channel,
    current,
    installmentMode,
    installments,
    simulationType,
  ]);

  const saveFees = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "/api/payment-fees/admin",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },
          body: JSON.stringify({
            fees,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Não foi possível salvar as taxas."
        );
      }

      if (data?.fees) {
        setFees(data.fees);
      }

      /*
       * Remove a configuração antiga local.
       * A fonte oficial agora é o backend.
       */
      localStorage.removeItem(STORAGE_KEY);

      setShowSettings(false);

      window.dispatchEvent(
        new CustomEvent(
          "mercado-pago-fees-updated",
          {
            detail: data,
          }
        )
      );
    } catch (error) {
      console.error(
        "Erro ao salvar taxas do Mercado Pago:",
        error
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar as taxas."
      );
    }
  };

  const restoreDefaults = () => {
    /*
     * Apenas restaura os valores na tela.
     * Para persistir no banco, o administrador
     * confirma em "Salvar taxas".
     */
    setFees(cloneDefaults());
  };

  const updateSaleFee = (
    targetChannel: Channel,
    value: string
  ) => {
    const numeric = Number(
      String(value).replace(",", ".")
    );

    setFees((currentFees) => ({
      ...currentFees,
      [targetChannel]: {
        ...currentFees[targetChannel],
        saleFee:
          Number.isFinite(numeric) ? numeric : 0,
      },
    }));
  };

  const updateInstallmentFee = (
    targetChannel: Channel,
    installment: number,
    value: string
  ) => {
    const numeric = Number(
      String(value).replace(",", ".")
    );

    setFees((currentFees) => ({
      ...currentFees,
      [targetChannel]: {
        ...currentFees[targetChannel],

        installments: {
          ...currentFees[targetChannel]
            .installments,

          [installment]:
            Number.isFinite(numeric)
              ? numeric
              : 0,
        },
      },
    }));
  };

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-violet-950 px-5 py-5 text-white sm:px-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-100">
                  Financeiro PRO
                </span>
              </div>

              <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                Simulador Mercado Pago
              </h2>

              <p className="mt-1 max-w-2xl text-sm text-slate-300">
                Simule taxas, parcelamentos e o
                valor líquido antes de gerar a
                cobrança.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowSettings(true)
              }
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
            >
              ⚙ Configurar taxas
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="mb-6 inline-flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() =>
                setSimulationType("charge")
              }
              className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                simulationType === "charge"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Para cobrar
            </button>

            <button
              type="button"
              onClick={() =>
                setSimulationType("receive")
              }
              className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                simulationType === "receive"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Para receber
            </button>
          </div>

          <div className="grid gap-7 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  {simulationType === "receive"
                    ? "Quanto você quer receber?"
                    : "Quanto você quer cobrar?"}
                </label>

                <div className="flex items-center rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 focus-within:border-violet-500">
                  <span className="mr-3 text-lg font-black text-slate-400">
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
                    className="min-w-0 flex-1 bg-transparent text-2xl font-black text-slate-950 outline-none"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Meio de cobrança
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    Object.keys(
                      fees
                    ) as Channel[]
                  ).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setChannel(item)
                      }
                      className={`rounded-xl border px-3 py-3 text-xs font-bold transition sm:text-sm ${
                        channel === item
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {fees[item].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Parcelas
                </label>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-2">
                  <button
                    type="button"
                    onClick={() =>
                      setInstallments((value) =>
                        Math.max(1, value - 1)
                      )
                    }
                    className="h-11 w-11 rounded-xl bg-slate-100 text-xl font-black text-slate-700 hover:bg-slate-200"
                  >
                    −
                  </button>

                  <div className="text-center">
                    <div className="text-2xl font-black text-slate-950">
                      {installments}x
                    </div>

                    <div className="text-xs text-slate-400">
                      até {current.maxInstallments}x
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setInstallments((value) =>
                        Math.min(
                          current.maxInstallments,
                          value + 1
                        )
                      )
                    }
                    className="h-11 w-11 rounded-xl bg-slate-100 text-xl font-black text-slate-700 hover:bg-slate-200"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Tipo de parcelamento
                </label>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      setInstallmentMode("seller")
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      installmentMode ===
                      "seller"
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="font-bold text-slate-900">
                      Parcelado vendedor
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Taxa da venda + parcelamento
                      descontados de você.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setInstallmentMode(
                        "customer"
                      )
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      installmentMode ===
                      "customer"
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="font-bold text-slate-900">
                      Parcelado cliente
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Parcelamento repassado ao
                      cliente.
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Resumo da simulação
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    {current.label} ·{" "}
                    {installments}x
                  </p>
                </div>

                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                  {installmentMode === "seller"
                    ? "Vendedor"
                    : "Cliente"}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs text-slate-400">
                    {simulationType ===
                    "receive"
                      ? "Valor desejado"
                      : "Valor informado"}
                  </p>

                  <p className="mt-1 text-lg font-black">
                    {brl(
                      simulation.inputValue
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs text-slate-400">
                    Taxa total
                  </p>

                  <p className="mt-1 text-lg font-black text-amber-300">
                    {percent(
                      simulation.totalFeePercent
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {brl(
                      simulation.totalFees
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowDetails(
                    (value) => !value
                  )
                }
                className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-left text-sm font-bold text-slate-200"
              >
                <span>Detalhes das taxas</span>

                <span>
                  {showDetails ? "−" : "+"}
                </span>
              </button>

              {showDetails && (
                <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-slate-300">
                        Taxa por venda
                      </span>

                      <span className="ml-2 text-xs font-bold text-slate-500">
                        {percent(
                          simulation.saleFeePercent
                        )}
                      </span>
                    </div>

                    <strong>
                      {brl(
                        simulation.saleFeeAmount
                      )}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-slate-300">
                        Taxa de parcelamento
                      </span>

                      <span className="ml-2 text-xs font-bold text-slate-500">
                        {percent(
                          simulation.installmentFeePercent
                        )}
                      </span>
                    </div>

                    <strong>
                      {brl(
                        simulation.installmentFeeAmount
                      )}
                    </strong>
                  </div>

                  <div className="border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-300">
                        Total das taxas
                      </span>

                      <strong className="text-rose-300">
                        {brl(
                          simulation.totalFees
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-2xl bg-emerald-400 p-5 text-slate-950">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-900/70">
                  Você recebe
                </p>

                <p className="mt-1 text-3xl font-black">
                  {brl(simulation.netAmount)}
                </p>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-blue-500/15 p-4">
                  <p className="text-xs font-bold uppercase text-blue-300">
                    Cliente paga
                  </p>

                  <p className="mt-2 text-xl font-black text-blue-100">
                    {installments}x de{" "}
                    {brl(
                      simulation.installmentValue
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-violet-500/15 p-4">
                  <p className="text-xs font-bold uppercase text-violet-300">
                    Valor total
                  </p>

                  <p className="mt-2 text-xl font-black text-violet-100">
                    {brl(
                      simulation.customerTotal
                    )}
                  </p>
                </div>
              </div>

              {installmentMode === "customer" && (
                <p className="mt-4 text-xs leading-relaxed text-slate-400">
                  No parcelado cliente, o valor
                  apresentado é uma estimativa.
                  O valor final do financiamento
                  é definido pelo Mercado Pago no
                  checkout.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MP_SETTINGS_FRONT_LAYER_V2 */}
      {showSettings && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Configurar taxas
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Atualize os percentuais sem
                  alterar o código.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowSettings(false)
                }
                className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-6">
              {(
                Object.keys(fees) as Channel[]
              ).map((item) => {
                const fee = fees[item];

                return (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                      <div>
                        <h3 className="font-black text-slate-900">
                          {fee.label}
                        </h3>

                        <p className="text-xs text-slate-500">
                          Até{" "}
                          {fee.maxInstallments}x
                        </p>
                      </div>

                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-slate-500">
                          Taxa por venda
                        </span>

                        <div className="flex items-center rounded-xl border border-slate-200 px-3">
                          <input
                            value={fee.saleFee}
                            onChange={(event) =>
                              updateSaleFee(
                                item,
                                event.target.value
                              )
                            }
                            className="w-20 py-2.5 text-right font-bold outline-none"
                          />

                          <span className="ml-1 text-slate-400">
                            %
                          </span>
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                      {Array.from(
                        {
                          length:
                            fee.maxInstallments,
                        },
                        (_, index) => index + 1
                      ).map((number) => (
                        <label
                          key={number}
                          className="rounded-xl bg-slate-50 p-3"
                        >
                          <span className="mb-1 block text-xs font-bold text-slate-500">
                            {number}x
                          </span>

                          <div className="flex items-center">
                            <input
                              value={
                                fee.installments[
                                  number
                                ] ?? 0
                              }
                              onChange={(event) =>
                                updateInstallmentFee(
                                  item,
                                  number,
                                  event.target
                                    .value
                                )
                              }
                              className="min-w-0 flex-1 bg-transparent font-bold text-slate-900 outline-none"
                            />

                            <span className="text-xs text-slate-400">
                              %
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={restoreDefaults}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600"
              >
                Restaurar taxas padrão
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowSettings(false)
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={saveFees}
                  className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white"
                >
                  Salvar taxas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

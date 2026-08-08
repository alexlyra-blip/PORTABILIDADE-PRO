"use client";

import {
  CardPayment,
  initMercadoPago,
} from "@mercadopago/sdk-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useParams } from "next/navigation";


function money(value: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value || 0);
}


function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path
        d="M12 3 19 6v5c0 4.7-2.8 8.7-7 10-4.2-1.3-7-5.3-7-10V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <path
        d="m9 12 2 2 4-5"
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
      className="h-6 w-6"
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

      <path
        d="M12 14v2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}


export default function PaymentPage() {
  const params = useParams();

  const reference = String(
    params?.reference || ""
  );

  const initializedRef = useRef(false);

  const [payment, setPayment] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [sdkReady, setSdkReady] =
    useState(false);

  const [brickReady, setBrickReady] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState<any>(null);


  useEffect(() => {
    const load = async () => {
      try {
        setError("");

        const [
          paymentResponse,
          configResponse,
        ] = await Promise.all([
          fetch(
            `/api/payment-orders/public/${reference}`,
            {
              cache: "no-store",
            }
          ),

          fetch(
            "/mercado-pago-config",
            {
              cache: "no-store",
            }
          ),
        ]);

        const paymentData =
          await paymentResponse.json();

        const configData =
          await configResponse.json();

        if (!paymentResponse.ok) {
          throw new Error(
            paymentData?.detail ||
              "Cobrança inválida."
          );
        }

        if (
          !configResponse.ok ||
          !configData?.publicKey
        ) {
          throw new Error(
            "Configuração de pagamento indisponível."
          );
        }

        setPayment(paymentData);

        if (!initializedRef.current) {
          initializedRef.current = true;

          initMercadoPago(
            configData.publicKey
          );

          setSdkReady(true);
        }
      } catch (err: any) {
        console.error(err);

        setError(
          err?.message ||
            "Não foi possível carregar o pagamento."
        );
      } finally {
        setLoading(false);
      }
    };

    if (reference) {
      load();
    }
  }, [reference]);


  const extractError = (
    data: any
  ) => {
    if (
      typeof data?.detail === "string"
    ) {
      return data.detail;
    }

    if (
      typeof data?.detail?.message
      === "string"
    ) {
      return data.detail.message;
    }

    return (
      "Não foi possível processar "
      + "o pagamento."
    );
  };


  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />

          <p className="mt-4 font-bold text-slate-300">
            Preparando pagamento seguro...
          </p>
        </div>
      </main>
    );
  }


  if (error && !payment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-lg rounded-3xl border border-red-900/40 bg-slate-900 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/10 text-red-400">
            <LockIcon />
          </div>

          <h1 className="mt-5 text-2xl font-black text-white">
            Pagamento indisponível
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            {error}
          </p>
        </div>
      </main>
    );
  }


  const alreadyApproved =
    payment?.status === "approved"
    || result?.status === "approved";

  const pending =
    payment?.status === "pending"
    || result?.status === "pending";


  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-400">
              Portabilidade PRO
            </p>

            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Pagamento seguro
            </h1>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-300">
            <LockIcon />

            <span className="hidden text-xs font-black uppercase tracking-wider sm:block">
              Ambiente protegido
            </span>
          </div>
        </header>


        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
              <ShieldIcon />
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-widest text-slate-500">
              Você está pagando
            </p>

            <p className="mt-2 text-4xl font-black tracking-tight text-white">
              {money(payment.amount)}
            </p>

            <p className="mt-4 text-sm font-bold text-slate-300">
              {payment.description}
            </p>

            {payment.customer_name && (
              <p className="mt-1 text-sm text-slate-500">
                {payment.customer_name}
              </p>
            )}

            <div className="my-6 border-t border-slate-800" />

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="text-emerald-400">
                  <LockIcon />
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    Dados protegidos
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Os dados do cartão são
                    processados e tokenizados
                    pelo Mercado Pago.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="text-blue-400">
                  <ShieldIcon />
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    Sem redirecionamento
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Você conclui o pagamento
                    dentro do Portabilidade PRO.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-bold leading-5 text-slate-500">
                Pagamento processado com
                tecnologia Mercado Pago.
              </p>
            </div>
          </aside>


          <section className="overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="border-b border-slate-100 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <LockIcon />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                    Checkout protegido
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-900">
                    Cartão de crédito
                  </h2>
                </div>
              </div>
            </div>


            <div className="p-5 sm:p-8">
              {alreadyApproved ? (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <ShieldIcon />
                  </div>

                  <h3 className="mt-5 text-3xl font-black text-slate-900">
                    Pagamento aprovado!
                  </h3>

                  <p className="mt-2 text-slate-500">
                    Recebemos a confirmação
                    do seu pagamento.
                  </p>
                </div>
              ) : pending ? (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <LockIcon />
                  </div>

                  <h3 className="mt-5 text-3xl font-black text-slate-900">
                    Pagamento em análise
                  </h3>

                  <p className="mt-2 text-slate-500">
                    O Mercado Pago está
                    processando a transação.
                  </p>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                      {error}
                    </div>
                  )}

                  {processing && (
                    <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700">
                      Processando pagamento...
                    </div>
                  )}

                  {sdkReady && (
                    <CardPayment
                      initialization={{
                        amount: Number(
                          payment.amount
                        ),
                      }}
                      customization={{
                        paymentMethods: {
                          minInstallments: 1,
                          maxInstallments:
                            Number(
                              payment.max_installments
                              || 12
                            ),
                          types: {
                            included: [
                              "credit_card",
                            ],
                          },
                        },
                        visual: {
                          style: {
                            theme:
                              "default",
                          },
                          texts: {
                            formTitle:
                              "Dados do cartão",
                            installmentsSectionTitle:
                              "Parcelamento",
                            selectInstallments:
                              "Selecione o número de parcelas",
                            formSubmit:
                              "Pagar com segurança",
                          },
                        },
                      }}
                      onReady={() => {
                        setBrickReady(true);
                      }}
                      onSubmit={async (
                        formData: any
                      ) => {
                        setProcessing(true);
                        setError("");

                        try {
                          const response =
                            await fetch(
                              `/api/payment-orders/public/${reference}/card`,
                              {
                                method:
                                  "POST",
                                headers: {
                                  "Content-Type":
                                    "application/json",
                                },
                                body:
                                  JSON.stringify(
                                    {
                                      card_token:
                                        formData?.token,

                                      payment_method_id:
                                        formData?.payment_method_id,

                                      installments:
                                        Number(
                                          formData?.installments
                                        ),

                                      payer_email:
                                        formData?.payer
                                          ?.email,

                                      identification_type:
                                        formData?.payer
                                          ?.identification
                                          ?.type
                                        || null,

                                      identification_number:
                                        formData?.payer
                                          ?.identification
                                          ?.number
                                        || null,
                                    }
                                  ),
                              }
                            );

                          const data =
                            await response.json();

                          if (
                            !response.ok
                          ) {
                            throw new Error(
                              extractError(
                                data
                              )
                            );
                          }

                          setResult(data);

                          setPayment(
                            (
                              current: any
                            ) => ({
                              ...current,
                              status:
                                data.status,
                              status_detail:
                                data.status_detail,
                            })
                          );
                        } catch (
                          err: any
                        ) {
                          console.error(
                            err
                          );

                          setError(
                            err?.message
                            || (
                              "Pagamento não "
                              + "aprovado. Confira "
                              + "os dados e tente "
                              + "novamente."
                            )
                          );
                        } finally {
                          setProcessing(
                            false
                          );
                        }
                      }}
                      onError={(
                        brickError: any
                      ) => {
                        console.error(
                          "Card Payment Brick:",
                          brickError
                        );

                        setError(
                          brickError?.message
                          || (
                            "Não foi possível "
                            + "carregar o formulário."
                          )
                        );
                      }}
                    />
                  )}

                  <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
                    <LockIcon />

                    {brickReady
                      ? "Pagamento protegido e pronto"
                      : "Carregando ambiente seguro"}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

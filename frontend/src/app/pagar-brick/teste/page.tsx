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

const TEST_AMOUNT = 1146.5;

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function MercadoPagoBrickTestPage() {
  const initializedRef = useRef(false);

  const [sdkReady, setSdkReady] = useState(false);
  const [brickReady, setBrickReady] = useState(false);
  const [error, setError] = useState("");
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    const initializeMercadoPago = async () => {
      if (initializedRef.current) {
        return;
      }

      initializedRef.current = true;

      try {
        const response = await fetch(
          "/mercado-pago-config",
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data?.publicKey) {
          throw new Error(
            data?.detail ||
              "Public Key do Mercado Pago não disponível."
          );
        }

        initMercadoPago(data.publicKey);
        setSdkReady(true);
      } catch (err: any) {
        console.error(
          "Erro ao inicializar Mercado Pago:",
          err
        );

        setError(
          err?.message ||
            "Não foi possível inicializar o Mercado Pago."
        );
      }
    };

    initializeMercadoPago();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-400">
            Portabilidade PRO
          </p>

          <h1 className="mt-2 text-3xl font-black text-white">
            Homologação Checkout Transparente
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Teste do Card Payment Brick do Mercado Pago.
            Nenhuma cobrança será processada nesta etapa.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Valor do teste
            </p>

            <p className="mt-3 text-4xl font-black text-white">
              {money(TEST_AMOUNT)}
            </p>

            <div className="mt-6 rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-4">
              <p className="font-bold text-emerald-300">
                Objetivo
              </p>

              <p className="mt-2 text-sm leading-6 text-emerald-100/80">
                Conferir se o cartão apresenta parcelamento
                em até 12x sem aumentar o valor total.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-900/50 bg-amber-950/30 p-4">
              <p className="font-bold text-amber-300">
                Homologação
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-100/80">
                Não clique para concluir uma compra real.
                Nesta primeira etapa estamos validando
                apenas as opções de parcelamento.
              </p>
            </div>

            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">
                  SDK Mercado Pago
                </span>

                <span
                  className={
                    sdkReady
                      ? "font-bold text-emerald-400"
                      : "font-bold text-slate-500"
                  }
                >
                  {sdkReady ? "Carregado" : "Aguardando"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">
                  Card Payment Brick
                </span>

                <span
                  className={
                    brickReady
                      ? "font-bold text-emerald-400"
                      : "font-bold text-slate-500"
                  }
                >
                  {brickReady ? "Pronto" : "Aguardando"}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                Pagamento seguro
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-900">
                Cartão de crédito
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Dados processados diretamente pelo Mercado Pago.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {validated && (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                Dados validados pelo Brick. Nenhuma cobrança
                foi enviada ao backend.
              </div>
            )}

            {sdkReady && (
              <CardPayment
                initialization={{
                  amount: TEST_AMOUNT,
                }}
                customization={{
                  paymentMethods: {
                    minInstallments: 1,
                    maxInstallments: 12,
                    types: {
                      included: ["credit_card"],
                    },
                  },
                  visual: {
                    style: {
                      theme: "default",
                    },
                    texts: {
                      formTitle: "Dados do cartão",
                      installmentsSectionTitle:
                        "Parcelamento",
                      selectInstallments:
                        "Selecione o número de parcelas",
                      formSubmit:
                        "Validar dados - homologação",
                    },
                  },
                }}
                onReady={() => {
                  setBrickReady(true);
                }}
                onSubmit={async (formData: any) => {
                  /*
                   * IMPORTANTE:
                   * Não enviamos token nem dados do cartão
                   * para nenhum backend nesta fase.
                   */
                  console.log(
                    "Homologação Brick:",
                    {
                      payment_method_id:
                        formData?.payment_method_id,
                      installments:
                        formData?.installments,
                      transaction_amount:
                        formData?.transaction_amount,
                    }
                  );

                  setValidated(true);
                }}
                onError={(brickError: any) => {
                  console.error(
                    "Erro Card Payment Brick:",
                    brickError
                  );

                  setError(
                    brickError?.message ||
                      "O Mercado Pago encontrou um erro no formulário."
                  );
                }}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

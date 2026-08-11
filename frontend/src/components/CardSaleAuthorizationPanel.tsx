"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { api } from "@/utils/api";
import { Icons } from "@/components/Icons";


type Authorization = {
  id: number;
  status: string;
  url: string;
  expires_at: string;
  authorized_at?: string | null;
};


type Payment = {
  id: number;
  status: string;
  checkout_url?: string | null;
};


type Props = {
  saleId: number;
  saleStatus: string;

  onStateChange?: (
    status: string,
    paymentId?: number | null
  ) => void;
};


export default function CardSaleAuthorizationPanel({
  saleId,
  saleStatus,
  onStateChange,
}: Props) {

  const [
    authorization,
    setAuthorization,
  ] = useState<Authorization | null>(
    null
  );

  const [
    payment,
    setPayment,
  ] = useState<Payment | null>(
    null
  );

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  const clearMessages = () => {
    setError("");
    setSuccess("");
  };


  const loadAuthorization =
    useCallback(
      async (
        showMessage = false
      ) => {
        setLoading(true);

        try {
          const response =
            await api.get(
              `/card-sales/${saleId}/authorization`
            );

          const rawAuthorization =
            response?.authorization || null;

          const currentAuthorization =
            rawAuthorization
            && ![
              "revoked",
              "expired",
            ].includes(
              rawAuthorization.status
            )
              ? rawAuthorization
              : null;

          const currentPayment =
            response?.payment || null;

          setAuthorization(
            currentAuthorization
          );

          setPayment(
            currentPayment
          );

          if (currentPayment) {
            onStateChange?.(
              "payment_created",
              currentPayment.id
            );

          } else if (
            currentAuthorization
            ?.status === "authorized"
          ) {
            onStateChange?.(
              "authorized"
            );

          } else if (
            currentAuthorization
          ) {
            onStateChange?.(
              "authorization_pending"
            );
          }

          if (showMessage) {
            setSuccess(
              "Status atualizado."
            );
          }

        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível consultar a autorização."
          );

        } finally {
          setLoading(false);
        }
      },
      [
        saleId,
      ]
    );


  useEffect(() => {
    loadAuthorization();
  }, [loadAuthorization]);


  const createAuthorization =
    async () => {
      clearMessages();
      setActionLoading(true);

      try {
        const response =
          await api.post(
            `/card-sales/${saleId}/authorization`,
            {}
          );

        setAuthorization(
          response?.authorization || null
        );

        setPayment(null);

        onStateChange?.(
          "authorization_pending"
        );

        setSuccess(
          "Link de autorização gerado com sucesso."
        );

      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível gerar o link de autorização."
        );

      } finally {
        setActionLoading(false);
      }
    };


  /*
   * AUTO_AUTHORIZATION_ON_DOCUMENTATION_COMPLETE
   *
   * Assim que os 3 documentos estiverem
   * completos, gera automaticamente o link
   * de autorização.
   *
   * Em caso de falha, não fica tentando em
   * loop. O botão manual permanece disponível
   * como contingência.
   */
  useEffect(() => {
    if (
      saleStatus !==
        "documentation_complete"
      || loading
      || authorization
      || actionLoading
    ) {
      return;
    }

    void createAuthorization();

    // A tentativa automática ocorre quando
    // loading muda para false ou quando a
    // venda entra em documentation_complete.
    //
    // actionLoading propositalmente não entra
    // nas dependências para não criar retry
    // infinito em caso de erro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    saleId,
    saleStatus,
    loading,
    authorization,
  ]);


  const revokeAuthorization =
    async () => {
      const confirmed =
        window.confirm(
          "Revogar este link de autorização? "
          + "O cliente não poderá mais utilizá-lo."
        );

      if (!confirmed) {
        return;
      }

      clearMessages();
      setActionLoading(true);

      try {
        await api.post(
          `/card-sales/${saleId}/authorization/revoke`,
          {}
        );

        setAuthorization(null);
        setPayment(null);

        onStateChange?.(
          "documentation_complete"
        );

        setSuccess(
          "Autorização revogada. "
          + "Os documentos foram liberados novamente."
        );

      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível revogar a autorização."
        );

      } finally {
        setActionLoading(false);
      }
    };


  const createPayment =
    async () => {
      clearMessages();
      setActionLoading(true);

      try {
        const response =
          await api.post(
            `/card-sales/${saleId}/payment`,
            {}
          );

        const createdPayment =
          response?.payment || null;

        setPayment(
          createdPayment
        );

        if (createdPayment) {
          onStateChange?.(
            "payment_created",
            createdPayment.id
          );
        }

        setSuccess(
          "Link de pagamento criado com sucesso."
        );

      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível gerar o pagamento."
        );

      } finally {
        setActionLoading(false);
      }
    };


  const copyLink =
    async (
      value: string,
      message: string
    ) => {
      clearMessages();

      try {
        await navigator.clipboard.writeText(
          value
        );

        setSuccess(
          message
        );

      } catch {
        setError(
          "Não foi possível copiar o link."
        );
      }
    };


  if (
    saleStatus ===
    "documentation_pending"
  ) {
    return null;
  }


  return (
    <div className="rounded-[1.5rem] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5">

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-600">
            Etapa 3
          </p>

          <h3 className="mt-2 text-lg font-black text-slate-950">
            Autorização do cliente
          </h3>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Gere um link exclusivo para o
            cliente conferir a operação,
            ler o termo e realizar a
            assinatura eletrônica.
          </p>
        </div>

        {authorization && (
          <span
            className={`inline-flex self-start rounded-full px-3 py-2 text-[10px] font-black uppercase ${
              authorization.status ===
              "authorized"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-violet-100 text-violet-700"
            }`}
          >
            {authorization.status ===
            "authorized"
              ? "Autorizado"
              : "Aguardando cliente"}
          </span>
        )}

      </div>


      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}


      {success && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          {success}
        </div>
      )}


      {loading ? (

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500">
          Consultando autorização...
        </div>

      ) : !authorization ? (

        <button
          type="button"
          onClick={
            createAuthorization
          }
          disabled={
            actionLoading
          }
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icons.ShieldCheck
            size={19}
          />

          {actionLoading
            ? "Gerando link..."
            : "Gerar link de autorização"}
        </button>

      ) : (

        <div className="mt-5 space-y-4">

          <div className="rounded-2xl border border-slate-200 bg-white p-4">

            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Link exclusivo
            </div>

            <div className="mt-2 break-all text-sm font-bold text-slate-700">
              {authorization.url}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">

              <button
                type="button"
                onClick={() =>
                  copyLink(
                    authorization.url,
                    "Link de autorização copiado."
                  )
                }
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white"
              >
                Copiar link
              </button>

              <button
                type="button"
                onClick={() =>
                  window.open(
                    authorization.url,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
              >
                Abrir link
              </button>

              <button
                type="button"
                onClick={() =>
                  loadAuthorization(
                    true
                  )
                }
                disabled={loading}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700"
              >
                Atualizar status
              </button>

            </div>

            {authorization.expires_at && (
              <div className="mt-3 text-xs font-semibold text-slate-400">
                Válido até{" "}
                {new Date(
                  authorization.expires_at
                ).toLocaleString(
                  "pt-BR"
                )}
              </div>
            )}

          </div>


          {authorization.status !==
            "authorized" && (

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">

              <div className="flex gap-3">
                <Icons.Lock
                  size={20}
                />

                <div>
                  <div className="text-sm font-black text-amber-900">
                    Aguardando assinatura
                  </div>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    Envie este link manualmente
                    ao cliente. Os documentos
                    permanecem protegidos enquanto
                    a autorização estiver ativa.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  revokeAuthorization
                }
                disabled={
                  actionLoading
                }
                className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-600 disabled:opacity-50"
              >
                Revogar autorização
              </button>

            </div>

          )}


          {authorization.status ===
            "authorized" && (

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">

              <div className="flex gap-3">
                <Icons.CheckCircle
                  size={23}
                />

                <div>
                  <div className="font-black text-emerald-900">
                    Autorização concluída
                  </div>

                  <p className="mt-1 text-sm leading-6 text-emerald-700">
                    O cliente aceitou o termo
                    e registrou sua assinatura
                    eletrônica.
                  </p>
                </div>
              </div>

            </div>

          )}


          {payment?.checkout_url ? (

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">

              <div className="text-[10px] font-black uppercase tracking-wider text-blue-500">
                Link da venda
              </div>

              <div className="mt-2 break-all text-sm font-bold text-blue-950">
                {payment.checkout_url}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={() =>
                    copyLink(
                      payment.checkout_url!,
                      "Link de pagamento copiado."
                    )
                  }
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white"
                >
                  Copiar pagamento
                </button>

                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      payment.checkout_url!,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-black text-blue-700"
                >
                  Abrir pagamento
                </button>

              </div>

            </div>

          ) : authorization.status ===
            "authorized" ? (

            <button
              type="button"
              onClick={
                createPayment
              }
              disabled={
                actionLoading
              }
              className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg disabled:opacity-60"
            >
              {actionLoading
                ? "Criando pagamento..."
                : "Gerar link de pagamento"}
            </button>

          ) : null}

        </div>

      )}

    </div>
  );
}

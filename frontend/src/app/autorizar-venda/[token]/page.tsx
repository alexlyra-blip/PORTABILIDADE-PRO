"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  PointerEvent as ReactPointerEvent,
} from "react";

import {
  useParams,
} from "next/navigation";


type AuthorizationData = {
  authorization: {
    status: string;
    expires_at: string;
    authorized_at?: string | null;
  };

  sale: {
    customer_name: string;
    customer_cpf: string;
    customer_phone: string;
    description: string;
    amount: number;
    installments: number;
  };

  term: {
    version: string;
    text: string;
    sha256: string;
  };

  payment: {
    created: boolean;
    status?: string | null;
    checkout_url?: string | null;
  };
};


function formatMoney(
  value: number
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value || 0);
}


export default function AuthorizationPage() {
  const params = useParams();

  const token =
    typeof params?.token === "string"
      ? params.token
      : "";

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  const drawingRef =
    useRef(false);

  const hasSignatureRef =
    useRef(false);

  const [data, setData] =
    useState<AuthorizationData | null>(
      null
    );

  const [signerName, setSignerName] =
    useState("");

  const [accepted, setAccepted] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [authorized, setAuthorized] =
    useState(false);

  const [paymentUrl, setPaymentUrl] =
    useState<string | null>(
      null
    );


  const loadAuthorization =
    useCallback(
      async () => {
        if (!token) {
          return;
        }

        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              `/api/card-sales/public/authorization/${encodeURIComponent(
                token
              )}`,
              {
                cache: "no-store",
              }
            );

          const body =
            await response.json()
            .catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              body?.detail ||
              "Não foi possível abrir esta autorização."
            );
          }

          setData(body);

          setSignerName(
            body?.sale
              ?.customer_name || ""
          );

          setAuthorized(
            body?.authorization
              ?.status === "authorized"
          );

          setPaymentUrl(
            body?.payment
              ?.checkout_url || null
          );

        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar a autorização."
          );

        } finally {
          setLoading(false);
        }
      },
      [token]
    );


  useEffect(() => {
    void loadAuthorization();
  }, [loadAuthorization]);


  const prepareCanvas =
    useCallback(
      () => {
        const canvas =
          canvasRef.current;

        if (!canvas) {
          return;
        }

        const rect =
          canvas.getBoundingClientRect();

        if (
          rect.width <= 0 ||
          rect.height <= 0
        ) {
          return;
        }

        const ratio =
          Math.max(
            window.devicePixelRatio || 1,
            1
          );

        canvas.width =
          Math.round(
            rect.width * ratio
          );

        canvas.height =
          Math.round(
            rect.height * ratio
          );

        const context =
          canvas.getContext("2d");

        if (!context) {
          return;
        }

        context.setTransform(
          ratio,
          0,
          0,
          ratio,
          0,
          0
        );

        context.lineWidth = 2.4;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle =
          "#0f172a";

        hasSignatureRef.current =
          false;
      },
      []
    );


  useEffect(() => {
    if (
      loading ||
      authorized ||
      !data
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        prepareCanvas,
        50
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    loading,
    authorized,
    data,
    prepareCanvas,
  ]);


  const getPoint =
    (
      event:
        ReactPointerEvent<HTMLCanvasElement>
    ) => {
      const canvas =
        canvasRef.current;

      if (!canvas) {
        return null;
      }

      const rect =
        canvas.getBoundingClientRect();

      return {
        x:
          event.clientX -
          rect.left,

        y:
          event.clientY -
          rect.top,
      };
    };


  const startDrawing =
    (
      event:
        ReactPointerEvent<HTMLCanvasElement>
    ) => {
      const canvas =
        canvasRef.current;

      const point =
        getPoint(event);

      if (
        !canvas ||
        !point
      ) {
        return;
      }

      const context =
        canvas.getContext("2d");

      if (!context) {
        return;
      }

      canvas.setPointerCapture(
        event.pointerId
      );

      drawingRef.current =
        true;

      context.beginPath();

      context.moveTo(
        point.x,
        point.y
      );
    };


  const draw =
    (
      event:
        ReactPointerEvent<HTMLCanvasElement>
    ) => {
      if (
        !drawingRef.current
      ) {
        return;
      }

      const canvas =
        canvasRef.current;

      const point =
        getPoint(event);

      if (
        !canvas ||
        !point
      ) {
        return;
      }

      const context =
        canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.lineTo(
        point.x,
        point.y
      );

      context.stroke();

      hasSignatureRef.current =
        true;
    };


  const stopDrawing =
    (
      event:
        ReactPointerEvent<HTMLCanvasElement>
    ) => {
      const canvas =
        canvasRef.current;

      if (
        canvas?.hasPointerCapture(
          event.pointerId
        )
      ) {
        canvas.releasePointerCapture(
          event.pointerId
        );
      }

      drawingRef.current =
        false;
    };


  const clearSignature = () => {
    prepareCanvas();
  };


  const completeAuthorization =
    async () => {
      if (!accepted) {
        setError(
          "Marque a confirmação de leitura e aceite do termo."
        );
        return;
      }

      if (
        signerName.trim().length < 2
      ) {
        setError(
          "Informe o nome do titular."
        );
        return;
      }

      if (
        !hasSignatureRef.current
      ) {
        setError(
          "Faça a assinatura antes de continuar."
        );
        return;
      }

      const canvas =
        canvasRef.current;

      if (!canvas) {
        return;
      }

      setSubmitting(true);
      setError("");

      try {
        const signature =
          canvas.toDataURL(
            "image/png"
          );

        const response =
          await fetch(
            `/api/card-sales/public/authorization/${encodeURIComponent(
              token
            )}/complete`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  accepted: true,
                  signer_name:
                    signerName.trim(),
                  signature_data_url:
                    signature,
                }),
            }
          );

        const body =
          await response.json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            body?.detail ||
            "Não foi possível concluir a autorização."
          );
        }

        setAuthorized(true);

        setPaymentUrl(
          body?.payment_url || null
        );

      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível concluir a autorização."
        );

      } finally {
        setSubmitting(false);
      }
    };


  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />

          <p className="mt-5 text-sm font-bold text-slate-500">
            Carregando autorização segura...
          </p>

        </div>
      </main>
    );
  }


  if (
    error &&
    !data
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-red-200 bg-white p-10 text-center shadow-xl">

          <div className="text-4xl">
            ⚠️
          </div>

          <h1 className="mt-4 text-2xl font-black text-slate-950">
            Link indisponível
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-600">
            {error}
          </p>

        </div>
      </main>
    );
  }


  if (!data) {
    return null;
  }


  if (authorized) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">

        <div className="mx-auto max-w-3xl rounded-[2rem] border border-emerald-200 bg-white p-7 shadow-xl md:p-10">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
            ✓
          </div>

          <div className="mt-5 text-center">

            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">
              Operação confirmada
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Autorização concluída
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              O termo foi aceito e a
              assinatura eletrônica foi
              registrada com sucesso.
            </p>

          </div>


          <div className="mt-7 rounded-2xl bg-slate-50 p-5">

            <Info
              label="Cliente"
              value={
                data.sale.customer_name
              }
            />

            <Info
              label="Valor"
              value={
                formatMoney(
                  data.sale.amount
                )
              }
            />

            <Info
              label="Parcelamento"
              value={
                `${data.sale.installments}x`
              }
              last
            />

          </div>


          {paymentUrl ? (

            <div className="mt-7 rounded-2xl border border-blue-200 bg-blue-50 p-5">

              <h2 className="font-black text-blue-950">
                Pagamento disponível
              </h2>

              <p className="mt-2 text-sm leading-6 text-blue-700">
                Agora você pode seguir
                para o ambiente seguro
                de pagamento.
              </p>

              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg"
              >
                Ir para pagamento
              </a>

            </div>

          ) : (

            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">

              <h2 className="font-black text-amber-900">
                Pagamento em preparação
              </h2>

              <p className="mt-2 text-sm leading-6 text-amber-700">
                A autorização já foi registrada.
                O responsável pela venda poderá
                gerar novamente o link de pagamento
                caso seja necessário.
              </p>

            </div>

          )}

        </div>

      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:py-12">

      <div className="mx-auto max-w-4xl space-y-6">

        <header className="text-center">

          <div className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-violet-700">
            Autorização segura
          </div>

          <h1 className="mt-4 text-3xl font-black text-slate-950 md:text-4xl">
            Autorização da venda
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Confira os dados da operação,
            leia o termo e assine somente
            após confirmar as informações.
          </p>

        </header>


        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}


        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl md:p-8">

          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-600">
            Dados da operação
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950">
            Confira antes de continuar
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">

            <DataBox
              label="Cliente"
              value={
                data.sale.customer_name
              }
            />

            <DataBox
              label="CPF"
              value={
                data.sale.customer_cpf
              }
            />

            <DataBox
              label="Descrição"
              value={
                data.sale.description
              }
            />

            <DataBox
              label="Valor"
              value={
                formatMoney(
                  data.sale.amount
                )
              }
            />

            <DataBox
              label="Parcelamento"
              value={
                `${data.sale.installments}x`
              }
            />

            <DataBox
              label="Telefone"
              value={
                data.sale.customer_phone
              }
            />

          </div>

        </section>


        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl md:p-8">

          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
            Termo
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950">
            Termo de autorização
          </h2>

          <div className="mt-5 max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
            {data.term.text}
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">

            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) =>
                setAccepted(
                  event.target.checked
                )
              }
              className="mt-1 h-5 w-5"
            />

            <span className="text-sm font-semibold leading-6 text-slate-700">
              Li o termo, conferi os dados
              da operação e concordo com
              seu conteúdo.
            </span>

          </label>

        </section>


        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl md:p-8">

          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
            Assinatura
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950">
            Assine para confirmar
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Use o dedo no celular ou
            o mouse/touchpad no computador.
          </p>


          <label className="mt-6 block">

            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
              Nome do titular
            </span>

            <input
              value={signerName}
              onChange={(event) =>
                setSignerName(
                  event.target.value
                )
              }
              maxLength={150}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />

          </label>


          <div className="mt-5">

            <div className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Assinatura
            </div>

            <canvas
              ref={canvasRef}
              onPointerDown={
                startDrawing
              }
              onPointerMove={
                draw
              }
              onPointerUp={
                stopDrawing
              }
              onPointerCancel={
                stopDrawing
              }
              onPointerLeave={
                (event) => {
                  if (
                    drawingRef.current
                  ) {
                    stopDrawing(
                      event
                    );
                  }
                }
              }
              className="h-52 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-white"
            />

            <div className="mt-3 flex items-center justify-between gap-3">

              <span className="text-xs text-slate-400">
                Assine dentro da área acima.
              </span>

              <button
                type="button"
                onClick={
                  clearSignature
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600"
              >
                Limpar assinatura
              </button>

            </div>

          </div>


          <button
            type="button"
            onClick={
              completeAuthorization
            }
            disabled={
              submitting
            }
            className="mt-7 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 via-blue-600 to-blue-700 px-6 py-4 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Registrando autorização..."
              : "Confirmar e autorizar"}
          </button>


          <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">
            O sistema registra evidências
            técnicas relacionadas ao aceite
            e à assinatura para composição
            do dossiê da operação.
          </p>

        </section>

      </div>

    </main>
  );
}


function DataBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">

      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-sm font-black text-slate-900">
        {value}
      </div>

    </div>
  );
}


function Info({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${
        last
          ? "pt-3"
          : "border-b border-slate-200 py-3"
      }`}
    >
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-black text-slate-900">
        {value}
      </span>
    </div>
  );
}

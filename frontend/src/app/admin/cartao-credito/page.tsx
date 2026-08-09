"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/utils/api";


export default function CreditCardPage() {
  const [allowed, setAllowed] =
    useState<boolean | null>(null);

  const [userRole, setUserRole] =
    useState("");


  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      try {
        const response =
          await api.get(
            "/card-sales/access"
          );

        if (!cancelled) {
          setAllowed(true);
          setUserRole(
            response?.role || ""
          );
        }
      } catch {
        if (!cancelled) {
          setAllowed(false);
        }
      }
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, []);


  if (allowed === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />

          <p className="mt-4 text-sm font-bold text-slate-500">
            Validando acesso seguro...
          </p>
        </div>
      </div>
    );
  }


  if (!allowed) {
    return (
      <div className="p-6 md:p-10">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-red-100 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
            🔒
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900">
            Acesso não autorizado
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            O módulo Cartão de Crédito
            ainda não foi habilitado para
            seu usuário.
          </p>

          <Link
            href="/simulador"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white"
          >
            Voltar ao Simulador
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-8 p-5 pb-28 md:p-8 lg:p-10">

      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 p-7 text-white shadow-2xl md:p-10">

        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="absolute -bottom-24 left-32 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />


        <div className="relative">

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-3xl shadow-xl backdrop-blur">
            💳
          </div>

          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">
            Portabilidade PRO
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            CARTÃO DE CRÉDITO
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Ambiente seguro para simulação,
            propostas e acompanhamento das
            suas vendas com cartão.
          </p>

          <div className="mt-6 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300">
            ✓ ACESSO AUTORIZADO
            {userRole
              ? ` • ${userRole.toUpperCase()}`
              : ""}
          </div>

        </div>
      </section>


      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

        <div className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
            ➕
          </div>

          <h2 className="mt-5 text-lg font-black text-slate-900">
            Nova Venda
          </h2>

          <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
            Criar uma proposta segura
            para pagamento com cartão.
          </p>

          <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
            Próxima etapa:
            documentação + termo
          </div>

        </div>


        <Link
          href="/calculadora-taxas"
          className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
        >

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
            🧮
          </div>

          <h2 className="mt-5 text-lg font-black text-slate-900">
            Calculadora
          </h2>

          <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
            Calcule o valor a cobrar
            ou o valor a receber.
          </p>

          <div className="mt-6 text-xs font-black uppercase tracking-wider text-blue-600">
            Abrir Calculadora →
          </div>

        </Link>


        <div className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
            📊
          </div>

          <h2 className="mt-5 text-lg font-black text-slate-900">
            Simulador
          </h2>

          <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
            Simule parcelamento e
            condições da operação.
          </p>

          <div className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-500">
            Preparando versão comercial
          </div>

        </div>


        <div className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-2xl">
            💼
          </div>

          <h2 className="mt-5 text-lg font-black text-slate-900">
            Minhas Vendas
          </h2>

          <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
            Acompanhe suas propostas,
            assinaturas e pagamentos.
          </p>

          <div className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-500">
            Disponível na próxima etapa
          </div>

        </div>

      </section>


      <section className="rounded-[2rem] border border-blue-100 bg-blue-50/60 p-6">

        <div className="flex gap-4">

          <div className="text-2xl">
            🛡️
          </div>

          <div>
            <h3 className="font-black text-slate-900">
              Venda protegida
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Para usuários abaixo do
              administrador, o link de
              pagamento será liberado
              somente após identificação
              do cliente, selfie de
              confirmação e assinatura
              eletrônica do termo.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}

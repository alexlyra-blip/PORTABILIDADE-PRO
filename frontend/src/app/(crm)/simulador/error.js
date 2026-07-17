'use client';

export default function ErrorBoundary({ error, reset }) {
  return (
    <div className="p-8 bg-red-50 text-red-900 rounded-2xl border border-red-200 mt-10 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">ERRO CRITICO (Mande a foto disso para o suporte):</h2>
      <pre className="bg-white p-4 text-xs font-mono whitespace-pre-wrap overflow-auto h-[400px]">{error?.stack}</pre>
    </div>
  );
}

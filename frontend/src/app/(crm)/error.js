'use client';

export default function CrmError({ error, reset }) {
  return (
    <div style={{padding: '2rem', color: 'red'}}>
      <h2>ERRO LAYOUT CRITICO:</h2>
      <pre>{error?.stack}</pre>
    </div>
  );
}
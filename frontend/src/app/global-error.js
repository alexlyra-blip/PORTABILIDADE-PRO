'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body>
        <div style={{padding: '2rem', color: 'red'}}>
          <h2>ERRO GLOBAL CRITICO:</h2>
          <pre>{error?.stack}</pre>
        </div>
      </body>
    </html>
  );
}
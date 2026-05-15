'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: 0,
          padding: '4rem 1.5rem',
          background: '#faf7f2',
          color: '#1c1917',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#3f6646',
            }}
          >
            Error
          </p>
          <h1
            style={{
              marginTop: 8,
              fontSize: 32,
              fontWeight: 600,
            }}
          >
            Something went wrong
          </h1>
          <p style={{ marginTop: 12, color: '#57534e' }}>
            {error?.message || 'An unexpected error occurred.'}
          </p>
          <div style={{ marginTop: 32 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: '#3f6646',
                color: 'white',
                padding: '12px 32px',
                border: 'none',
                borderRadius: 9999,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

function MinimalApp() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: 'white',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '28rem',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#f97316'
        }}>
          Flavr
        </h1>
        <p style={{
          fontSize: '1.125rem',
          marginBottom: '1.5rem'
        }}>
          AI-Powered Recipe Generator
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <button style={{
            width: '100%',
            backgroundColor: '#ea580c',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer'
          }}>
            Get Started
          </button>
        </div>
        <p style={{
          fontSize: '0.875rem',
          color: '#94a3b8'
        }}>
          Application running successfully
        </p>
      </div>
    </div>
  );
}

export default MinimalApp;
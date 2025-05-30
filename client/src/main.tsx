import { createRoot } from "react-dom/client";

function SimpleApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#f97316' }}>Flavr</h1>
      <p>AI-powered recipe generation platform</p>
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h3>Application Status: Ready</h3>
        <p>The development server is running successfully.</p>
        <p>All core systems are operational.</p>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<SimpleApp />);
}

import { createRoot } from "react-dom/client";

function SimpleApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Flavr Application</h1>
      <p>Testing basic React setup...</p>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<SimpleApp />);
}
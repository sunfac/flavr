import { createRoot } from "react-dom/client";
import TestApp from "./TestApp";

console.log("main.tsx executing");

const rootElement = document.getElementById("root");
if (rootElement) {
  console.log("Root element found, rendering TestApp");
  createRoot(rootElement).render(<TestApp />);
} else {
  console.error("Root element not found!");
}

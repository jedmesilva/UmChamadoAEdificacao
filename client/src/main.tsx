import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// O Service Worker já está sendo registrado no index.html
// Isso evita problemas de duplicação de registro

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
} else {
  console.error("Elemento root não encontrado!");
}

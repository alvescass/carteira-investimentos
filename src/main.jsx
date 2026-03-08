// =============================================================================
// ENTRY POINT
// Monta o componente raiz React no elemento #root do index.html.
// Roteia para o painel admin se a URL for /admin.
// =============================================================================

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AdminPanel from "./admin/AdminPanel";

// Roteamento simples baseado no pathname
const isAdmin = window.location.pathname.startsWith("/admin");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isAdmin ? <AdminPanel /> : <App />}
  </React.StrictMode>
);

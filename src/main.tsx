import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./WebApp";
import { AuthProvider } from "./auth/AuthContext";
import { CartProvider } from "./commerce/CartContext";
import "./styles.css";
import "./commerce.css";
import { LocaleProvider } from "./i18n/LocaleContext";
import { ActionPromptProvider } from "./components/ActionPrompt";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LocaleProvider><AuthProvider>
        <CartProvider><ActionPromptProvider><App /></ActionPromptProvider></CartProvider>
      </AuthProvider></LocaleProvider>
    </BrowserRouter>
  </React.StrictMode>
);

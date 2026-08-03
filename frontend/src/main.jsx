import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./styles/main.css";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SidebarProvider } from "./context/SidebarContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SidebarProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </SidebarProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
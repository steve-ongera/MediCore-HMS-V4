// src/layouts/AuthLayout.jsx
import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div
      className="auth-layout-simple"
      style={{
        backgroundImage: "url(/login_background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="auth-layout-simple__panel">
        <Outlet />
      </div>
    </div>
  );
}
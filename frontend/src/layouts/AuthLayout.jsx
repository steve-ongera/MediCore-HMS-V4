// src/layouts/AuthLayout.jsx
import { Outlet, useLocation } from "react-router-dom";

// Routes that should show the background image. Add/remove paths here as
// new pages get added under this layout — everything else on AuthLayout
// (e.g. Unauthorized) renders on a plain white background by default.
const ROUTES_WITH_BACKGROUND = ["/login"];

export default function AuthLayout() {
  const location = useLocation();
  const showBackground = ROUTES_WITH_BACKGROUND.includes(location.pathname);

  return (
    <div
      className="auth-layout-simple"
      style={
        showBackground
          ? {
              backgroundImage: "url(/background_image.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : undefined
      }
    >
      <div className="auth-layout-simple__panel">
        <Outlet />
      </div>
    </div>
  );
}
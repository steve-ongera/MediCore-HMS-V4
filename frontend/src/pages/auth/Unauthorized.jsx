// src/pages/auth/Unauthorized.jsx
import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="text-center">
      <div
        className="font-extrabold text-danger mb-3"
        style={{ fontSize: "6rem", lineHeight: 1 }}
      >
        401
      </div>
      <h2 className="mb-2">Access Denied</h2>
      <p className="text-muted mb-4">
        You don't have permission to access this page.
        <br />
        Please contact your administrator if you believe this is an error.
      </p>
      <Link to="/dashboard" className="link-btn">
        Back to Dashboard
      </Link>
    </div>
  );
}
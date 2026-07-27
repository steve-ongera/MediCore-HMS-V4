import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp, resendOtp } = useAuth();

  const userId = location.state?.userId;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  if (!userId) {
    navigate("/login", { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await verifyOtp(userId, code);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid or expired code.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await resendOtp(userId);
      setResent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <h1>Verify Your Login</h1>
      <p>We've sent a 6-digit code to your registered email. Enter it below to continue.</p>
      {error && <p>Error: {error}</p>}
      {resent && <p>A new code has been sent.</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter 6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          required
        />
        <button type="submit" disabled={submitting || code.length !== 6}>
          {submitting ? "Verifying..." : "Verify & Continue"}
        </button>
      </form>

      <button type="button" onClick={handleResend} disabled={resending}>
        {resending ? "Sending..." : "Resend Code"}
      </button>
    </div>
  );
}
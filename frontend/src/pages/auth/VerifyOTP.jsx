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

  const styles = {
    
    header: {
      textAlign: "center",
      marginBottom: "28px",
    },
    title: {
      fontSize: "22px",
      fontWeight: 700,
      margin: "0 0 6px 0",
      color: "#111827",
    },
    subtitle: {
      fontSize: "14px",
      color: "#6b7280",
      margin: 0,
      lineHeight: 1.5,
    },
    errorBox: {
      background: "#fef2f2",
      color: "#dc2626",
      padding: "10px 14px",
      borderRadius: "8px",
      fontSize: "13px",
      marginBottom: "20px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      border: "1px solid #fca5a5",
    },
    successBox: {
      background: "#f0fdf4",
      color: "#16a34a",
      padding: "10px 14px",
      borderRadius: "8px",
      fontSize: "13px",
      marginBottom: "20px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      border: "1px solid #86efac",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },
    inputWrapper: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    input: {
      width: "100%",
      padding: "14px 16px",
      fontSize: "24px",
      fontWeight: 600,
      textAlign: "center",
      letterSpacing: "8px",
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      outline: "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
      background: "#ffffff",
      color: "#111827",
      height: "60px",
    },
    inputFocus: {
      borderColor: "#3bbbc0",
      boxShadow: "0 0 0 3px rgba(59, 187, 192, 0.12)",
    },
    inputError: {
      borderColor: "#dc2626",
      boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.12)",
    },
    helperText: {
      fontSize: "11px",
      color: "#9ca3af",
      textAlign: "center",
      marginTop: "4px",
    },
    submitBtn: {
      width: "100%",
      padding: "14px",
      fontSize: "15px",
      fontWeight: 600,
      color: "#ffffff",
      background: "#3bbbc0",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      transition: "background 0.2s",
      height: "52px",
    },
    submitBtnHover: {
      background: "#2da3a8",
    },
    submitBtnDisabled: {
      opacity: 0.6,
      cursor: "not-allowed",
    },
    footer: {
      marginTop: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      flexWrap: "wrap",
    },
    resendBtn: {
      background: "none",
      border: "none",
      color: "#3bbbc0",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: 500,
      padding: "4px 8px",
      borderRadius: "4px",
      transition: "color 0.2s",
    },
    resendBtnHover: {
      color: "#2da3a8",
      textDecoration: "underline",
    },
    resendBtnDisabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    footerText: {
      fontSize: "12px",
      color: "#9ca3af",
    },
    spinner: {
      display: "inline-block",
      width: "16px",
      height: "16px",
      border: "2px solid rgba(255,255,255,0.3)",
      borderTop: "2px solid #ffffff",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    },
    spinnerSmall: {
      display: "inline-block",
      width: "14px",
      height: "14px",
      border: "2px solid rgba(59, 187, 192, 0.3)",
      borderTop: "2px solid #3bbbc0",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    },
    icon: {
      fontSize: "16px",
    },
  };

  // Handle focus state
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Verify Login</h1>
          <p style={styles.subtitle}>Enter the 6-digit code sent to your email</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <i className="bi bi-exclamation-circle"></i>
            {error}
          </div>
        )}

        {resent && (
          <div style={styles.successBox}>
            <i className="bi bi-check-circle"></i>
            New code sent to your email
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputWrapper}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              required
              style={{
                ...styles.input,
                ...(isFocused && styles.inputFocus),
                ...(error && styles.inputError),
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            style={{
              ...styles.submitBtn,
              ...((submitting || code.length !== 6) && styles.submitBtnDisabled),
            }}
            onMouseEnter={(e) => {
              if (!submitting && code.length === 6) {
                e.currentTarget.style.background = "#2da3a8";
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting && code.length === 6) {
                e.currentTarget.style.background = "#3bbbc0";
              }
            }}
          >
            {submitting ? (
              <>
                <span style={styles.spinner}></span>
                Verifying...
              </>
            ) : (
              <>
                <i className="bi bi-shield-check" style={styles.icon}></i>
                Verify & Continue
              </>
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={styles.footerText}>Didn't receive the code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            style={{
              ...styles.resendBtn,
              ...(resending && styles.resendBtnDisabled),
            }}
            onMouseEnter={(e) => {
              if (!resending) {
                e.currentTarget.style.color = "#2da3a8";
                e.currentTarget.style.textDecoration = "underline";
              }
            }}
            onMouseLeave={(e) => {
              if (!resending) {
                e.currentTarget.style.color = "#3bbbc0";
                e.currentTarget.style.textDecoration = "none";
              }
            }}
          >
            {resending ? (
              <>
                <span style={styles.spinnerSmall}></span>
                Sending...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-repeat" style={{ marginRight: "4px" }}></i>
                Resend Code
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        input::placeholder {
          color: #d1d5db;
          letter-spacing: 4px;
          font-weight: 400;
        }
        input:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
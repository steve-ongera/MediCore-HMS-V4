import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { scanQRCode } from "../../services/api";

export default function QRScanner() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [manualText, setManualText] = useState("");

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    setError("");
    setResult(null);
    setScanning(true);
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          await handleScanResult(decodedText);
          scanner.stop();
          setScanning(false);
        },
        () => {}
      );
    } catch (err) {
      setError("Could not access camera: " + err.message);
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
    }
    setScanning(false);
  };

  const handleScanResult = async (rawText) => {
    setError("");
    try {
      const data = await scanQRCode(rawText);
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    await handleScanResult(manualText);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Verification</div>
          <h1 className="page-title">QR Code Scanner</h1>
          <p className="page-subtitle">
            Scan any receipt QR code — single payments, walk-in pharmacy sales, or bulk payments — to verify its authenticity and view the underlying record.
          </p>
        </div>
        <div className="page-header__actions">
          <Link to="/" className="btn btn-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back
          </Link>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="text-center" style={{ marginBottom: "var(--space-4)" }}>
            <div 
              id="qr-reader" 
              style={{ 
                width: "100%", 
                maxWidth: "400px", 
                margin: "0 auto",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                background: "var(--gray-900)"
              }}
            ></div>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {!scanning ? (
              <button type="button" className="btn btn-primary" onClick={startScanning}>
                <i className="bi bi-camera me-2"></i>
                Start Camera Scan
              </button>
            ) : (
              <button type="button" className="btn btn-danger" onClick={stopScanning}>
                <i className="bi bi-stop-circle me-2"></i>
                Stop Scanning
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-keyboard me-1"></i>
            Or Paste QR Text Manually
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleManualSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <div className="input-icon-wrap">
                  <i className="bi bi-qr-code icon"></i>
                  <input
                    type="text"
                    className="input"
                    placeholder="Paste decoded QR text here"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                  />
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                  <i className="bi bi-check-circle me-1"></i>
                  Verify
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {result && (
        <div className={`card ${result.valid ? 'card-valid' : 'card-invalid'}`} style={{ 
          borderColor: result.valid ? "var(--success)" : "var(--danger)",
          background: result.valid ? "var(--success-soft)" : "var(--danger-soft)",
        }}>
          <div className="card-body">
            {result.valid ? (
              <>
                <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-4)" }}>
                  <div className="stat-card__icon tone-success" style={{ width: "48px", height: "48px" }}>
                    <i className="bi bi-check-circle-fill" style={{ fontSize: "24px" }}></i>
                  </div>
                  <div>
                    <h5 className="card-title" style={{ color: "var(--success-strong)" }}>
                      Verified — {result.type?.replace("_", " ") || "Record"}
                    </h5>
                    <span className="badge badge-success">Authentic</span>
                  </div>
                </div>

                <div className="info-grid">
                  {result.receipt_number && (
                    <div className="info-item">
                      <div className="info-item__label">Receipt #</div>
                      <div className="info-item__value cell-mono">{result.receipt_number}</div>
                    </div>
                  )}
                  {result.sale_number && (
                    <div className="info-item">
                      <div className="info-item__label">Sale #</div>
                      <div className="info-item__value cell-mono">{result.sale_number}</div>
                    </div>
                  )}
                  {result.patient_name && (
                    <div className="info-item">
                      <div className="info-item__label">Patient</div>
                      <div className="info-item__value">{result.patient_name}</div>
                    </div>
                  )}
                  {result.customer_name && (
                    <div className="info-item">
                      <div className="info-item__label">Customer</div>
                      <div className="info-item__value">{result.customer_name}</div>
                    </div>
                  )}
                  {(result.total_amount || result.amount) && (
                    <div className="info-item">
                      <div className="info-item__label">Amount</div>
                      <div className="info-item__value font-mono font-semibold">
                        KES {result.total_amount || result.amount}
                      </div>
                    </div>
                  )}
                  {(result.paid_at || result.sold_at) && (
                    <div className="info-item">
                      <div className="info-item__label">Date</div>
                      <div className="info-item__value text-sm text-muted">
                        {new Date(result.paid_at || result.sold_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {result.detail_url && (
                  <div className="form-actions" style={{ marginTop: "var(--space-4)" }}>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={() => navigate(result.detail_url)}
                    >
                      <i className="bi bi-eye me-2"></i>
                      View Full Record
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-4)" }}>
                  <div className="stat-card__icon tone-danger" style={{ width: "48px", height: "48px" }}>
                    <i className="bi bi-x-circle-fill" style={{ fontSize: "24px" }}></i>
                  </div>
                  <div>
                    <h5 className="card-title" style={{ color: "var(--danger-strong)" }}>
                      Not Verified
                    </h5>
                    <span className="badge badge-danger">Invalid</span>
                  </div>
                </div>
                <p className="text-danger">{result.detail || "This QR code could not be verified."}</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
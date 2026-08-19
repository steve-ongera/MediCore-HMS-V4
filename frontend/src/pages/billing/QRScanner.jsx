import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
      // stop the camera stream on unmount so it doesn't keep running in the background
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
        () => { /* per-frame scan failure — expected constantly while aiming, ignore */ }
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
    <div>
      <h1>QR Code Scanner</h1>
      <p>Scan any receipt QR code in the system — single payments, walk-in pharmacy sales, or bulk payments — to verify its authenticity and view the underlying record.</p>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <div id="qr-reader" style={{ width: 320, maxWidth: "100%" }}></div>

      {!scanning ? (
        <button type="button" onClick={startScanning}>Start Camera Scan</button>
      ) : (
        <button type="button" onClick={stopScanning}>Stop Scanning</button>
      )}

      <h2>Or Paste QR Text Manually</h2>
      <form onSubmit={handleManualSubmit}>
        <input
          type="text"
          placeholder="Paste decoded QR text here"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
        />
        <button type="submit">Verify</button>
      </form>

      {result && (
        <div style={{ border: "1px solid #ccc", padding: "12px", marginTop: "12px", background: result.valid ? "#d4edda" : "#f8d7da" }}>
          {result.valid ? (
            <>
              <h3>✅ Verified — {result.type.replace("_", " ")}</h3>
              {result.receipt_number && <p>Receipt #: {result.receipt_number}</p>}
              {result.sale_number && <p>Sale #: {result.sale_number}</p>}
              {result.patient_name && <p>Patient: {result.patient_name}</p>}
              {result.customer_name && <p>Customer: {result.customer_name}</p>}
              {(result.total_amount || result.amount) && <p>Amount: KES {result.total_amount || result.amount}</p>}
              {(result.paid_at || result.sold_at) && <p>Date: {new Date(result.paid_at || result.sold_at).toLocaleString()}</p>}
              {result.detail_url && (
                <button type="button" onClick={() => navigate(result.detail_url)}>View Full Record</button>
              )}
            </>
          ) : (
            <h3>❌ Not Verified — {result.detail}</h3>
          )}
        </div>
      )}
    </div>
  );
}
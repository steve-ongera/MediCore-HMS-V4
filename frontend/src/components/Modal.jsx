// src/components/Modal.jsx
import { useState, useRef, useEffect } from "react";

export default function Modal({ show, onClose, title, description, children, footer, size = "" }) {
  // All hooks must be called before any conditional returns
  const [isResizing, setIsResizing] = useState(false);
  const [modalWidth, setModalWidth] = useState(null);
  const modalRef = useRef(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Reset width when modal closes
  useEffect(() => {
    if (!show) {
      setModalWidth(null);
    }
  }, [show]);

  // Resize event handlers
  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
      return () => {
        window.removeEventListener("mousemove", handleResizeMove);
        window.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [isResizing]);

  // Now it's safe to have the conditional return
  if (!show) return null;

  const handleResizeMove = (e) => {
    if (!isResizing) return;
    const delta = e.clientX - startX.current;
    const newWidth = Math.max(400, Math.min(window.innerWidth - 40, startWidth.current + delta));
    setModalWidth(newWidth);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Support both format: "modal-lg" or just "lg"
  const getSizeClass = () => {
    if (!size) return "";
    if (size.startsWith("modal-")) return size;
    return `modal-${size}`;
  };

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = modalRef.current?.offsetWidth || 0;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  const modalStyle = modalWidth ? { width: `${modalWidth}px`, maxWidth: "none" } : {};

  // Inline styles
  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "20px",
    },
    modal: {
      backgroundColor: "#fff",
      borderRadius: "8px",
      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
      maxWidth: "90vw",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column",
      minWidth: "320px",
      width: modalWidth ? undefined : "auto",
      transition: isResizing ? "none" : "width 0.2s ease",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      gap: "16px",
    },
    headerLeft: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      margin: 0,
      fontSize: "18px",
      fontWeight: 600,
      color: "#111827",
    },
    description: {
      margin: "4px 0 0 0",
      fontSize: "14px",
      color: "#6b7280",
    },
    headerActions: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flexShrink: 0,
    },
    resizeHandle: {
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "ew-resize",
      padding: "4px 6px",
      fontSize: "16px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      transition: "all 0.2s",
    },
    closeButton: {
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "4px 6px",
      fontSize: "18px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      transition: "all 0.2s",
    },
    body: {
      padding: "24px",
      overflowY: "auto",
      flex: 1,
    },
    footer: {
      padding: "16px 24px",
      borderTop: "1px solid #e5e7eb",
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
    },
  };

  // Size-specific styles
  const sizeStyles = {
    "modal-sm": { maxWidth: "400px" },
    "modal-lg": { maxWidth: "800px" },
    "modal-xl": { maxWidth: "1140px" },
    "modal-full": { maxWidth: "95vw" },
  };

  const sizeStyle = sizeStyles[getSizeClass()] || {};

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div 
        ref={modalRef}
        style={{ ...styles.modal, ...sizeStyle, ...modalStyle }}
        role="dialog" 
        aria-modal="true"
      >
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h5 style={styles.title}>{title}</h5>
            {description && <p style={styles.description}>{description}</p>}
          </div>
          <div style={styles.headerActions}>
            <button 
              style={styles.resizeHandle}
              onMouseDown={handleResizeStart}
              title="Drag to resize"
              aria-label="Resize modal"
              onMouseEnter={(e) => e.currentTarget.style.color = "#111827"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#9ca3af"}
            >
              <i className="bi bi-arrows-angle-expand"></i>
            </button>
            <button 
              style={styles.closeButton}
              onClick={onClose} 
              aria-label="Close"
              onMouseEnter={(e) => e.currentTarget.style.color = "#111827"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#9ca3af"}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
        <div style={styles.body}>{children}</div>
        {footer && <div style={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
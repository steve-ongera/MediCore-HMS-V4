import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getInsuranceClaims, getInsurers } from "../../services/api";
import Pagination from "../../components/Pagination";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import medicoreLogo from "../../assets/logo.png";

// Design constants aligned with BulkPaymentReceipt / HMIS Standard
const BRAND_COLOR = [30, 64, 175]; // #1e40af
const DARK_TEXT = [17, 24, 39]; // #111827
const MUTED_COLOR = [107, 114, 128]; // #6b7280
const LIGHT_BORDER = [229, 231, 235]; // #e5e7eb
const LIGHT_FILL = [249, 250, 251]; // #f9fafb

export default function ClaimsList() {
  const [claims, setClaims] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [insurerFilter, setInsurerFilter] = useState("");
  const [insurers, setInsurers] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportMenuRef = useRef(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Load insurer options once for the filter dropdown
  useEffect(() => {
    getInsurers({ page_size: 200 })
      .then((data) => setInsurers(data.results ?? data))
      .catch(() => {});
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, insurerFilter, debouncedSearch]);

  useEffect(() => {
    load();
  }, [statusFilter, insurerFilter, debouncedSearch, page]);

  // Close the export dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const buildParams = () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (insurerFilter) params.insurer = insurerFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInsuranceClaims({
        ...buildParams(),
        page,
        page_size: pageSize,
      });
      const results = data.results ?? data;
      setClaims(results);
      setTotal(data.count ?? results.length);
    } catch (err) {
      setError(err.message || "Failed to load claims");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Helper to load an image element into jsPDF
   */
  const loadImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  /**
   * Helper to trigger browser download from a Blob
   */
  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  /**
   * Generate PDF Report with Totals & Official Sign/Stamp Approval Blocks
   */
  const generatePdf = async (exportData) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    // Load logo
    const logoImg = await loadImage(medicoreLogo);

    // 1. Header Rendering
    if (logoImg) {
      try {
        doc.addImage(logoImg, "PNG", margin, 10, 12, 12);
      } catch (e) {
        console.warn("Could not render logo in PDF:", e);
      }
    }

    const brandX = logoImg ? margin + 15 : margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...DARK_TEXT);
    doc.text("MEDICORE HOSPITAL", brandX, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text("Healthcare Management Information System", brandX, 19);

    // Right Header Title & Metadata
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...BRAND_COLOR);
    doc.text("INSURANCE CLAIMS REPORT", pageWidth - margin, 15, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth - margin, 19, { align: "right" });

    // Accent Line
    doc.setDrawColor(...BRAND_COLOR);
    doc.setLineWidth(0.4);
    doc.line(margin, 23, pageWidth - margin, 23);

    let startY = 26;

    // Filter Summary Block
    const activeInsurerName =
      insurers.find((i) => String(i.id) === String(insurerFilter))?.name || "All Insurers";

    autoTable(doc, {
      startY: startY,
      theme: "plain",
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.2,
        textColor: DARK_TEXT,
      },
      columnStyles: {
        0: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 26 },
        1: { cellWidth: 64 },
        2: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 26 },
        3: { cellWidth: 64 },
      },
      body: [
        [
          "Insurer Filter:",
          activeInsurerName,
          "Status Filter:",
          statusFilter ? statusFilter.replace(/_/g, " ") : "All Statuses",
        ],
        [
          "Search Query:",
          debouncedSearch || "None",
          "Total Records:",
          `${exportData.length} claim(s)`,
        ],
      ],
      didDrawCell: (data) => {
        if (data.row.index === 0 && data.column.index === 0) {
          doc.setDrawColor(...LIGHT_BORDER);
          doc.setFillColor(...LIGHT_FILL);
        }
      },
    });

    startY = doc.lastAutoTable.finalY + 4;

    // Table Columns Definition
    const tableColumns = [
      { header: "Claim #", dataKey: "claim_number" },
      { header: "Patient Name", dataKey: "patient_name" },
      { header: "Branch", dataKey: "branch_name" },
      { header: "Insurer", dataKey: "insurer_name" },
      { header: "Status", dataKey: "status" },
      { header: "Claimed (KES)", dataKey: "total_claimed" },
      { header: "Approved (KES)", dataKey: "total_approved" },
    ];

    let totalClaimedSum = 0;
    let totalApprovedSum = 0;

    const tableRows = exportData.map((c) => {
      const claimed = parseFloat(c.total_claimed || 0);
      const approved = parseFloat(c.total_approved || 0);
      totalClaimedSum += claimed;
      totalApprovedSum += approved;

      return {
        claim_number: c.claim_number || "-",
        patient_name: c.patient_name || "-",
        branch_name: c.branch_name || "-",
        insurer_name: c.insurer_name || "-",
        status: (c.status || "-").replace(/_/g, " "),
        total_claimed: formatCurrency(claimed),
        total_approved: formatCurrency(approved),
      };
    });

    // AutoTable Rendering
    autoTable(doc, {
      startY: startY,
      columns: tableColumns,
      body: tableRows,
      margin: { left: margin, right: margin, bottom: 20 },
      styles: {
        fontSize: 7,
        cellPadding: 1.2,
        textColor: DARK_TEXT,
        valign: "middle",
        overflow: "ellipsize",
      },
      headStyles: {
        fillColor: BRAND_COLOR,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: 1.5,
      },
      alternateRowStyles: {
        fillColor: LIGHT_FILL,
      },
      columnStyles: {
        0: { cellWidth: 32, minCellWidth: 32, fontStyle: "bold" },
        1: { cellWidth: 36 },
        2: { cellWidth: 26 },
        3: { cellWidth: 30 },
        4: { cellWidth: 24 },
        5: { cellWidth: 20, halign: "right" },
        6: { cellWidth: 20, halign: "right", fontStyle: "bold" },
      },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED_COLOR);

        doc.setDrawColor(...LIGHT_BORDER);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

        doc.text(
          "Confidential - Official Insurance Claims Summary Report",
          margin,
          pageHeight - 6
        );
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 6,
          { align: "right" }
        );
      },
    });

    // Totals Summary Box
    let currentY = doc.lastAutoTable.finalY + 4;

    if (currentY + 65 > pageHeight - 15) {
      doc.addPage();
      currentY = 15;
    }

    doc.setFillColor(...LIGHT_FILL);
    doc.rect(pageWidth - margin - 80, currentY, 80, 14, "F");
    doc.setDrawColor(...LIGHT_BORDER);
    doc.rect(pageWidth - margin - 80, currentY, 80, 14, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("Total Claimed:", pageWidth - margin - 76, currentY + 5.5);
    doc.setTextColor(...BRAND_COLOR);
    doc.text(formatCurrency(totalClaimedSum), pageWidth - margin - 4, currentY + 5.5, {
      align: "right",
    });

    doc.setTextColor(...DARK_TEXT);
    doc.text("Total Approved:", pageWidth - margin - 76, currentY + 10.5);
    doc.setTextColor(...BRAND_COLOR);
    doc.text(formatCurrency(totalApprovedSum), pageWidth - margin - 4, currentY + 10.5, {
      align: "right",
    });

    // -------------------------------------------------------------
    // SIGNATURE & STAMP SECTION (Hospital & Insurance Verification)
    // -------------------------------------------------------------
    let sigY = currentY + 22;
    const boxWidth = (pageWidth - margin * 2 - 10) / 2; // 2 columns

    // 1. Hospital Verification Box
    doc.setDrawColor(...LIGHT_BORDER);
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(margin, sigY, boxWidth, 38, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_COLOR);
    doc.text("HOSPITAL AUTHORIZATION & STAMP", margin + 4, sigY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK_TEXT);

    doc.text("Authorized Name: _______________________", margin + 4, sigY + 13);
    doc.text("Signature: _____________________________", margin + 4, sigY + 20);
    doc.text("Date: __________________________________", margin + 4, sigY + 27);

    // Dotted Official Stamp Box
    doc.setDrawColor(...MUTED_COLOR);
    doc.setLineDashPattern([1, 1], 0);
    doc.rect(margin + boxWidth - 28, sigY + 8, 24, 24, "S");
    doc.setFontSize(6);
    doc.setTextColor(...MUTED_COLOR);
    doc.text("Official Hospital", margin + boxWidth - 16, sigY + 18, { align: "center" });
    doc.text("Stamp Here", margin + boxWidth - 16, sigY + 22, { align: "center" });
    doc.setLineDashPattern([], 0); // Reset dash pattern

    // 2. Insurance Company Verification Box
    const insX = margin + boxWidth + 10;
    doc.setDrawColor(...LIGHT_BORDER);
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(insX, sigY, boxWidth, 38, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_COLOR);
    doc.text("INSURER APPROVAL & STAMP", insX + 4, sigY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK_TEXT);

    doc.text("Claim Representative: ____________________", insX + 4, sigY + 13);
    doc.text("Signature: _____________________________", insX + 4, sigY + 20);
    doc.text("Date: __________________________________", insX + 4, sigY + 27);

    // Dotted Official Stamp Box
    doc.setDrawColor(...MUTED_COLOR);
    doc.setLineDashPattern([1, 1], 0);
    doc.rect(insX + boxWidth - 28, sigY + 8, 24, 24, "S");
    doc.setFontSize(6);
    doc.setTextColor(...MUTED_COLOR);
    doc.text("Insurer Stamp", insX + boxWidth - 16, sigY + 18, { align: "center" });
    doc.text("Here", insX + boxWidth - 16, sigY + 22, { align: "center" });
    doc.setLineDashPattern([], 0); // Reset dash pattern

    return doc;
  };

  /**
   * Generate XML Excel Spreadsheet
   */
  const generateExcelXML = (exportData) => {
    const rowsHtml = exportData
      .map(
        (c) => `
      <tr>
        <td style="mso-number-format:'\\@';">${c.claim_number || ""}</td>
        <td>${c.patient_name || ""}</td>
        <td>${c.branch_name || ""}</td>
        <td>${c.insurer_name || ""}</td>
        <td>${(c.status || "").replace(/_/g, " ")}</td>
        <td>${c.total_claimed || 0}</td>
        <td>${c.total_approved || 0}</td>
      </tr>
    `
      )
      .join("");

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Insurance Claims</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
        </head>
        <body>
          <table>
            <thead>
              <tr style="background-color: #1e40af; color: #ffffff; font-weight: bold;">
                <th>Claim #</th>
                <th>Patient Name</th>
                <th>Branch</th>
                <th>Insurer</th>
                <th>Status</th>
                <th>Claimed Amount</th>
                <th>Approved Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  /**
   * Client-Side Export Handler
   */
  const handleExport = async (format) => {
    setExportOpen(false);
    setExporting(true);
    setError("");

    try {
      const data = await getInsuranceClaims({
        ...buildParams(),
        page: 1,
        page_size: 10000,
      });

      const exportData = data.results ?? data ?? [];

      if (!exportData.length) {
        setError("No claims match the filter criteria to export.");
        return;
      }

      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === "pdf") {
        const doc = await generatePdf(exportData);
        doc.save(`Insurance_Claims_${timestamp}.pdf`);
      } else if (format === "xlsx") {
        const excelContent = generateExcelXML(exportData);
        downloadFile(
          excelContent,
          `Insurance_Claims_${timestamp}.xls`,
          "application/vnd.ms-excel"
        );
      }
    } catch (err) {
      setError(err.message || "Failed to export claims");
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      DRAFT: "badge-neutral",
      SUBMITTED: "badge-primary",
      UNDER_REVIEW: "badge-info",
      APPROVED: "badge-success",
      PARTIALLY_APPROVED: "badge-warning",
      REJECTED: "badge-danger",
      SETTLED: "badge-success",
      CANCELLED: "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading && claims.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading claims...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Billing & Insurance</div>
          <h1 className="page-title">Insurance Claims</h1>
          <p className="page-subtitle">Manage insurance claims</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>

          <div className="dropdown" ref={exportMenuRef} style={{ position: "relative" }}>
            <button
              className="btn btn-secondary"
              onClick={() => setExportOpen((o) => !o)}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" />
                  Exporting...
                </>
              ) : (
                <>
                  <i className="bi bi-download me-1"></i>
                  Export
                  <i className="bi bi-chevron-down ms-1"></i>
                </>
              )}
            </button>
            {exportOpen && (
              <div
                className="dropdown-menu show"
                style={{ position: "absolute", right: 0, top: "110%", zIndex: 20, minWidth: "160px" }}
              >
                <button className="dropdown-item" onClick={() => handleExport("xlsx")}>
                  <i className="bi bi-file-earmark-excel me-2"></i> Excel (.xls)
                </button>
                <button className="dropdown-item" onClick={() => handleExport("pdf")}>
                  <i className="bi bi-file-earmark-pdf me-2"></i> PDF Document
                </button>
              </div>
            )}
          </div>

          <Link to="/insurance/claims/new" className="btn btn-primary">
            <i className="bi bi-plus-circle me-1"></i> File Claim
          </Link>
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: "var(--space-4)",
            borderColor: "var(--danger)",
            background: "var(--danger-soft)",
          }}
        >
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>
                Search
              </label>
              <input
                type="text"
                className="input"
                placeholder="Claim #, patient, hospital #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "220px" }}
              />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>
                Insurer
              </label>
              <select
                className="select"
                value={insurerFilter}
                onChange={(e) => setInsurerFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All Insurers</option>
                {insurers.map((ins) => (
                  <option key={ins.id} value={ins.id}>
                    {ins.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>
                Status
              </label>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PARTIALLY_APPROVED">Partially Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="SETTLED">Settled</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {total} claim{total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {claims.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-file-earmark-text"></i>
              </div>
              <h3 className="empty-state__title">No claims found</h3>
              <p className="empty-state__desc">
                {statusFilter || insurerFilter || debouncedSearch
                  ? "No claims match your current filters."
                  : "Start by filing a new insurance claim."}
              </p>
              {!statusFilter && !insurerFilter && !debouncedSearch && (
                <Link to="/insurance/claims/new" className="btn btn-primary">
                  <i className="bi bi-plus-circle me-1"></i> File Claim
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="data-table" style={{ whiteSpace: "nowrap" }}>
                  <thead>
                    <tr>
                      <th>Claim #</th>
                      <th>Patient</th>
                      <th>Branch</th>
                      <th>Insurer</th>
                      <th>Status</th>
                      <th className="cell-numeric">Claimed</th>
                      <th className="cell-numeric">Approved</th>
                      <th className="cell-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((c) => (
                      <tr key={c.id}>
                        <td className="cell-mono">{c.claim_number}</td>
                        <td className="cell-primary">{c.patient_name}</td>
                        <td>{c.branch_name || "—"}</td>
                        <td>{c.insurer_name}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(c.status)}`}>
                            <span className="badge-dot"></span>
                            {(c.status || "").replace("_", " ")}
                          </span>
                        </td>
                        <td className="cell-numeric">{formatCurrency(c.total_claimed)}</td>
                        <td className="cell-numeric">{formatCurrency(c.total_approved)}</td>
                        <td className="cell-actions">
                          <Link
                            to={`/insurance/claims/${c.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            <i className="bi bi-eye me-1"></i> View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={page}
                count={total}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
        {claims.length > 0 && (
          <div className="card-footer">
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>Approved
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>Partial
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>Rejected
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>Under Review
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "../../context/ToastContext";
import { getPatients, deletePatient } from "../../services/api";
import DataTable from "../../components/DataTable";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import ConfirmDialog from "../../components/ConfirmDialog";
import { formatDate, formatDateTime, initials } from "../../utils/formatters";
import medicoreLogo from "../../assets/logo.png";

// Design constants aligned with HMIS Standard
const BRAND_COLOR = [30, 64, 175]; // #1e40af
const DARK_TEXT = [17, 24, 39]; // #111827
const MUTED_COLOR = [107, 114, 128]; // #6b7280
const LIGHT_BORDER = [229, 231, 235]; // #e5e7eb
const LIGHT_FILL = [249, 250, 251]; // #f9fafb

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const navigate = useNavigate();

  const pageSize = 20;

  useEffect(() => {
    loadPatients();
  }, [page, search]);

  // Close export dropdown on click outside
  useEffect(() => {
    const onClick = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      const data = await getPatients(params);
      setPatients(data.results || []);
      setTotal(data.count || 0);
    } catch (err) {
      toast.error(err.message || "Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePatient(deleteId);
      toast.success("Patient deleted successfully");
      loadPatients();
    } catch (err) {
      toast.error(err.message || "Failed to delete patient");
    } finally {
      setShowConfirm(false);
      setDeleteId(null);
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
   * Generate PDF Report for Patients List
   */
  const generatePdf = async (exportData) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    // Load logo
    const logoImg = await loadImage(medicoreLogo);

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

    // Right Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...BRAND_COLOR);
    doc.text("PATIENT RECORDS REPORT", pageWidth - margin, 15, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth - margin, 19, { align: "right" });

    // Accent Line
    doc.setDrawColor(...BRAND_COLOR);
    doc.setLineWidth(0.4);
    doc.line(margin, 23, pageWidth - margin, 23);

    let startY = 26;

    // Filter Summary
    autoTable(doc, {
      startY: startY,
      theme: "plain",
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 1.2, textColor: DARK_TEXT },
      columnStyles: {
        0: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 26 },
        1: { cellWidth: 64 },
        2: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 26 },
        3: { cellWidth: 64 },
      },
      body: [
        [
          "Search Query:", search || "All Patients",
          "Total Records:", `${exportData.length} patient(s)`
        ]
      ]
    });

    startY = doc.lastAutoTable.finalY + 4;

    const tableColumns = [
      { header: "Hospital #", dataKey: "hospital_number" },
      { header: "Full Name", dataKey: "full_name" },
      { header: "Gender", dataKey: "gender" },
      { header: "Age", dataKey: "age" },
      { header: "Phone", dataKey: "phone" },
      { header: "National ID", dataKey: "national_id" },
      { header: "Registered", dataKey: "created_at" },
    ];

    const tableRows = exportData.map((p) => ({
      hospital_number: p.hospital_number || "-",
      full_name: p.full_name || "-",
      gender: p.gender || "-",
      age: p.age ? String(p.age) : "-",
      phone: p.phone || "-",
      national_id: p.national_id || "-",
      created_at: formatDate(p.created_at) || "-",
    }));

    autoTable(doc, {
      startY: startY,
      columns: tableColumns,
      body: tableRows,
      margin: { left: margin, right: margin, bottom: 18 },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.5,
        textColor: DARK_TEXT,
        valign: "middle",
        overflow: "ellipsize",
      },
      headStyles: {
        fillColor: BRAND_COLOR,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 1.8,
      },
      alternateRowStyles: {
        fillColor: LIGHT_FILL,
      },
      columnStyles: {
        0: { cellWidth: 36, minCellWidth: 36, fontStyle: "bold" }, // Full Hospital # visibility
        1: { cellWidth: 44, fontStyle: "bold" },                   // Patient Name
        2: { cellWidth: 18 },                                      // Gender
        3: { cellWidth: 14 },                                      // Age
        4: { cellWidth: 28 },                                      // Phone
        5: { cellWidth: 24 },                                      // National ID
        6: { cellWidth: 22 },                                      // Registered Date
      },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED_COLOR);

        doc.setDrawColor(...LIGHT_BORDER);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

        doc.text("Confidential - Official Patient Records Summary", margin, pageHeight - 6);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: "right" });
      },
    });

    return doc;
  };

  /**
   * Generate CSV File Format
   */
  const generateCSV = (exportData) => {
    const headers = ["Hospital #", "Full Name", "Gender", "Age", "Phone", "National ID", "Registered Date"];
    
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = exportData.map((p) => [
      escapeCsv(p.hospital_number),
      escapeCsv(p.full_name),
      escapeCsv(p.gender),
      escapeCsv(p.age),
      escapeCsv(p.phone),
      escapeCsv(p.national_id),
      escapeCsv(formatDate(p.created_at)),
    ].join(","));

    return [headers.join(","), ...rows].join("\r\n");
  };

  /**
   * Generate XML Excel Format (.xls)
   */
  const generateExcelXML = (exportData) => {
    const rowsHtml = exportData.map((p) => `
      <tr>
        <td style="mso-number-format:'\\@';">${p.hospital_number || ""}</td>
        <td>${p.full_name || ""}</td>
        <td>${p.gender || ""}</td>
        <td>${p.age || ""}</td>
        <td style="mso-number-format:'\\@';">${p.phone || ""}</td>
        <td style="mso-number-format:'\\@';">${p.national_id || ""}</td>
        <td>${formatDate(p.created_at) || ""}</td>
      </tr>
    `).join("");

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Patient Records</x:Name>
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
                <th>Hospital #</th>
                <th>Full Name</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Phone</th>
                <th>National ID</th>
                <th>Registered Date</th>
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
   * Universal Export Handler
   */
  const handleExport = async (format) => {
    setExportOpen(false);
    setExporting(true);

    try {
      const params = { page: 1, page_size: 10000 };
      if (search) params.search = search;

      const data = await getPatients(params);
      const exportData = data.results || data || [];

      if (!exportData.length) {
        toast.error("No patient records to export.");
        return;
      }

      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === "pdf") {
        const doc = await generatePdf(exportData);
        doc.save(`Patient_Records_${timestamp}.pdf`);
      } else if (format === "csv") {
        const csvContent = generateCSV(exportData);
        downloadFile(csvContent, `Patient_Records_${timestamp}.csv`, "text/csv;charset=utf-8;");
      } else if (format === "xlsx") {
        const excelContent = generateExcelXML(exportData);
        downloadFile(excelContent, `Patient_Records_${timestamp}.xls`, "application/vnd.ms-excel");
      }
      toast.success(`Exported ${exportData.length} records to ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err.message || "Failed to export patients");
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: "hospital_number",
      label: "Hospital #",
      render: (row) => <span className="cell-mono">{row.hospital_number}</span>,
    },
    {
      key: "full_name",
      label: "Patient Name",
      render: (row) => (
        <Link to={`/patients/${row.id}`} className="table-row-avatar table-row-avatar--link">
          <span className="avatar avatar-sm">
            {initials(row.full_name) || "?"}
          </span>
          <div>
            <div className="cell-primary">{row.full_name}</div>
            <div className="text-2xs text-tertiary">{row.gender || "—"}</div>
          </div>
        </Link>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row) => row.phone || "—",
    },
    {
      key: "national_id",
      label: "National ID",
      render: (row) => row.national_id || "—",
    },
    {
      key: "age",
      label: "Age",
      render: (row) => row.age || "—",
    },
    {
      key: "created_at",
      label: "Registered",
      render: (row) => formatDate(row.created_at),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <Link
            to={`/patients/${row.id}`}
            className="btn-icon-only"
            title="View profile"
          >
            <i className="bi bi-person-vcard"></i>
          </Link>
          <Link
            to={`/patients/${row.id}/visits`}
            className="btn-icon-only"
            title="View visits"
          >
            <i className="bi bi-eye"></i>
          </Link>
          <Link
            to={`/patients/${row.id}/edit`}
            className="btn-icon-only"
            title="Edit patient"
          >
            <i className="bi bi-pencil"></i>
          </Link>
          <button
            className="btn-icon-only"
            style={{ color: "var(--danger-strong)" }}
            onClick={() => handleDelete(row.id)}
            title="Delete patient"
          >
            <i className="bi bi-trash"></i>
          </button>
        </div>
      ),
    },
  ];

  if (loading && patients.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading patients...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Reception</div>
          <h1 className="page-title">Patient Records</h1>
          <p className="page-subtitle">Manage all patient registrations</p>
        </div>
        <div className="page-header__actions">
          {/* Export Dropdown */}
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
                <button className="dropdown-item" onClick={() => handleExport("csv")}>
                  <i className="bi bi-file-earmark-text me-2"></i> CSV (.csv)
                </button>
                <button className="dropdown-item" onClick={() => handleExport("pdf")}>
                  <i className="bi bi-file-earmark-pdf me-2"></i> PDF Document
                </button>
              </div>
            )}
          </div>

          <Link to="/patients/register" className="btn btn-primary">
            <i className="bi bi-person-plus me-1"></i>
            Register Patient
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar
              placeholder="Search by name, phone, or hospital #..."
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              delay={400}
            />
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {total} patient{total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <DataTable
            columns={columns}
            data={patients}
            loading={loading}
            emptyMessage="No patients found. Register a new patient to get started."
          />

          <Pagination page={page} count={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Patient"
        message="Are you sure you want to delete this patient? This action cannot be undone."
        variant="danger"
      />
    </>
  );
}
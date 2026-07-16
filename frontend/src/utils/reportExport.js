import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportTableToExcel(tableData, filename = "report") {
  if (!tableData || tableData.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(tableData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportTableToPDF(tableData, title = "Report", filename = "report") {
  if (!tableData || tableData.length === 0) return;
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(new Date().toLocaleString(), 14, 21);

  const columns = Object.keys(tableData[0]).map((key) => ({
    header: key.replace(/_/g, " ").toUpperCase(),
    dataKey: key,
  }));

  autoTable(doc, {
    startY: 26,
    columns,
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 98, 255] },
  });

  doc.save(`${filename}.pdf`);
}
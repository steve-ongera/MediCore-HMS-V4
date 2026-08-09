import MOHReportBase from "./MOHReportBase.jsx";
import { getMOHPharmacyReport } from "../../services/api";

export default function PharmacyCommoditiesReport() {
  return <MOHReportBase
    title="Pharmacy & Commodities" subtitle="Dispensing volume, stock-outs, consumption trend"
    fetchFn={getMOHPharmacyReport} exportFilename="moh_pharmacy_commodities"
    cardsConfig={[
      { key: "total_dispenses", label: "Total Dispenses" }, { key: "stock_out_items", label: "Stock-Out Items" },
      { key: "low_stock_items", label: "Low Stock Items" },
    ]}
    chartsConfig={[
      { dataKey: "top_dispensed_medicines", title: "Top Dispensed Medicines", type: "bar", horizontal: true },
      { dataKey: "consumption_trend", title: "Daily Consumption Trend", type: "line" },
    ]}
    detailTable={{
      endpoint: "/moh/pharmacy-commodities/dispenses/",
      title: "Dispense Records",
      searchPlaceholder: "Search medicine, patient name...",
      columns: [
        { key: "patient_name", label: "Patient" },
        { key: "medicine_name", label: "Medicine" },
        { key: "dosage", label: "Dosage" },
        { key: "quantity_dispensed", label: "Qty" },
        { key: "payment_method", label: "Payment" },
        { key: "status", label: "Status" },
        { key: "dispensed_by_name", label: "Dispensed By" },
        { key: "completed_at", label: "Completed" },
      ],
      filters: [
        { key: "status", label: "Status", options: [
          { value: "PENDING_PAYMENT", label: "Pending Payment" },
          { value: "COMPLETED", label: "Completed" },
          { value: "CANCELLED", label: "Cancelled" },
        ]},
        { key: "payment_method", label: "Payment", options: [
          { value: "CASH", label: "Cash" },
          { value: "MPESA", label: "M-Pesa" },
          { value: "CARD", label: "Card" },
          { value: "INSURANCE", label: "Insurance" },
        ]},
      ],
    }}
  />;
}
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
  />;
}
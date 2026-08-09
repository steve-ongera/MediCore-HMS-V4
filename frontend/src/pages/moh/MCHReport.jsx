import MOHReportBase from "./MOHReportBase.jsx";
import { getMOHMCHReport } from "../../services/api";

export default function MCHReport() {
  return <MOHReportBase
    title="Maternal & Child Health" subtitle="ANC, deliveries, maternal deaths, immunization"
    fetchFn={getMOHMCHReport} exportFilename="moh_mch_report"
    cardsConfig={[
      { key: "anc_registrations", label: "ANC Registrations" }, { key: "anc_visits", label: "ANC Visits" },
      { key: "total_deliveries", label: "Total Deliveries" }, { key: "c_sections", label: "C-Sections" },
      { key: "live_births", label: "Live Births" }, { key: "stillbirths", label: "Stillbirths" },
      { key: "maternal_deaths", label: "Maternal Deaths" }, { key: "pnc_visits", label: "PNC Visits" },
      { key: "immunizations_given", label: "Immunizations Given" },
    ]}
    chartsConfig={[{ dataKey: "by_delivery_mode", title: "Deliveries by Mode", type: "pie" }]}
  />;
}
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
    detailTable={{
      endpoint: "/moh/mch/deliveries/",
      title: "Delivery Records",
      searchPlaceholder: "Search delivery #, mother name, ANC #...",
      columns: [
        { key: "delivery_number", label: "Delivery #" },
        { key: "mother_name", label: "Mother" },
        { key: "anc_number", label: "ANC #" },
        { key: "delivery_date", label: "Date" },
        { key: "mode_of_delivery", label: "Mode" },
        { key: "outcome", label: "Outcome" },
        { key: "attended_by_name", label: "Attended By" },
        { key: "blood_loss_ml", label: "Blood Loss (ml)" },
      ],
      filters: [
        { key: "mode_of_delivery", label: "Mode", options: [
          { value: "SVD", label: "Spontaneous Vaginal" },
          { value: "ASSISTED", label: "Assisted Vaginal" },
          { value: "CAESAREAN", label: "Caesarean Section" },
          { value: "BREECH", label: "Breech" },
        ]},
        { key: "outcome", label: "Outcome", options: [
          { value: "LIVE_BIRTH", label: "Live Birth" },
          { value: "STILLBIRTH", label: "Stillbirth" },
        ]},
      ],
    }}
  />;
}
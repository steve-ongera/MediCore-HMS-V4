import MOHReportBase from "./MOHReportBase.jsx";
import { getMOHTheatreReport } from "../../services/api";

export default function TheatreEmergencyReport() {
  return <MOHReportBase
    title="Theatre, Emergency, Blood & Referrals" subtitle="Operations, casualty attendance, blood services, referral flow"
    fetchFn={getMOHTheatreReport} exportFilename="moh_theatre_emergency"
    cardsConfig={[
      { key: "total_surgeries", label: "Total Surgeries" }, { key: "completed_surgeries", label: "Completed" },
      { key: "emergency_surgeries", label: "Emergency Surgeries" }, { key: "total_emergency_visits", label: "ED Visits" },
      { key: "blood_units_collected", label: "Blood Collected" }, { key: "blood_units_issued", label: "Blood Issued" },
      { key: "referrals_received", label: "Referrals In" }, { key: "referrals_sent", label: "Referrals Out" },
    ]}
    chartsConfig={[]}
  />;
}
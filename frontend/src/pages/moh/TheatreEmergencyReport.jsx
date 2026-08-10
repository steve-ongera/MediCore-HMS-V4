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
    detailTable={{
      endpoint: "/moh/theatre-emergency-blood-referral/referrals/",
      title: "Referral Records",
      searchPlaceholder: "Search referral #, patient, facility, reason...",
      columns: [
        { key: "referral_number", label: "Referral #" },
        { key: "patient_name", label: "Patient" },
        { key: "direction", label: "Direction" },
        { key: "facility_name", label: "Facility" },
        { key: "status", label: "Status" },
        { key: "receiving_doctor_name", label: "Receiving Doctor" },
        { key: "created_at_display", label: "Created" },
        { key: "resolved_at", label: "Resolved" },
      ],
      filters: [
        { key: "direction", label: "Direction", options: [
          { value: "INCOMING", label: "Incoming" },
          { value: "OUTGOING", label: "Outgoing" },
        ]},
        { key: "status", label: "Status", options: [
          { value: "PENDING", label: "Pending" },
          { value: "ACCEPTED", label: "Accepted" },
          { value: "COMPLETED", label: "Completed" },
          { value: "DECLINED", label: "Declined" },
        ]},
      ],
    }}
  />;
}
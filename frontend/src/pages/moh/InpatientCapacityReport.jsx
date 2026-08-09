import MOHReportBase from "./MOHReportBase.jsx";
import { getMOHInpatientCapacityReport } from "../../services/api";

export default function InpatientCapacityReport() {
  return <MOHReportBase
    title="Inpatient Capacity & Bed Utilization" subtitle="Admissions, discharges, length of stay, ward occupancy"
    fetchFn={getMOHInpatientCapacityReport} exportFilename="moh_inpatient_capacity_report"
    cardsConfig={[
      { key: "total_admissions", label: "Total Admissions" },
      { key: "total_discharges", label: "Total Discharges" },
      { key: "average_length_of_stay_days", label: "Avg. Length of Stay", suffix: "days" },
      { key: "total_beds", label: "Total Beds" },
      { key: "currently_occupied_beds", label: "Occupied Beds" },
      { key: "bed_occupancy_rate_percent", label: "Occupancy Rate", suffix: "%" },
      { key: "icu_total_beds", label: "ICU Beds" },
      { key: "icu_occupied_beds", label: "ICU Occupied" },
    ]}
    chartsConfig={[
      { dataKey: "admission_trend", title: "Admission Trend", type: "line" },
      { dataKey: "by_ward", title: "Occupancy by Ward", type: "bar", horizontal: true },
    ]}
    detailTable={{
      endpoint: "/moh/inpatient-capacity/admissions/",
      title: "Admission Records",
      searchPlaceholder: "Search admission #, patient, diagnosis...",
      columns: [
        { key: "admission_number", label: "Admission #" },
        { key: "patient_name", label: "Patient" },
        { key: "admission_date", label: "Admitted" },
        { key: "admission_type", label: "Type" },
        { key: "ward", label: "Ward" },
        { key: "bed_number", label: "Bed" },
        { key: "attending_doctor_name", label: "Doctor" },
        { key: "status", label: "Status" },
        { key: "discharge_date", label: "Discharged" },
        { key: "discharge_type", label: "Discharge Type" },
        { key: "length_of_stay_days", label: "LOS (days)" },
      ],
      filters: [
        { key: "status", label: "Status", options: [
          { value: "ADMITTED", label: "Admitted" },
          { value: "DISCHARGED", label: "Discharged" },
          { value: "TRANSFERRED_OUT", label: "Transferred Out" },
          { value: "DECEASED", label: "Deceased" },
          { value: "ABSCONDED", label: "Absconded" },
        ]},
        { key: "admission_type", label: "Type", options: [
          { value: "EMERGENCY", label: "Emergency" },
          { value: "ELECTIVE", label: "Elective" },
          { value: "TRANSFER_IN", label: "Transfer In" },
          { value: "MATERNITY", label: "Maternity" },
        ]},
        { key: "discharge_type", label: "Discharge Type", options: [
          { value: "NORMAL", label: "Normal" },
          { value: "DAMA", label: "DAMA" },
          { value: "REFERRED", label: "Referred" },
          { value: "DECEASED", label: "Deceased" },
          { value: "ABSCONDED", label: "Absconded" },
        ]},
      ],
    }}
  />;
}
import MOHReportBase from "./MOHReportBase.jsx";
import { getMOHInpatientReport } from "../../services/api";

export default function InpatientCapacityReport() {
  return <MOHReportBase
    title="Inpatient & Facility Capacity" subtitle="Admissions, discharges, bed occupancy, length of stay"
    fetchFn={getMOHInpatientReport} exportFilename="moh_inpatient_report"
    cardsConfig={[
      { key: "total_admissions", label: "Admissions" }, { key: "total_discharges", label: "Discharges" },
      { key: "average_length_of_stay_days", label: "Avg. Length of Stay", suffix: " days" },
      { key: "total_beds", label: "Total Beds" }, { key: "currently_occupied_beds", label: "Occupied Beds" },
      { key: "bed_occupancy_rate_percent", label: "Occupancy Rate", suffix: "%" },
      { key: "icu_total_beds", label: "ICU Beds" }, { key: "icu_occupied_beds", label: "ICU Occupied" },
    ]}
    chartsConfig={[{ dataKey: "admission_trend", title: "Admissions Over Time", type: "line" }]}
  />;
}
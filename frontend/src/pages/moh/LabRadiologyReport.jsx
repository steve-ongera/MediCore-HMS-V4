import MOHReportBase from "./MOHReportBase.jsx";
import { getMOHLabRadiologyReport } from "../../services/api";

export default function LabRadiologyReport() {
  return <MOHReportBase
    title="Laboratory & Radiology" subtitle="Test workload, turnaround time, imaging by modality"
    fetchFn={getMOHLabRadiologyReport} exportFilename="moh_lab_radiology"
    cardsConfig={[
      { key: "total_lab_orders", label: "Lab Orders" }, { key: "lab_orders_completed", label: "Lab Completed" },
      { key: "average_lab_turnaround_hours", label: "Avg. Turnaround", suffix: " hrs" },
      { key: "total_radiology_orders", label: "Radiology Orders" }, { key: "radiology_reported", label: "Radiology Reported" },
    ]}
    chartsConfig={[
      { dataKey: "lab_by_test", title: "Lab Tests Performed", type: "bar", horizontal: true },
      { dataKey: "radiology_by_modality", title: "Radiology by Modality", type: "bar", horizontal: true },
    ]}
  />;
}
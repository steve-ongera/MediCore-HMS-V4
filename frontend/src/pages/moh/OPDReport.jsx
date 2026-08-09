import MOHReportBase from "./MOHReportBase.jsx";
import { getMOHOpdReport } from "../../services/api";

export default function OPDReport() {
  return <MOHReportBase
    title="OPD & Outpatient Utilization" subtitle="Attendance, new vs returning, department distribution"
    fetchFn={getMOHOpdReport} exportFilename="moh_opd_report"
    cardsConfig={[
      { key: "total_visits", label: "Total Visits" }, { key: "unique_patients", label: "Unique Patients" },
      { key: "new_patients", label: "New Patients" }, { key: "returning_patients", label: "Returning Patients" },
      { key: "male_patients", label: "Male Patients" }, { key: "female_patients", label: "Female Patients" },
    ]}
    chartsConfig={[
      { dataKey: "by_department", title: "Visits by Department", type: "bar" },
      { dataKey: "by_consultation_type", title: "Visits by Type", type: "pie" },
    ]}
    detailTable={{
      endpoint: "/moh/opd/visits/",
      title: "Visit Records",
      searchPlaceholder: "Search patient name...",
      columns: [
        { key: "patient_name", label: "Patient" },
        { key: "patient_gender", label: "Gender" },
        { key: "visit_date", label: "Visit Date" },
        { key: "department_name", label: "Department" },
        { key: "consultation_type", label: "Type" },
      ],
      filters: [
        { key: "gender", label: "Gender", options: [
          { value: "MALE", label: "Male" },
          { value: "FEMALE", label: "Female" },
        ]},
      ],
    }}
  />;
}
import MOHReportBase from "./MOHReportBase.jsx";
import { getMOHDiseaseReport } from "../../services/api";

export default function DiseaseSurveillanceReport() {
  return <MOHReportBase
    title="Disease Surveillance" subtitle="Priority diseases and top diagnoses"
    fetchFn={getMOHDiseaseReport} exportFilename="moh_disease_surveillance"
    cardsConfig={[{ key: "total_diagnoses_coded", label: "Total Diagnoses Coded" }]}
    chartsConfig={[
      { dataKey: "priority_diseases", title: "Priority Diseases (Malaria, TB, HIV, etc.)", type: "bar" },
      { dataKey: "top_diagnoses", title: "Top 20 Diagnoses", type: "bar", horizontal: true },
    ]}
    detailTable={{
      endpoint: "/moh/disease-surveillance/diagnoses/",
      title: "Diagnosis Records",
      searchPlaceholder: "Search ICD-10 code, description, patient...",
      columns: [
        { key: "patient_name", label: "Patient" },
        { key: "consultation_date", label: "Consultation Date" },
        { key: "icd10_code_display", label: "ICD-10 Code" },
        { key: "diagnosis_description", label: "Diagnosis" },
      ],
      filters: [],
    }}
  />;
}
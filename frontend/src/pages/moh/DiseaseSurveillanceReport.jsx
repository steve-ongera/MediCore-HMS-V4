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
  />;
}
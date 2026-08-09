import MOHReportBase from "./MOHReportBase.jsx";
import { getMOHMortalityReport } from "../../services/api";

export default function MortalityReport() {
  return <MOHReportBase
    title="Mortality Report" subtitle="Deaths by cause, sex, and trend"
    fetchFn={getMOHMortalityReport} exportFilename="moh_mortality_report"
    cardsConfig={[
      { key: "total_deaths", label: "Total Deaths" }, { key: "male_deaths", label: "Male" }, { key: "female_deaths", label: "Female" },
    ]}
    chartsConfig={[
      { dataKey: "trend", title: "Deaths Over Time", type: "line" },
      { dataKey: "by_cause", title: "Top Causes of Death", type: "bar", horizontal: true },
    ]}
    detailTable={{
      endpoint: "/moh/mortality/deaths/",
      title: "Death Register Records",
      searchPlaceholder: "Search name, registration #, cause...",
      columns: [
        { key: "registration_number", label: "Reg #" },
        { key: "deceased_name", label: "Deceased" },
        { key: "patient_gender", label: "Gender" },
        { key: "date_of_death", label: "Date of Death" },
        { key: "cause_of_death", label: "Cause of Death" },
        { key: "certifying_doctor_name", label: "Certifying Doctor" },
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
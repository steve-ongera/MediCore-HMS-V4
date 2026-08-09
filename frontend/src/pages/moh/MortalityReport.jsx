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
  />;
}
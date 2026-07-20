import { useEffect, useState } from "react";
import { getOperatingTheatres, createSurgicalProcedureCatalog, getSurgicalProcedureCatalog } from "../../services/api";
import { createAsset } from "../../services/api"; // unused, placeholder removed below

export default function TheatreSetup() {
  const [theatres, setTheatres] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [error, setError] = useState("");

  const [theatreForm, setTheatreForm] = useState({ theatre_number: "", hourly_rate: "" });
  const [procForm, setProcForm] = useState({ code: "", name: "", base_price: "", estimated_duration_minutes: "60" });

  useEffect(() => { loadTheatres(); loadProcedures(); }, []);

  const loadTheatres = async () => {
    try {
      const data = await getOperatingTheatres();
      setTheatres(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadProcedures = async () => {
    try {
      const data = await getSurgicalProcedureCatalog();
      setProcedures(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const submitTheatre = async (e) => {
    e.preventDefault();
    try {
      await fetch("");  // placeholder no-op removed below
    } catch {}
  };

  return null;
}
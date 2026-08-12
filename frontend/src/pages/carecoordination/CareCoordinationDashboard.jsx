import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getFollowUpDashboard, getMyFollowUpTasks, getOverdueFollowUps } from "../../services/api";

const COLORS = ["#2962FF", "#FFAB00", "#FF5252", "#00C48C", "#9333EA", "#64748b"];

export default function CareCoordinationDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [d, mt, ov] = await Promise.all([getFollowUpDashboard(), getMyFollowUpTasks(), getOverdueFollowUps()]);
      setDashboard(d); setMyTasks(mt); setOverdue(ov);
    } catch (err) { setError(err.message); }
  };

  if (!dashboard) return <div>Loading...</div>;

  return (
    <div>
      <h1>Care Coordination</h1>
      <p>Patient follow-up tracking, chronic disease monitoring, and missed-appointment escalation across the whole hospital.</p>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <Link to="/care-coordination/care-plans"><button type="button">All Care Plans</button></Link>{" "}
      <Link to="/care-coordination/all-tasks"><button type="button">All Follow-up Tasks</button></Link>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", margin: "16px 0" }}>
        <div><strong>Due Today</strong><h2>{dashboard.due_today}</h2></div>
        <div><strong>Overdue</strong><h2 style={{ color: "orange" }}>{dashboard.overdue}</h2></div>
        <div><strong>Escalated</strong><h2 style={{ color: "red" }}>{dashboard.escalated}</h2></div>
        <div><strong>Missed (this data)</strong><h2>{dashboard.missed_this_month}</h2></div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={dashboard.by_status} dataKey="value" nameKey="name" outerRadius={85} label>
            {dashboard.by_status.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip /><Legend />
        </PieChart>
      </ResponsiveContainer>

      <h2>My Follow-up Tasks</h2>
      <table>
        <thead><tr><th>Patient</th><th>Task</th><th>Due</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {myTasks.map((t) => (
            <tr key={t.id} style={{ background: t.status === "OVERDUE" || t.status === "ESCALATED" ? "#fee" : "inherit" }}>
              <td>{t.patient_name}</td><td>{t.description}</td><td>{t.due_date}</td><td>{t.status}</td>
              <td><Link to={`/care-coordination/care-plans/${t.care_plan}`}>View Plan</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      {myTasks.length === 0 && <p>No follow-up tasks assigned to you.</p>}

      <h2>Overdue / Escalated (All)</h2>
      <table>
        <thead><tr><th>Patient</th><th>Task</th><th>Due</th><th>Assigned To</th><th>Status</th></tr></thead>
        <tbody>
          {overdue.map((t) => (
            <tr key={t.id} style={{ background: "#fee" }}>
              <td>{t.patient_name}</td><td>{t.description}</td><td>{t.due_date}</td>
              <td>{t.assigned_to_name || "Unassigned"}</td><td>{t.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {overdue.length === 0 && <p>Nothing overdue right now.</p>}
    </div>
  );
}
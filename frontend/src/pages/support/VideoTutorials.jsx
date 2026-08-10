import { useState } from "react";

const TUTORIAL_CATEGORIES = [
  {
    category: "Getting Started",
    videos: [
      { title: "MediCore HMIS — Full System Overview", duration: "12:30", url: "#" },
      { title: "Logging In & Two-Factor Authentication", duration: "3:15", url: "#" },
      { title: "Understanding Your Role Dashboard", duration: "5:40", url: "#" },
    ],
  },
  {
    category: "Front Desk & Registration",
    videos: [
      { title: "Registering a New Patient", duration: "6:20", url: "#" },
      { title: "Registering a Visit & Queue Assignment", duration: "4:10", url: "#" },
    ],
  },
  {
    category: "Billing & Payments",
    videos: [
      { title: "Processing a Single Invoice Payment", duration: "5:00", url: "#" },
      { title: "Using Bulk Payment for Multiple Invoices", duration: "7:45", url: "#" },
      { title: "Opening & Closing Your Cash Till", duration: "4:30", url: "#" },
      { title: "Requesting and Approving Refunds", duration: "5:15", url: "#" },
    ],
  },
  {
    category: "Clinical Workflow",
    videos: [
      { title: "Doctor Consultation Workflow", duration: "9:00", url: "#" },
      { title: "Nurse Triage & Vitals Recording", duration: "6:00", url: "#" },
      { title: "Ordering Lab & Radiology Tests", duration: "5:30", url: "#" },
    ],
  },
  {
    category: "Pharmacy",
    videos: [
      { title: "Two-Stage Dispensing: Prepare & Complete", duration: "8:10", url: "#" },
      { title: "Managing Stock Locations & Transfers", duration: "7:00", url: "#" },
    ],
  },
  {
    category: "Inpatient & Specialized Units",
    videos: [
      { title: "Admitting a Patient & Bed Management", duration: "6:45", url: "#" },
      { title: "ICU/HDU Monitoring", duration: "5:20", url: "#" },
      { title: "Theatre Booking & Surgery Workflow", duration: "8:30", url: "#" },
    ],
  },
  {
    category: "Administration",
    videos: [
      { title: "Managing Staff Accounts (IT Support)", duration: "6:00", url: "#" },
      { title: "Understanding Your License & Capacity", duration: "3:40", url: "#" },
      { title: "Raising & Approving Requisitions", duration: "7:20", url: "#" },
    ],
  },
];

export default function VideoTutorials() {
  const [search, setSearch] = useState("");

  const filtered = TUTORIAL_CATEGORIES.map((cat) => ({
    ...cat,
    videos: cat.videos.filter((v) => v.title.toLowerCase().includes(search.toLowerCase())),
  })).filter((cat) => cat.videos.length > 0);

  return (
    <div>
      <h1>Video Tutorials</h1>
      <p>Step-by-step video guides for every module in MediCore HMIS.</p>

      <input
        type="text"
        placeholder="Search tutorials..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.map((cat) => (
        <section key={cat.category}>
          <h2>{cat.category}</h2>
          <table>
            <thead><tr><th>Title</th><th>Duration</th><th></th></tr></thead>
            <tbody>
              {cat.videos.map((v) => (
                <tr key={v.title}>
                  <td>{v.title}</td>
                  <td>{v.duration}</td>
                  <td><a href={v.url} target="_blank" rel="noreferrer">Watch</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      {filtered.length === 0 && <p>No tutorials match your search.</p>}
    </div>
  );
}
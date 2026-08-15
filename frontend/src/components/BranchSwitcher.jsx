// src/components/BranchSwitcher.jsx
import { useEffect, useState } from "react";
import { getMyAccessibleBranches } from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";

export default function BranchSwitcher() {
  const { user, isGroupAdmin } = useAuth();

  const [branches, setBranches] = useState([]);
  const [current, setCurrent] = useState(localStorage.getItem("current_branch_id") || "");

  useEffect(() => {
    if (isGroupAdmin) load();
  }, [isGroupAdmin]);

  const load = async () => {
    try {
      const data = await getMyAccessibleBranches();
      setBranches(data);
    } catch {
      /* silent */
    }
  };

  const handleChange = (e) => {
    const branchId = e.target.value;
    setCurrent(branchId);
    if (branchId) {
      localStorage.setItem("current_branch_id", branchId);
    } else {
      localStorage.removeItem("current_branch_id");
    }
    window.location.reload(); // simplest way to ensure every page's data refetches under the new branch context
  };

  // GROUP_ADMIN: switchable dropdown across every branch they can access
  if (isGroupAdmin) {
    return (
      <div className="navbar__branch-switcher">
        <i className="bi bi-building navbar__branch-icon" aria-hidden="true"></i>
        <select
          className="navbar__branch-select"
          value={current}
          onChange={handleChange}
          title="Viewing branch"
        >
          <option value="">All Branches (Group View)</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.level})
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Everyone else: read-only badge showing their own assigned branch — no switching
  return (
    <div className="navbar__branch-badge" title="Your assigned branch">
      <i className="bi bi-geo-alt" aria-hidden="true"></i>
      <span>{user?.branch_name || "No Branch"}</span>
    </div>
  );
}
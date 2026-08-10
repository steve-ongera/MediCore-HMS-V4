import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers, startConversation } from "../../services/api";

export default function StaffDirectory() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getUsers({ page_size: 200 });
      setUsers(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (userId) => {
    try {
      const conv = await startConversation(userId);
      navigate(`/messages/${conv.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const filtered = users.filter((u) => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading staff directory...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Communication</div>
          <h1 className="page-title">Staff Directory</h1>
          <p className="page-subtitle">Find and message staff members</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle  me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="search-bar" style={{ width: "280px" }}>
              <i className="bi bi-search search-bar__icon"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search by name or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="search-bar__clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {filtered.length} staff member{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-people"></i>
              </div>
              <h3 className="empty-state__title">
                {search ? "No staff members found" : "No staff members available"}
              </h3>
              <p className="empty-state__desc">
                {search 
                  ? `No staff members match "${search}".` 
                  : "No staff members are currently available."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div 
                            className="avatar avatar-sm" 
                            style={{ 
                              background: "var(--primary-50)", 
                              color: "var(--primary-600)",
                              fontWeight: 600,
                              fontSize: "12px",
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}
                          >
                            {getInitials(u.full_name)}
                          </div>
                          <div>
                            <div className="cell-primary" style={{ fontWeight: 500 }}>
                              {u.full_name}
                            </div>
                            <div className="text-2xs text-tertiary">{u.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="tag">{u.role}</span>
                      </td>
                      <td>
                        <span className={`badge ${u.is_active ? "badge-success" : "badge-neutral"}`}>
                          <span className="badge-dot"></span>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => handleChat(u.id)}
                          disabled={!u.is_active}
                          title={!u.is_active ? "User is inactive" : "Start conversation"}
                        >
                          <i className="bi bi-chat-left  me-1"></i> Message
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {filtered.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {filtered.length} staff member{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
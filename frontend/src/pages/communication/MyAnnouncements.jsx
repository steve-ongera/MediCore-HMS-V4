import { useEffect, useState } from "react";
import { getMyAnnouncements, markAnnouncementRead } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

export default function MyAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMyAnnouncements();
      setAnnouncements(data?.results ?? data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAnnouncement = async (a) => {
    try { await markAnnouncementRead(a.id); } catch { /* silent */ }
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      "GENERAL": "badge-info",
      "TRAINING": "badge-primary",
      "MAINTENANCE": "badge-warning",
      "POLICY": "badge-secondary",
      "EMERGENCY": "badge-danger",
      "HR_NOTICE": "badge-success",
    };
    return typeMap[type] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading announcements...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Communication</div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Stay updated with hospital announcements</p>
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
            <i className="bi bi-megaphone  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>All Announcements</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body">
          {announcements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-megaphone"></i>
              </div>
              <h3 className="empty-state__title">No announcements yet</h3>
              <p className="empty-state__desc">Check back later for hospital updates.</p>
            </div>
          ) : (
            <div className="announcements-list">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="announcement-card"
                  onClick={() => openAnnouncement(a)}
                >
                  <div className="announcement-card__header">
                    <div className="announcement-card__title-group">
                      <h5 className="announcement-card__title">{a.title}</h5>
                      <span className={`badge ${getTypeBadge(a.announcement_type)}`}>
                        <span className="badge-dot"></span>
                        {a.announcement_type}
                      </span>
                    </div>
                    <span className="announcement-card__time">
                      <i className="bi bi-clock  me-1"></i>
                      {formatDateTime(a.created_at_display)}
                    </span>
                  </div>

                  <div className="announcement-card__meta">
                    <span className="text-2xs text-tertiary">
                      <i className="bi bi-person  me-1"></i>
                      From: {a.created_by_name}
                    </span>
                  </div>

                  {a.event_date && (
                    <div className="announcement-card__event">
                      <i className="bi bi-calendar-event  me-1"></i>
                      <strong>Event:</strong> {formatDateTime(a.event_date)}
                    </div>
                  )}

                  <div className="announcement-card__body">
                    {a.body}
                  </div>

                  {a.image && (
                    <div className="announcement-card__image">
                      <img src={a.image} alt={a.title} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {announcements.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
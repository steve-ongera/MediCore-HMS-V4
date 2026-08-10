import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getConversations } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getConversations();
      setConversations(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading conversations...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Communication</div>
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Your conversations</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
          <Link to="/messages/directory" className="btn btn-primary">
            <i className="bi bi-plus-circle  me-1"></i> New Message
          </Link>
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
            <i className="bi bi-chat-left  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Conversations</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {conversations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-chat-dots"></i>
              </div>
              <h3 className="empty-state__title">No conversations yet</h3>
              <p className="empty-state__desc">Start a conversation from the Staff Directory.</p>
              <Link to="/messages/directory" className="btn btn-primary">
                <i className="bi bi-person-plus  me-1"></i> Find Staff
              </Link>
            </div>
          ) : (
            <div className="conversation-list">
              {conversations.map((c) => {
                const displayName = c.is_group ? c.name : c.other_participant?.name;
                const avatar = c.is_group ? "bi-people" : "bi-person";
                
                return (
                  <Link
                    key={c.id}
                    to={`/messages/${c.id}`}
                    className="conversation-item"
                  >
                    <div className="conversation-item__avatar">
                      {!c.is_group && c.other_participant?.profile_picture ? (
                        <img
                          src={c.other_participant.profile_picture}
                          alt={displayName}
                          className="avatar avatar-sm"
                        />
                      ) : (
                        <div className="avatar avatar-sm" style={{ background: "var(--primary-50)", color: "var(--primary-600)" }}>
                          {c.is_group ? (
                            <i className="bi bi-people"></i>
                          ) : (
                            getInitials(displayName)
                          )}
                        </div>
                      )}
                    </div>
                    <div className="conversation-item__content">
                      <div className="conversation-item__header">
                        <span className="conversation-item__name">{displayName || "Unknown"}</span>
                        {c.last_message && (
                          <span className="conversation-item__time">{formatDateTime(c.last_message.created_at)}</span>
                        )}
                      </div>
                      <div className="conversation-item__message">
                        {c.last_message ? c.last_message.text : "No messages yet"}
                        {c.unread_count > 0 && (
                          <span className="conversation-item__badge">{c.unread_count}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        {conversations.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
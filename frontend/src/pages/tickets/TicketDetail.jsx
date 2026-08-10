import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTicketDetail, commentOnTicket, assignTicket, startTicketProgress,
  resolveTicket, closeTicket, reopenTicket,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatDateTime } from "../../utils/formatters";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isIT = hasRole("IT_SUPPORT_OFFICER");

  const [ticket, setTicket] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [rating, setRating] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try { 
      const data = await getTicketDetail(id); 
      setTicket(data); 
    } catch (err) { 
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    try {
      await commentOnTicket(id, commentText);
      setCommentText("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssign = async () => { 
    try { await assignTicket(id); load(); } catch (err) { setError(err.message); } 
  };
  
  const handleStart = async () => { 
    try { await startTicketProgress(id); load(); } catch (err) { setError(err.message); } 
  };
  
  const handleResolve = async () => {
    try { await resolveTicket(id, { resolution_notes: resolutionNotes }); load(); } catch (err) { setError(err.message); }
  };
  
  const handleClose = async () => {
    try { await closeTicket(id, { satisfaction_rating: rating || undefined }); load(); } catch (err) { setError(err.message); }
  };
  
  const handleReopen = async () => { 
    try { await reopenTicket(id); load(); } catch (err) { setError(err.message); } 
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "OPEN": "badge-warning",
      "ASSIGNED": "badge-primary",
      "IN_PROGRESS": "badge-info",
      "RESOLVED": "badge-success",
      "CLOSED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      "CRITICAL": "badge-danger",
      "HIGH": "badge-warning",
      "MEDIUM": "badge-primary",
      "LOW": "badge-info",
    };
    return priorityMap[priority] || "badge-neutral";
  };

  const getCategoryBadge = (category) => {
    const categoryMap = {
      "HARDWARE": "badge-primary",
      "NETWORK": "badge-info",
      "SOFTWARE": "badge-success",
      "CCTV": "badge-warning",
      "TELEPHONY": "badge-secondary",
      "ACCOUNT_ACCESS": "badge-danger",
      "OTHER": "badge-neutral",
    };
    return categoryMap[category] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading ticket details...</span>
      </div>
    );
  }

  if (!ticket) return null;

  const isOwner = user?.id === ticket.raised_by;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">IT Support</div>
          <h1 className="page-title">{ticket.ticket_number}</h1>
          <p className="page-subtitle">{ticket.subject}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left  me-1"></i> Back
          </button>
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

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-ticket fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{ticket.ticket_number}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-person  me-1"></i> {ticket.raised_by_name}
                </span>
                <span>•</span>
                <span>{ticket.raised_by_role}</span>
                <span>•</span>
                <span className={`badge ${getCategoryBadge(ticket.category)}`}>
                  <span className="badge-dot"></span>
                  {ticket.category}
                </span>
                <span>•</span>
                <span className={`badge ${getPriorityBadge(ticket.priority)}`}>
                  <span className="badge-dot"></span>
                  {ticket.priority}
                </span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(ticket.status)}`}>
                  <span className="badge-dot"></span>
                  {ticket.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-clock  me-1"></i> Created {formatDateTime(ticket.created_at)}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Location</div>
              <div className="info-item__value">{ticket.location || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Assigned To</div>
              <div className="info-item__value">{ticket.assigned_to_name || "Unassigned"}</div>
            </div>
            {ticket.resolution_hours != null && (
              <div className="info-item">
                <div className="info-item__label">Resolution Time</div>
                <div className="info-item__value">{ticket.resolution_hours} hours</div>
              </div>
            )}
            {ticket.satisfaction_rating && (
              <div className="info-item">
                <div className="info-item__label">Satisfaction Rating</div>
                <div className="info-item__value">
                  <span className="badge badge-success">
                    <span className="badge-dot"></span>
                    {ticket.satisfaction_rating}/5
                  </span>
                </div>
              </div>
            )}
            <div className="info-item" style={{ gridColumn: "span 2" }}>
              <div className="info-item__label">Description</div>
              <div className="info-item__value">{ticket.description}</div>
            </div>
            {ticket.resolution_notes && (
              <div className="info-item" style={{ gridColumn: "span 2" }}>
                <div className="info-item__label">Resolution Notes</div>
                <div className="info-item__value">{ticket.resolution_notes}</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap" style={{ marginTop: "var(--space-3)" }}>
            {isIT && ticket.status === "OPEN" && (
              <button className="btn btn-primary" onClick={handleAssign}>
                <i className="bi bi-person-check  me-1"></i> Assign to Me
              </button>
            )}
            {isIT && ticket.status === "ASSIGNED" && (
              <button className="btn btn-primary" onClick={handleStart}>
                <i className="bi bi-play-circle  me-1"></i> Start Working
              </button>
            )}
            {isIT && (ticket.status === "ASSIGNED" || ticket.status === "IN_PROGRESS") && (
              <div className="flex gap-2" style={{ flexWrap: "wrap", width: "100%" }}>
                <textarea
                  className="textarea"
                  placeholder="Resolution notes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  style={{ flex: 1, minWidth: "200px" }}
                />
                <button className="btn btn-success" onClick={handleResolve}>
                  <i className="bi bi-check-circle  me-1"></i> Mark Resolved
                </button>
              </div>
            )}
            {(isOwner || isIT) && ticket.status === "RESOLVED" && (
              <div className="flex gap-2" style={{ flexWrap: "wrap", width: "100%" }}>
                <select
                  className="select"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  style={{ width: "200px" }}
                >
                  <option value="">Rate the resolution (optional)</option>
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Average</option>
                  <option value="2">2 - Poor</option>
                  <option value="1">1 - Very Poor</option>
                </select>
                <button className="btn btn-primary" onClick={handleClose}>
                  <i className="bi bi-check-circle  me-1"></i> Confirm & Close
                </button>
              </div>
            )}
            {(isOwner || isIT) && (ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (
              <button className="btn btn-warning" onClick={handleReopen}>
                <i className="bi bi-arrow-repeat  me-1"></i> Reopen — Issue Not Fixed
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-chat-dots  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Comments</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {ticket.comments.length} comment{ticket.comments.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body">
          {ticket.comments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-chat-dots"></i>
              </div>
              <h3 className="empty-state__title">No comments</h3>
              <p className="empty-state__desc">Add a comment to start the conversation.</p>
            </div>
          ) : (
            <div className="comments-list">
              {ticket.comments.map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="comment-item__avatar">
                    <span className="avatar avatar-sm">
                      {c.author_name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="comment-item__content">
                    <div className="comment-item__header">
                      <span className="comment-item__author">{c.author_name}</span>
                      <span className="comment-item__time">{formatDateTime(c.created_at)}</span>
                    </div>
                    <div className="comment-item__text">{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={submitComment} className="flex gap-2" style={{ marginTop: "var(--space-3)" }}>
            <input
              type="text"
              className="input"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">
              <i className="bi bi-send  me-1"></i> Post
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
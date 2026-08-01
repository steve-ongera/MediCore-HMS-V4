import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getConversations, getUnreadMessageCount } from "../services/api";
import "./ChatDropdown.css";

export default function ChatDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) loadConversations();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadUnread = async () => {
    try {
      const data = await getUnreadMessageCount();
      setUnreadCount(data.unread_count);
    } catch {
      // silent — don't spam errors from a background poll
    }
  };

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      // getConversations() returns a paginated DRF response ({ results, count,
      // next, previous }), not a bare array — unwrap it the same way every
      // other list loader in this app does, or conversations.map() blows up.
      setConversations(data.results ?? data);
    } catch {
      // silent
    }
  };

  const openConversation = (id) => {
    setOpen(false);
    navigate(`/messages/${id}`);
  };

  return (
    <div ref={dropdownRef} className="chat-dropdown">
      <button
        type="button"
        className="navbar__icon-btn chat-dropdown__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label="Messages"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <i className="bi bi-chat-left" style={{ fontSize: 17 }} aria-hidden="true"></i>
        {unreadCount > 0 && (
          <span className="chat-dropdown__badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="chat-dropdown__panel">
          <div className="chat-dropdown__header">
            <strong>Messages</strong>
            <button
              type="button"
              className="chat-dropdown__new-btn"
              onClick={() => { setOpen(false); navigate("/messages"); }}
            >
              New Chat
            </button>
          </div>

          {conversations.length === 0 ? (
            <p className="chat-dropdown__empty">No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={`chat-dropdown__item${c.unread_count > 0 ? " is-unread" : ""}`}
              >
                <div className="chat-dropdown__item-title">
                  {c.is_group ? c.name : c.other_participant?.name || "Unknown"}
                  {c.other_participant?.role && (
                    <small className="chat-dropdown__item-role"> ({c.other_participant.role})</small>
                  )}
                </div>
                <div className="chat-dropdown__item-preview">
                  {c.last_message ? `${c.last_message.sender_name}: ${c.last_message.text.slice(0, 40)}` : "No messages yet"}
                </div>
                {c.unread_count > 0 && (
                  <span className="chat-dropdown__item-count">{c.unread_count} new</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
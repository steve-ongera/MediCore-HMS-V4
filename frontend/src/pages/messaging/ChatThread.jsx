import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getConversationMessages, sendMessage, markConversationRead, getConversations } from "../../services/api";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatDateTime } from "../../utils/formatters";

export default function ChatThread() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    loadThread();
    markConversationRead(id).catch(() => {});
    const interval = setInterval(loadMessages, 8000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadThread = async () => {
    setLoading(true);
    try {
      const [msgs, convs] = await Promise.all([getConversationMessages(id), getConversations()]);
      setMessages(msgs);
      setConversation(convs.find((c) => c.id === id) || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const msgs = await getConversationMessages(id);
      setMessages(msgs);
      markConversationRead(id).catch(() => {});
    } catch {
      // silent on background poll
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await sendMessage(id, text);
      setText("");
      loadMessages();
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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading conversation...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Communication</div>
          <h1 className="page-title">
            {conversation?.is_group ? conversation.name : conversation?.other_participant?.name || "Chat"}
          </h1>
          <p className="page-subtitle">
            {conversation?.is_group 
              ? `${conversation.participants?.length || 0} participants` 
              : "Direct message"}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/messages")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Messages
          </button>
          <button className="btn btn-secondary" onClick={loadMessages}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-2"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {/* Conversation Info */}
          <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-3)" }}>
            <div className="avatar avatar-sm" style={{ background: "var(--primary-50)", color: "var(--primary-600)" }}>
              {conversation?.is_group ? (
                <i className="bi bi-people"></i>
              ) : (
                getInitials(conversation?.other_participant?.name)
              )}
            </div>
            <div>
              <div className="font-semibold">
                {conversation?.is_group ? conversation.name : conversation?.other_participant?.name || "Unknown"}
              </div>
              <div className="text-2xs text-tertiary">
                {conversation?.is_group ? `${conversation.participants?.length || 0} members` : "Online"}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div 
            className="chat-messages"
            style={{
              height: 420,
              overflowY: "auto",
              padding: "var(--space-3)",
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius)",
              marginBottom: "var(--space-3)"
            }}
          >
            {messages.length === 0 ? (
              <div className="empty-state" style={{ padding: "var(--space-6)" }}>
                <div className="empty-state__icon">
                  <i className="bi bi-chat-dots"></i>
                </div>
                <h3 className="empty-state__title">No messages yet</h3>
                <p className="empty-state__desc">Start the conversation by sending a message.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMine = m.sender === user?.id;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: isMine ? "flex-end" : "flex-start",
                      marginBottom: "var(--space-2)"
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        padding: "var(--space-2) var(--space-3)",
                        borderRadius: "var(--radius)",
                        background: isMine ? "var(--primary-50)" : "var(--surface-color)",
                        border: isMine ? "1px solid var(--primary-200)" : "1px solid var(--border-color)",
                      }}
                    >
                      <div className="text-2xs text-tertiary" style={{ marginBottom: "2px" }}>
                        {m.sender_name}
                      </div>
                      <div className="text-sm">{m.text}</div>
                      <div className="text-2xs text-tertiary" style={{ marginTop: "4px", textAlign: isMine ? "right" : "left" }}>
                        {formatDateTime(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              className="input"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!text.trim()}
            >
              <i className="bi bi-send me-2"></i> Send
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
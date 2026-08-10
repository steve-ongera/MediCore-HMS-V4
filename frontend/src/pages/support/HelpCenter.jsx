import { useState } from "react";
import { Link } from "react-router-dom";

const FAQ_CATEGORIES = [
  {
    category: "Account & Login",
    icon: "bi-person-circle",
    items: [
      { 
        q: "I forgot my password. What do I do?", 
        a: "Contact your IT Support Officer or Super Admin — they can reset your password directly from Staff Accounts. You do not need your old password for this." 
      },
      { 
        q: "Why did I get logged out automatically?", 
        a: "MediCore automatically logs you out after 5 minutes of inactivity for security. Simply log back in to continue." 
      },
      { 
        q: "I'm not receiving my login verification code.", 
        a: "Check your spam/junk folder. If it still doesn't arrive, use the 'Resend Code' button, or contact IT Support if the issue persists." 
      },
    ],
  },
  {
    category: "Billing",
    icon: "bi-credit-card",
    items: [
      { 
        q: "Why can't I process a payment?", 
        a: "Cashiers must open their Cash Till at the start of each shift before any billing action is allowed. Go to Billing → Cash Till to open your till." 
      },
      { 
        q: "How do I pay off multiple invoices for one patient at once?", 
        a: "Use Billing → Bulk Payment. Search the patient, select the invoices to cover, and enter any amount up to the combined total — even a partial amount." 
      },
      { 
        q: "How do I request a refund?", 
        a: "Go to Billing → Request Refund, search for the original payment, and submit the amount and reason. An Accountant or Super Admin must approve it before it's processed." 
      },
    ],
  },
  {
    category: "Pharmacy",
    icon: "bi-capsule",
    items: [
      { 
        q: "Why is my prescription stuck in 'Awaiting Payment'?", 
        a: "The invoice raised for that dispense hasn't been fully paid yet. Direct the patient to Billing to settle the balance — the pharmacy item will move to 'Ready to Complete' automatically once payment clears." 
      },
      { 
        q: "Why can't I give a medication dose again?", 
        a: "The system enforces real dosing intervals server-side based on the prescribed frequency — a dose can't be repeated until it's actually due, even after a page refresh." 
      },
    ],
  },
  {
    category: "Requisitions & Procurement",
    icon: "bi-box-seam",
    items: [
      { 
        q: "Why was my requisition rejected before it even reached Procurement?", 
        a: "Every requisition must be tied to your own department's active budget line, and cannot exceed the amount currently available on it. Check Finance → Budgets to see your department's real-time available balance." 
      },
      { 
        q: "Who approves my requisition?", 
        a: "Your department's designated Head of Department (HOD) approves first; once approved, it moves to Procurement to become a Purchase Order." 
      },
    ],
  },
  {
    category: "System & Licensing",
    icon: "bi-gear",
    items: [
      { 
        q: "Why can't I add a new staff account or bed?", 
        a: "Your facility's license has a maximum number of beds and user accounts based on your package. Check Settings → License Status to see current usage, and contact MediCore support to upgrade if you've reached the limit." 
      },
      { 
        q: "Can I edit our license limits myself?", 
        a: "No — license limits can only be changed by MediCore's support team, not by your facility's Super Admin. This is by design. Use the Contact Us page to request a change." 
      },
    ],
  },
];

export default function HelpCenter() {
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState(null);

  const filtered = FAQ_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (i) => i.q.toLowerCase().includes(search.toLowerCase()) || 
              i.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  const totalResults = filtered.reduce((acc, cat) => acc + cat.items.length, 0);

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Support</div>
          <h1 className="page-title">Help Center</h1>
          <p className="page-subtitle">
            Answers to common questions. Can't find what you need?{" "}
            <Link to="/contact-us">Contact Us</Link>
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="search-bar" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <i className="search-bar__icon bi bi-search"></i>
            <input
              type="text"
              className="search-bar__input"
              placeholder="Search help articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "var(--space-8)" }}
            />
            {search && (
              <button 
                className="search-bar__clear" 
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
          
          {/* Search Results Count */}
          {search && (
            <div className="text-center mt-3">
              <span className="text-sm text-muted">
                Found {totalResults} article{totalResults !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* FAQ Categories */}
      <div className="flex flex-col gap-6">
        {filtered.map((cat) => (
          <div key={cat.category} className="card">
            {/* Category Header */}
            <div className="card-header">
              <div className="flex items-center gap-3">
                <div className="stat-card__icon tone-info" style={{ width: "40px", height: "40px" }}>
                  <i className={`bi ${cat.icon}`} style={{ fontSize: "18px" }}></i>
                </div>
                <div>
                  <h5 className="card-title">{cat.category}</h5>
                  <div className="card-subtitle">
                    {cat.items.length} article{cat.items.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Items */}
            <div className="card-body p-0">
              <div className="faq-list">
                {cat.items.map((item, i) => {
                  const key = `${cat.category}-${i}`;
                  const isOpen = openIndex === key;
                  
                  return (
                    <div 
                      key={key} 
                      className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}
                    >
                      <button
                        className="faq-item__trigger"
                        onClick={() => setOpenIndex(isOpen ? null : key)}
                        aria-expanded={isOpen}
                      >
                        <div className="faq-item__question">
                          <span className="faq-item__icon">
                            <i className={`bi ${isOpen ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i>
                          </span>
                          <span className="faq-item__text">{item.q}</span>
                        </div>
                        <span className="faq-item__badge">
                          {isOpen ? "Hide" : "Show"}
                        </span>
                      </button>
                      
                      {isOpen && (
                        <div className="faq-item__answer">
                          <div className="faq-item__answer-content">
                            <i className="bi bi-quote" style={{ 
                              color: "var(--text-tertiary)", 
                              fontSize: "20px",
                              marginRight: "var(--space-2)",
                              opacity: 0.5
                            }}></i>
                            {item.a}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="empty-state" style={{ padding: "var(--space-12) var(--space-6)" }}>
          <div className="empty-state__icon">
            <i className="bi bi-search"></i>
          </div>
          <div className="empty-state__title">No results found</div>
          <div className="empty-state__desc">
            We couldn't find any articles matching "{search}". 
            Try adjusting your search terms or{" "}
            <Link to="/contact-us">contact our support team</Link> for help.
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={() => setSearch("")}
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Help Footer */}
      <div className="card" style={{ marginTop: "var(--space-6)" }}>
        <div className="card-body" style={{ 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "var(--space-3)"
        }}>
          <div className="flex items-center gap-4 flex-wrap" style={{ justifyContent: "center" }}>
            <div className="flex items-center gap-2">
              <div className="stat-card__icon tone-success" style={{ width: "36px", height: "36px" }}>
                <i className="bi bi-chat-dots"></i>
              </div>
              <div className="text-left">
                <div className="text-2xs text-muted font-semibold uppercase">Live Chat</div>
                <div className="text-sm font-medium">Available 24/7</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="stat-card__icon tone-info" style={{ width: "36px", height: "36px" }}>
                <i className="bi bi-envelope"></i>
              </div>
              <div className="text-left">
                <div className="text-2xs text-muted font-semibold uppercase">Email</div>
                <div className="text-sm font-medium">
                  <a href="mailto:support@medicorehospital.com">support@medicorehospital.com</a>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="stat-card__icon tone-warning" style={{ width: "36px", height: "36px" }}>
                <i className="bi bi-clock"></i>
              </div>
              <div className="text-left">
                <div className="text-2xs text-muted font-semibold uppercase">Hours</div>
                <div className="text-sm font-medium">Mon–Fri, 8AM–6PM EAT</div>
              </div>
            </div>
          </div>
          
          <Link to="/contact-us" className="btn btn-primary">
            <i className="bi bi-send me-2"></i>
            Still need help? Contact Support
          </Link>
        </div>
      </div>
    </>
  );
}
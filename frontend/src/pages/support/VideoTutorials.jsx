import { useState } from "react";
import { Link } from "react-router-dom";

const TUTORIAL_CATEGORIES = [
  {
    category: "Getting Started",
    icon: "bi-rocket-takeoff",
    videos: [
      { 
        title: "MediCore HMIS — Full System Overview", 
        duration: "12:30", 
        videoId: "dQw4w9WgXcQ", // Replace with actual YouTube IDs
        description: "Complete walkthrough of the MediCore HMIS platform"
      },
      { 
        title: "Logging In & Two-Factor Authentication", 
        duration: "3:15", 
        videoId: "dQw4w9WgXcQ",
        description: "Secure login process with 2FA setup"
      },
      { 
        title: "Understanding Your Role Dashboard", 
        duration: "5:40", 
        videoId: "dQw4w9WgXcQ",
        description: "Navigate your personalized dashboard based on role"
      },
    ],
  },
  {
    category: "Front Desk & Registration",
    icon: "bi-person-plus",
    videos: [
      { 
        title: "Registering a New Patient", 
        duration: "6:20", 
        videoId: "dQw4w9WgXcQ",
        description: "Step-by-step patient registration process"
      },
      { 
        title: "Registering a Visit & Queue Assignment", 
        duration: "4:10", 
        videoId: "dQw4w9WgXcQ",
        description: "Create visits and assign patients to appropriate queues"
      },
    ],
  },
  {
    category: "Billing & Payments",
    icon: "bi-credit-card",
    videos: [
      { 
        title: "Processing a Single Invoice Payment", 
        duration: "5:00", 
        videoId: "dQw4w9WgXcQ",
        description: "Process individual invoice payments efficiently"
      },
      { 
        title: "Using Bulk Payment for Multiple Invoices", 
        duration: "7:45", 
        videoId: "dQw4w9WgXcQ",
        description: "Pay multiple invoices at once with bulk payment"
      },
      { 
        title: "Opening & Closing Your Cash Till", 
        duration: "4:30", 
        videoId: "dQw4w9WgXcQ",
        description: "Manage cash till operations for cashiers"
      },
      { 
        title: "Requesting and Approving Refunds", 
        duration: "5:15", 
        videoId: "dQw4w9WgXcQ",
        description: "Submit and approve refund requests"
      },
    ],
  },
  {
    category: "Clinical Workflow",
    icon: "bi-heart-pulse",
    videos: [
      { 
        title: "Doctor Consultation Workflow", 
        duration: "9:00", 
        videoId: "dQw4w9WgXcQ",
        description: "Complete doctor consultation process"
      },
      { 
        title: "Nurse Triage & Vitals Recording", 
        duration: "6:00", 
        videoId: "dQw4w9WgXcQ",
        description: "Patient triage and vital signs documentation"
      },
      { 
        title: "Ordering Lab & Radiology Tests", 
        duration: "5:30", 
        videoId: "dQw4w9WgXcQ",
        description: "Order and track diagnostic tests"
      },
    ],
  },
  {
    category: "Pharmacy",
    icon: "bi-capsule",
    videos: [
      { 
        title: "Two-Stage Dispensing: Prepare & Complete", 
        duration: "8:10", 
        videoId: "dQw4w9WgXcQ",
        description: "Dispensing workflow with prepare and complete stages"
      },
      { 
        title: "Managing Stock Locations & Transfers", 
        duration: "7:00", 
        videoId: "dQw4w9WgXcQ",
        description: "Stock management and location transfers"
      },
    ],
  },
  {
    category: "Inpatient & Specialized Units",
    icon: "bi-hospital",
    videos: [
      { 
        title: "Admitting a Patient & Bed Management", 
        duration: "6:45", 
        videoId: "dQw4w9WgXcQ",
        description: "Patient admission and bed assignment"
      },
      { 
        title: "ICU/HDU Monitoring", 
        duration: "5:20", 
        videoId: "dQw4w9WgXcQ",
        description: "Specialized monitoring in ICU/HDU units"
      },
      { 
        title: "Theatre Booking & Surgery Workflow", 
        duration: "8:30", 
        videoId: "dQw4w9WgXcQ",
        description: "Book theatre slots and manage surgical procedures"
      },
    ],
  },
  {
    category: "Administration",
    icon: "bi-gear",
    videos: [
      { 
        title: "Managing Staff Accounts (IT Support)", 
        duration: "6:00", 
        videoId: "dQw4w9WgXcQ",
        description: "Create and manage staff user accounts"
      },
      { 
        title: "Understanding Your License & Capacity", 
        duration: "3:40", 
        videoId: "dQw4w9WgXcQ",
        description: "Monitor license usage and facility capacity"
      },
      { 
        title: "Raising & Approving Requisitions", 
        duration: "7:20", 
        videoId: "dQw4w9WgXcQ",
        description: "Submit and approve procurement requisitions"
      },
    ],
  },
];

export default function VideoTutorials() {
  const [search, setSearch] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);

  const filtered = TUTORIAL_CATEGORIES.map((cat) => ({
    ...cat,
    videos: cat.videos.filter((v) => 
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.videos.length > 0);

  const totalResults = filtered.reduce((acc, cat) => acc + cat.videos.length, 0);

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Learning</div>
          <h1 className="page-title">Video Tutorials</h1>
          <p className="page-subtitle">
            Step-by-step video guides for every module in MediCore HMIS.
            Can't find what you need? <Link to="/help">Visit Help Center</Link>
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
              placeholder="Search tutorials by title or description..."
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
          {search && (
            <div className="text-center mt-3">
              <span className="text-sm text-muted">
                Found {totalResults} tutorial{totalResults !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="modal-overlay" onClick={() => setSelectedVideo(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{selectedVideo.title}</div>
                <div className="modal-desc">{selectedVideo.description}</div>
              </div>
              <button 
                className="modal-close" 
                onClick={() => setSelectedVideo(null)}
                aria-label="Close video"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <div style={{ 
                position: "relative", 
                paddingBottom: "56.25%", 
                height: 0,
                overflow: "hidden",
                borderRadius: "0 0 var(--radius-lg) var(--radius-lg)"
              }}>
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.videoId}`}
                  title={selectedVideo.title}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: 0,
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
            <div className="modal-footer">
              <span className="text-sm text-muted">
                <i className="bi bi-clock me-1"></i>
                Duration: {selectedVideo.duration}
              </span>
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedVideo(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Categories */}
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
                    {cat.videos.length} video{cat.videos.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Video Grid */}
            <div className="card-body">
              <div className="video-grid">
                {cat.videos.map((video) => (
                  <div 
                    key={video.title} 
                    className="video-card"
                    onClick={() => setSelectedVideo(video)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedVideo(video);
                      }
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="video-card__thumbnail">
                      <img
                        src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                        alt={video.title}
                        loading="lazy"
                      />
                      <div className="video-card__play">
                        <i className="bi bi-play-fill"></i>
                      </div>
                      <div className="video-card__duration">{video.duration}</div>
                    </div>
                    
                    {/* Video Info */}
                    <div className="video-card__info">
                      <h6 className="video-card__title">{video.title}</h6>
                      <p className="video-card__description">{video.description}</p>
                      <div className="video-card__meta">
                        <span className="video-card__watch">
                          <i className="bi bi-play-circle me-1"></i>
                          Watch now
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="empty-state" style={{ padding: "var(--space-12) var(--space-6)" }}>
          <div className="empty-state__icon">
            <i className="bi bi-youtube"></i>
          </div>
          <div className="empty-state__title">No tutorials found</div>
          <div className="empty-state__desc">
            We couldn't find any tutorials matching "{search}". 
            Try adjusting your search terms or{" "}
            <Link to="/contact-us">request a tutorial</Link>.
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
          <div className="flex items-center gap-2">
            <i className="bi bi-question-circle" style={{ color: "var(--primary-600)", fontSize: "24px" }}></i>
            <span className="h5" style={{ margin: 0 }}>Need more help?</span>
          </div>
          <p className="text-sm text-muted" style={{ maxWidth: "500px" }}>
            Can't find what you're looking for? Visit our Help Center for written guides
            or contact our support team for personalized assistance.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link to="/help" className="btn btn-secondary">
              <i className="bi bi-book me-2"></i>
              Help Center
            </Link>
            <Link to="/contact-us" className="btn btn-primary">
              <i className="bi bi-chat-dots me-2"></i>
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
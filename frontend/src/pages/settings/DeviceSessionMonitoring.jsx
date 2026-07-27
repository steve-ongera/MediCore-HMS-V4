import { Link } from "react-router-dom";

export default function UnderDevelopment() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">MediCore HMIS</div>
          <h1 className="page-title">Module Under Development</h1>
          <p className="page-subtitle">
            This module is currently being developed and will be available in an
            upcoming release.
          </p>
        </div>

        <div className="page-header__actions">
          <Link to="/dashboard" className="btn btn-secondary">
            <i className="bi bi-arrow-left me-2"></i>
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body text-center py-5">

          <div
            className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle bg-primary-soft"
            style={{ width: 110, height: 110 }}
          >
            <i
              className="bi bi-tools text-primary"
              style={{ fontSize: "3rem" }}
            ></i>
          </div>

          <h2 className="fw-bold mb-3">
            We're Building Something Great
          </h2>

          <p
            className="text-muted mx-auto"
            style={{ maxWidth: "650px" }}
          >
            This module is currently under active development by the MediCore
            engineering team. It will be available in a future update with full
            functionality, security, reporting, and seamless integration with
            the rest of the Hospital Management Information System.
          </p>

          <div className="row g-3 mt-4 justify-content-center">

            <div className="col-md-3">
              <div className="border rounded p-3 h-100">
                <i className="bi bi-code-slash fs-2 text-primary"></i>
                <h6 className="mt-3 mb-1">Development</h6>
                <small className="text-muted">
                  Core features are currently being implemented.
                </small>
              </div>
            </div>

            <div className="col-md-3">
              <div className="border rounded p-3 h-100">
                <i className="bi bi-shield-check fs-2 text-success"></i>
                <h6 className="mt-3 mb-1">Testing</h6>
                <small className="text-muted">
                  Every workflow undergoes extensive quality assurance.
                </small>
              </div>
            </div>

            <div className="col-md-3">
              <div className="border rounded p-3 h-100">
                <i className="bi bi-rocket-takeoff fs-2 text-warning"></i>
                <h6 className="mt-3 mb-1">Coming Soon</h6>
                <small className="text-muted">
                  This module will be released in a future MediCore update.
                </small>
              </div>
            </div>

          </div>

          <div className="mt-5">
            <Link to="/dashboard" className="btn btn-primary px-4">
              <i className="bi bi-house-door me-2"></i>
              Return to Dashboard
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
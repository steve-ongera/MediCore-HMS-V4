# MediCore HMIS — Multi-Branch Hospital Management Information System
**Developer Onboarding & Reference Documentation**

A comprehensive, multi-tenant-capable Hospital Management Information System built for Kenyan Level 2–5 facilities and hospital groups. Backend: Django REST Framework across 45+ focused apps. Frontend: React (Vite), one route tree, one `services/api.js`.

---

## What MediCore Solves

Most Kenyan hospital software stops at "register a patient, bill them, print a receipt." MediCore is built around five problems that generic HMIS software leaves unsolved:

### 1. Money leaks silently between departments
A lab technician runs a test. The result gets typed up. Nobody ever confirmed the cashier billed it. This happens constantly across Lab, Radiology, Pharmacy, Procedures, Theatre, Dialysis, ICU, Blood Bank, Ambulance, and Mortuary — services performed with no matching invoice, and nobody notices until the books don't reconcile at month-end.

**MediCore's answer:** the `leakage` app runs a reconciliation scan across all 14 revenue-generating modules, flags every service-with-no-invoice, and gives Accounting a one-click "Bill Now" or a justified write-off — with a live dashboard showing exactly how much money is currently unbilled, broken down by source.

### 2. Patients disappear after they leave
A diabetic patient is seen, prescribed, and sent home with "come back in two weeks." Nothing in most HMIS systems tracks whether that actually happens. Chronic disease management, post-discharge follow-up, and referral closure all depend on staff remembering — which doesn't scale.

**MediCore's answer:** the `carecoordination` app gives every encounter (consultation, discharge, ED visit, delivery, referral) a `CarePlan` with concrete `FollowUpTask`s. A scheduled job automatically escalates anything overdue by 7+ days, notifying the responsible doctor — so a missed follow-up becomes visible instead of silently falling through.

### 3. Drug and asset theft in a low-trust cash environment
Pharmacy stock walks out the door in small amounts nobody notices until a big shortfall shows up at stocktake. Cash tills get "adjusted" after the fact.

**MediCore's answer:** dual-confirmed stock transfers between locations (sender declares dispatch quantity, receiver independently confirms — any mismatch auto-flags), mandatory cash-till opening/closing with physical-count reconciliation and supervisor approval above a variance threshold, and an AI-flavored (rule-based, not ML) insights engine that cross-references purchased vs. dispensed vs. physically-counted stock to surface theft signals automatically.

### 4. A hospital group's owner can't see across branches without spreadsheets
Kenyan hospital groups commonly run 3–5 facilities at different service levels (Level 3 clinic, Level 4/5 hospitals). Standard HMIS software is single-facility; consolidating revenue/patient data across branches means manual exports.

**MediCore's answer:** the `branches` app makes every branch-relevant record (visits, invoices, payments, admissions) row-scoped to a `Branch`, enforced server-side via a reusable ViewSet mixin — branch staff see only their branch, while a dedicated `GROUP_ADMIN` role (distinct from each branch's own `SUPER_ADMIN`) sees consolidated, group-wide numbers with a branch switcher in the navbar. Patients remain group-wide by design (continuity of care across branches), while financial records are branch-scoped for accurate per-facility reporting.

### 5. MOH/regulatory reporting is a manual, error-prone chore
Facility staff re-key numbers from paper registers or disconnected systems into KHIS/DHIS2-style reports every month.

**MediCore's answer:** the `moh` app aggregates real system data into the 8 standard Kenyan MOH reporting categories (OPD, inpatient/capacity, MCH, mortality, disease surveillance, lab/radiology, pharmacy/commodities, theatre/emergency/blood/referrals) with Excel/PDF export. This does not submit to KHIS/DHIS2 automatically — that requires a separate API integration project — but it eliminates manual data reconstruction.

---

## Tech Stack

- **Backend:** Django 6.0.6, Django REST Framework, SimpleJWT, django-filters, APScheduler, `qrcode` (server-side QR generation)
- **Frontend:** React 19 (Vite), Recharts, Bootstrap Icons, `html5-qrcode` (camera scanning), xlsx/jsPDF (exports)
- **Auth:** JWT (15-min access / 8-hr refresh) + email-based two-factor OTP (bypassed only when `DEBUG=True`)
- **Database:** SQLite (dev), UUID primary keys throughout, soft-delete via `BaseModel`
- **Scheduling:** APScheduler for recurring jobs (bed charges, leakage scans, follow-up escalation, license checks)

---

## Project Structure

```text
MediCore-HMIS/
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env
│   │
│   ├── backend/                        # Project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py / wsgi.py
│   │
│   ├── api/                            # Core: users, patients, visits, billing,
│   │   │                                # queue, consultations, prescriptions,
│   │   │                                # lab, radiology, pharmacy, OTC, audit log
│   │   ├── models.py / serializers.py / views.py / permissions.py / filters.py
│   │   ├── middleware.py               # thread-local user for audit signals
│   │   ├── managers.py                 # SoftDeleteManager / AllObjectsManager
│   │   └── migrations/
│   │
│   ├── branches/                       # Multi-branch scoping & group admin
│   │   ├── models.py                   # Branch, BranchStaffAssignment
│   │   ├── mixins.py                   # BranchScopedViewSetMixin — the retrofit pattern
│   │   ├── permissions.py              # get_accessible_branch_ids(), IsGroupAdmin
│   │   └── middleware.py               # X-Branch-Context header handling
│   │
│   ├── security/                       # 2FA, lockouts, sessions, security audit log
│   ├── licensing/                      # Bed/user/patient caps, MediCore-Ops-only editing
│   ├── notifications/                  # ~150 event types, in-app + flash delivery
│   ├── messaging/                      # Internal staff chat (polling-based)
│   ├── communication/                  # Bulk announcements (in-app + email)
│   ├── documents/                      # Organizational document library
│   ├── support/                        # Contact Us inquiry pipeline
│   ├── tickets/                        # IT support ticketing
│   │
│   ├── inpatient/                      # Wards, beds (branch-scoped), admissions,
│   │   │                                # medication administration, bed charges
│   ├── mch/                            # Antenatal, delivery, postnatal, immunization
│   ├── emergency/                      # ED bays, triage, procedures, disposition
│   ├── icu/                            # ICU/HDU beds, vitals, ventilator settings
│   ├── theatre/                        # Surgery booking, team, consumables billing
│   ├── dialysis/                       # Chronic patient profiles, sessions
│   ├── dental/ eyeclinic/              # Specialty visit + procedure workflows
│   ├── bloodbank/                      # Donor → donation → unit → issue
│   ├── mortuary/                       # Case admission, storage billing, release
│   ├── ambulance/                      # Fleet, dispatch lifecycle, billing
│   ├── pacs/                           # DICOM Study/Series/Image, gateway pattern
│   │   └── gateways/
│   │       ├── base.py, mock.py        # working demonstration gateway
│   │       └── orthanc.py              # real integration — stubbed, not connected
│   │
│   ├── finance/                        # Chart of accounts, journal entries, budgets
│   │   └── permissions.py              # RequiresOpenTill
│   ├── procurement/                    # Any-staff requisitions, budget-line validation,
│   │   │                                # HOD approval, PO, goods receipt
│   ├── assets/                         # Asset register, maintenance, disposal
│   ├── stockcontrol/                   # Multi-location medicine chain-of-custody
│   ├── executive/                      # Executive dashboard, refunds, bill cancellation
│   ├── leakage/                        # Revenue leakage detection engine
│   ├── insights/                       # Rule-based AI business insights, theft detection
│   ├── insurance/                      # SHA / payer claims, eligibility gateway
│   ├── etims/                          # KRA fiscalization gateway
│   │
│   ├── hr/                             # Employee records, leave, attendance, payroll
│   ├── doctormgmt/                     # Doctor profiles, schedules, holidays, commission
│   ├── biomed/                         # Equipment register, maintenance, calibration
│   │
│   ├── medrecords/                     # HIM: file tracking, birth/death registers,
│   │   │                                # referrals, discharge summaries, record
│   │   │                                # requests, ICD-10 coding QA, audit trail
│   ├── carecoordination/               # Care plans, follow-up tasks, escalation
│   ├── moh/                            # 8 MOH/KHIS-aligned aggregation reports
│   │
│   └── media/                          # Uploads (QR codes, lab results, PACS images, etc.)
│
└── frontend/
    └── src/
        ├── App.jsx                     # All routes; RoleHomeDashboard resolves
        │                                # per-role dashboard component
        ├── components/
        │   ├── BranchSwitcher.jsx      # GROUP_ADMIN branch context switcher
        │   ├── BillClearanceCheck.jsx  # Reusable pre-discharge billing check
        │   ├── ChatDropdown.jsx / NotificationBell.jsx / PageSearch.jsx
        │   └── SearchableSelect.jsx    # Generic searchable dropdown
        ├── config/
        │   └── pageRegistry.js         # Flat, role-filtered page index for search
        ├── context/
        │   └── AuthContext.jsx         # login/verifyOtp/logout, hasRole()
        ├── pages/
        │   ├── dashboard/               # RoleDashboardBase.jsx + ~20 per-role wrappers
        │   ├── billing/                 # Payments, BulkPayment(+List/Receipt/QR),
        │   │                            # WalkInSale, CashTillDashboard, QRScanner
        │   ├── pharmacy/, laboratory/, radiology/
        │   ├── inpatient/, mch/, emergency/, icu/, theatre/, dialysis/,
        │   │   dental/, eyeclinic/, bloodbank/, mortuary/, ambulance/
        │   ├── pacs/                    # PACSWorklist, StudyDetail
        │   ├── finance/, procurement/, stockcontrol/, executive/, leakage/, insights/
        │   ├── hr/, doctormgmt/, biomed/, tickets/
        │   ├── medrecords/, carecoordination/, moh/
        │   ├── branches/                # BranchManagement
        │   ├── settings/                # Users, LicenseStatus, ICD10Management,
        │   │                            # DeviceSessionMonitoring, SecurityAuditLogPage
        │   └── support/                 # VideoTutorials, HelpCenter, ContactUs, Subscriptions
        └── services/
            └── api.js                   # Every backend call, one file
```

---

## Roles

**Group / Platform level**  
`GROUP_ADMIN` (cross-branch owner view) — a genuine Django `is_superuser=True` account is the only other identity above this, reserved for MediCore's own ops team (licensing edits only).

**Branch-level administrative**  
`SUPER_ADMIN`, `IT_SUPPORT_OFFICER` (broad technical co-admin — accounts, security, master data, bed register — deliberately excluded from financial approvals/HR payroll for segregation of duties)

**Clinical**  
`DOCTOR`, `NURSE`, `LAB_TECHNOLOGIST`, `RADIOLOGIST`, `PHARMACIST`

**Front office / finance**  
`RECEPTIONIST`, `CASHIER`, `ACCOUNTANT`

**Specialized operations**  
`MORTUARY_ATTENDANT`, `HR_OFFICER`, `PROCUREMENT_OFFICER`, `AMBULANCE_DISPATCHER`, `BIOMEDICAL_ENGINEER`, `HEALTH_RECORDS_OFFICER`, `MEDICAL_RECORDS_OFFICER`

Every ViewSet's permission class fails **closed** by default (`HasRole` denies all non-Super-Admin users if `allowed_roles` isn't explicitly set) — a module forgetting to declare its allowed roles blocks access rather than silently allowing it.

---

## Endpoint Reference (under `/api/`)

| Group | App | Base path | Notes |
|---|---|---|---|
| Auth | api | `auth/login/`, `auth/verify-otp/`, `auth/resend-otp/`, `auth/logout/`, `auth/change-password/` | Two-step: password → email OTP → JWT |
| Users | api | `users/`, `users/{id}/reset-password/`, `users/{id}/toggle-active/` | Reset requires no old password (admin action) |
| Departments | api | `departments/` | |
| Patients / Visits | api | `patients/`, `patients/search/`, `patients/{id}/summary/`, `patients/{id}/bill-clearance/`, `visits/` | Patients are group-wide; visits are branch-scoped |
| Billing | api | `invoices/`, `payments/`, `bulk-payments/`, `bulk-payments/{id}/receipt/` | Till must be open (`RequiresOpenTill`); QR generated server-side on bulk payment |
| QR | api | `qr-scan/`, `qr-verify/bulk-payment/{id}/` | Universal scan-any-receipt-type lookup |
| Queue / Vitals | api | `queue/`, `queue/my-queue/`, `vitals/` | |
| Consultation | api | `consultations/`, `consultations/{id}/add-diagnosis/`, `.../add-procedure/`, `prescriptions/` | Ad-hoc billable procedures during a visit |
| Lab / Radiology | api | `lab-orders/`, `radiology-orders/`, `icd10-codes/` | Payment-gated result entry |
| PACS | pacs | `pacs-studies/`, `.../worklist/`, `.../simulate-images/` (demo only), `.../save-report/` | Gateway-swappable; demo mode active |
| Pharmacy | api | `medicines/`, `pharmacy-dispenses/` (2-stage: prepare→complete), `otc-sales/` | FEFO deduction; dosing-interval enforced server-side |
| Stock Control | stockcontrol | `store-locations/`, `.../set-stock/`, `.../reconciliation/`, `stock-transfers/`, `stock-counts/` | Dual-confirmed transfers; discrepancy auto-flagging |
| Inpatient | inpatient | `wards/`, `beds/`, `admissions/`, `bed-charges/` | Branch-scoped via `bed__ward__branch` |
| ICU / Theatre / Dialysis / Dental / Eye / Blood / Mortuary / Ambulance | (respective apps) | module-specific | Each auto-creates a shared `Visit` for billing |
| Finance | finance | `accounts/`, `journal-entries/`, `budgets/` (real-time utilization), `expenses/`, `cashier-shifts/` | Till open/close, variance approval |
| Procurement | procurement | `purchase-requisitions/` (any staff, budget-validated), `.../hod-approve/`, `purchase-orders/`, `goods-receipts/` | HOD checked against `Department.head_of_department` |
| Assets | assets | `asset-categories/`, `assets/`, `asset-maintenance/`, `asset-transfers/` | |
| Executive | executive | `executive/dashboard/`, `refunds/`, `bill-cancellations/` | Dual-approval refunds |
| Revenue Leakage | leakage | `revenue-leakage/`, `.../scan-now/`, `.../dashboard/` | Cross-module reconciliation scan |
| AI Insights | insights | `business-insights/`, `.../generate-now/` | Rule-based, includes theft-signal detection |
| Insurance | insurance | `insurers/`, `insurance-policies/`, `.../verify-eligibility/`, `insurance-claims/` | Gateway-swappable (SHA, generic) |
| eTIMS | etims | `fiscalization-config/`, `fiscalized-receipts/` | KRA gateway, sandbox by default |
| HR | hr | `employees/`, `leave-requests/`, `attendance/`, `payroll-runs/` | Self-service leave request page for all staff |
| Doctor Management | doctormgmt | `doctor-profiles/`, `doctor-schedules/`, `doctor-holidays/`, `doctor-commissions/` | HR/Super Admin only |
| Biomedical Engineering | biomed | `equipment/`, `service-requests/`, `maintenance-records/`, `calibrations/`, `spare-parts/` | |
| IT Ticketing | tickets | `tickets/`, `.../comment/`, `.../resolve/`, `.../close/` | Open to all staff to raise |
| Medical Records | medrecords | `patient-files/`, `document-attachments/`, `birth-register/`, `death-register/`, `referrals/`, `discharge-summaries/`, `record-requests/`, `icd-coding-review/`, `record-audit-trail/` | Immutable audit trail |
| Care Coordination | carecoordination | `care-plans/`, `care-plans/{id}/add-task/`, `follow-up-tasks/`, `.../dashboard/`, `.../overdue/` | Scheduled escalation job |
| MOH Reports | moh | `moh/opd/`, `.../inpatient-capacity/`, `.../mch/`, `.../mortality/`, `.../disease-surveillance/`, `.../lab-radiology/`, `.../pharmacy-commodities/`, `.../theatre-emergency-blood-referral/` | Date-filtered, exportable |
| Branches | branches | `branches/`, `branches/my-accessible/`, `branch-staff-assignments/` | GROUP_ADMIN-only writes |
| Licensing | licensing | `facility-license/` | GET: branch Super Admin; PATCH: MediCore Ops (`is_superuser`) only, structurally |
| Security | security | `login-attempts/`, `user-sessions/`, `security-audit-logs/`, `account-lockouts/` | Immutable, Super Admin/IT only |
| Notifications | notifications | `notifications/`, `.../unread/`, `.../mark-all-read/` | ~150 event types across all roles |
| Messaging | messaging | `conversations/`, `.../start/`, `.../send/` | Polling-based |
| Announcements | communication | `announcements/`, `.../send/`, `my-announcements/` | Multi-channel delivery |
| Documents | documents | `documents/` | Visibility-scoped (public/department/role) |
| Support | support | `contact-inquiries/` | Emails MediCore support inbox |

---

## Core Architectural Patterns (read this before adding a new module)

1. **`BaseModel`** — every model inherits UUID PK, soft-delete, `created_at`/`updated_at`. Never hard-delete clinical/financial records.
2. **Shared-Visit billing** — any module raising a charge (Inpatient, MCH, Emergency, ICU, Dialysis, Dental, Eye, Mortuary, Ambulance, Theatre, Blood Bank) creates/reuses an `api.Visit` under a module-specific `Department`, so every charge for a patient surfaces through the same billing pipeline regardless of origin.
3. **Auto-branch-stamping** — `Invoice.save()`/`Payment.save()` inherit `branch` from their linked `Visit` automatically. Any new model that creates invoices doesn't need manual branch-tagging at every call site.
4. **`BranchScopedViewSetMixin`** — the retrofit pattern for making any existing ViewSet branch-aware: add the mixin, set `branch_field_path` if branch isn't a direct field, done. **Not yet applied to every app** — see Known Gaps.
5. **Gateway pattern** — external system integrations (SHA, eTIMS, PACS) implement a common interface (`base.py`) with a mock/sandbox version always available and a real version stubbed for verified connection later. Never assume a "real" gateway is production-ready without checking its module directly.
6. **FEFO stock deduction** — every point that dispenses medicine uses earliest-expiry-first `MedicineBatch` selection.
7. **Fail-closed permissions** — `HasRole` with no `allowed_roles` set blocks everyone but Super Admin, not the reverse.
8. **Server-generated QR codes** — receipts (`Payment`, `OTCSale`, `BulkPayment`) generate and store their QR image server-side at creation time via `generate_qr_code()`, never regenerated client-side, so what's scanned always matches the database record.
9. **Scheduled jobs (APScheduler)** — bed charges, revenue leakage scans, follow-up task escalation, license/password-staleness checks all run on a recurring interval registered in each app's scheduler hookup, not triggered by user action.

---

## Known Gaps & Honest Caveats

- **Branch-scoping is only fully retrofitted on `Patient`/`Visit`/`Invoice`/`Payment`/`Ward`/`Admission`.** The remaining 35+ apps need the same `BranchScopedViewSetMixin` treatment module-by-module — this is mechanical but not yet done everywhere.
- **PACS is demonstration-only.** `MockPACSGateway` simulates a modality pushing images; `OrthancPACSGateway` is a real, documented-but-unconnected stub requiring a separate DICOM server deployment.
- **eTIMS/SHA gateways are unverified against live provider APIs.** Confirm exact endpoint/payload specs before flipping either environment flag to production.
- **Messaging/notifications are polling-based**, not WebSocket push. Fine at current scale; revisit with Django Channels if concurrent staff count grows substantially.
- **MOH reporting produces the numbers, not a KHIS/DHIS2 submission.** Actual submission remains manual or requires a dedicated DHIS2 API integration.
- **Several report aggregations degrade gracefully (`None`/`N/A`)** where a field name was assumed rather than confirmed against a live model — check server logs for `logging.getLogger(...).exception(...)` entries after deploying a new report and tighten any mismatches found.
- **Per-branch licensing is not yet supported** — `FacilityLicense` (beds/users/patients) is currently one row per deployment, shared across all branches in a group. True per-branch licensing would require restructuring this to one license row per `Branch`.

---

## Suggested Future Work

**High priority**
- Finish the `BranchScopedViewSetMixin` retrofit across Inpatient, Pharmacy, HR, and Procurement — these carry the most sensitive cross-branch data.
- Real Orthanc PACS integration for at least one modality type (start with a single X-ray machine) to validate the gateway architecture end-to-end.
- Per-branch license rows, if the group commercial model requires selling different packages to different branches within one group.

**Medium priority**
- Move background email (announcements, OTP, bulk contact notifications) off the request/response cycle onto a real task queue (Celery + Redis) — current synchronous sending will not scale past roughly 100 concurrent recipients.
- WebSocket-based messaging/notifications (Django Channels) if staff concurrency grows enough that 15-second polling becomes a noticeable lag complaint.
- A dedicated `ProgramEnrollment` model for genuine HIV/TB program tracking (enrollment, treatment stage, outcomes) — the current MOH disease-surveillance report uses ICD-10 keyword matching as a proxy, which is directionally useful but not a real program register.

**Lower priority / nice-to-have**
- DHIS2 API integration for direct KHIS submission from the `moh` app.
- A dedicated MediCore-Ops internal panel for licensing edits, replacing direct Django-admin access for that workflow.
- Editable (non-hardcoded) FAQ/tutorial content in the `support` app, if non-developer staff need to maintain it.

---

## Setup

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # MediCore Ops account — is_superuser=True, no hospital role assigned
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

**One-time data migration after adding `branches`/`licensing`:** run the branch/license backfill scripts documented inline in `branches/models.py` and `api/models.py` migration notes — every existing `User`/`Visit`/`Invoice`/`Payment` needs a `branch` assigned before scoping is enforced, or affected users will suddenly see nothing.

Required `.env`: `SECRET_KEY`, `DEBUG`, DB credentials, `EMAIL_HOST_*` (OTP delivery — no spaces in app passwords), `SECURITY_ADMIN_EMAIL`, `PACS_MODE=DEMO`.

---

## Author

**Steve Ongera**  
Phone: 0112284093

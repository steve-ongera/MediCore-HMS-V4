# MediCore HMS V4 — Hospital Management Information System

A comprehensive Hospital Management Information System (HMIS) built as a **modular Django REST Framework backend** that manages the complete patient journey — from **registration, billing, queue management, triage, consultation, laboratory and radiology services, pharmacy, inpatient wards, emergency, maternal & child health (MCH), insurance/SHA claims, and eTIMS/KRA fiscalization** — paired with a **React 19 frontend**. Built with **Python 3.13, Django 5, Django REST Framework, and SQLite/PostgreSQL**, the system features **JWT authentication with silent refresh**, **Role-Based Access Control (RBAC)**, **soft deletes**, **audit logging**, **QR-coded receipts**, **M-Pesa integration**, and **OpenAPI/Swagger documentation**.

Unlike earlier single-app iterations, V4 splits functionality into focused Django apps — `api` (core: patients, visits, billing, queue, pharmacy, lab, radiology), `assets` (asset register, maintenance, transfers, disposals), `emergency` (ED bays, triage, procedures), `etims` (KRA fiscalization gateway), `inpatient` (wards, beds, admissions, medication administration), `insurance` (SHA and other payer claims), and `mch` (antenatal, delivery, postnatal, child immunization) — while keeping the frontend as a single React app with one page tree and one `services/api.js`.

---

## Project Structure

```
MediCore HMS V4/
│
├── backend/                            # Django project root
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env
│   ├── .gitignore
│   ├── db.sqlite3
│   │
│   ├── backend/                        # Project config
│   │   ├── __init__.py
│   │   ├── settings.py                 # DB, DRF, JWT, CORS, Swagger
│   │   ├── urls.py                     # Root URLConf + Swagger/Redoc
│   │   ├── asgi.py
│   │   └── wsgi.py
│   │
│   ├── api/                            # ⭐ Core app: patients → reports
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── exceptions.py
│   │   ├── filters.py
│   │   ├── managers.py                 # Soft delete
│   │   ├── middleware.py
│   │   ├── models.py                   # Users, Departments, Patients, Visits,
│   │   │                                #   Billing, Queue, Vitals, Consultation,
│   │   │                                #   Prescriptions, Lab, Radiology, Pharmacy,
│   │   │                                #   OTC Sales, AuditLog
│   │   ├── permissions.py              # RBAC per role
│   │   ├── serializers.py
│   │   ├── signals.py                  # Audit log + workflow automation
│   │   ├── tests.py
│   │   ├── urls.py                     # DRF router
│   │   ├── utils.py                    # Number/QR/BMI generators
│   │   ├── views.py                    # ViewSets + auth/dashboard/report views
│   │   ├── management/commands/
│   │   │   └── seed_data.py
│   │   └── migrations/
│   │       ├── 0001_initial.py
│   │       ├── 0002_otcsale_otcsaleitem.py
│   │       └── 0003–0006_alter_invoice_source_type.py
│   │
│   ├── assets/                         # Asset register & lifecycle management
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                   # AssetCategory, Asset, AssetMaintenance,
│   │   │                                #   AssetTransfer, AssetDisposal
│   │   ├── serializers.py
│   │   ├── tests.py
│   │   ├── urls.py
│   │   ├── utils.py                    # Asset tag generator
│   │   ├── views.py                    # Transfer/dispose actions, warranty alerts
│   │   ├── management/commands/
│   │   │   └── seed_assets.py
│   │   └── migrations/
│   │       └── 0001_initial.py
│   │
│   ├── emergency/                      # Emergency department
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                   # Bays, Visits, Triage Vitals, Notes,
│   │   │                                #   Procedures, Medication Orders
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── tests.py
│   │   ├── urls.py
│   │   ├── utils.py
│   │   ├── views.py                    # Discharge home / LAMA / deceased / admit
│   │   ├── management/commands/
│   │   │   └── seed_emergency.py
│   │   └── migrations/
│   │       └── 0001_initial.py
│   │
│   ├── etims/                          # KRA eTIMS fiscalization
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                   # FiscalizationConfig, FiscalizedReceipt
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── signals.py
│   │   ├── tests.py
│   │   ├── urls.py
│   │   ├── views.py                    # Retry failed fiscalizations
│   │   ├── gateways/
│   │   │   ├── base.py
│   │   │   └── kra.py                  # KRA eTIMS gateway integration
│   │   ├── management/commands/
│   │   │   └── seed_fiscalization.py
│   │   └── migrations/
│   │       └── 0001_initial.py
│   │
│   ├── inpatient/                      # Wards, beds, admissions
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                   # Ward, Bed, Admission, WardRound,
│   │   │                                #   NursingNote, MedicationOrder/Admin,
│   │   │                                #   BedCharge, ProcedureCatalog
│   │   ├── scheduler.py                # Recurring bed-charge generation
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── signals.py
│   │   ├── tests.py
│   │   ├── urls.py
│   │   ├── views.py                    # Discharge, transfer bed, billing
│   │   ├── management/commands/
│   │   │   ├── backfill_admission_visits.py
│   │   │   ├── generate_bed_charges.py
│   │   │   ├── seed_inpatient.py
│   │   │   └── seed_procedure_catalog.py
│   │   └── migrations/
│   │       ├── 0001_initial.py
│   │       ├── 0002_medicationorder_quantity.py
│   │       ├── 0003_medicationadministration_batch_and_more.py
│   │       └── 0004_procedurecatalog_inpatientprocedure.py
│   │
│   ├── insurance/                      # Payer / SHA claims
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                   # Insurer, InsurancePolicy, InsuranceClaim
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── tests.py
│   │   ├── urls.py
│   │   ├── utils.py
│   │   ├── views.py                    # Eligibility check, submit/settle/cancel claim
│   │   ├── gateways/
│   │   │   ├── base.py
│   │   │   ├── factory.py
│   │   │   ├── generic.py
│   │   │   └── sha.py                  # SHA (Social Health Authority) gateway
│   │   ├── management/commands/
│   │   │   └── seed_insurance.py
│   │   └── migrations/
│   │       └── 0001_initial.py
│   │
│   ├── mch/                             # Maternal & Child Health
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py                   # AntenatalProfile, ANCVisit, DeliveryRecord,
│   │   │                                #   PostnatalVisit, Child, Immunization,
│   │   │                                #   GrowthRecord, DeliveryCharge
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── tests.py
│   │   ├── urls.py
│   │   ├── utils.py
│   │   ├── views.py                    # Record delivery, due immunizations
│   │   ├── management/commands/
│   │   │   └── seed_mch_records.py
│   │   └── migrations/
│   │       ├── 0001_initial.py
│   │       └── 0002_deliverycharge.py
│   │
│   ├── media/                          # Uploads
│   │   ├── lab_results/
│   │   ├── otc_receipts/qr/
│   │   ├── radiology_images/
│   │   ├── radiology_reports/
│   │   └── receipts/qr/
│   │
│   └── static/
│       └── logo.png
│
└── frontend/                           # React 19 (JSX + Vite)
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── .env
    │
    └── src/
        ├── App.jsx                     # ⭐ All routes defined here
        ├── main.jsx
        ├── App.css
        ├── index.css
        │
        ├── assets/                     # Static images
        │   ├── hero.png
        │   ├── medicore_logo.png
        │   ├── react.svg
        │   └── vite.svg
        │
        ├── components/                 # Reusable, presentational
        │   ├── ConfirmDialog.jsx
        │   ├── DataTable.jsx
        │   ├── LoadingSpinner.jsx
        │   ├── Modal.jsx
        │   ├── Navbar.jsx
        │   ├── PageContent.jsx
        │   ├── PageHeader.jsx
        │   ├── Pagination.jsx
        │   ├── PrintableReceipt.jsx
        │   ├── ProtectedRoute.jsx      # Role-based route guard
        │   ├── ReceiptModal.jsx
        │   ├── SearchBar.jsx
        │   ├── Sidebar.jsx
        │   ├── SkeletonLoader.jsx
        │   ├── StatCard.jsx
        │   └── StatusBadge.jsx
        │
        ├── context/
        │   ├── AuthContext.jsx         # user, token, login/logout, role
        │   ├── SidebarContext.jsx
        │   ├── ToastContext.jsx
        │   └── toast.css
        │
        ├── hooks/
        │   ├── index.js
        │   ├── useApi.js
        │   ├── useAuth.js
        │   ├── useClickOutside.js
        │   ├── useDebounce.js
        │   ├── useForm.js
        │   ├── useLocalStorage.js
        │   └── usePagination.js
        │
        ├── layouts/
        │   ├── AuthLayout.jsx          # Centered login shell
        │   └── DashboardLayout.jsx     # Navbar + Sidebar shell
        │
        ├── pages/
        │   ├── NotFound.jsx
        │   ├── assets/
        │   │   ├── AssetCategories.jsx
        │   │   ├── AssetDetail.jsx
        │   │   ├── AssetForm.jsx
        │   │   ├── AssetMaintenance.jsx
        │   │   └── AssetRegister.jsx
        │   ├── auth/
        │   │   ├── Login.jsx
        │   │   └── Unauthorized.jsx
        │   ├── billing/
        │   │   ├── Billing.jsx
        │   │   ├── Payments.jsx
        │   │   └── WalkInSale.jsx
        │   ├── dashboard/
        │   │   └── Dashboard.jsx
        │   ├── doctor/
        │   │   ├── Consultation.jsx
        │   │   ├── ConsultationDetail.jsx
        │   │   ├── ConsultationList.jsx
        │   │   └── DoctorDashboard.jsx
        │   ├── emergency/
        │   │   ├── EmergencyBoard.jsx
        │   │   ├── EmergencyVisitDetail.jsx
        │   │   └── RegisterEmergency.jsx
        │   ├── etims/
        │   │   ├── ETIMSConfig.jsx
        │   │   └── FiscalizedReceipts.jsx
        │   ├── inpatient/
        │   │   ├── AdmissionDetail.jsx
        │   │   ├── AdmissionList.jsx
        │   │   ├── AdmitPatient.jsx
        │   │   ├── BedManagement.jsx
        │   │   └── WardBoard.jsx
        │   ├── insurance/
        │   │   ├── ClaimDetail.jsx
        │   │   ├── ClaimsList.jsx
        │   │   ├── FileClaim.jsx
        │   │   ├── Insurers.jsx
        │   │   └── PatientPolicies.jsx
        │   ├── inventory/
        │   │   └── Inventory.jsx
        │   ├── laboratory/
        │   │   └── Laboratory.jsx
        │   ├── mch/
        │   │   ├── ANCProfileDetail.jsx
        │   │   ├── AntenatalRegister.jsx
        │   │   ├── ChildDetail.jsx
        │   │   ├── ChildRegister.jsx
        │   │   └── MCHDashboard.jsx
        │   ├── nurse/
        │   │   └── NurseDashboard.jsx
        │   ├── pharmacy/
        │   │   ├── Pharmacy.jsx
        │   │   └── Suppliers.jsx
        │   ├── profile/
        │   │   └── Profile.jsx
        │   ├── queue/
        │   │   └── QueueBoard.jsx
        │   ├── radiology/
        │   │   └── Radiology.jsx
        │   ├── reception/
        │   │   ├── EditPatient.jsx
        │   │   ├── PatientList.jsx
        │   │   ├── PatientProfile.jsx
        │   │   ├── PatientVisits.jsx
        │   │   ├── RegisterPatient.jsx
        │   │   └── RegisterVisit.jsx
        │   ├── reports/
        │   │   ├── DailyOPDReport.jsx
        │   │   ├── DiseaseStatisticsReport.jsx
        │   │   ├── DrugConsumptionReport.jsx
        │   │   ├── IPDReport.jsx
        │   │   ├── MCHReport.jsx
        │   │   ├── Reports.jsx
        │   │   └── RevenueReport.jsx
        │   └── settings/
        │       ├── AuditLog.jsx
        │       ├── Departments.jsx
        │       ├── Settings.jsx
        │       ├── TestCatalog.jsx
        │       └── Users.jsx
        │
        ├── services/
        │   └── api.js                  # ⭐ ONLY file that calls axios — every endpoint
        │
        ├── styles/
        │   └── main.css
        │
        └── utils/
            ├── formatters.js           # Currency, date formatting
            ├── reportExport.js
            ├── roles.js                # Role constants + page-access map
            └── validators.js           # Frontend form validation helpers
```

---

## Setup

### 1. Create a virtual environment & install dependencies
```bash
python -m venv venv
venv\Scripts\activate               # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment variables
```bash
copy .env.example .env              # macOS/Linux: cp .env.example .env
# then edit .env with your real SECRET_KEY and database credentials
```

### 3. Run migrations (per app)
```bash
python manage.py makemigrations api assets emergency etims inpatient insurance mch
python manage.py migrate
```

### 4. Create a Super Admin
```bash
python manage.py createsuperuser
```
(Note: `role` isn't prompted by `createsuperuser` — set it via `/admin/` or the shell:
`User.objects.filter(username="you").update(role="SUPER_ADMIN")`)

### 5. Seed demo data (optional)
```bash
python manage.py seed_data
python manage.py seed_assets
python manage.py seed_emergency
python manage.py seed_fiscalization
python manage.py seed_inpatient
python manage.py seed_procedure_catalog
python manage.py seed_insurance
python manage.py seed_mch_records
```

### 6. Run the server
```bash
python manage.py runserver
```

### 7. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## API Documentation

Once running, the full interactive API reference is available at:

| URL | Purpose |
|---|---|
| `/api/docs/` | Swagger UI |
| `/api/redoc/` | ReDoc UI |
| `/api/schema/` | Raw OpenAPI 3 schema (JSON) |
| `/admin/` | Django admin back-office |

---

## Key Endpoint Groups (under `/api/`)

| Group | App | Base path | Notes |
|---|---|---|---|
| Auth | api | `auth/login/`, `auth/refresh/`, `auth/me/`, `auth/change-password/` | JWT via SimpleJWT with silent refresh |
| Users / Departments | api | `users/`, `departments/` | Super Admin only for users |
| Patients / Visits | api | `patients/`, `patients/search/?q=`, `visits/` | Auto-generates consultation invoice on visit |
| Billing | api | `invoices/`, `payments/`, `payments/{id}/receipt/` | Payments auto-update invoice balance |
| Queue / Triage | api | `queue/`, `queue/my-queue/`, `vitals/` | Nurse/Doctor/Lab/Radiology/Pharmacy queues |
| Consultation / Rx | api | `consultations/`, `prescriptions/` | Pause/resume/complete, ICD-10 diagnoses |
| Laboratory / Radiology | api | `lab-orders/`, `radiology-orders/` | Payment-gated result entry |
| Pharmacy / OTC | api | `medicines/`, `pharmacy-dispenses/`, `otc-sales/` | FEFO batch selection, auto stock deduction |
| Assets | assets | `asset-categories/`, `assets/`, `asset-maintenance/`, `asset-transfers/`, `asset-disposals/` | Transfer/dispose actions, warranty alerts |
| Emergency | emergency | `emergency-bays/`, `emergency-visits/`, `triage-vitals/` | Discharge home / LAMA / deceased / admit |
| Inpatient | inpatient | `wards/`, `beds/`, `admissions/`, `ward-rounds/`, `bed-charges/` | Bed transfers, recurring bed charges |
| Insurance | insurance | `insurers/`, `insurance-policies/`, `insurance-claims/` | Eligibility check, submit/settle/cancel |
| MCH | mch | `antenatal-profiles/`, `anc-visits/`, `delivery-records/`, `children/`, `child-immunizations/` | Delivery recording, immunization due-list |
| eTIMS | etims | `fiscalization-config/`, `fiscalized-receipts/` | KRA fiscalization, retry on failure |
| Reports / Dashboard | api | `reports/?type=...`, `dashboard/` | Revenue, patient, and department stats |
| Audit Log | api | `audit-logs/` | Read-only, Super Admin only |

---

## Roles (RBAC)

`SUPER_ADMIN`, `RECEPTIONIST`, `CASHIER`, `NURSE`, `DOCTOR`, `LAB_TECHNOLOGIST`,
`RADIOLOGIST`, `PHARMACIST`, `ACCOUNTANT` — enforced per-endpoint via classes in
`api/permissions.py`. Super Admin always has full access.

---

## Automated Business Flow (via each app's `signals.py`)

1. **Visit created** → consultation invoice auto-generated.
2. **Invoice paid in full** → patient auto-enters the Nurse queue.
3. **Vitals recorded** → patient auto-moves to the Doctor queue.
4. **Lab/Radiology order placed** → invoice auto-generated; results blocked until `is_paid=True`.
5. **Consultation completed** → visit marked completed; prescriptions push patient to the Pharmacy queue.
6. **Admission created** → bed marked occupied; discharge/transfer keeps bed status in sync.
7. **Invoice fiscalized** → eTIMS gateway called; failed fiscalizations are retryable.
8. **Every create/update/delete** on clinical/financial models is written to `AuditLog` automatically.

---

## Notes

- All primary keys are UUIDs.
- Deletes are **soft** (`is_deleted` + `deleted_at`) — nothing is hard-deleted by the API.
- Pagination, search, and filtering are enabled globally via DRF defaults + `django-filter`.
- V4 splits functionality into **focused Django apps** (`api`, `assets`, `emergency`, `etims`, `inpatient`, `insurance`, `mch`) instead of a single monolithic app, while the frontend remains one React app with a single route tree and one `services/api.js`.

---

## Author

**Steve Ongera**
Phone: 0112284093
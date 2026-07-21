//src/services/api.js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// Axios instance + interceptors
// ---------------------------------------------------------------------------
const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  refreshQueue = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't try to refresh on the login/refresh endpoints themselves
    const isAuthRoute = originalRequest.url?.includes("/auth/login") || originalRequest.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh: refreshToken });
        localStorage.setItem("access_token", data.access);
        client.defaults.headers.Authorization = `Bearer ${data.access}`;
        processQueue(null, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Normalizes DRF's {success, status_code, errors} shape into a plain Error with .message
const unwrap = (promise) =>
  promise.then((res) => res.data).catch((err) => {
    const payload = err.response?.data;
    const message =
      payload?.errors?.detail ||
      (typeof payload?.errors === "string" ? payload.errors : null) ||
      (payload?.errors && JSON.stringify(payload.errors)) ||
      err.message ||
      "Something went wrong";
    const wrapped = new Error(message);
    wrapped.status = err.response?.status;
    wrapped.errors = payload?.errors;
    throw wrapped;
  });

// Turns { page: 2, search: 'john', status: 'PAID' } into a query string, skipping empties
const qs = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : "";
};

// ===========================================================================
// AUTH
// ===========================================================================
export const login = (username, password) => unwrap(client.post("/auth/login/", { username, password }));
export const logout = (refresh) => unwrap(client.post("/auth/logout/", { refresh }));
export const getMe = () => unwrap(client.get("/auth/me/"));
export const changePassword = (payload) => unwrap(client.post("/auth/change-password/", payload));

// ===========================================================================
// USERS (Super Admin)
// ===========================================================================
export const getUsers = (params) => unwrap(client.get(`/users/${qs(params)}`));
export const getUser = (id) => unwrap(client.get(`/users/${id}/`));
export const createUser = (payload) => unwrap(client.post("/users/", payload));
export const updateUser = (id, payload) => unwrap(client.patch(`/users/${id}/`, payload));
export const deleteUser = (id) => unwrap(client.delete(`/users/${id}/`));

// ===========================================================================
// DEPARTMENTS
// ===========================================================================
export const getDepartments = (params) => unwrap(client.get(`/departments/${qs(params)}`));
export const createDepartment = (payload) => unwrap(client.post("/departments/", payload));
export const updateDepartment = (id, payload) => unwrap(client.patch(`/departments/${id}/`, payload));
export const deleteDepartment = (id) => unwrap(client.delete(`/departments/${id}/`));

// ===========================================================================
// PATIENTS
// ===========================================================================
export const getPatients = (params) => unwrap(client.get(`/patients/${qs(params)}`));
export const getPatient = (id) => unwrap(client.get(`/patients/${id}/`));
export const createPatient = (payload) => unwrap(client.post("/patients/", payload));
export const updatePatient = (id, payload) => unwrap(client.patch(`/patients/${id}/`, payload));
export const deletePatient = (id) => unwrap(client.delete(`/patients/${id}/`));
export const searchPatient = (query) => unwrap(client.get(`/patients/search/${qs({ q: query })}`));
export const getPatientVisits = (id) => unwrap(client.get(`/patients/${id}/visits/`));
export const getPatientSummary = (id) => unwrap(client.get(`/patients/${id}/summary/`));

export const createAllergy = (payload) => unwrap(client.post("/allergies/", payload));
export const deleteAllergy = (id) => unwrap(client.delete(`/allergies/${id}/`));
export const createMedicalHistoryNote = (payload) => unwrap(client.post("/medical-history/", payload));
export const deleteMedicalHistoryNote = (id) => unwrap(client.delete(`/medical-history/${id}/`));

// ===========================================================================
// VISITS
// ===========================================================================
export const getVisits = (params) => unwrap(client.get(`/visits/${qs(params)}`));
export const getVisit = (id) => unwrap(client.get(`/visits/${id}/`));
export const registerVisit = (payload) => unwrap(client.post("/visits/", payload));
export const updateVisit = (id, payload) => unwrap(client.patch(`/visits/${id}/`, payload));

// ===========================================================================
// BILLING
// ===========================================================================
export const getInvoices = (params) => unwrap(client.get(`/invoices/${qs(params)}`));
export const getInvoice = (id) => unwrap(client.get(`/invoices/${id}/`));

export const getPayments = (params) => unwrap(client.get(`/payments/${qs(params)}`));
export const createPayment = (payload) => unwrap(client.post("/payments/", payload));
export const getReceipt = (paymentId) => unwrap(client.get(`/payments/${paymentId}/receipt/`));

// ===========================================================================
// QUEUE
// ===========================================================================
export const getQueue = (params) => unwrap(client.get(`/queue/${qs(params)}`));
export const getMyQueue = (queueType) => unwrap(client.get(`/queue/my-queue/${qs({ queue_type: queueType })}`));
export const callNextInQueue = (id) => unwrap(client.post(`/queue/${id}/call-next/`));
export const updateQueueEntry = (id, payload) => unwrap(client.patch(`/queue/${id}/`, payload));

// ===========================================================================
// NURSE / TRIAGE (VITALS)
// ===========================================================================
export const getVitals = (params) => unwrap(client.get(`/vitals/${qs(params)}`));
export const saveVitals = (payload) => unwrap(client.post("/vitals/", payload));

// ===========================================================================
// ICD-10
// ===========================================================================
export const lookupIcd10 = (query) => unwrap(client.get(`/icd10/lookup/${qs({ q: query })}`));

// ===========================================================================
// DOCTOR / CONSULTATION
// ===========================================================================
export const getConsultations = (params) => unwrap(client.get(`/consultations/${qs(params)}`));
export const getConsultation = (id) => unwrap(client.get(`/consultations/${id}/`));
export const startConsultation = (payload) => unwrap(client.post("/consultations/", payload));
export const saveConsultation = (id, payload) => unwrap(client.patch(`/consultations/${id}/`, payload));
export const deleteConsultation = (id) => unwrap(client.delete(`/consultations/${id}/`));
export const addDiagnosis = (id, payload) => unwrap(client.post(`/consultations/${id}/add-diagnosis/`, payload));
export const pauseConsultation = (id, payload) => unwrap(client.post(`/consultations/${id}/pause/`, payload));
export const resumeConsultation = (id) => unwrap(client.post(`/consultations/${id}/resume/`));
export const completeConsultation = (id) => unwrap(client.post(`/consultations/${id}/complete/`));

export const getPrescriptions = (params) => unwrap(client.get(`/prescriptions/${qs(params)}`));
export const createPrescription = (payload) => unwrap(client.post("/prescriptions/", payload));
export const searchMedicines = (query) => unwrap(client.get(`/medicines/autocomplete/${qs({ q: query })}`));

// ===========================================================================
// LABORATORY
// ===========================================================================
export const getLabTestCatalog = (params) => unwrap(client.get(`/lab-tests-catalog/${qs(params)}`));
export const createLabTest = (payload) => unwrap(client.post("/lab-tests-catalog/", payload));
export const updateLabTest = (id, payload) => unwrap(client.patch(`/lab-tests-catalog/${id}/`, payload));
export const deleteLabTest = (id) => unwrap(client.delete(`/lab-tests-catalog/${id}/`));

export const getLabOrders = (params) => unwrap(client.get(`/lab-orders/${qs(params)}`));
export const getPendingLabOrders = () => unwrap(client.get("/lab-orders/pending/"));
export const createLabOrder = (payload) => unwrap(client.post("/lab-orders/", payload));
export const collectLabOrder = (id) => unwrap(client.post(`/lab-orders/${id}/collect/`));
export const uploadLabResults = (payload) => {
  const form = toFormData(payload);
  return unwrap(client.post("/lab-results/", form, { headers: { "Content-Type": "multipart/form-data" } }));
};

// ===========================================================================
// RADIOLOGY
// ===========================================================================
export const getRadiologyTestCatalog = (params) => unwrap(client.get(`/radiology-tests-catalog/${qs(params)}`));
export const createRadiologyTest = (payload) => unwrap(client.post("/radiology-tests-catalog/", payload));
export const updateRadiologyTest = (id, payload) => unwrap(client.patch(`/radiology-tests-catalog/${id}/`, payload));
export const deleteRadiologyTest = (id) => unwrap(client.delete(`/radiology-tests-catalog/${id}/`));

export const getRadiologyOrders = (params) => unwrap(client.get(`/radiology-orders/${qs(params)}`));
export const getPendingRadiologyOrders = () => unwrap(client.get("/radiology-orders/pending/"));
export const createRadiologyOrder = (payload) => unwrap(client.post("/radiology-orders/", payload));
export const uploadRadiologyReport = (payload) => {
  const form = toFormData(payload);
  return unwrap(client.post("/radiology-results/", form, { headers: { "Content-Type": "multipart/form-data" } }));
};

// ===========================================================================
// PHARMACY / INVENTORY
// ===========================================================================
export const getMedicines = (params) => unwrap(client.get(`/medicines/${qs(params)}`));
export const createMedicine = (payload) => unwrap(client.post("/medicines/", payload));
export const updateMedicine = (id, payload) => unwrap(client.patch(`/medicines/${id}/`, payload));
export const getLowStockMedicines = () => unwrap(client.get("/medicines/low-stock/"));

export const getSuppliers = (params) => unwrap(client.get(`/suppliers/${qs(params)}`));
export const createSupplier = (payload) => unwrap(client.post("/suppliers/", payload));
export const updateSupplier = (id, payload) => unwrap(client.patch(`/suppliers/${id}/`, payload));
export const deleteSupplier = (id) => unwrap(client.delete(`/suppliers/${id}/`));

export const getMedicineBatches = (params) => unwrap(client.get(`/medicine-batches/${qs(params)}`));
export const createMedicineBatch = (payload) => unwrap(client.post("/medicine-batches/", payload));

export const getStockTransactions = (params) => unwrap(client.get(`/stock-transactions/${qs(params)}`));
export const createStockTransaction = (payload) => unwrap(client.post("/stock-transactions/", payload));

export const dispenseMedicine = (payload) => unwrap(client.post("/pharmacy-dispenses/", payload));
export const getDispenses = (params) => unwrap(client.get(`/pharmacy-dispenses/${qs(params)}`));

// ---------------------------------------------------------------------------
// Walk-in / OTC Sales (POS) — no patient record required
// ---------------------------------------------------------------------------
export const getOTCSales = (params) => unwrap(client.get(`/otc-sales/${qs(params)}`));
export const createOTCSale = (payload) => unwrap(client.post("/otc-sales/", payload));
export const getOTCSaleReceipt = (id) => unwrap(client.get(`/otc-sales/${id}/receipt/`));

// ===========================================================================
// DASHBOARD / REPORTS
// ===========================================================================
export const getDashboard = () => unwrap(client.get("/dashboard/"));
export const getReports = (type, params) => unwrap(client.get(`/reports/${qs({ type, ...params })}`));

// ===========================================================================
// AUDIT LOG
// ===========================================================================
export const getAuditLogs = (params) => unwrap(client.get(`/audit-logs/${qs(params)}`));
export const getAllTransactions = (params) => unwrap(client.get(`/transactions/${qs(params)}`));

// ===========================================================================
// INPATIENT / WARDS
// ===========================================================================
export const getWards = (params) => unwrap(client.get(`/wards/${qs(params)}`));
export const getWardOccupancy = () => unwrap(client.get("/wards/occupancy/"));
export const createWard = (payload) => unwrap(client.post("/wards/", payload));
export const updateWard = (id, payload) => unwrap(client.patch(`/wards/${id}/`, payload));

export const getBeds = (params) => unwrap(client.get(`/beds/${qs(params)}`));
export const getAvailableBeds = (wardId) => unwrap(client.get(`/beds/available/${qs({ ward: wardId })}`));
export const createBed = (payload) => unwrap(client.post("/beds/", payload));
export const updateBed = (id, payload) => unwrap(client.patch(`/beds/${id}/`, payload));

export const getAdmissions = (params) => unwrap(client.get(`/admissions/${qs(params)}`));
export const getActiveAdmissions = () => unwrap(client.get("/admissions/active/"));
export const getAdmission = (id) => unwrap(client.get(`/admissions/${id}/`));
export const admitPatient = (payload) => unwrap(client.post("/admissions/", payload));
export const dischargePatient = (id, payload) => unwrap(client.post(`/admissions/${id}/discharge/`, payload));
export const transferBed = (id, payload) => unwrap(client.post(`/admissions/${id}/transfer-bed/`, payload));
export const getAdmissionBilling = (id) => unwrap(client.get(`/admissions/${id}/billing/`));

export const getBedTransfers = (params) => unwrap(client.get(`/bed-transfers/${qs(params)}`));

export const getWardRounds = (params) => unwrap(client.get(`/ward-rounds/${qs(params)}`));
export const createWardRound = (payload) => unwrap(client.post("/ward-rounds/", payload));

export const getNursingNotes = (params) => unwrap(client.get(`/nursing-notes/${qs(params)}`));
export const createNursingNote = (payload) => unwrap(client.post("/nursing-notes/", payload));

export const getInpatientVitals = (params) => unwrap(client.get(`/inpatient-vitals/${qs(params)}`));
export const saveInpatientVitals = (payload) => unwrap(client.post("/inpatient-vitals/", payload));

export const getMedicationOrders = (params) => unwrap(client.get(`/medication-orders/${qs(params)}`));
export const createMedicationOrder = (payload) => unwrap(client.post("/medication-orders/", payload));
export const discontinueMedicationOrder = (id) => unwrap(client.post(`/medication-orders/${id}/discontinue/`));

export const getMedicationAdministrations = (params) => unwrap(client.get(`/medication-administrations/${qs(params)}`));
export const recordMedicationAdministration = (payload) => unwrap(client.post("/medication-administrations/", payload));

export const getBedCharges = (params) => unwrap(client.get(`/bed-charges/${qs(params)}`));
export const generateTodaysBedCharges = () => unwrap(client.post("/bed-charges/generate-today/"));


export const orderLabForAdmission = (admissionId, payload) => unwrap(client.post(`/admissions/${admissionId}/order-lab/`, payload));
export const orderRadiologyForAdmission = (admissionId, payload) => unwrap(client.post(`/admissions/${admissionId}/order-radiology/`, payload));
export const orderProcedureForAdmission = (admissionId, payload) => unwrap(client.post(`/admissions/${admissionId}/order-procedure/`, payload));

export const getProcedureCatalog = (params) => unwrap(client.get(`/procedure-catalog/${qs(params)}`));
export const getInpatientProcedures = (params) => unwrap(client.get(`/inpatient-procedures/${qs(params)}`));
export const completeProcedure = (id) => unwrap(client.post(`/inpatient-procedures/${id}/complete/`));


// ===========================================================================
// MATERNAL & CHILD HEALTH (MCH)
// ===========================================================================
export const getAntenatalProfiles = (params) => unwrap(client.get(`/antenatal-profiles/${qs(params)}`));
export const getAntenatalProfile = (id) => unwrap(client.get(`/antenatal-profiles/${id}/`));
export const registerAntenatal = (payload) => unwrap(client.post("/antenatal-profiles/", payload));
export const recordDelivery = (profileId, payload) => unwrap(client.post(`/antenatal-profiles/${profileId}/record-delivery/`, payload));

export const getANCVisits = (params) => unwrap(client.get(`/anc-visits/${qs(params)}`));
export const createANCVisit = (payload) => unwrap(client.post("/anc-visits/", payload));

export const getDeliveryRecords = (params) => unwrap(client.get(`/delivery-records/${qs(params)}`));

export const getPostnatalVisits = (params) => unwrap(client.get(`/postnatal-visits/${qs(params)}`));
export const createPostnatalVisit = (payload) => unwrap(client.post("/postnatal-visits/", payload));

export const getChildren = (params) => unwrap(client.get(`/children/${qs(params)}`));
export const getChild = (id) => unwrap(client.get(`/children/${id}/`));
export const registerChild = (payload) => unwrap(client.post("/children/", payload));
export const updateChild = (id, payload) => unwrap(client.patch(`/children/${id}/`, payload));

export const getVaccineCatalog = (params) => unwrap(client.get(`/vaccine-catalog/${qs(params)}`));

export const getChildImmunizations = (params) => unwrap(client.get(`/child-immunizations/${qs(params)}`));
export const administerImmunization = (id, payload) => unwrap(client.post(`/child-immunizations/${id}/administer/`, payload));
export const getDueImmunizations = () => unwrap(client.get("/child-immunizations/due/"));

export const getGrowthRecords = (params) => unwrap(client.get(`/growth-monitoring/${qs(params)}`));
export const createGrowthRecord = (payload) => unwrap(client.post("/growth-monitoring/", payload));

export const getAntenatalProfileBilling = (id) => unwrap(client.get(`/antenatal-profiles/${id}/billing/`));
export const addAntenatalCharge = (id, payload) => unwrap(client.post(`/antenatal-profiles/${id}/add-charge/`, payload));
export const addDeliveryCharge = (deliveryId, payload) => unwrap(client.post(`/delivery-records/${deliveryId}/add-charge/`, payload));

// ===========================================================================
// EMERGENCY DEPARTMENT
// ===========================================================================
export const getEmergencyBays = (params) => unwrap(client.get(`/emergency-bays/${qs(params)}`));
export const getAvailableEmergencyBays = () => unwrap(client.get("/emergency-bays/available/"));

export const getEmergencyVisits = (params) => unwrap(client.get(`/emergency-visits/${qs(params)}`));
export const getActiveEmergencyVisits = () => unwrap(client.get("/emergency-visits/active/"));
export const getEmergencyVisit = (id) => unwrap(client.get(`/emergency-visits/${id}/`));
export const registerEmergencyVisit = (payload) => unwrap(client.post("/emergency-visits/", payload));
export const getEmergencyBilling = (id) => unwrap(client.get(`/emergency-visits/${id}/billing/`));
export const addEmergencyCharge = (id, payload) => unwrap(client.post(`/emergency-visits/${id}/add-charge/`, payload));
export const orderEmergencyProcedure = (id, payload) => unwrap(client.post(`/emergency-visits/${id}/order-procedure/`, payload));
export const dischargeHome = (id, payload) => unwrap(client.post(`/emergency-visits/${id}/discharge-home/`, payload));
export const transferToAdmission = (id, payload) => unwrap(client.post(`/emergency-visits/${id}/transfer-to-admission/`, payload));
export const emergencyLama = (id, payload) => unwrap(client.post(`/emergency-visits/${id}/lama/`, payload));
export const emergencyDeceased = (id, payload) => unwrap(client.post(`/emergency-visits/${id}/deceased/`, payload));

export const getTriageVitals = (params) => unwrap(client.get(`/triage-vitals/${qs(params)}`));
export const saveTriageVitals = (payload) => unwrap(client.post("/triage-vitals/", payload));

export const getEmergencyNotes = (params) => unwrap(client.get(`/emergency-notes/${qs(params)}`));
export const createEmergencyNote = (payload) => unwrap(client.post("/emergency-notes/", payload));

export const getEmergencyProcedureCatalog = (params) => unwrap(client.get(`/emergency-procedure-catalog/${qs(params)}`));
export const completeEmergencyProcedure = (id) => unwrap(client.post(`/emergency-procedures/${id}/complete/`));

export const getEmergencyMedicationOrders = (params) => unwrap(client.get(`/emergency-medication-orders/${qs(params)}`));
export const createEmergencyMedicationOrder = (payload) => unwrap(client.post("/emergency-medication-orders/", payload));
export const recordEmergencyMedicationAdministration = (payload) => unwrap(client.post("/emergency-medication-administrations/", payload));


// ===========================================================================
// INSURANCE / SHA
// ===========================================================================
export const getInsurers = (params) => unwrap(client.get(`/insurers/${qs(params)}`));
export const createInsurer = (payload) => unwrap(client.post("/insurers/", payload));
export const updateInsurer = (id, payload) => unwrap(client.patch(`/insurers/${id}/`, payload));

export const getInsurancePolicies = (params) => unwrap(client.get(`/insurance-policies/${qs(params)}`));
export const createInsurancePolicy = (payload) => unwrap(client.post("/insurance-policies/", payload));
export const verifyEligibility = (policyId) => unwrap(client.post(`/insurance-policies/${policyId}/verify-eligibility/`));
export const getEligibilityHistory = (policyId) => unwrap(client.get(`/insurance-policies/${policyId}/eligibility-history/`));

export const getInsuranceClaims = (params) => unwrap(client.get(`/insurance-claims/${qs(params)}`));
export const getInsuranceClaim = (id) => unwrap(client.get(`/insurance-claims/${id}/`));
export const createInsuranceClaim = (payload) => unwrap(client.post("/insurance-claims/", payload));
export const submitInsuranceClaim = (id) => unwrap(client.post(`/insurance-claims/${id}/submit/`));
export const applyClaimResponse = (id, payload) => unwrap(client.post(`/insurance-claims/${id}/apply-response/`, payload));
export const settleInsuranceClaim = (id) => unwrap(client.post(`/insurance-claims/${id}/settle/`));
export const cancelInsuranceClaim = (id) => unwrap(client.post(`/insurance-claims/${id}/cancel/`));

// ===========================================================================
// eTIMS / KRA FISCALIZATION
// ===========================================================================
export const getFiscalizationConfig = () => unwrap(client.get("/fiscalization-config/"));
export const updateFiscalizationConfig = (id, payload) => unwrap(client.patch(`/fiscalization-config/${id}/`, payload));
export const createFiscalizationConfig = (payload) => unwrap(client.post("/fiscalization-config/", payload));

export const getFiscalizedReceipts = (params) => unwrap(client.get(`/fiscalized-receipts/${qs(params)}`));
export const getFailedFiscalizations = () => unwrap(client.get("/fiscalized-receipts/failed/"));
export const retryFiscalization = (id) => unwrap(client.post(`/fiscalized-receipts/${id}/retry/`));

// ===========================================================================
// ASSET MANAGEMENT
// ===========================================================================
export const getAssetCategories = (params) => unwrap(client.get(`/asset-categories/${qs(params)}`));
export const createAssetCategory = (payload) => unwrap(client.post("/asset-categories/", payload));

export const getAssets = (params) => unwrap(client.get(`/assets/${qs(params)}`));
export const getAsset = (id) => unwrap(client.get(`/assets/${id}/`));
export const createAsset = (payload) => unwrap(client.post("/assets/", payload));
export const updateAsset = (id, payload) => unwrap(client.patch(`/assets/${id}/`, payload));
export const getAssetSummary = () => unwrap(client.get("/assets/summary/"));
export const transferAsset = (id, payload) => unwrap(client.post(`/assets/${id}/transfer/`, payload));
export const disposeAsset = (id, payload) => unwrap(client.post(`/assets/${id}/dispose/`, payload));
export const getWarrantyExpiring = () => unwrap(client.get("/assets/warranty-expiring/"));

export const getAssetMaintenanceRecords = (params) => unwrap(client.get(`/asset-maintenance/${qs(params)}`));
export const createAssetMaintenance = (payload) => unwrap(client.post("/asset-maintenance/", payload));
export const completeAssetMaintenance = (id) => unwrap(client.post(`/asset-maintenance/${id}/complete/`));

export const getAssetTransfers = (params) => unwrap(client.get(`/asset-transfers/${qs(params)}`));
export const getAssetDisposals = (params) => unwrap(client.get(`/asset-disposals/${qs(params)}`));

// ===========================================================================
// PROCUREMENT
// ===========================================================================
export const getRequisitions = (params) => unwrap(client.get(`/purchase-requisitions/${qs(params)}`));
export const getPendingRequisitions = () => unwrap(client.get("/purchase-requisitions/pending-approval/"));
export const createRequisition = (payload) => unwrap(client.post("/purchase-requisitions/", payload));
export const approveRequisition = (id) => unwrap(client.post(`/purchase-requisitions/${id}/approve/`));
export const rejectRequisition = (id, payload) => unwrap(client.post(`/purchase-requisitions/${id}/reject/`, payload));

export const getPurchaseOrders = (params) => unwrap(client.get(`/purchase-orders/${qs(params)}`));
export const getOpenPurchaseOrders = () => unwrap(client.get("/purchase-orders/open/"));
export const getPurchaseOrder = (id) => unwrap(client.get(`/purchase-orders/${id}/`));
export const createPurchaseOrder = (payload) => unwrap(client.post("/purchase-orders/", payload));
export const cancelPurchaseOrder = (id) => unwrap(client.post(`/purchase-orders/${id}/cancel/`));

export const getGoodsReceipts = (params) => unwrap(client.get(`/goods-receipts/${qs(params)}`));
export const createGoodsReceipt = (payload) => unwrap(client.post("/goods-receipts/", payload));

export const getSupplierInvoices = (params) => unwrap(client.get(`/supplier-invoices/${qs(params)}`));
export const getOutstandingSupplierInvoices = () => unwrap(client.get("/supplier-invoices/outstanding/"));
export const createSupplierInvoice = (payload) => unwrap(client.post("/supplier-invoices/", payload));

export const getSupplierPayments = (params) => unwrap(client.get(`/supplier-payments/${qs(params)}`));
export const createSupplierPayment = (payload) => unwrap(client.post("/supplier-payments/", payload));

// ===========================================================================
// HUMAN RESOURCES
// ===========================================================================
export const getEmployees = (params) => unwrap(client.get(`/employees/${qs(params)}`));
export const getActiveEmployees = () => unwrap(client.get("/employees/active/"));
export const getEmployee = (id) => unwrap(client.get(`/employees/${id}/`));
export const createEmployee = (payload) => unwrap(client.post("/employees/", payload));
export const updateEmployee = (id, payload) => unwrap(client.patch(`/employees/${id}/`, payload));
export const terminateEmployee = (id, payload) => unwrap(client.post(`/employees/${id}/terminate/`, payload));

export const getLeaveTypes = (params) => unwrap(client.get(`/leave-types/${qs(params)}`));
export const createLeaveType = (payload) => unwrap(client.post("/leave-types/", payload));

export const getLeaveRequests = (params) => unwrap(client.get(`/leave-requests/${qs(params)}`));
export const getPendingLeaveRequests = () => unwrap(client.get("/leave-requests/pending/"));
export const createLeaveRequest = (payload) => unwrap(client.post("/leave-requests/", payload));
export const approveLeaveRequest = (id) => unwrap(client.post(`/leave-requests/${id}/approve/`));
export const rejectLeaveRequest = (id, payload) => unwrap(client.post(`/leave-requests/${id}/reject/`, payload));

export const getAttendance = (params) => unwrap(client.get(`/attendance/${qs(params)}`));
export const getTodaysAttendance = () => unwrap(client.get("/attendance/today/"));
export const recordAttendance = (payload) => unwrap(client.post("/attendance/", payload));

export const getPayrollRuns = (params) => unwrap(client.get(`/payroll-runs/${qs(params)}`));
export const getPayrollRun = (id) => unwrap(client.get(`/payroll-runs/${id}/`));
export const generatePayrollRun = (payload) => unwrap(client.post("/payroll-runs/", payload));
export const processPayrollRun = (id) => unwrap(client.post(`/payroll-runs/${id}/process/`));
export const markPayrollRunPaid = (id) => unwrap(client.post(`/payroll-runs/${id}/mark-paid/`));
export const updatePayslip = (id, payload) => unwrap(client.patch(`/payslips/${id}/`, payload));

export const getPerformanceReviews = (params) => unwrap(client.get(`/performance-reviews/${qs(params)}`));
export const createPerformanceReview = (payload) => unwrap(client.post("/performance-reviews/", payload));

export const getDisciplinaryRecords = (params) => unwrap(client.get(`/disciplinary-records/${qs(params)}`));
export const createDisciplinaryRecord = (payload) => unwrap(client.post("/disciplinary-records/", payload));

// ===========================================================================
// AMBULANCE
// ===========================================================================
export const getAmbulances = (params) => unwrap(client.get(`/ambulances/${qs(params)}`));
export const getAvailableAmbulances = () => unwrap(client.get("/ambulances/available/"));
export const createAmbulance = (payload) => unwrap(client.post("/ambulances/", payload));
export const updateAmbulance = (id, payload) => unwrap(client.patch(`/ambulances/${id}/`, payload));

export const getAmbulanceCrew = (params) => unwrap(client.get(`/ambulance-crew/${qs(params)}`));
export const assignCrewMember = (payload) => unwrap(client.post("/ambulance-crew/", payload));

export const getDispatches = (params) => unwrap(client.get(`/ambulance-dispatches/${qs(params)}`));
export const getActiveDispatches = () => unwrap(client.get("/ambulance-dispatches/active/"));
export const getDispatch = (id) => unwrap(client.get(`/ambulance-dispatches/${id}/`));
export const requestDispatch = (payload) => unwrap(client.post("/ambulance-dispatches/", payload));
export const assignAmbulanceToDispatch = (id, payload) => unwrap(client.post(`/ambulance-dispatches/${id}/assign-ambulance/`, payload));
export const assignCrewToDispatch = (id, payload) => unwrap(client.post(`/ambulance-dispatches/${id}/assign-crew/`, payload));
export const markPatientOnboard = (id) => unwrap(client.post(`/ambulance-dispatches/${id}/mark-patient-onboard/`));
export const completeDispatch = (id, payload) => unwrap(client.post(`/ambulance-dispatches/${id}/complete/`, payload));
export const cancelDispatch = (id) => unwrap(client.post(`/ambulance-dispatches/${id}/cancel/`));

export const getAmbulanceMaintenanceLogs = (params) => unwrap(client.get(`/ambulance-maintenance/${qs(params)}`));
export const createAmbulanceMaintenanceLog = (payload) => unwrap(client.post("/ambulance-maintenance/", payload));


// ===========================================================================
// MORTUARY
// ===========================================================================
export const getMortuaryUnits = (params) => unwrap(client.get(`/mortuary-units/${qs(params)}`));
export const getAvailableMortuaryUnits = () => unwrap(client.get("/mortuary-units/available/"));

export const getMortuaryServiceCatalog = (params) => unwrap(client.get(`/mortuary-service-catalog/${qs(params)}`));

export const getMortuaryCases = (params) => unwrap(client.get(`/mortuary-admissions/${qs(params)}`));
export const getInStorageCases = () => unwrap(client.get("/mortuary-admissions/in-storage/"));
export const getMortuaryCase = (id) => unwrap(client.get(`/mortuary-admissions/${id}/`));
export const registerMortuaryCase = (payload) => unwrap(client.post("/mortuary-admissions/", payload));
export const getMortuaryBilling = (id) => unwrap(client.get(`/mortuary-admissions/${id}/billing/`));
export const addMortuaryCharge = (id, payload) => unwrap(client.post(`/mortuary-admissions/${id}/add-charge/`, payload));
export const orderMortuaryService = (id, payload) => unwrap(client.post(`/mortuary-admissions/${id}/order-service/`, payload));
export const releaseBody = (id, payload) => unwrap(client.post(`/mortuary-admissions/${id}/release/`, payload));

// ===========================================================================
// THEATRE MANAGEMENT
// ===========================================================================
export const getOperatingTheatres = (params) => unwrap(client.get(`/operating-theatres/${qs(params)}`));
export const getAvailableTheatres = () => unwrap(client.get("/operating-theatres/available/"));

export const getSurgicalProcedureCatalog = (params) => unwrap(client.get(`/surgical-procedure-catalog/${qs(params)}`));

export const getSurgeryBookings = (params) => unwrap(client.get(`/surgery-bookings/${qs(params)}`));
export const getUpcomingBookings = () => unwrap(client.get("/surgery-bookings/upcoming/"));
export const getSurgeryBooking = (id) => unwrap(client.get(`/surgery-bookings/${id}/`));
export const createSurgeryBooking = (payload) => unwrap(client.post("/surgery-bookings/", payload));
export const cancelSurgeryBooking = (id, payload) => unwrap(client.post(`/surgery-bookings/${id}/cancel/`, payload));
export const startSurgery = (bookingId, payload) => unwrap(client.post(`/surgery-bookings/${bookingId}/start-surgery/`, payload));

export const getSurgeries = (params) => unwrap(client.get(`/surgeries/${qs(params)}`));
export const getInProgressSurgeries = () => unwrap(client.get("/surgeries/in-progress/"));
export const getSurgery = (id) => unwrap(client.get(`/surgeries/${id}/`));
export const markIncision = (id) => unwrap(client.post(`/surgeries/${id}/mark-incision/`));
export const markClosure = (id) => unwrap(client.post(`/surgeries/${id}/mark-closure/`));
export const assignSurgicalTeamMember = (id, payload) => unwrap(client.post(`/surgeries/${id}/assign-team/`, payload));
export const recordConsumable = (id, payload) => unwrap(client.post(`/surgeries/${id}/record-consumable/`, payload));
export const addPostOpNote = (id, payload) => unwrap(client.post(`/surgeries/${id}/add-post-op-note/`, payload));
export const completeSurgery = (id, payload) => unwrap(client.post(`/surgeries/${id}/complete/`, payload));

export const createOperatingTheatre = (payload) => unwrap(client.post("/operating-theatres/", payload));
export const createSurgicalProcedure = (payload) => unwrap(client.post("/surgical-procedure-catalog/", payload));

// ===========================================================================
// FINANCE & ACCOUNTING
// ===========================================================================
export const getAccounts = (params) => unwrap(client.get(`/accounts/${qs(params)}`));
export const createAccount = (payload) => unwrap(client.post("/accounts/", payload));

export const getFiscalPeriods = (params) => unwrap(client.get(`/fiscal-periods/${qs(params)}`));
export const createFiscalPeriod = (payload) => unwrap(client.post("/fiscal-periods/", payload));
export const closeFiscalPeriod = (id) => unwrap(client.post(`/fiscal-periods/${id}/close/`));

export const getJournalEntries = (params) => unwrap(client.get(`/journal-entries/${qs(params)}`));
export const getJournalEntry = (id) => unwrap(client.get(`/journal-entries/${id}/`));
export const createJournalEntry = (payload) => unwrap(client.post("/journal-entries/", payload));
export const postJournalEntry = (id) => unwrap(client.post(`/journal-entries/${id}/post/`));
export const voidJournalEntry = (id) => unwrap(client.post(`/journal-entries/${id}/void/`));

export const getExpenseCategories = (params) => unwrap(client.get(`/expense-categories/${qs(params)}`));
export const createExpenseCategory = (payload) => unwrap(client.post("/expense-categories/", payload));

export const getExpenses = (params) => unwrap(client.get(`/expenses/${qs(params)}`));
export const getPendingExpenses = () => unwrap(client.get("/expenses/pending-approval/"));
export const createExpense = (payload) => unwrap(client.post("/expenses/", payload));
export const approveExpense = (id) => unwrap(client.post(`/expenses/${id}/approve/`));
export const rejectExpense = (id, payload) => unwrap(client.post(`/expenses/${id}/reject/`, payload));
export const markExpensePaid = (id) => unwrap(client.post(`/expenses/${id}/mark-paid/`));

export const getBudgets = (params) => unwrap(client.get(`/budgets/${qs(params)}`));
export const createBudget = (payload) => unwrap(client.post("/budgets/", payload));

export const getFinancialSummary = (params) => unwrap(client.get(`/finance/summary/${qs(params)}`));

// ===========================================================================
// BLOOD BANK
// ===========================================================================
export const getBloodDonors = (params) => unwrap(client.get(`/blood-donors/${qs(params)}`));
export const getEligibleDonors = () => unwrap(client.get("/blood-donors/eligible/"));
export const createBloodDonor = (payload) => unwrap(client.post("/blood-donors/", payload));

export const getBloodDonations = (params) => unwrap(client.get(`/blood-donations/${qs(params)}`));
export const createBloodDonation = (payload) => unwrap(client.post("/blood-donations/", payload));

export const getBloodUnits = (params) => unwrap(client.get(`/blood-units/${qs(params)}`));
export const getBloodInventory = () => unwrap(client.get("/blood-units/inventory/"));
export const getExpiringSoonUnits = () => unwrap(client.get("/blood-units/expiring-soon/"));
export const screenBloodUnit = (id, payload) => unwrap(client.post(`/blood-units/${id}/screen/`, payload));
export const discardBloodUnit = (id) => unwrap(client.post(`/blood-units/${id}/discard/`));

export const getBloodRequests = (params) => unwrap(client.get(`/blood-requests/${qs(params)}`));
export const getPendingBloodRequests = () => unwrap(client.get("/blood-requests/pending/"));
export const getBloodRequest = (id) => unwrap(client.get(`/blood-requests/${id}/`));
export const createBloodRequest = (payload) => unwrap(client.post("/blood-requests/", payload));
export const getCompatibleUnits = (id) => unwrap(client.get(`/blood-requests/${id}/compatible-units/`));
export const issueBloodUnit = (id, payload) => unwrap(client.post(`/blood-requests/${id}/issue-unit/`, payload));
export const cancelBloodRequest = (id) => unwrap(client.post(`/blood-requests/${id}/cancel/`));

// ===========================================================================
// DENTAL
// ===========================================================================
export const getDentalProcedureCatalog = (params) => unwrap(client.get(`/dental-procedure-catalog/${qs(params)}`));

export const getDentalVisits = (params) => unwrap(client.get(`/dental-visits/${qs(params)}`));
export const getDentalVisit = (id) => unwrap(client.get(`/dental-visits/${id}/`));
export const registerDentalVisit = (payload) => unwrap(client.post("/dental-visits/", payload));
export const recordTooth = (visitId, payload) => unwrap(client.post(`/dental-visits/${visitId}/record-tooth/`, payload));
export const addTreatmentPlanItem = (visitId, payload) => unwrap(client.post(`/dental-visits/${visitId}/add-treatment-plan/`, payload));

export const performDentalProcedure = (planId, payload) => unwrap(client.post(`/dental-treatment-plans/${planId}/perform/`, payload));
export const cancelTreatmentPlanItem = (planId) => unwrap(client.post(`/dental-treatment-plans/${planId}/cancel/`));

// ===========================================================================
// EYE CLINIC
// ===========================================================================
export const getEyeProcedureCatalog = (params) => unwrap(client.get(`/eye-procedure-catalog/${qs(params)}`));

export const getEyeVisits = (params) => unwrap(client.get(`/eye-visits/${qs(params)}`));
export const getEyeVisit = (id) => unwrap(client.get(`/eye-visits/${id}/`));
export const registerEyeVisit = (payload) => unwrap(client.post("/eye-visits/", payload));
export const saveEyeExamination = (visitId, payload) => unwrap(client.post(`/eye-visits/${visitId}/save-examination/`, payload));
export const prescribeSpectacles = (visitId, payload) => unwrap(client.post(`/eye-visits/${visitId}/prescribe-spectacles/`, payload));
export const addEyeTreatmentPlanItem = (visitId, payload) => unwrap(client.post(`/eye-visits/${visitId}/add-treatment-plan/`, payload));

export const performEyeProcedure = (planId, payload) => unwrap(client.post(`/eye-treatment-plans/${planId}/perform/`, payload));
export const cancelEyeTreatmentPlanItem = (planId) => unwrap(client.post(`/eye-treatment-plans/${planId}/cancel/`));

// ===========================================================================
// DIALYSIS
// ===========================================================================
export const getDialysisMachines = (params) => unwrap(client.get(`/dialysis-machines/${qs(params)}`));
export const getAvailableDialysisMachines = () => unwrap(client.get("/dialysis-machines/available/"));

export const getDialysisPatients = (params) => unwrap(client.get(`/dialysis-patients/${qs(params)}`));
export const getActiveDialysisPatients = () => unwrap(client.get("/dialysis-patients/active/"));
export const getDialysisPatient = (id) => unwrap(client.get(`/dialysis-patients/${id}/`));
export const registerDialysisPatient = (payload) => unwrap(client.post("/dialysis-patients/", payload));
export const scheduleDialysisSession = (profileId, payload) => unwrap(client.post(`/dialysis-patients/${profileId}/schedule-session/`, payload));
export const addAccessCheck = (profileId, payload) => unwrap(client.post(`/dialysis-patients/${profileId}/add-access-check/`, payload));

export const getDialysisSessions = (params) => unwrap(client.get(`/dialysis-sessions/${qs(params)}`));
export const getTodaysDialysisSessions = () => unwrap(client.get("/dialysis-sessions/today/"));
export const getDialysisSession = (id) => unwrap(client.get(`/dialysis-sessions/${id}/`));
export const startDialysisSession = (id, payload) => unwrap(client.post(`/dialysis-sessions/${id}/start/`, payload));
export const completeDialysisSession = (id, payload) => unwrap(client.post(`/dialysis-sessions/${id}/complete/`, payload));
export const markSessionMissed = (id) => unwrap(client.post(`/dialysis-sessions/${id}/mark-missed/`));

// ---------------------------------------------------------------------------
// Helper: build multipart FormData for endpoints that accept file uploads
// ---------------------------------------------------------------------------
function toFormData(obj) {
  const form = new FormData();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });
  return form;
}

export default client;
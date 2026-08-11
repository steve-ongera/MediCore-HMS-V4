// src/App.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";

import DashboardLayout from "./layouts/DashboardLayout.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { ROLES } from "./utils/roles.js";

import Login from "./pages/auth/Login.jsx";
import Unauthorized from "./pages/auth/Unauthorized.jsx";
import NotFound from "./pages/NotFound.jsx";

import Dashboard from "./pages/dashboard/Dashboard.jsx";
import ReceptionistDashboard from "./pages/dashboard/ReceptionistDashboard.jsx";
import CashierDashboard from "./pages/dashboard/CashierDashboard.jsx";
import NurseHomeDashboard from "./pages/dashboard/NurseHomeDashboard.jsx";
import DoctorHomeDashboard from "./pages/dashboard/DoctorHomeDashboard.jsx";
import LabDashboard from "./pages/dashboard/LabDashboard.jsx";
import RadiologyDashboard from "./pages/dashboard/RadiologyDashboard.jsx";
import PharmacyDashboard from "./pages/dashboard/PharmacyDashboard.jsx";
import AccountantDashboard from "./pages/dashboard/AccountantDashboard.jsx";
import MortuaryDashboard from "./pages/dashboard/MortuaryDashboard.jsx";
import HRDashboard from "./pages/dashboard/HRDashboard.jsx";
import ProcurementDashboard from "./pages/dashboard/ProcurementDashboard.jsx";
import AmbulanceDashboard from "./pages/dashboard/AmbulanceDashboard.jsx";

import PatientList from "./pages/reception/PatientList.jsx";
import RegisterPatient from "./pages/reception/RegisterPatient.jsx";
import RegisterVisit from "./pages/reception/RegisterVisit.jsx";
import PatientVisits from "./pages/reception/PatientVisits.jsx";
import EditPatient from "./pages/reception/EditPatient.jsx";
import PatientProfile from "./pages/reception/PatientProfile.jsx";

import Billing from "./pages/billing/Billing.jsx";
import Payments from "./pages/billing/Payments.jsx";
import WalkInSale from "./pages/billing/WalkInSale.jsx";

import QueueBoard from "./pages/queue/QueueBoard.jsx";

import NurseDashboard from "./pages/nurse/NurseDashboard.jsx";

import DoctorDashboard from "./pages/doctor/DoctorDashboard.jsx";
import Consultation from "./pages/doctor/Consultation.jsx";
import ConsultationList from "./pages/doctor/ConsultationList.jsx";
import ConsultationDetail from "./pages/doctor/ConsultationDetail.jsx";

import Laboratory from "./pages/laboratory/Laboratory.jsx";
import Radiology from "./pages/radiology/Radiology.jsx";
import Pharmacy from "./pages/pharmacy/Pharmacy.jsx";
import Inventory from "./pages/inventory/Inventory.jsx";
import Suppliers from "./pages/pharmacy/Suppliers.jsx";

import Reports from "./pages/reports/Reports.jsx";
import Settings from "./pages/settings/Settings.jsx";
import Profile from "./pages/profile/Profile.jsx";

// Super Admin management pages
import Users from "./pages/settings/Users.jsx";
import Departments from "./pages/settings/Departments.jsx";
import AuditLog from "./pages/settings/AuditLog.jsx";
import TestCatalog from "./pages/settings/TestCatalog.jsx";
import ICD10Management from "./pages/settings/ICD10Management.jsx";

// Inpatient / Wards
import WardBoard from "./pages/inpatient/WardBoard.jsx";
import BedManagement from "./pages/inpatient/BedManagement.jsx";
import AdmissionList from "./pages/inpatient/AdmissionList.jsx";
import AdmitPatient from "./pages/inpatient/AdmitPatient.jsx";
import AdmissionDetail from "./pages/inpatient/AdmissionDetail.jsx";

import MCHDashboard from "./pages/mch/MCHDashboard.jsx";
import AntenatalRegister from "./pages/mch/AntenatalRegister.jsx";
import ANCProfileDetail from "./pages/mch/ANCProfileDetail.jsx";
import ChildRegister from "./pages/mch/ChildRegister.jsx";
import ChildDetail from "./pages/mch/ChildDetail.jsx";

import DailyOPDReport from "./pages/reports/DailyOPDReport.jsx";
import IPDReport from "./pages/reports/IPDReport.jsx";
import MCHReport from "./pages/reports/MCHReport.jsx";
import RevenueReport from "./pages/reports/RevenueReport.jsx";
import DrugConsumptionReport from "./pages/reports/DrugConsumptionReport.jsx";
import DiseaseStatisticsReport from "./pages/reports/DiseaseStatisticsReport.jsx";

import EmergencyBoard from "./pages/emergency/EmergencyBoard.jsx";
import RegisterEmergency from "./pages/emergency/RegisterEmergency.jsx";
import EmergencyVisitDetail from "./pages/emergency/EmergencyVisitDetail.jsx";

import Insurers from "./pages/insurance/Insurers.jsx";
import PatientPolicies from "./pages/insurance/PatientPolicies.jsx";
import ClaimsList from "./pages/insurance/ClaimsList.jsx";
import FileClaim from "./pages/insurance/FileClaim.jsx";
import ClaimDetail from "./pages/insurance/ClaimDetail.jsx";

import FiscalizedReceipts from "./pages/etims/FiscalizedReceipts.jsx";
import ETIMSConfig from "./pages/etims/ETIMSConfig.jsx";

import AssetRegister from "./pages/assets/AssetRegister.jsx";
import AssetForm from "./pages/assets/AssetForm.jsx";
import AssetDetail from "./pages/assets/AssetDetail.jsx";
import AssetMaintenance from "./pages/assets/AssetMaintenance.jsx";
import AssetCategories from "./pages/assets/AssetCategories.jsx";

import Requisitions from "./pages/procurement/Requisitions.jsx";
import PurchaseOrders from "./pages/procurement/PurchaseOrders.jsx";
import PurchaseOrderDetail from "./pages/procurement/PurchaseOrderDetail.jsx";
import GoodsReceipts from "./pages/procurement/GoodsReceipts.jsx";
import SupplierInvoices from "./pages/procurement/SupplierInvoices.jsx";

import Employees from "./pages/hr/Employees.jsx";
import EmployeeForm from "./pages/hr/EmployeeForm.jsx";
import EmployeeDetail from "./pages/hr/EmployeeDetail.jsx";
import LeaveRequests from "./pages/hr/LeaveRequests.jsx";
import Attendance from "./pages/hr/Attendance.jsx";
import Payroll from "./pages/hr/Payroll.jsx";
import PayrollRunDetail from "./pages/hr/PayrollRunDetail.jsx";

import AmbulanceDispatchBoard from "./pages/ambulance/AmbulanceDispatchBoard.jsx";
import RequestDispatch from "./pages/ambulance/RequestDispatch.jsx";
import DispatchDetail from "./pages/ambulance/DispatchDetail.jsx";
import FleetManagement from "./pages/ambulance/FleetManagement.jsx";

import MortuaryRegister from "./pages/mortuary/MortuaryRegister.jsx";
import AdmitDeceased from "./pages/mortuary/AdmitDeceased.jsx";
import MortuaryCaseDetail from "./pages/mortuary/MortuaryCaseDetail.jsx";

import TheatreBoard from "./pages/theatre/TheatreBoard.jsx";
import BookSurgery from "./pages/theatre/BookSurgery.jsx";
import BookingDetail from "./pages/theatre/BookingDetail.jsx";
import SurgeryDetail from "./pages/theatre/SurgeryDetail.jsx";
import TheatreSetup from "./pages/theatre/TheatreSetup.jsx";

import FinancialSummary from "./pages/finance/FinancialSummary.jsx";
import JournalEntries from "./pages/finance/JournalEntries.jsx";
import Expenses from "./pages/finance/Expenses.jsx";
import Budgets from "./pages/finance/Budgets.jsx";
import ChartOfAccounts from "./pages/finance/ChartOfAccounts.jsx";

import BloodInventory from "./pages/bloodbank/BloodInventory.jsx";
import BloodDonors from "./pages/bloodbank/BloodDonors.jsx";
import BloodRequests from "./pages/bloodbank/BloodRequests.jsx";
import BloodRequestDetail from "./pages/bloodbank/BloodRequestDetail.jsx";

import DentalVisits from "./pages/dental/DentalVisits.jsx";
import RegisterDentalVisit from "./pages/dental/RegisterDentalVisit.jsx";
import DentalVisitDetail from "./pages/dental/DentalVisitDetail.jsx";

import EyeVisits from "./pages/eyeclinic/EyeVisits.jsx";
import RegisterEyeVisit from "./pages/eyeclinic/RegisterEyeVisit.jsx";
import EyeVisitDetail from "./pages/eyeclinic/EyeVisitDetail.jsx";

import DialysisSessionsToday from "./pages/dialysis/DialysisSessionsToday.jsx";
import DialysisPatients from "./pages/dialysis/DialysisPatients.jsx";
import RegisterDialysisPatient from "./pages/dialysis/RegisterDialysisPatient.jsx";
import DialysisPatientDetail from "./pages/dialysis/DialysisPatientDetail.jsx";
import DialysisSessionDetail from "./pages/dialysis/DialysisSessionDetail.jsx";

import ICUBoard from "./pages/icu/ICUBoard.jsx";
import AdmitToICU from "./pages/icu/AdmitToICU.jsx";
import ICUAdmissionDetail from "./pages/icu/ICUAdmissionDetail.jsx";

import BulkPayment from "./pages/billing/BulkPayment.jsx";
import BulkPaymentReceipt from "./pages/billing/BulkPaymentReceipt.jsx";

import LabTechReport from "./pages/reports/LabTechReport.jsx";
import RadiologistReport from "./pages/reports/RadiologistReport.jsx";
import PharmacistReport from "./pages/reports/PharmacistReport.jsx";
import MortuaryReport from "./pages/reports/MortuaryReport.jsx";
import AmbulanceReport from "./pages/reports/AmbulanceReport.jsx";
import LabTestCatalogManagement from "./pages/laboratory/LabTestCatalogManagement.jsx";
import RadiologyTestCatalogManagement from "./pages/radiology/RadiologyTestCatalogManagement.jsx";
import ExpiryAlerts from "./pages/pharmacy/ExpiryAlerts.jsx";
import BodyReleaseHistory from "./pages/mortuary/BodyReleaseHistory.jsx";
import MaintenanceHistory from "./pages/ambulance/MaintenanceHistory.jsx";

import AdmissionMedicineOrders from "./pages/pharmacy/AdmissionMedicineOrders.jsx";
import EmergencyMedicineOrders from "./pages/pharmacy/EmergencyMedicineOrders.jsx";

import VerifyOTP from "./pages/auth/VerifyOTP.jsx";
import DeviceSessionMonitoring from "./pages/settings/DeviceSessionMonitoring.jsx";
import SecurityAuditLogPage from "./pages/settings/SecurityAuditLogPage.jsx";

import CashTillDashboard from "./pages/billing/CashTillDashboard.jsx";
import VarianceApprovals from "./pages/finance/VarianceApprovals.jsx";

import StoreLocations from "./pages/stockcontrol/StoreLocations.jsx";
import StockTransfers from "./pages/stockcontrol/StockTransfers.jsx";
import StockTransferDetail from "./pages/stockcontrol/StockTransferDetail.jsx";
import StockCounts from "./pages/stockcontrol/StockCounts.jsx";
import DiscrepancyReport from "./pages/stockcontrol/DiscrepancyReport.jsx";

import RevenueLeakageDashboard from "./pages/leakage/RevenueLeakageDashboard.jsx";
import LeakageRecords from "./pages/leakage/LeakageRecords.jsx";

import ExecutiveDashboard from "./pages/executive/ExecutiveDashboard.jsx";
import RefundsManagement from "./pages/executive/RefundsManagement.jsx";
import BusinessInsights from "./pages/insights/BusinessInsights.jsx";
import RequestRefund from "./pages/billing/RequestRefund.jsx";

import Messages from "./pages/messaging/Messages.jsx";
import ChatThread from "./pages/messaging/ChatThread.jsx";
import StaffDirectory from "./pages/messaging/StaffDirectory.jsx";
import MyLeaveRequests from "./pages/hr/MyLeaveRequests.jsx";

import MedRecordsDashboard from "./pages/medrecords/MedRecordsDashboard.jsx";
import PatientFileTracking from "./pages/medrecords/PatientFileTracking.jsx";
import BirthRegisterPage from "./pages/medrecords/BirthRegisterPage.jsx";
import DeathRegisterPage from "./pages/medrecords/DeathRegisterPage.jsx";
import ReferralsPage from "./pages/medrecords/ReferralsPage.jsx";
import DischargeSummaries from "./pages/medrecords/DischargeSummaries.jsx";
import RecordRequestsPage from "./pages/medrecords/RecordRequestsPage.jsx";
import RecordAuditTrailPage from "./pages/medrecords/RecordAuditTrailPage.jsx";
import DocumentUpload from "./pages/medrecords/DocumentUpload.jsx";
import HealthRecordsOfficerDashboard from "./pages/dashboard/HealthRecordsOfficerDashboard.jsx";
import MedicalRecordsOfficerDashboard from "./pages/dashboard/MedicalRecordsOfficerDashboard.jsx";
import ICDCodingReview from "./pages/medrecords/ICDCodingReview.jsx";
import BiomedicalEngineerDashboard from "./pages/dashboard/BiomedicalEngineerDashboard.jsx";

import EquipmentRegister from "./pages/biomed/EquipmentRegister.jsx";
import EquipmentForm from "./pages/biomed/EquipmentForm.jsx";
import EquipmentDetail from "./pages/biomed/EquipmentDetail.jsx";
import ServiceRequests from "./pages/biomed/ServiceRequests.jsx";
import Maintenance from "./pages/biomed/Maintenance.jsx";
import CalibrationSchedule from "./pages/biomed/CalibrationSchedule.jsx";
import SparePartsInventory from "./pages/biomed/SparePartsInventory.jsx";
import ServiceContracts from "./pages/biomed/ServiceContracts.jsx";
import DowntimeReport from "./pages/biomed/DowntimeReport.jsx";

import Announcements from "./pages/communication/Announcements.jsx";
import MyAnnouncements from "./pages/communication/MyAnnouncements.jsx";

import RaiseTicket from "./pages/tickets/RaiseTicket.jsx";
import MyTickets from "./pages/tickets/MyTickets.jsx";
import ITSupportQueue from "./pages/tickets/ITSupportQueue.jsx";
import TicketDetail from "./pages/tickets/TicketDetail.jsx";

import LicenseStatus from "./pages/settings/LicenseStatus.jsx";
import ITSupportDashboard from "./pages/dashboard/ITSupportDashboard.jsx";
import RaiseRequisition from "./pages/procurement/RaiseRequisition.jsx";
import HODApprovals from "./pages/procurement/HODApprovals.jsx";

import OPDReport from "./pages/moh/OPDReport.jsx";
import InpatientCapacityReport from "./pages/moh/InpatientCapacityReport.jsx";
import XMCHReport from "./pages/moh/MCHReport.jsx";
import MortalityReport from "./pages/moh/MortalityReport.jsx";
import DiseaseSurveillanceReport from "./pages/moh/DiseaseSurveillanceReport.jsx";
import LabRadiologyReport from "./pages/moh/LabRadiologyReport.jsx";
import PharmacyCommoditiesReport from "./pages/moh/PharmacyCommoditiesReport.jsx";
import TheatreEmergencyReport from "./pages/moh/TheatreEmergencyReport.jsx";

import VideoTutorials from "./pages/support/VideoTutorials.jsx";
import HelpCenter from "./pages/support/HelpCenter.jsx";
import ContactUs from "./pages/support/ContactUs.jsx";
import Subscriptions from "./pages/support/Subscriptions.jsx";

import PACSWorklist from "./pages/pacs/PACSWorklist.jsx";
import StudyDetail from "./pages/pacs/StudyDetail.jsx";
import BulkPaymentList from "./pages/billing/BulkPaymentList.jsx";
import VisitList from "./pages/reception/VisitList.jsx";
import VisitDetail from "./pages/reception/VisitDetail.jsx";
import VisitEdit from "./pages/reception/VisitEdit.jsx";

// Preserves query params (e.g. ?invoice=xxx) when redirecting old /payments
// links to the new /billing/payments path.
function LegacyPaymentsRedirect() {
  const location = useLocation();
  return <Navigate to={`/billing/payments${location.search}`} replace />;
}

// Routes any authenticated user to their role's home dashboard. Super Admin
// keeps the original full-admin Dashboard; every other role gets its own
// tailored RoleDashboardBase-powered page.
function RoleHomeDashboard() {
  const { user } = useAuth();

  const roleComponentMap = {
    [ROLES.SUPER_ADMIN]: Dashboard,
    [ROLES.RECEPTIONIST]: ReceptionistDashboard,
    [ROLES.CASHIER]: CashierDashboard,
    [ROLES.NURSE]: NurseHomeDashboard,
    [ROLES.DOCTOR]: DoctorHomeDashboard,
    [ROLES.LAB_TECHNOLOGIST]: LabDashboard,
    [ROLES.RADIOLOGIST]: RadiologyDashboard,
    [ROLES.PHARMACIST]: PharmacyDashboard,
    [ROLES.ACCOUNTANT]: AccountantDashboard,
    [ROLES.MORTUARY_ATTENDANT]: MortuaryDashboard,
    [ROLES.HR_OFFICER]: HRDashboard,
    [ROLES.PROCUREMENT_OFFICER]: ProcurementDashboard,
    [ROLES.AMBULANCE_DISPATCHER]: AmbulanceDashboard,
    [ROLES.HEALTH_RECORDS_OFFICER]: HealthRecordsOfficerDashboard,
    [ROLES.MEDICAL_RECORDS_OFFICER]: MedicalRecordsOfficerDashboard,
    [ROLES.BIOMEDICAL_ENGINEER]: BiomedicalEngineerDashboard,
    [ROLES.IT_SUPPORT_OFFICER]: ITSupportDashboard,
  };

  const role = user?.role;
  const Component = roleComponentMap[role] || Dashboard;
  return <Component />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Route>

      {/* Authenticated shell */}
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleHomeDashboard />
            </ProtectedRoute>
          }
        />

        {/* Super Admin's original full dashboard, kept reachable directly */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Reception */}
        <Route
          path="/patients"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}>
              <PatientList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/register"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}>
              <RegisterPatient />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR]}>
              <PatientProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/:id/visits"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}>
              <PatientVisits />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/:id/edit"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}>
              <EditPatient />
            </ProtectedRoute>
          }
        />
        <Route
          path="/visits/register"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}>
              <RegisterVisit />
            </ProtectedRoute>
          }
        />

        {/* Billing */}
        <Route
          path="/billing"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ACCOUNTANT]}>
              <Billing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing/payments"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ACCOUNTANT]}>
              <Payments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing/walk-in-sale"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ACCOUNTANT]}>
              <WalkInSale />
            </ProtectedRoute>
          }
        />

        {/* Legacy redirect: old /payments links (with query params like ?invoice=xxx)
            now forward to /billing/payments */}
        <Route path="/payments" element={<LegacyPaymentsRedirect />} />

        {/* Queue */}
        <Route
          path="/queue"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR]}>
              <QueueBoard />
            </ProtectedRoute>
          }
        />

        {/* Nurse */}
        <Route
          path="/nurse"
          element={
            <ProtectedRoute allowedRoles={[ROLES.NURSE]}>
              <NurseDashboard />
            </ProtectedRoute>
          }
        />

        {/* Doctor */}
        <Route
          path="/doctor"
          element={
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/consultation/:visitId"
          element={
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
              <Consultation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/consultations"
          element={
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
              <ConsultationList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/consultations/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
              <ConsultationDetail />
            </ProtectedRoute>
          }
        />

        {/* Laboratory */}
        <Route
          path="/laboratory"
          element={
            <ProtectedRoute allowedRoles={[ROLES.LAB_TECHNOLOGIST]}>
              <Laboratory />
            </ProtectedRoute>
          }
        />

        {/* Radiology */}
        <Route
          path="/radiology"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RADIOLOGIST]}>
              <Radiology />
            </ProtectedRoute>
          }
        />

        {/* Pharmacy */}
        <Route
          path="/pharmacy"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PHARMACIST]}>
              <Pharmacy />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PHARMACIST, ROLES.PROCUREMENT_OFFICER]}>
              <Suppliers />
            </ProtectedRoute>
          }
        />

        {/* Inventory */}
        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PHARMACIST, ROLES.ACCOUNTANT]}>
              <Inventory />
            </ProtectedRoute>
          }
        />

        {/* Reports */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/opd-daily"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}>
              <DailyOPDReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/ipd"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}>
              <IPDReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/mch"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}>
              <MCHReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/revenue"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}>
              <RevenueReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/drug-consumption"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}>
              <DrugConsumptionReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/disease-statistics"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}>
              <DiseaseStatisticsReport />
            </ProtectedRoute>
          }
        />

        {/* Settings (Super Admin) */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.IT_SUPPORT_OFFICER]}>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Staff, Departments, Audit Log, Test Catalog (Super Admin) */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.IT_SUPPORT_OFFICER]}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/departments"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.IT_SUPPORT_OFFICER]}>
              <Departments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.IT_SUPPORT_OFFICER]}>
              <AuditLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/test-catalog"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.IT_SUPPORT_OFFICER]}>
              <TestCatalog />
            </ProtectedRoute>
          }
        />

        {/* Inpatient / Wards */}
        <Route
          path="/inpatient"
          element={
            <ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.SUPER_ADMIN]}>
              <WardBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inpatient/beds"
          element={
            <ProtectedRoute allowedRoles={[ROLES.IT_SUPPORT_OFFICER, ROLES.SUPER_ADMIN]}>
              <BedManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inpatient/admissions"
          element={
            <ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR, ROLES.RECEPTIONIST]}>
              <AdmissionList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inpatient/admit"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR]}>
              <AdmitPatient />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inpatient/admissions/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR, ROLES.RECEPTIONIST]}>
              <AdmissionDetail />
            </ProtectedRoute>
          }
        />

        {/* Maternal & Child Health */}
        <Route
          path="/mch"
          element={
            <ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR, ROLES.RECEPTIONIST]}>
              <MCHDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mch/antenatal"
          element={
            <ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR, ROLES.RECEPTIONIST]}>
              <AntenatalRegister />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mch/antenatal/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR]}>
              <ANCProfileDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mch/children"
          element={
            <ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR, ROLES.RECEPTIONIST]}>
              <ChildRegister />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mch/children/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR]}>
              <ChildDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/emergency"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR]}>
              <EmergencyBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/emergency/register"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR]}>
              <RegisterEmergency />
            </ProtectedRoute>
          }
        />
        <Route
          path="/emergency/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR]}>
              <EmergencyVisitDetail />
            </ProtectedRoute>
          }
        />

        <Route path="/insurance/insurers" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><Insurers /></ProtectedRoute>} />
        <Route path="/insurance/policies" element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST, ROLES.CASHIER, ROLES.ACCOUNTANT]}><PatientPolicies /></ProtectedRoute>} />
        <Route path="/insurance/claims" element={<ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ACCOUNTANT]}><ClaimsList /></ProtectedRoute>} />
        <Route path="/insurance/claims/new" element={<ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ACCOUNTANT, ROLES.RECEPTIONIST]}><FileClaim /></ProtectedRoute>} />
        <Route path="/insurance/claims/:id" element={<ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ACCOUNTANT]}><ClaimDetail /></ProtectedRoute>} />

        <Route path="/etims/receipts" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT]}><FiscalizedReceipts /></ProtectedRoute>} />
        <Route path="/etims/config" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><ETIMSConfig /></ProtectedRoute>} />

        <Route path="/assets" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><AssetRegister /></ProtectedRoute>} />
        <Route path="/assets/register" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><AssetForm /></ProtectedRoute>} />
        <Route path="/assets/:id" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><AssetDetail /></ProtectedRoute>} />
        <Route path="/assets/maintenance" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><AssetMaintenance /></ProtectedRoute>} />
        <Route path="/assets/categories" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><AssetCategories /></ProtectedRoute>} />

        <Route path="/procurement/requisitions" element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER, ROLES.ACCOUNTANT]}><Requisitions /></ProtectedRoute>} />
        <Route path="/procurement/orders" element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER, ROLES.ACCOUNTANT]}><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/procurement/orders/:id" element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER, ROLES.ACCOUNTANT]}><PurchaseOrderDetail /></ProtectedRoute>} />
        <Route path="/procurement/receipts" element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER, ROLES.ACCOUNTANT]}><GoodsReceipts /></ProtectedRoute>} />
        <Route path="/procurement/invoices" element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER, ROLES.ACCOUNTANT]}><SupplierInvoices /></ProtectedRoute>} />
        <Route path="/requisitions/raise" element={<ProtectedRoute><RaiseRequisition /></ProtectedRoute>} />
        <Route path="/requisitions/approvals" element={<ProtectedRoute><HODApprovals /></ProtectedRoute>} />

        <Route path="/hr/employees" element={<ProtectedRoute allowedRoles={[ROLES.HR_OFFICER]}><Employees /></ProtectedRoute>} />
        <Route path="/hr/employees/register" element={<ProtectedRoute allowedRoles={[ROLES.HR_OFFICER]}><EmployeeForm /></ProtectedRoute>} />
        <Route path="/hr/employees/:id" element={<ProtectedRoute allowedRoles={[ROLES.HR_OFFICER]}><EmployeeDetail /></ProtectedRoute>} />
        <Route path="/hr/leave" element={<ProtectedRoute allowedRoles={[ROLES.HR_OFFICER]}><LeaveRequests /></ProtectedRoute>} />
        <Route path="/hr/attendance" element={<ProtectedRoute allowedRoles={[ROLES.HR_OFFICER]}><Attendance /></ProtectedRoute>} />
        <Route path="/hr/payroll" element={<ProtectedRoute allowedRoles={[ROLES.HR_OFFICER]}><Payroll /></ProtectedRoute>} />
        <Route path="/hr/payroll/:id" element={<ProtectedRoute allowedRoles={[ROLES.HR_OFFICER]}><PayrollRunDetail /></ProtectedRoute>} />

        {/* Ambulance — dispatch board & case detail are Dispatcher-only
            operational data (vehicle status, driver assignments, all active
            dispatches hospital-wide). Clinical staff can still REQUEST a
            dispatch for a patient without seeing the full board. */}
        <Route path="/ambulance" element={<ProtectedRoute allowedRoles={[ROLES.AMBULANCE_DISPATCHER]}><AmbulanceDispatchBoard /></ProtectedRoute>} />
        <Route path="/ambulance/request" element={<ProtectedRoute allowedRoles={[ROLES.AMBULANCE_DISPATCHER, ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR]}><RequestDispatch /></ProtectedRoute>} />
        <Route path="/ambulance/:id" element={<ProtectedRoute allowedRoles={[ROLES.AMBULANCE_DISPATCHER]}><DispatchDetail /></ProtectedRoute>} />
        <Route path="/ambulance/fleet" element={<ProtectedRoute allowedRoles={[ROLES.AMBULANCE_DISPATCHER]}><FleetManagement /></ProtectedRoute>} />

        {/* Mortuary — full register & case detail (next-of-kin info, storage,
            release status for every case) are Mortuary Attendant-only.
            Clinical staff can still ADMIT a deceased patient without
            browsing the full mortuary register. */}
        <Route path="/mortuary" element={<ProtectedRoute allowedRoles={[ROLES.MORTUARY_ATTENDANT]}><MortuaryRegister /></ProtectedRoute>} />
        <Route path="/mortuary/admit" element={<ProtectedRoute allowedRoles={[ROLES.MORTUARY_ATTENDANT, ROLES.NURSE, ROLES.DOCTOR, ROLES.RECEPTIONIST]}><AdmitDeceased /></ProtectedRoute>} />
        <Route path="/mortuary/:id" element={<ProtectedRoute allowedRoles={[ROLES.MORTUARY_ATTENDANT]}><MortuaryCaseDetail /></ProtectedRoute>} />

        <Route path="/theatre" element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.NURSE]}><TheatreBoard /></ProtectedRoute>} />
        <Route path="/theatre/book" element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.NURSE]}><BookSurgery /></ProtectedRoute>} />
        <Route path="/theatre/:id" element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.NURSE]}><SurgeryDetail /></ProtectedRoute>} />
        <Route path="/theatre/setup" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><TheatreSetup /></ProtectedRoute>} />
        <Route path="/theatre/booking/:id" element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.NURSE]}><BookingDetail /></ProtectedRoute>} />

        <Route path="/finance" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><FinancialSummary /></ProtectedRoute>} />
        <Route path="/finance/journal" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><JournalEntries /></ProtectedRoute>} />
        <Route path="/finance/expenses" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><Expenses /></ProtectedRoute>} />
        <Route path="/finance/budgets" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><Budgets /></ProtectedRoute>} />
        <Route path="/finance/accounts" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><ChartOfAccounts /></ProtectedRoute>} />

        <Route path="/bloodbank" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR]}><BloodInventory /></ProtectedRoute>} />
        <Route path="/bloodbank/donors" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR]}><BloodDonors /></ProtectedRoute>} />
        <Route path="/bloodbank/requests" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR]}><BloodRequests /></ProtectedRoute>} />
        <Route path="/bloodbank/requests/:id" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR]}><BloodRequestDetail /></ProtectedRoute>} />

        <Route path="/dental" element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.NURSE]}><DentalVisits /></ProtectedRoute>} />
        <Route path="/dental/register" element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.NURSE]}><RegisterDentalVisit /></ProtectedRoute>} />
        <Route path="/dental/:id" element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.NURSE]}><DentalVisitDetail /></ProtectedRoute>} />

        <Route path="/eyeclinic" element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.NURSE]}><EyeVisits /></ProtectedRoute>} />
        <Route path="/eyeclinic/register" element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.NURSE]}><RegisterEyeVisit /></ProtectedRoute>} />
        <Route path="/eyeclinic/:id" element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.NURSE]}><EyeVisitDetail /></ProtectedRoute>} />

        <Route path="/icu" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR , ROLES.RECEPTIONIST]}><ICUBoard /></ProtectedRoute>} />
        <Route path="/icu/admit" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR , ROLES.RECEPTIONIST]}><AdmitToICU /></ProtectedRoute>} />
        <Route path="/icu/:id" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR , ROLES.RECEPTIONIST]}><ICUAdmissionDetail /></ProtectedRoute>} />

        <Route path="/dialysis" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR]}><DialysisSessionsToday /></ProtectedRoute>} />
        <Route path="/dialysis/patients" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR]}><DialysisPatients /></ProtectedRoute>} />
        <Route path="/dialysis/register" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR]}><RegisterDialysisPatient /></ProtectedRoute>} />
        <Route path="/dialysis/patients/:id" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR]}><DialysisPatientDetail /></ProtectedRoute>} />
        <Route path="/dialysis/sessions/:id" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR]}><DialysisSessionDetail /></ProtectedRoute>} />

        <Route path="/billing/bulk-payment" element={<ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ACCOUNTANT]}><BulkPayment /></ProtectedRoute>} />
        <Route path="/billing/bulk-payment/:id/receipt" element={<ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ACCOUNTANT]}><BulkPaymentReceipt /></ProtectedRoute>} />

        <Route path="/laboratory/reports" element={<ProtectedRoute allowedRoles={[ROLES.LAB_TECHNOLOGIST]}><LabTechReport /></ProtectedRoute>} />
        <Route path="/laboratory/catalog" element={<ProtectedRoute allowedRoles={[ROLES.LAB_TECHNOLOGIST]}><LabTestCatalogManagement /></ProtectedRoute>} />
        <Route path="/radiology/reports" element={<ProtectedRoute allowedRoles={[ROLES.RADIOLOGIST]}><RadiologistReport /></ProtectedRoute>} />
        <Route path="/radiology/catalog" element={<ProtectedRoute allowedRoles={[ROLES.RADIOLOGIST]}><RadiologyTestCatalogManagement /></ProtectedRoute>} />
        <Route path="/pharmacy/reports" element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST , ROLES.PROCUREMENT_OFFICER]}><PharmacistReport /></ProtectedRoute>} />
        <Route path="/pharmacy/alerts" element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST ,  ROLES.PROCUREMENT_OFFICER]}><ExpiryAlerts /></ProtectedRoute>} />
        <Route path="/mortuary/reports" element={<ProtectedRoute allowedRoles={[ROLES.MORTUARY_ATTENDANT]}><MortuaryReport /></ProtectedRoute>} />
        <Route path="/mortuary/releases" element={<ProtectedRoute allowedRoles={[ROLES.MORTUARY_ATTENDANT]}><BodyReleaseHistory /></ProtectedRoute>} />
        <Route path="/ambulance/reports" element={<ProtectedRoute allowedRoles={[ROLES.AMBULANCE_DISPATCHER]}><AmbulanceReport /></ProtectedRoute>} />
        <Route path="/ambulance/maintenance" element={<ProtectedRoute allowedRoles={[ROLES.AMBULANCE_DISPATCHER]}><MaintenanceHistory /></ProtectedRoute>} />

        <Route path="/pharmacy/admission-orders" element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST]}><AdmissionMedicineOrders /></ProtectedRoute>} />
        <Route path="/pharmacy/emergency-orders" element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST]}><EmergencyMedicineOrders /></ProtectedRoute>} />

        <Route path="/settings/sessions" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN , ROLES.IT_SUPPORT_OFFICER]}><DeviceSessionMonitoring /></ProtectedRoute>} />
        <Route path="/settings/security-audit" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN , ROLES.IT_SUPPORT_OFFICER]}><SecurityAuditLogPage /></ProtectedRoute>} />

        <Route path="/billing/till" element={<ProtectedRoute allowedRoles={[ROLES.CASHIER]}><CashTillDashboard /></ProtectedRoute>} />
        <Route path="/finance/variance-approvals" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><VarianceApprovals /></ProtectedRoute>} />

        {/* Stock Control — internal transfer records span all store
            locations; scoped to Pharmacy (and Super Admin), not Nursing.
            If wards need to request supplies, that should be a separate,
            narrowly-scoped "ward stock request" flow, not this page. */}
        <Route path="/stockcontrol/locations" element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST, ROLES.SUPER_ADMIN]}><StoreLocations /></ProtectedRoute>} />
        <Route path="/stockcontrol/transfers" element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST, ROLES.SUPER_ADMIN]}><StockTransfers /></ProtectedRoute>} />
        <Route path="/stockcontrol/transfers/:id" element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST, ROLES.SUPER_ADMIN]}><StockTransferDetail /></ProtectedRoute>} />
        <Route path="/stockcontrol/counts" element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST, ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><StockCounts /></ProtectedRoute>} />
        <Route path="/stockcontrol/discrepancies" element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST, ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><DiscrepancyReport /></ProtectedRoute>} />

        <Route path="/leakage" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><RevenueLeakageDashboard /></ProtectedRoute>} />
        <Route path="/leakage/records" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><LeakageRecords /></ProtectedRoute>} />

        <Route path="/executive" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT]}><ExecutiveDashboard /></ProtectedRoute>} />
        <Route path="/executive/refunds" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT]}><RefundsManagement /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><BusinessInsights /></ProtectedRoute>} />
        <Route path="/billing/request-refund" element={<ProtectedRoute allowedRoles={[ROLES.CASHIER]}><RequestRefund /></ProtectedRoute>} />

        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/messages/directory" element={<ProtectedRoute><StaffDirectory /></ProtectedRoute>} />
        <Route path="/messages/:id" element={<ProtectedRoute><ChatThread /></ProtectedRoute>} />
        <Route path="/my-leave" element={<ProtectedRoute><MyLeaveRequests /></ProtectedRoute>} />
        
        
        <Route path="/medrecords" element={<ProtectedRoute allowedRoles={[ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER]}><MedRecordsDashboard /></ProtectedRoute>} />
        <Route path="/medrecords/files" element={<ProtectedRoute allowedRoles={[ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER]}><PatientFileTracking /></ProtectedRoute>} />
        <Route path="/medrecords/birth-register" element={<ProtectedRoute allowedRoles={[ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER]}><BirthRegisterPage /></ProtectedRoute>} />
        <Route path="/medrecords/death-register" element={<ProtectedRoute allowedRoles={[ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER]}><DeathRegisterPage /></ProtectedRoute>} />
        <Route path="/medrecords/referrals" element={<ProtectedRoute allowedRoles={[ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER, ROLES.DOCTOR]}><ReferralsPage /></ProtectedRoute>} />
        <Route path="/medrecords/discharge-summaries" element={<ProtectedRoute allowedRoles={[ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER, ROLES.DOCTOR]}><DischargeSummaries /></ProtectedRoute>} />
        <Route path="/medrecords/requests" element={<ProtectedRoute allowedRoles={[ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER]}><RecordRequestsPage /></ProtectedRoute>} />
        <Route path="/medrecords/audit-trail" element={<ProtectedRoute allowedRoles={[ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER]}><RecordAuditTrailPage /></ProtectedRoute>} />
        <Route path="/medrecords/documents" element={<ProtectedRoute allowedRoles={[ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER]}><DocumentUpload /></ProtectedRoute>} />
        <Route path="/medrecords/coding-review" element={<ProtectedRoute allowedRoles={[ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER]}><ICDCodingReview /></ProtectedRoute>} />


        <Route path="/biomed/equipment" element={<ProtectedRoute allowedRoles={[ROLES.BIOMEDICAL_ENGINEER]}><EquipmentRegister /></ProtectedRoute>} />
        <Route path="/biomed/equipment/register" element={<ProtectedRoute allowedRoles={[ROLES.BIOMEDICAL_ENGINEER]}><EquipmentForm /></ProtectedRoute>} />
        <Route path="/biomed/equipment/:id" element={<ProtectedRoute allowedRoles={[ROLES.BIOMEDICAL_ENGINEER]}><EquipmentDetail /></ProtectedRoute>} />
        <Route path="/biomed/service-requests" element={<ProtectedRoute><ServiceRequests /></ProtectedRoute>} />
        <Route path="/biomed/maintenance" element={<ProtectedRoute allowedRoles={[ROLES.BIOMEDICAL_ENGINEER]}><Maintenance /></ProtectedRoute>} />
        <Route path="/biomed/calibration" element={<ProtectedRoute allowedRoles={[ROLES.BIOMEDICAL_ENGINEER]}><CalibrationSchedule /></ProtectedRoute>} />
        <Route path="/biomed/spare-parts" element={<ProtectedRoute allowedRoles={[ROLES.BIOMEDICAL_ENGINEER]}><SparePartsInventory /></ProtectedRoute>} />
        <Route path="/biomed/contracts" element={<ProtectedRoute allowedRoles={[ROLES.BIOMEDICAL_ENGINEER]}><ServiceContracts /></ProtectedRoute>} />
        <Route path="/biomed/downtime-report" element={<ProtectedRoute allowedRoles={[ROLES.BIOMEDICAL_ENGINEER]}><DowntimeReport /></ProtectedRoute>} />

        <Route path="/announcements/manage" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HR_OFFICER]}><Announcements /></ProtectedRoute>} />
        <Route path="/announcements" element={<ProtectedRoute><MyAnnouncements /></ProtectedRoute>} />

        <Route path="/tickets/raise" element={<ProtectedRoute><RaiseTicket /></ProtectedRoute>} />
        <Route path="/tickets/mine" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
        <Route path="/tickets/queue" element={<ProtectedRoute allowedRoles={[ROLES.IT_SUPPORT_OFFICER , ROLES.SUPER_ADMIN]}><ITSupportQueue /></ProtectedRoute>} />
        <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />

        <Route path="/settings/license" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><LicenseStatus /></ProtectedRoute>} />
        <Route path="/settings/icd10-codes" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.IT_SUPPORT_OFFICER]}><ICD10Management /></ProtectedRoute>} />

        <Route path="/moh/opd" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER, ROLES.ACCOUNTANT]}><OPDReport /></ProtectedRoute>} />
        <Route path="/moh/inpatient" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER, ROLES.ACCOUNTANT]}><InpatientCapacityReport /></ProtectedRoute>} />
        <Route path="/moh/mch" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER, ROLES.ACCOUNTANT]}><MCHReport /></ProtectedRoute>} />
        <Route path="/moh/mortality" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER, ROLES.ACCOUNTANT]}><MortalityReport /></ProtectedRoute>} />
        <Route path="/moh/disease-surveillance" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER, ROLES.ACCOUNTANT]}><DiseaseSurveillanceReport /></ProtectedRoute>} />
        <Route path="/moh/lab-radiology" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER, ROLES.ACCOUNTANT]}><LabRadiologyReport /></ProtectedRoute>} />
        <Route path="/moh/pharmacy" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER, ROLES.ACCOUNTANT]}><PharmacyCommoditiesReport /></ProtectedRoute>} />
        <Route path="/moh/theatre-emergency" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER, ROLES.ACCOUNTANT]}><TheatreEmergencyReport /></ProtectedRoute>} />


        {/* Visible to every authenticated user — no role restriction */}
        <Route path="/tutorials" element={<ProtectedRoute><VideoTutorials /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
        <Route path="/contact-us" element={<ProtectedRoute><ContactUs /></ProtectedRoute>} />
        <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />

        <Route path="/pacs" element={<ProtectedRoute allowedRoles={[ROLES.RADIOLOGIST, ROLES.DOCTOR]}><PACSWorklist /></ProtectedRoute>} />
        <Route path="/pacs/studies/:id" element={<ProtectedRoute allowedRoles={[ROLES.RADIOLOGIST, ROLES.DOCTOR]}><StudyDetail /></ProtectedRoute>} />
        <Route path="/billing/bulk-payments" element={<ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ACCOUNTANT]}><BulkPaymentList /></ProtectedRoute>} />
        <Route path="/visits" element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}><VisitList /></ProtectedRoute>} />
        <Route path="/visits/:id" element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}><VisitDetail /></ProtectedRoute>} />
        <Route path="/visits/:id/edit" element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}><VisitEdit /></ProtectedRoute>} />

        {/* Profile - any authenticated user */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
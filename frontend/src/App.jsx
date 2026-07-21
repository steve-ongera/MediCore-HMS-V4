// src/App.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { ROLES } from "./utils/roles.js";

import Login from "./pages/auth/Login.jsx";
import Unauthorized from "./pages/auth/Unauthorized.jsx";
import NotFound from "./pages/NotFound.jsx";

import Dashboard from "./pages/dashboard/Dashboard.jsx";

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

// Preserves query params (e.g. ?invoice=xxx) when redirecting old /payments
// links to the new /billing/payments path.
function LegacyPaymentsRedirect() {
  const location = useLocation();
  return <Navigate to={`/billing/payments${location.search}`} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Route>

      {/* Authenticated shell */}
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
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
            <ProtectedRoute allowedRoles={[ROLES.PHARMACIST, ROLES.ACCOUNTANT]}>
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
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Staff, Departments, Audit Log, Test Catalog (Super Admin) */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/departments"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
              <Departments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
              <AuditLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/test-catalog"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
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
            <ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.SUPER_ADMIN]}>
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

        <Route path="/procurement/requisitions" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><Requisitions /></ProtectedRoute>} />
        <Route path="/procurement/orders" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/procurement/orders/:id" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><PurchaseOrderDetail /></ProtectedRoute>} />
        <Route path="/procurement/receipts" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><GoodsReceipts /></ProtectedRoute>} />
        <Route path="/procurement/invoices" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT, ROLES.SUPER_ADMIN]}><SupplierInvoices /></ProtectedRoute>} />

        <Route path="/hr/employees" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><Employees /></ProtectedRoute>} />
        <Route path="/hr/employees/register" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><EmployeeForm /></ProtectedRoute>} />
        <Route path="/hr/employees/:id" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><EmployeeDetail /></ProtectedRoute>} />
        <Route path="/hr/leave" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><LeaveRequests /></ProtectedRoute>} />
        <Route path="/hr/attendance" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><Attendance /></ProtectedRoute>} />
        <Route path="/hr/payroll" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><Payroll /></ProtectedRoute>} />
        <Route path="/hr/payroll/:id" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><PayrollRunDetail /></ProtectedRoute>} />

        <Route path="/ambulance" element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR]}><AmbulanceDispatchBoard /></ProtectedRoute>} />
        <Route path="/ambulance/request" element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR]}><RequestDispatch /></ProtectedRoute>} />
        <Route path="/ambulance/:id" element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR]}><DispatchDetail /></ProtectedRoute>} />
        <Route path="/ambulance/fleet" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><FleetManagement /></ProtectedRoute>} />

        <Route path="/mortuary" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR, ROLES.RECEPTIONIST]}><MortuaryRegister /></ProtectedRoute>} />
        <Route path="/mortuary/admit" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR, ROLES.RECEPTIONIST]}><AdmitDeceased /></ProtectedRoute>} />
        <Route path="/mortuary/:id" element={<ProtectedRoute allowedRoles={[ROLES.NURSE, ROLES.DOCTOR, ROLES.RECEPTIONIST]}><MortuaryCaseDetail /></ProtectedRoute>} />

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
from django.db import models
from api.models import BaseModel, User, Role


class NotificationCategory(models.TextChoices):
    ACCOUNT = "ACCOUNT", "Account"
    SECURITY = "SECURITY", "Security"
    SYSTEM = "SYSTEM", "System"
    PATIENT = "PATIENT", "Patient"
    BILLING = "BILLING", "Billing"
    CLINICAL = "CLINICAL", "Clinical"
    INVENTORY = "INVENTORY", "Inventory"
    HR = "HR", "Human Resources"
    PROCUREMENT = "PROCUREMENT", "Procurement"
    AMBULANCE = "AMBULANCE", "Ambulance"
    MORTUARY = "MORTUARY", "Mortuary"
    ANNOUNCEMENT = "ANNOUNCEMENT", "Announcement"


class NotificationPriority(models.TextChoices):
    LOW = "LOW", "Low"
    NORMAL = "NORMAL", "Normal"
    HIGH = "HIGH", "High"
    CRITICAL = "CRITICAL", "Critical"


class NotificationType(models.TextChoices):
    """
    Every event type from the requested per-role list, plus globals.
    Grouped by role/category for reference; the `code` is what
    services.notify() actually keys off — the choices below are the
    canonical vocabulary so producers across the codebase stay consistent.
    """
    # SUPER_ADMIN
    USER_CREATED = "USER_CREATED", "New user account created"
    USER_ROLE_CHANGED = "USER_ROLE_CHANGED", "User role changed"
    FAILED_LOGIN_DETECTED = "FAILED_LOGIN_DETECTED", "Failed login attempts detected"
    BACKUP_COMPLETED = "BACKUP_COMPLETED", "System backup completed"
    BACKUP_FAILED = "BACKUP_FAILED", "System backup failed"
    STORAGE_LOW = "STORAGE_LOW", "Server storage running low"
    UPDATE_AVAILABLE = "UPDATE_AVAILABLE", "New software update available"
    DATABASE_ERROR = "DATABASE_ERROR", "Database error detected"
    MODULE_DISABLED = "MODULE_DISABLED", "Module disabled or unavailable"
    LICENSE_EXPIRING = "LICENSE_EXPIRING", "License expiring soon"
    CONFIG_CHANGED = "CONFIG_CHANGED", "Hospital configuration changed"
    AUDIT_SECURITY_ALERT = "AUDIT_SECURITY_ALERT", "Audit log security alert"
    PASSWORD_STALE = "PASSWORD_STALE", "Password has not been changed in over a month"

    # RECEPTIONIST
    APPOINTMENT_BOOKED = "APPOINTMENT_BOOKED", "New appointment booked"
    PATIENT_CHECKED_IN = "PATIENT_CHECKED_IN", "Patient checked in"
    PATIENT_REGISTERED = "PATIENT_REGISTERED", "Patient registration completed"
    DUPLICATE_PATIENT = "DUPLICATE_PATIENT", "Duplicate patient detected"
    MISSING_PATIENT_INFO = "MISSING_PATIENT_INFO", "Missing patient information"
    PATIENT_REFERRED_IN = "PATIENT_REFERRED_IN", "Patient referred from another facility"
    APPOINTMENT_CANCELLED = "APPOINTMENT_CANCELLED", "Appointment cancelled"
    APPOINTMENT_RESCHEDULED = "APPOINTMENT_RESCHEDULED", "Appointment rescheduled"
    PATIENT_WAITING_LONG = "PATIENT_WAITING_LONG", "Patient waiting over 30 minutes"
    QUEUE_ASSIGNED = "QUEUE_ASSIGNED", "Queue assigned successfully"

    # CASHIER
    INVOICE_GENERATED = "INVOICE_GENERATED", "New invoice generated"
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED", "Payment received"
    PAYMENT_FAILED = "PAYMENT_FAILED", "Payment failed"
    OUTSTANDING_BALANCE = "OUTSTANDING_BALANCE", "Outstanding patient balance"
    INSURANCE_PAYMENT_APPROVED = "INSURANCE_PAYMENT_APPROVED", "Insurance payment approved"
    INSURANCE_CLAIM_REJECTED = "INSURANCE_CLAIM_REJECTED", "Insurance claim rejected"
    REFUND_REQUESTED = "REFUND_REQUESTED", "Refund request submitted"
    CASH_RECONCILIATION_PENDING = "CASH_RECONCILIATION_PENDING", "Daily cash reconciliation pending"
    SHIFT_CLOSING_REMINDER = "SHIFT_CLOSING_REMINDER", "Shift closing reminder"
    RECEIPT_REPRINT_REQUESTED = "RECEIPT_REPRINT_REQUESTED", "Receipt reprint requested"

    # NURSE
    PATIENT_AWAITING_TRIAGE = "PATIENT_AWAITING_TRIAGE", "New patient awaiting triage"
    PATIENT_ADMITTED = "PATIENT_ADMITTED", "Patient admitted to ward"
    NURSING_REVIEW_REQUESTED = "NURSING_REVIEW_REQUESTED", "Doctor requested nursing review"
    MEDICATION_DUE = "MEDICATION_DUE", "Medication administration due"
    VITALS_OVERDUE = "VITALS_OVERDUE", "Vital signs overdue"
    PATIENT_TRANSFERRED = "PATIENT_TRANSFERRED", "Patient transferred"
    EMERGENCY_ARRIVING = "EMERGENCY_ARRIVING", "Emergency patient arriving"
    ALLERGY_ALERT = "ALLERGY_ALERT", "Allergy alert"
    ISOLATION_ALERT = "ISOLATION_ALERT", "Isolation patient alert"
    DISCHARGE_PREP_STARTED = "DISCHARGE_PREP_STARTED", "Discharge preparation started"

    # DOCTOR
    NEW_PATIENT_ASSIGNED = "NEW_PATIENT_ASSIGNED", "New patient assigned"
    EMERGENCY_CASE_ASSIGNED = "EMERGENCY_CASE_ASSIGNED", "Emergency case assigned"
    LAB_RESULTS_READY = "LAB_RESULTS_READY", "Laboratory results ready"
    RADIOLOGY_REPORT_READY = "RADIOLOGY_REPORT_READY", "Radiology report available"
    CRITICAL_LAB_RESULT = "CRITICAL_LAB_RESULT", "Critical laboratory result"
    PATIENT_REFERRED_CONSULT = "PATIENT_REFERRED_CONSULT", "Patient referred for consultation"
    FOLLOWUP_DUE = "FOLLOWUP_DUE", "Follow-up visit due"
    PRESCRIPTION_REVIEW_NEEDED = "PRESCRIPTION_REVIEW_NEEDED", "Prescription requires review"
    CONSULTATION_PENDING_LONG = "CONSULTATION_PENDING_LONG", "Consultation pending over 20 minutes"

    # LAB_TECHNOLOGIST
    LAB_TEST_ORDERED = "LAB_TEST_ORDERED", "New laboratory test ordered"
    SAMPLE_COLLECTED = "SAMPLE_COLLECTED", "Sample collected"
    SAMPLE_REJECTED = "SAMPLE_REJECTED", "Sample rejected"
    SAMPLE_OVERDUE = "SAMPLE_OVERDUE", "Sample overdue"
    CRITICAL_TEST_RESULT = "CRITICAL_TEST_RESULT", "Critical test result"
    LAB_EQUIPMENT_MAINTENANCE = "LAB_EQUIPMENT_MAINTENANCE", "Equipment maintenance due"
    REAGENT_LOW = "REAGENT_LOW", "Reagent stock running low"
    TEST_CANCELLED = "TEST_CANCELLED", "Test cancelled"
    RESULTS_VIEWED_BY_DOCTOR = "RESULTS_VIEWED_BY_DOCTOR", "Doctor viewed results"

    # RADIOLOGIST
    IMAGING_REQUESTED = "IMAGING_REQUESTED", "New imaging request"
    PATIENT_READY_IMAGING = "PATIENT_READY_IMAGING", "Patient ready for imaging"
    REPORT_PENDING = "REPORT_PENDING", "Report pending"
    CRITICAL_IMAGING_FINDING = "CRITICAL_IMAGING_FINDING", "Critical imaging finding"
    IMAGING_EQUIPMENT_MAINTENANCE = "IMAGING_EQUIPMENT_MAINTENANCE", "Imaging equipment maintenance due"
    IMAGING_REQUEST_CANCELLED = "IMAGING_REQUEST_CANCELLED", "Imaging request cancelled"
    REPORT_REVIEWED = "REPORT_REVIEWED", "Report reviewed by doctor"
    EMERGENCY_IMAGING = "EMERGENCY_IMAGING", "Emergency imaging request"
    UPLOAD_FAILED = "UPLOAD_FAILED", "Upload failed"

    # PHARMACIST
    PRESCRIPTION_RECEIVED = "PRESCRIPTION_RECEIVED", "New prescription received"
    PRESCRIPTION_UPDATED = "PRESCRIPTION_UPDATED", "Prescription updated"
    DRUG_INTERACTION_WARNING = "DRUG_INTERACTION_WARNING", "Drug interaction warning"
    ALLERGY_WARNING = "ALLERGY_WARNING", "Allergy warning"
    MEDICINE_OUT_OF_STOCK = "MEDICINE_OUT_OF_STOCK", "Medicine out of stock"
    MEDICINE_BELOW_REORDER = "MEDICINE_BELOW_REORDER", "Medicine below reorder level"
    MEDICINE_NEARING_EXPIRY = "MEDICINE_NEARING_EXPIRY", "Medicine nearing expiry"
    MEDICINE_EXPIRED = "MEDICINE_EXPIRED", "Medicine expired"
    PRESCRIPTION_DISPENSED = "PRESCRIPTION_DISPENSED", "Prescription dispensed"
    CONTROLLED_MED_APPROVAL = "CONTROLLED_MED_APPROVAL", "Controlled medicine approval required"

    # ACCOUNTANT
    DAILY_REVENUE_READY = "DAILY_REVENUE_READY", "Daily revenue report ready"
    MONTHLY_REPORT_READY = "MONTHLY_REPORT_READY", "Monthly financial report generated"
    OUTSTANDING_CLAIMS = "OUTSTANDING_CLAIMS", "Outstanding insurance claims"
    INSURANCE_PAYMENT_RECEIVED = "INSURANCE_PAYMENT_RECEIVED", "Insurance payment received"
    BUDGET_EXCEEDED = "BUDGET_EXCEEDED", "Budget limit exceeded"
    CASH_RECONCILIATION_DONE = "CASH_RECONCILIATION_DONE", "Cash reconciliation completed"
    PROCUREMENT_PAYMENT_PENDING = "PROCUREMENT_PAYMENT_PENDING", "Procurement payment pending"
    PAYROLL_READY = "PAYROLL_READY", "Payroll ready for processing"
    AUDIT_REMINDER = "AUDIT_REMINDER", "Financial audit reminder"
    UNPAID_SUPPLIER_INVOICE = "UNPAID_SUPPLIER_INVOICE", "Unpaid supplier invoice"

    # MORTUARY_ATTENDANT
    BODY_RECEIVED = "BODY_RECEIVED", "New body received"
    BODY_RELEASED = "BODY_RELEASED", "Body released"
    POSTMORTEM_SCHEDULED = "POSTMORTEM_SCHEDULED", "Postmortem scheduled"
    POSTMORTEM_COMPLETED = "POSTMORTEM_COMPLETED", "Postmortem completed"
    IDENTIFICATION_PENDING = "IDENTIFICATION_PENDING", "Identification pending"
    MORTUARY_DOCS_INCOMPLETE = "MORTUARY_DOCS_INCOMPLETE", "Documentation incomplete"
    MORTUARY_CAPACITY_FULL = "MORTUARY_CAPACITY_FULL", "Storage capacity nearly full"
    BODY_UNCLAIMED_REMINDER = "BODY_UNCLAIMED_REMINDER", "Body unclaimed reminder"
    MORTUARY_TRANSFER_REQUEST = "MORTUARY_TRANSFER_REQUEST", "Transfer request received"
    RELEASE_APPROVAL_DONE = "RELEASE_APPROVAL_DONE", "Release approval completed"

    # HR_OFFICER
    LEAVE_SUBMITTED = "LEAVE_SUBMITTED", "Leave request submitted"
    LEAVE_APPROVED = "LEAVE_APPROVED", "Leave approved"
    LEAVE_REJECTED = "LEAVE_REJECTED", "Leave rejected"
    CONTRACT_EXPIRING = "CONTRACT_EXPIRING", "Staff contract expiring"
    EMPLOYEE_ADDED = "EMPLOYEE_ADDED", "New employee added"
    STAFF_DOC_MISSING = "STAFF_DOC_MISSING", "Staff document missing"
    ATTENDANCE_ANOMALY = "ATTENDANCE_ANOMALY", "Attendance anomaly detected"
    PAYROLL_PROCESSING_REMINDER = "PAYROLL_PROCESSING_REMINDER", "Payroll processing reminder"
    HR_LICENSE_RENEWAL_DUE = "HR_LICENSE_RENEWAL_DUE", "License renewal due"
    PERFORMANCE_REVIEW_DUE = "PERFORMANCE_REVIEW_DUE", "Performance review due"

    # PROCUREMENT_OFFICER
    PURCHASE_REQUEST_SUBMITTED = "PURCHASE_REQUEST_SUBMITTED", "Purchase request submitted"
    PURCHASE_REQUEST_APPROVED = "PURCHASE_REQUEST_APPROVED", "Purchase request approved"
    PURCHASE_ORDER_CREATED = "PURCHASE_ORDER_CREATED", "Purchase order created"
    SUPPLIER_QUOTE_RECEIVED = "SUPPLIER_QUOTE_RECEIVED", "Supplier quotation received"
    GOODS_RECEIVED = "GOODS_RECEIVED", "Goods received"
    STOCK_BELOW_REORDER = "STOCK_BELOW_REORDER", "Stock below reorder level"
    STOCK_OUT_DETECTED = "STOCK_OUT_DETECTED", "Stock out detected"
    SUPPLIER_PAYMENT_PENDING = "SUPPLIER_PAYMENT_PENDING", "Supplier payment pending"
    DELIVERY_DELAYED = "DELIVERY_DELAYED", "Delivery delayed"
    PROCUREMENT_APPROVAL_REQUIRED = "PROCUREMENT_APPROVAL_REQUIRED", "Procurement approval required"

    # AMBULANCE_DISPATCHER
    DISPATCH_REQUESTED = "DISPATCH_REQUESTED", "Emergency dispatch request"
    AMBULANCE_ASSIGNED = "AMBULANCE_ASSIGNED", "Ambulance assigned"
    AMBULANCE_DEPARTED = "AMBULANCE_DEPARTED", "Ambulance departed"
    AMBULANCE_ARRIVED_SCENE = "AMBULANCE_ARRIVED_SCENE", "Ambulance arrived at scene"
    PATIENT_PICKED_UP = "PATIENT_PICKED_UP", "Patient picked up"
    PATIENT_DELIVERED = "PATIENT_DELIVERED", "Patient delivered to hospital"
    AMBULANCE_RETURNED = "AMBULANCE_RETURNED", "Ambulance returned to base"
    AMBULANCE_UNAVAILABLE = "AMBULANCE_UNAVAILABLE", "Ambulance unavailable"
    VEHICLE_MAINTENANCE_DUE = "VEHICLE_MAINTENANCE_DUE", "Vehicle maintenance due"
    FUEL_LOW = "FUEL_LOW", "Fuel level low"

    # GLOBAL
    HOSPITAL_ANNOUNCEMENT = "HOSPITAL_ANNOUNCEMENT", "Hospital announcement"
    SYSTEM_MAINTENANCE_SCHEDULED = "SYSTEM_MAINTENANCE_SCHEDULED", "System maintenance scheduled"
    SYSTEM_OUTAGE = "SYSTEM_OUTAGE", "System outage detected"
    POLICY_UPDATE = "POLICY_UPDATE", "New policy update"
    DEPARTMENT_MESSAGE = "DEPARTMENT_MESSAGE", "Department message"
    CRITICAL_INCIDENT = "CRITICAL_INCIDENT", "Critical incident reported"
    DISASTER_EMERGENCY = "DISASTER_EMERGENCY", "Fire or disaster emergency"
    NETWORK_RESTORED = "NETWORK_RESTORED", "Network connectivity restored"
    DELIVERY_FAILED = "DELIVERY_FAILED", "SMS/Email delivery failed"
   


class Notification(BaseModel):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(max_length=40, choices=NotificationType.choices)
    category = models.CharField(max_length=20, choices=NotificationCategory.choices)
    priority = models.CharField(max_length=10, choices=NotificationPriority.choices, default=NotificationPriority.NORMAL)
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    link = models.CharField(max_length=255, blank=True, help_text="Frontend route to navigate to when clicked, e.g. /billing/payments")
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "created_at"]),
        ]

    def __str__(self):
        return f"{self.recipient.username}: {self.title}"
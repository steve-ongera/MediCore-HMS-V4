"""
Seed command for the etims app.

etims has no data of its own yet, so this command:
  1. Ensures a single active FiscalizationConfig row exists.
  2. Creates a handful of *new* Payment and OTCSale records in the api app
     (reusing existing Patients/Departments/Medicines if you already have
     some, and creating minimal fallbacks if you don't).
  3. Fiscalizes those new Payments/OTCSales into FiscalizedReceipt /
     FiscalizedReceiptItem rows, spread across PENDING / FISCALIZED /
     FAILED / VOIDED so the eTIMS screens have something realistic to show.

Usage:
    python manage.py seed_fiscalization
    python manage.py seed_fiscalization --count 10
    python manage.py seed_fiscalization --count 10 --flush
"""
import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import (
    Department,
    Gender,
    Invoice,
    InvoiceSourceType,
    Medicine,
    MedicineBatch,
    OTCSale,
    OTCSaleItem,
    Patient,
    Payment,
    PaymentMethod,
    Role,
    User,
)
from etims.models import (
    FiscalizationConfig,
    FiscalizationStatus,
    FiscalizedReceipt,
    FiscalizedReceiptItem,
    VATCategory,
)

FIRST_NAMES = ["Amina", "Brian", "Cynthia", "Dennis", "Esther", "Felix", "Grace", "Hassan"]
LAST_NAMES = ["Otieno", "Wanjiru", "Mutua", "Njoroge", "Achieng", "Kiptoo", "Wambui", "Odhiambo"]

OTC_MEDICINES = [
    ("Paracetamol 500mg", "tablet", Decimal("10.00")),
    ("Amoxicillin 250mg", "capsule", Decimal("15.00")),
    ("ORS Sachet", "sachet", Decimal("50.00")),
    ("Cough Syrup 100ml", "bottle", Decimal("180.00")),
    ("Vitamin C 1000mg", "tablet", Decimal("20.00")),
]


class Command(BaseCommand):
    help = "Seed etims fiscalization data: config + fresh Payments/OTCSales + fiscalized receipts."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=5, help="How many payments AND otc sales to create (default 5).")
        parser.add_argument("--flush", action="store_true", help="Delete previously seeded fiscalization rows first.")

    @transaction.atomic
    def handle(self, *args, **options):
        count = options["count"]

        if options["flush"]:
            self._flush()

        config = self._get_or_create_config()
        self.stdout.write(self.style.SUCCESS(f"Using FiscalizationConfig: {config}"))

        department = self._get_or_create_department()
        cashier = self._get_or_create_user(Role.CASHIER, "cashier.seed")

        payments = [self._create_payment(i, department, cashier) for i in range(count)]
        otc_sales = [self._create_otc_sale(i, cashier) for i in range(count)]

        receipts_created = 0
        for payment in payments:
            self._fiscalize(payment=payment, otc_sale=None, triggered_by=cashier)
            receipts_created += 1
        for sale in otc_sales:
            self._fiscalize(payment=None, otc_sale=sale, triggered_by=cashier)
            receipts_created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Created {len(payments)} payments, {len(otc_sales)} OTC sales, "
            f"and {receipts_created} fiscalized receipts."
        ))

    # ------------------------------------------------------------------
    # Setup helpers
    # ------------------------------------------------------------------
    def _flush(self):
        deleted_items, _ = FiscalizedReceiptItem.objects.all().delete()
        deleted_receipts, _ = FiscalizedReceipt.objects.all().delete()
        self.stdout.write(self.style.WARNING(
            f"Flushed {deleted_receipts} receipts / {deleted_items} items."
        ))

    def _get_or_create_config(self):
        config = FiscalizationConfig.objects.filter(is_active=True).first()
        if config:
            return config
        return FiscalizationConfig.objects.create(
            kra_pin="P000000000X",
            branch_id="00",
            cu_serial="KRACU0000000000",
            default_vat_category=VATCategory.A_EXEMPT,
            is_active=True,
        )

    def _get_or_create_department(self):
        department = Department.objects.filter(is_active=True).first()
        if department:
            return department
        return Department.objects.create(
            name="General Outpatient (seed)",
            consultation_fee=Decimal("500.00"),
            description="Auto-created by seed_fiscalization for testing.",
            is_active=True,
        )

    def _get_or_create_user(self, role, username):
        user = User.objects.filter(role=role).first()
        if user:
            return user
        return User.objects.create_user(
            username=username,
            password="ChangeMe123!",
            role=role,
            first_name="Seed",
            last_name=role.title(),
        )

    def _get_or_create_patient(self, index):
        patient = Patient.objects.order_by("?").first()
        if patient and index % 2 == 0:
            # Reuse an existing patient roughly half the time so receipts
            # look connected to real records, not just seed noise.
            return patient
        return Patient.objects.create(
            full_name=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
            gender=random.choice([Gender.MALE, Gender.FEMALE]),
            phone=f"07{random.randint(10000000, 99999999)}",
        )

    def _get_or_create_medicine(self):
        medicine = Medicine.objects.order_by("?").first()
        if medicine:
            return medicine
        name, unit, price = random.choice(OTC_MEDICINES)
        return Medicine.objects.create(
            name=name,
            unit=unit,
            unit_price=price,
            category="General",
        )

    def _get_or_create_batch(self, medicine):
        batch = medicine.batches.filter(is_deleted=False, quantity_remaining__gt=0).first()
        if batch:
            return batch
        return MedicineBatch.objects.create(
            medicine=medicine,
            batch_number=f"SEED-{medicine.id.hex[:8]}",
            quantity_received=500,
            quantity_remaining=500,
            expiry_date=timezone.now().date().replace(year=timezone.now().year + 2),
        )

    # ------------------------------------------------------------------
    # Record creation
    # ------------------------------------------------------------------
    def _create_payment(self, index, department, cashier):
        patient = self._get_or_create_patient(index)
        amount = Decimal(random.choice([500, 800, 1200, 1500, 2500]))
        invoice = Invoice.objects.create(
            patient=patient,
            source_type=InvoiceSourceType.CONSULTATION,
            description=f"Consultation - {department.name}",
            amount=amount,
            amount_paid=amount,
        )
        invoice.recalculate_status()
        payment = Payment.objects.create(
            invoice=invoice,
            amount=amount,
            method=random.choice([PaymentMethod.CASH, PaymentMethod.MPESA, PaymentMethod.CARD]),
            reference_number=f"REF{random.randint(100000, 999999)}",
            cashier=cashier,
        )
        return payment

    def _create_otc_sale(self, index, cashier):
        sale = OTCSale.objects.create(
            customer_name=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
            customer_phone=f"07{random.randint(10000000, 99999999)}",
            payment_method=random.choice([PaymentMethod.CASH, PaymentMethod.MPESA]),
            reference_number=f"OTC{random.randint(100000, 999999)}",
            served_by=cashier,
        )
        for _ in range(random.randint(1, 3)):
            medicine = self._get_or_create_medicine()
            batch = self._get_or_create_batch(medicine)
            quantity = random.randint(1, 5)
            OTCSaleItem.objects.create(
                sale=sale,
                medicine=medicine,
                batch=batch,
                quantity=quantity,
                unit_price=medicine.unit_price,
            )
        sale.recalculate_totals()
        sale.amount_paid = sale.total_amount
        sale.save(update_fields=["amount_paid"])
        return sale

    # ------------------------------------------------------------------
    # Fiscalization
    # ------------------------------------------------------------------
    def _fiscalize(self, payment, otc_sale, triggered_by):
        status = random.choices(
            [
                FiscalizationStatus.FISCALIZED,
                FiscalizationStatus.PENDING,
                FiscalizationStatus.FAILED,
                FiscalizationStatus.VOIDED,
            ],
            weights=[60, 20, 15, 5],
        )[0]

        # Some projects auto-create a FiscalizedReceipt via a signal the
        # moment a Payment/OTCSale is saved. Use get_or_create rather than
        # create() so we don't collide with a receipt that already exists
        # for this payment/otc_sale, and just overwrite it with our seed
        # values instead.
        receipt, _created = FiscalizedReceipt.objects.get_or_create(
            payment=payment,
            otc_sale=otc_sale,
            defaults={"triggered_by": triggered_by},
        )
        # Reset to a clean slate in case a signal (or a previous run)
        # already populated this receipt with different values.
        receipt.status = status
        receipt.triggered_by = triggered_by
        receipt.kra_invoice_number = ""
        receipt.cu_invoice_number = ""
        receipt.qr_code_url = ""
        receipt.cu_signature = ""
        receipt.fiscalized_at = None
        receipt.failure_reason = ""
        receipt.raw_response = {}
        receipt.retry_count = 0

        if status == FiscalizationStatus.FISCALIZED:
            kra_invoice_number = f"KRA{random.randint(100000, 999999)}"
            receipt.kra_invoice_number = kra_invoice_number
            receipt.cu_invoice_number = kra_invoice_number
            receipt.qr_code_url = f"https://etims.kra.go.ke/common/link/etims/receipt/indexEtimsReceiptData?Data={kra_invoice_number}"
            receipt.cu_signature = f"SIG-{random.randint(10**8, 10**9 - 1)}"
            receipt.fiscalized_at = timezone.now()
            receipt.raw_response = {"resultCd": "000", "resultMsg": "Success", "invoiceNo": kra_invoice_number}
        elif status == FiscalizationStatus.FAILED:
            receipt.failure_reason = random.choice([
                "Connection timeout to KRA OSCU.",
                "Invalid VAT category on line item.",
                "Duplicate invoice number.",
            ])
            receipt.retry_count = random.randint(1, 3)
            receipt.raw_response = {"resultCd": "999", "resultMsg": receipt.failure_reason}
        receipt.save()
        receipt.items.all().delete()

        if payment:
            FiscalizedReceiptItem.objects.create(
                receipt=receipt,
                description=payment.invoice.description or "Consultation fee",
                quantity=1,
                unit_price=payment.amount,
                vat_category=VATCategory.A_EXEMPT,
                line_total=payment.amount,
            )
        else:
            for item in otc_sale.items.all():
                FiscalizedReceiptItem.objects.create(
                    receipt=receipt,
                    description=item.medicine.name,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    vat_category=VATCategory.B_STANDARD,
                    line_total=item.subtotal,
                )

        return receipt
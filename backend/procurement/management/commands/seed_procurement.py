"""
Seed realistic data for the procurement app.

Reuses whatever already exists in the api app — Department, Supplier,
Medicine, User — and does NOT create any of those. It only creates rows for
procurement's own models (requisitions, purchase orders, goods receipts,
supplier invoices/payments), plus the MedicineBatch rows that naturally get
created as a side-effect of receiving stock (that's transactional inventory
data, not master data, so it's created here the same way a real goods
receipt would create it).

If Department, Supplier, Medicine, or User have no rows, the command aborts
and tells you what to seed first.

Usage:
    python manage.py seed_procurement
    python manage.py seed_procurement --requisitions 30
    python manage.py seed_procurement --clear   # wipes procurement app data first

Place this file at: procurement/management/commands/seed_procurement.py
(create empty __init__.py files in procurement/management/ and
procurement/management/commands/ if they don't already exist)
"""

import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Department, Medicine, MedicineBatch, Supplier, User
from procurement.models import (
    GoodsReceipt,
    GoodsReceiptItem,
    ItemType,
    PaymentMethod,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    PurchaseRequisition,
    RequisitionItem,
    RequisitionStatus,
    SupplierInvoice,
    SupplierInvoiceStatus,
    SupplierPayment,
)

NON_MEDICINE_DESCRIPTIONS = [
    ("Examination gloves (box of 100)", ItemType.CONSUMABLE, Decimal("450")),
    ("Surgical face masks (box of 50)", ItemType.CONSUMABLE, Decimal("600")),
    ("Alcohol swabs (pack of 200)", ItemType.CONSUMABLE, Decimal("350")),
    ("A4 printing paper (ream)", ItemType.OTHER, Decimal("650")),
    ("Patient examination bed", ItemType.ASSET, Decimal("45000")),
    ("Digital thermometer", ItemType.ASSET, Decimal("1200")),
    ("Wheelchair", ItemType.ASSET, Decimal("18000")),
    ("Blood pressure monitor", ItemType.ASSET, Decimal("6500")),
    ("Syringes 5ml (box of 100)", ItemType.CONSUMABLE, Decimal("800")),
    ("Cotton wool (roll)", ItemType.CONSUMABLE, Decimal("300")),
]

REJECTION_REASONS = [
    "Budget not available this quarter.",
    "Quantity requested exceeds departmental allocation.",
    "Duplicate of an existing pending requisition.",
    "Requires further justification before approval.",
]

BATCH_PREFIX_LETTERS = "ABCDEFGH"


class Command(BaseCommand):
    help = (
        "Seed procurement app data (requisitions, POs, goods receipts, supplier "
        "invoices/payments) using existing Department, Supplier, Medicine, and User rows."
    )

    def add_arguments(self, parser):
        parser.add_argument("--requisitions", type=int, default=25, help="Number of purchase requisitions to create.")
        parser.add_argument("--clear", action="store_true", help="Delete existing procurement app rows before seeding.")

    def handle(self, *args, **options):
        num_requisitions = options["requisitions"]
        clear = options["clear"]

        departments = list(Department.objects.filter(is_active=True))
        suppliers = list(Supplier.objects.all())
        medicines = list(Medicine.objects.all())
        users = list(User.objects.all())

        missing = []
        if not departments:
            missing.append("Department")
        if not suppliers:
            missing.append("Supplier")
        if not medicines:
            missing.append("Medicine")
        if not users:
            missing.append("User")
        if missing:
            self.stderr.write(self.style.ERROR(
                f"No rows found for: {', '.join(missing)}. Seed those first — this command "
                "will not create Department, Supplier, Medicine, or User rows."
            ))
            return

        with transaction.atomic():
            if clear:
                self._clear()

            requisitions = self._seed_requisitions(num_requisitions, departments, users, medicines)
            purchase_orders = self._seed_purchase_orders(requisitions, suppliers, users)
            self._seed_goods_receipts_and_invoicing(purchase_orders, users)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(requisitions)} requisitions and {len(purchase_orders)} purchase orders."
        ))

    # ------------------------------------------------------------------
    def _clear(self):
        SupplierPayment.objects.all().delete()
        SupplierInvoice.objects.all().delete()
        GoodsReceiptItem.objects.all().delete()
        GoodsReceipt.objects.all().delete()
        PurchaseOrderItem.objects.all().delete()
        PurchaseOrder.objects.all().delete()
        RequisitionItem.objects.all().delete()
        PurchaseRequisition.objects.all().delete()
        self.stdout.write("Cleared existing procurement app data.")

    # ------------------------------------------------------------------
    def _seed_requisitions(self, num_requisitions, departments, users, medicines):
        requisitions = []
        status_pool = [
            RequisitionStatus.DRAFT, RequisitionStatus.PENDING_APPROVAL,
            RequisitionStatus.APPROVED, RequisitionStatus.REJECTED,
            RequisitionStatus.CONVERTED, RequisitionStatus.CANCELLED,
        ]
        status_weights = [10, 15, 20, 10, 35, 10]

        for _ in range(num_requisitions):
            department = random.choice(departments)
            requested_by = random.choice(users)
            status = random.choices(status_pool, weights=status_weights)[0]

            approved_by, approved_at, rejection_reason = None, None, ""
            if status in (RequisitionStatus.APPROVED, RequisitionStatus.CONVERTED):
                approved_by = random.choice(users)
                approved_at = self._random_datetime_past(60)
            elif status == RequisitionStatus.REJECTED:
                approved_by = random.choice(users)
                approved_at = self._random_datetime_past(60)
                rejection_reason = random.choice(REJECTION_REASONS)

            requisition = PurchaseRequisition.objects.create(
                department=department,
                requested_by=requested_by,
                status=status,
                justification=random.choice([
                    "Stock running low for routine dispensing.",
                    "Required for upcoming outreach clinic.",
                    "Replacement of faulty/expired equipment.",
                    "Restocking ahead of the busy season.",
                ]),
                approved_by=approved_by,
                approved_at=approved_at,
                rejection_reason=rejection_reason,
            )

            for _ in range(random.randint(1, 5)):
                self._add_requisition_item(requisition, medicines)

            requisitions.append(requisition)

        return requisitions

    def _add_requisition_item(self, requisition, medicines):
        if medicines and random.random() < 0.6:
            medicine = random.choice(medicines)
            RequisitionItem.objects.create(
                requisition=requisition,
                item_type=ItemType.MEDICINE,
                medicine=medicine,
                description=medicine.name,
                quantity_requested=random.randint(20, 500),
                estimated_unit_cost=medicine.unit_price,
            )
        else:
            description, item_type, est_cost = random.choice(NON_MEDICINE_DESCRIPTIONS)
            RequisitionItem.objects.create(
                requisition=requisition,
                item_type=item_type,
                medicine=None,
                description=description,
                quantity_requested=random.randint(1, 20),
                estimated_unit_cost=est_cost,
            )

    # ------------------------------------------------------------------
    def _seed_purchase_orders(self, requisitions, suppliers, users):
        purchase_orders = []
        for requisition in requisitions:
            if requisition.status != RequisitionStatus.CONVERTED:
                continue

            supplier = random.choice(suppliers)
            status = random.choices(
                [PurchaseOrderStatus.OPEN, PurchaseOrderStatus.PARTIALLY_RECEIVED,
                 PurchaseOrderStatus.FULLY_RECEIVED, PurchaseOrderStatus.CANCELLED],
                weights=[20, 25, 45, 10],
            )[0]

            po = PurchaseOrder.objects.create(
                requisition=requisition,
                supplier=supplier,
                status=status,
                expected_delivery_date=date.today() + timedelta(days=random.randint(-10, 30)),
                notes=random.choice(["", "Urgent — please expedite.", "Standard delivery terms apply."]),
                created_by=random.choice(users),
            )

            for req_item in requisition.items.all():
                markup = Decimal(str(random.uniform(0.95, 1.15))).quantize(Decimal("0.01"))
                unit_cost = (req_item.estimated_unit_cost or Decimal("100")) * markup
                quantity_ordered = req_item.quantity_requested

                if status == PurchaseOrderStatus.FULLY_RECEIVED:
                    quantity_received = quantity_ordered
                elif status == PurchaseOrderStatus.PARTIALLY_RECEIVED:
                    quantity_received = random.randint(1, max(quantity_ordered - 1, 1))
                else:
                    quantity_received = 0

                PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    item_type=req_item.item_type,
                    medicine=req_item.medicine,
                    description=req_item.description,
                    quantity_ordered=quantity_ordered,
                    quantity_received=quantity_received,
                    unit_cost=unit_cost.quantize(Decimal("0.01")),
                )

            purchase_orders.append(po)

        return purchase_orders

    # ------------------------------------------------------------------
    def _seed_goods_receipts_and_invoicing(self, purchase_orders, users):
        for po in purchase_orders:
            received_items = [item for item in po.items.all() if item.quantity_received > 0]
            if not received_items:
                continue

            # One or two receipts depending on whether it was partially received
            receipts_needed = 1 if po.status == PurchaseOrderStatus.FULLY_RECEIVED else random.choice([1, 1, 2])
            remaining = {item.id: item.quantity_received for item in received_items}

            for receipt_num in range(receipts_needed):
                receipt = GoodsReceipt.objects.create(
                    purchase_order=po,
                    received_by=random.choice(users),
                    delivery_note_ref=f"DN-{random.randint(10000, 99999)}",
                    notes="",
                )
                for item in received_items:
                    qty_left = remaining[item.id]
                    if qty_left <= 0:
                        continue
                    qty_this_receipt = qty_left if receipt_num == receipts_needed - 1 else max(1, qty_left // 2)
                    remaining[item.id] -= qty_this_receipt

                    medicine_batch = None
                    batch_number, expiry_date = "", None
                    if item.item_type == ItemType.MEDICINE and item.medicine:
                        batch_number = f"{random.choice(BATCH_PREFIX_LETTERS)}{random.randint(1000, 9999)}"
                        expiry_date = date.today() + timedelta(days=random.randint(180, 900))
                        medicine_batch = MedicineBatch.objects.create(
                            medicine=item.medicine,
                            supplier=po.supplier,
                            batch_number=batch_number,
                            quantity_received=qty_this_receipt,
                            quantity_remaining=qty_this_receipt,
                            expiry_date=expiry_date,
                        )

                    GoodsReceiptItem.objects.create(
                        goods_receipt=receipt,
                        po_item=item,
                        quantity_received=qty_this_receipt,
                        batch_number=batch_number,
                        expiry_date=expiry_date,
                        medicine_batch=medicine_batch,
                    )

            if random.random() < 0.8:
                self._seed_supplier_invoice(po, users)

    def _seed_supplier_invoice(self, po, users):
        amount = po.total_amount
        if not amount:
            return

        status = random.choices(
            [SupplierInvoiceStatus.UNPAID, SupplierInvoiceStatus.PARTIAL,
             SupplierInvoiceStatus.PAID, SupplierInvoiceStatus.DISPUTED],
            weights=[30, 20, 45, 5],
        )[0]

        invoice = SupplierInvoice.objects.create(
            supplier_invoice_ref=f"SUP-{random.randint(100000, 999999)}",
            purchase_order=po,
            supplier=po.supplier,
            amount=amount,
            due_date=date.today() + timedelta(days=random.randint(-10, 45)),
            recorded_by=random.choice(users),
        )

        amount_paid = Decimal("0")
        if status == SupplierInvoiceStatus.PAID:
            amount_paid = amount
        elif status == SupplierInvoiceStatus.PARTIAL:
            amount_paid = (amount * Decimal(str(random.uniform(0.2, 0.8)))).quantize(Decimal("0.01"))

        if amount_paid > 0:
            self._add_supplier_payments(invoice, amount_paid, users)

        invoice.amount_paid = amount_paid
        invoice.status = status
        invoice.save(update_fields=["amount_paid", "status"])

    def _add_supplier_payments(self, invoice, amount_paid, users):
        remaining = amount_paid
        num_installments = random.choice([1, 1, 1, 2])
        for i in range(num_installments):
            if remaining <= 0:
                break
            portion = remaining if i == num_installments - 1 else (remaining / 2).quantize(Decimal("0.01"))
            method = random.choice([
                PaymentMethod.BANK_TRANSFER, PaymentMethod.CHEQUE,
                PaymentMethod.MPESA, PaymentMethod.CASH,
            ])
            SupplierPayment.objects.create(
                supplier_invoice=invoice,
                amount=portion,
                method=method,
                reference_number=self._random_reference(method),
                paid_by=random.choice(users),
            )
            remaining -= portion

    @staticmethod
    def _random_reference(method):
        if method == PaymentMethod.MPESA:
            return "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", k=10))
        if method == PaymentMethod.CHEQUE:
            return f"CHQ{random.randint(100000, 999999)}"
        if method == PaymentMethod.BANK_TRANSFER:
            return f"TRF{random.randint(1000000, 9999999)}"
        return ""

    @staticmethod
    def _random_datetime_past(max_days_ago):
        from django.utils import timezone
        return timezone.now() - timedelta(days=random.randint(0, max_days_ago), hours=random.randint(0, 23))
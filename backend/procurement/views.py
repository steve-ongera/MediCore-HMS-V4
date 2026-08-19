from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.views import BaseModelViewSet
from api.models import Department, Medicine, MedicineBatch, StockTransaction, StockTransactionType

from .models import (
    PurchaseRequisition, RequisitionStatus, RequisitionItem, ItemType,
    PurchaseOrder, PurchaseOrderStatus, PurchaseOrderItem,
    GoodsReceipt, GoodsReceiptItem, SupplierInvoice, SupplierPayment,
)
from .serializers import (
    PurchaseRequisitionSerializer, CreateRequisitionSerializer, RejectRequisitionSerializer,
    PurchaseOrderSerializer, PurchaseOrderListSerializer, CreatePurchaseOrderSerializer,
    GoodsReceiptSerializer, CreateGoodsReceiptSerializer,
    SupplierInvoiceSerializer, SupplierPaymentSerializer,
)


from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied

from api.models import Role
from finance.models import Budget

from .models import PurchaseRequisition, RequisitionItem, RequisitionStatus
from .serializers import PurchaseRequisitionSerializer, CreateRequisitionSerializer, RejectRequisitionSerializer


def _accessible_branch_ids(user):
    from branches.permissions import get_accessible_branch_ids
    return get_accessible_branch_ids(user)


def _resolve_branch_id(request):
    """Standard branch-stamping: GROUP_ADMIN may pass an explicit `branch`, everyone else always gets their own branch."""
    accessible = _accessible_branch_ids(request.user)
    if accessible is None:
        return request.data.get("branch") or request.user.branch_id
    return request.user.branch_id


class PurchaseRequisitionViewSet(BaseModelViewSet):
    queryset = PurchaseRequisition.objects.select_related("department", "requested_by", "budget_line", "branch").prefetch_related("items").all()
    filterset_fields = ["status", "department", "category"]
    search_fields = ["requisition_number", "justification"]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        return PurchaseRequisitionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Procurement Officers, Accountants, and Super Admin see across
        # every department at their own branch (they need cross-department
        # visibility to process requisitions) — everyone else only sees
        # requisitions for their own department. Either way, branch scoping
        # is then applied on top, so a Procurement Officer at Branch A never
        # sees Branch B's requisitions even though they're cross-department.
        if user.role in (Role.PROCUREMENT_OFFICER, Role.ACCOUNTANT, Role.SUPER_ADMIN):
            base_qs = qs
        elif user.department_id:
            base_qs = qs.filter(department_id=user.department_id)
        else:
            return qs.none()

        accessible = _accessible_branch_ids(user)
        if accessible is not None:
            base_qs = base_qs.filter(branch_id__in=accessible)
        return base_qs

    def create(self, request, *args, **kwargs):
        """
        Open to any staff member with a department — not restricted to
        Procurement. Enforces three things server-side, not just in the UI:
        1. The chosen budget_line must belong to the requester's own
           department — a staff member cannot requisition against another
           department's budget, regardless of what the frontend sends.
        2. The chosen budget_line must belong to the requester's own
           branch — budgets are now branch-owned (see finance.Budget), so
           a requisition can never draw against another branch's money.
        3. The requested amount cannot exceed that budget line's currently
           available amount (allocated - spent - already committed).
        """
        if not request.user.department_id:
            raise ValidationError({"detail": "You are not assigned to a department, so you cannot raise a requisition. Contact HR/IT to update your profile."})

        serializer = CreateRequisitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        budget_line = Budget.objects.filter(pk=data["budget_line"]).first()
        if not budget_line:
            raise ValidationError({"budget_line": "Budget line not found."})

        if budget_line.department_id != request.user.department_id:
            raise ValidationError({
                "budget_line": "You can only requisition against your own department's budget line."
            })

        accessible = _accessible_branch_ids(request.user)
        if accessible is not None and budget_line.branch_id and budget_line.branch_id not in accessible:
            raise ValidationError({
                "budget_line": "This budget line belongs to a different branch."
            })

        estimated_total = sum(
            (item["quantity_requested"] * (item.get("estimated_unit_cost") or 0) for item in data["items"]),
            start=0,
        )
        if estimated_total > budget_line.available_amount:
            raise ValidationError({
                "detail": (
                    f"Estimated cost (KES {estimated_total}) exceeds the available amount on this "
                    f"budget line (KES {budget_line.available_amount}, after spent + already-committed requisitions)."
                )
            })

        with transaction.atomic():
            requisition = PurchaseRequisition.objects.create(
                department_id=request.user.department_id, budget_line=budget_line,
                branch_id=request.user.branch_id or budget_line.branch_id,
                category=data["category"], justification=data.get("justification", ""),
                requested_by=request.user,
            )
            for item in data["items"]:
                RequisitionItem.objects.create(
                    requisition=requisition, medicine_id=item.get("medicine"),
                    description=item["description"], quantity_requested=item["quantity_requested"],
                    estimated_unit_cost=item.get("estimated_unit_cost"),
                )

        return Response(PurchaseRequisitionSerializer(requisition).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="hod-approve")
    def hod_approve(self, request, pk=None):
        """Only the department's designated Head of Department (or Super Admin) can approve — checked against Department.head_of_department, not just role."""
        req = self.get_object()
        if req.status != RequisitionStatus.PENDING_HOD_APPROVAL:
            raise ValidationError({"detail": "Only pending requisitions can be approved."})

        is_hod = req.department.head_of_department_id == request.user.id
        if not is_hod and request.user.role != Role.SUPER_ADMIN:
            raise PermissionDenied("Only this department's Head of Department can approve this requisition.")

        from django.utils import timezone
        req.status = RequisitionStatus.HOD_APPROVED
        req.hod_approved_by = request.user
        req.hod_approved_at = timezone.now()
        req.save(update_fields=["status", "hod_approved_by", "hod_approved_at"])
        return Response(PurchaseRequisitionSerializer(req).data)

    @action(detail=True, methods=["post"], url_path="hod-reject")
    def hod_reject(self, request, pk=None):
        req = self.get_object()
        if req.status != RequisitionStatus.PENDING_HOD_APPROVAL:
            raise ValidationError({"detail": "Only pending requisitions can be rejected."})

        is_hod = req.department.head_of_department_id == request.user.id
        if not is_hod and request.user.role != Role.SUPER_ADMIN:
            raise PermissionDenied("Only this department's Head of Department can reject this requisition.")

        serializer = RejectRequisitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        req.status = RequisitionStatus.REJECTED
        req.rejection_reason = serializer.validated_data["rejection_reason"]
        req.save(update_fields=["status", "rejection_reason"])
        return Response(PurchaseRequisitionSerializer(req).data)

    @action(detail=False, methods=["get"], url_path="pending-my-approval")
    def pending_my_approval(self, request):
        """What THIS HOD needs to act on — cross-department, based on head_of_department, not just their own department filter. Still branch-scoped: an HOD only sees requisitions raised at their own accessible branch(es)."""
        qs = PurchaseRequisition.objects.filter(
            department__head_of_department=request.user, status=RequisitionStatus.PENDING_HOD_APPROVAL
        )
        accessible = _accessible_branch_ids(request.user)
        if accessible is not None:
            qs = qs.filter(branch_id__in=accessible)
        return Response(PurchaseRequisitionSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="approved-for-procurement")
    def approved_for_procurement(self, request):
        """Procurement's worklist — every HOD-approved requisition, across all departments, ready to become a PO. Branch-scoped via self.get_queryset()."""
        qs = self.get_queryset().filter(status=RequisitionStatus.HOD_APPROVED)
        return Response(PurchaseRequisitionSerializer(qs, many=True).data)
    
    @action(detail=False, methods=["get"], url_path="am-i-hod")
    def am_i_hod(self, request):
        from api.models import Department
        headed_departments = Department.objects.filter(head_of_department=request.user)
        return Response({
            "is_hod": headed_departments.exists() or request.user.role == "SUPER_ADMIN",
            "departments": [{"id": str(d.id), "name": d.name} for d in headed_departments],
        })


class PurchaseOrderViewSet(BaseModelViewSet):
    queryset = PurchaseOrder.objects.select_related("supplier", "requisition", "branch").prefetch_related("items").all()
    filterset_fields = ["status", "supplier"]
    search_fields = ["po_number", "supplier__name"]

    def get_queryset(self):
        qs = super().get_queryset()
        accessible = _accessible_branch_ids(self.request.user)
        if accessible is not None:
            qs = qs.filter(branch_id__in=accessible)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return PurchaseOrderListSerializer
        return PurchaseOrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreatePurchaseOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        requisition = None
        if data.get("requisition"):
            requisition = PurchaseRequisition.objects.filter(pk=data["requisition"]).first()
            if not requisition:
                raise ValidationError({"requisition": "Requisition not found."})
            accessible = _accessible_branch_ids(request.user)
            if accessible is not None and requisition.branch_id and requisition.branch_id not in accessible:
                raise ValidationError({"requisition": "This requisition belongs to a different branch."})

        # A PO raised directly against a supplier (no requisition attached)
        # gets its branch from the creating user instead — see the model
        # docstring for why PurchaseOrder needs its own branch field.
        po_branch_id = requisition.branch_id if requisition else _resolve_branch_id(request)

        with transaction.atomic():
            po = PurchaseOrder.objects.create(
                requisition=requisition,
                supplier_id=data["supplier"],
                branch_id=po_branch_id,
                expected_delivery_date=data.get("expected_delivery_date"),
                notes=data.get("notes", ""),
                created_by=request.user,
            )
            for item in data["items"]:
                PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    item_type=item.get("item_type", ItemType.MEDICINE),
                    medicine_id=item.get("medicine"),
                    description=item["description"],
                    quantity_ordered=item["quantity_ordered"],
                    unit_cost=item["unit_cost"],
                )
            if requisition:
                requisition.status = RequisitionStatus.CONVERTED
                requisition.save(update_fields=["status"])

        return Response(PurchaseOrderSerializer(po).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        po = self.get_object()
        if po.status == PurchaseOrderStatus.FULLY_RECEIVED:
            raise ValidationError({"detail": "Cannot cancel a fully received purchase order."})
        po.status = PurchaseOrderStatus.CANCELLED
        po.save(update_fields=["status"])
        return Response(PurchaseOrderSerializer(po).data)

    @action(detail=False, methods=["get"], url_path="open")
    def open(self, request):
        qs = self.get_queryset().exclude(status__in=[PurchaseOrderStatus.FULLY_RECEIVED, PurchaseOrderStatus.CANCELLED])
        return Response(PurchaseOrderListSerializer(qs, many=True).data)


class GoodsReceiptViewSet(BaseModelViewSet):
    queryset = GoodsReceipt.objects.select_related("purchase_order__supplier", "purchase_order__branch").prefetch_related("items").all()
    filterset_fields = ["purchase_order"]
    search_fields = ["grn_number"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        # GoodsReceipt has no branch field of its own — derived through
        # purchase_order.branch, same pattern as QueueEntry/EmergencyVisit.
        accessible = _accessible_branch_ids(self.request.user)
        if accessible is not None:
            qs = qs.filter(purchase_order__branch_id__in=accessible)
        return qs

    def get_serializer_class(self):
        return GoodsReceiptSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateGoodsReceiptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        po = PurchaseOrder.objects.filter(pk=data["purchase_order"]).first()
        if not po:
            raise ValidationError({"purchase_order": "Purchase order not found."})
        if po.status == PurchaseOrderStatus.CANCELLED:
            raise ValidationError({"purchase_order": "Cannot receive against a cancelled purchase order."})

        accessible = _accessible_branch_ids(request.user)
        if accessible is not None and po.branch_id and po.branch_id not in accessible:
            raise ValidationError({"purchase_order": "This purchase order belongs to a different branch."})

        with transaction.atomic():
            receipt = GoodsReceipt.objects.create(
                purchase_order=po, received_by=request.user,
                receiver_contact_phone=data.get("receiver_contact_phone", ""),
                delivered_by_name=data.get("delivered_by_name", ""),
                delivered_by_phone=data.get("delivered_by_phone", ""),
                delivered_by_company=data.get("delivered_by_company", ""),
                delivery_note_ref=data.get("delivery_note_ref", ""),
                inspected_by_id=data.get("inspected_by"),
                inspection_passed=data.get("inspection_passed"),
                inspection_notes=data.get("inspection_notes", ""),
                destination_location_id=data.get("destination_location"),
                notes=data.get("notes", ""),
            )

            for item_data in data["items"]:
                po_item = PurchaseOrderItem.objects.filter(pk=item_data["po_item"], purchase_order=po).first()
                if not po_item:
                    raise ValidationError({"po_item": f"PO item {item_data['po_item']} not found on this order."})

                qty = item_data["quantity_received"]
                if qty > po_item.quantity_outstanding:
                    raise ValidationError({
                        "quantity_received": f"Cannot receive {qty} — only {po_item.quantity_outstanding} outstanding for '{po_item.description}'."
                    })

                receipt_item = GoodsReceiptItem.objects.create(
                    goods_receipt=receipt, po_item=po_item, quantity_received=qty,
                    batch_number=item_data.get("batch_number", ""),
                    expiry_date=item_data.get("expiry_date"),
                )

                po_item.quantity_received += qty
                po_item.save(update_fields=["quantity_received"])

                if po_item.item_type == ItemType.MEDICINE and po_item.medicine:
                    if not item_data.get("expiry_date"):
                        raise ValidationError({"expiry_date": f"Expiry date is required for medicine '{po_item.description}'."})
                    batch = MedicineBatch.objects.create(
                        medicine=po_item.medicine,
                        batch_number=item_data.get("batch_number") or f"AUTO-{receipt.grn_number}",
                        quantity_received=qty, quantity_remaining=qty,
                        expiry_date=item_data["expiry_date"],
                        # Without this, every goods-received batch silently
                        # ended up branchless regardless of which branch
                        # requisitioned it — the same class of bug fixed
                        # earlier for OTCSale/PharmacyDispense stock.
                        branch_id=po.branch_id,
                    )
                    StockTransaction.objects.create(
                        medicine=po_item.medicine, batch=batch, transaction_type=StockTransactionType.STOCK_IN,
                        quantity=qty, reason=f"Goods receipt {receipt.grn_number} ({po.po_number})",
                        performed_by=request.user,
                    )
                    receipt_item.medicine_batch = batch
                    receipt_item.save(update_fields=["medicine_batch"])

                    # Feed straight into the chain-of-custody ledger — the goods
                    # receipt IS the first tracked movement, so the destination
                    # location's StoreStock starts accurate from day one instead
                    # of only becoming trackable once an internal transfer happens.
                    if receipt.destination_location:
                        from stockcontrol.services import adjust_stock
                        adjust_stock(receipt.destination_location, po_item.medicine, qty)

                # In GoodsReceiptViewSet.create, inside the ASSET branch:
                elif po_item.item_type == ItemType.ASSET:
                    from assets.models import Asset, AssetCategory
                    default_category, _ = AssetCategory.objects.get_or_create(
                        name="Uncategorized (from Procurement)",
                        defaults={"default_useful_life_years": 5},
                    )
                    asset = Asset.objects.create(
                        name=po_item.description,
                        category=default_category,
                        supplier=po.supplier,
                        purchase_date=timezone.now().date(),
                        purchase_cost=po_item.unit_cost,
                        registered_by=request.user,
                        department=po.requisition.department if po.requisition else None,  # ties the new asset to the requesting department automatically
                    )

            all_items = po.items.all()
            if all(i.quantity_received >= i.quantity_ordered for i in all_items):
                po.status = PurchaseOrderStatus.FULLY_RECEIVED
            elif any(i.quantity_received > 0 for i in all_items):
                po.status = PurchaseOrderStatus.PARTIALLY_RECEIVED
            po.save(update_fields=["status"])

        return Response(GoodsReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)

class SupplierInvoiceViewSet(BaseModelViewSet):
    queryset = SupplierInvoice.objects.select_related("supplier", "purchase_order__branch").all()
    serializer_class = SupplierInvoiceSerializer
    filterset_fields = ["status", "supplier", "purchase_order"]
    search_fields = ["invoice_number", "supplier_invoice_ref", "supplier__name"]

    def get_queryset(self):
        qs = super().get_queryset()
        accessible = _accessible_branch_ids(self.request.user)
        if accessible is not None:
            qs = qs.filter(purchase_order__branch_id__in=accessible)
        return qs

    def perform_create(self, serializer):
        purchase_order = serializer.validated_data.get("purchase_order")
        accessible = _accessible_branch_ids(self.request.user)
        if accessible is not None and purchase_order and purchase_order.branch_id and purchase_order.branch_id not in accessible:
            raise ValidationError({"purchase_order": "This purchase order belongs to a different branch."})
        serializer.save(recorded_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="outstanding")
    def outstanding(self, request):
        qs = self.get_queryset().exclude(status="PAID")
        return Response(SupplierInvoiceSerializer(qs, many=True).data)


class SupplierPaymentViewSet(BaseModelViewSet):
    queryset = SupplierPayment.objects.select_related("supplier_invoice__supplier", "supplier_invoice__purchase_order__branch").all()
    serializer_class = SupplierPaymentSerializer
    filterset_fields = ["supplier_invoice", "method"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        accessible = _accessible_branch_ids(self.request.user)
        if accessible is not None:
            qs = qs.filter(supplier_invoice__purchase_order__branch_id__in=accessible)
        return qs

    def perform_create(self, serializer):
        invoice = serializer.validated_data.get("supplier_invoice")
        accessible = _accessible_branch_ids(self.request.user)
        po_branch_id = invoice.purchase_order.branch_id if invoice else None
        if accessible is not None and po_branch_id and po_branch_id not in accessible:
            raise ValidationError({"supplier_invoice": "This invoice belongs to a different branch."})

        payment = serializer.save(paid_by=self.request.user)
        invoice = payment.supplier_invoice
        invoice.amount_paid += payment.amount
        invoice.recalculate_status()
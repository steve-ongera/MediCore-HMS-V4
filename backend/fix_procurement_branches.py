from procurement.models import PurchaseRequisition, PurchaseOrder
from branches.models import Branch

nrb = Branch.objects.get(code="NRB")

n1 = 0
for req in PurchaseRequisition.objects.filter(branch__isnull=True).select_related("requested_by"):
    req.branch_id = (req.requested_by.branch_id if req.requested_by_id else None) or nrb.id
    req.save(update_fields=["branch"])
    n1 += 1

n2 = 0
for po in PurchaseOrder.objects.filter(branch__isnull=True).select_related("requisition", "created_by"):
    po.branch_id = (
        (po.requisition.branch_id if po.requisition_id else None)
        or (po.created_by.branch_id if po.created_by_id else None)
        or nrb.id
    )
    po.save(update_fields=["branch"])
    n2 += 1

print("requisitions:", n1, "purchase orders:", n2)
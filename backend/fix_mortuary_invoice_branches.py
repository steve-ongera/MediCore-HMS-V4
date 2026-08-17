from api.models import Invoice
from mortuary.models import MortuaryCharge

fixed = 0
skipped = []

for inv in Invoice.objects.filter(branch__isnull=True, visit__isnull=True):
    charge = MortuaryCharge.objects.filter(invoice=inv).select_related("mortuary_case__compartment").first()
    if charge and charge.mortuary_case.compartment and charge.mortuary_case.compartment.branch_id:
        inv.branch_id = charge.mortuary_case.compartment.branch_id
        inv.save(update_fields=["branch"])
        fixed += 1
    else:
        skipped.append(inv.invoice_number)

print(f"Fixed {fixed} invoices.")
print(f"Skipped (no compartment/branch to derive from): {skipped}")
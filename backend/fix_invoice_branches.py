from api.models import Invoice, Payment

fixed_invoices = 0
still_broken_invoices = []

for inv in Invoice.objects.filter(branch__isnull=True).select_related("visit"):
    if inv.visit_id and inv.visit.branch_id:
        inv.branch_id = inv.visit.branch_id
        inv.save(update_fields=["branch"])
        fixed_invoices += 1
    else:
        still_broken_invoices.append(inv.invoice_number)

print(f"Fixed {fixed_invoices} invoices.")
print(f"Still broken (no visit, or visit itself has no branch): {still_broken_invoices}")

# Payment.branch has the exact same "only stamped at creation" problem,
# derived from invoice.branch — any Payment made against one of the
# invoices above before this fix would have inherited branch=None too.
fixed_payments = 0
for pay in Payment.objects.filter(branch__isnull=True).select_related("invoice"):
    if pay.invoice_id and pay.invoice.branch_id:
        pay.branch_id = pay.invoice.branch_id
        pay.save(update_fields=["branch"])
        fixed_payments += 1

print(f"Fixed {fixed_payments} payments.")
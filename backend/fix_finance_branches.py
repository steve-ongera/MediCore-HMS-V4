from finance.models import JournalEntry, Expense, Budget, CashierShift
from branches.models import Branch

nrb = Branch.objects.get(code="NRB")

n1 = JournalEntry.objects.filter(branch__isnull=True).update(branch=nrb)
n2 = Expense.objects.filter(branch__isnull=True).update(branch=nrb)
n3 = Budget.objects.filter(branch__isnull=True).update(branch=nrb)

fixed_shifts = 0
for shift in CashierShift.objects.filter(branch__isnull=True).select_related("cashier"):
    if shift.cashier and shift.cashier.branch_id:
        shift.branch_id = shift.cashier.branch_id
        shift.save(update_fields=["branch"])
        fixed_shifts += 1

print("journal entries:", n1, "expenses:", n2, "budgets:", n3, "shifts:", fixed_shifts)
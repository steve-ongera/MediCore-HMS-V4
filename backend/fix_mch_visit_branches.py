from mch.models import AntenatalProfile

fixed = 0
skipped = []

for p in AntenatalProfile.objects.select_related("visit", "registered_by", "mother").filter(visit__branch__isnull=True):
    branch_id = None

    if p.registered_by is not None and p.registered_by.branch_id:
        branch_id = p.registered_by.branch_id
    elif p.mother is not None and p.mother.home_branch_id:
        branch_id = p.mother.home_branch_id

    if branch_id:
        p.visit.branch_id = branch_id
        p.visit.save(update_fields=["branch"])
        fixed += 1
    else:
        skipped.append(p.anc_number)

print(f"Fixed {fixed} antenatal visits.")
print(f"Skipped (no branch to derive from at all): {skipped}")
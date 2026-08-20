from mch.models import AntenatalProfile
from api.models import Department, User
from branches.permissions import get_accessible_branch_ids

print("=" * 60)
print("STEP 1: Department rows — check for duplicates/orphans")
print("=" * 60)
depts = Department.objects.filter(name="Maternal & Child Health")
for d in depts:
    print(f"id={d.id} branch_id={d.branch_id} branch={d.branch.name if d.branch else 'NULL'}")

print()
print("=" * 60)
print("STEP 2: Every AntenatalProfile and its derived branch")
print("=" * 60)
total = AntenatalProfile.objects.count()
print(f"Total antenatal profiles: {total}")

for p in AntenatalProfile.objects.select_related("mother", "visit", "visit__branch", "visit__department"):
    visit_branch = p.visit.branch.name if p.visit and p.visit.branch_id else "NULL/NO BRANCH"
    dept_branch = p.visit.department.branch_id if p.visit and p.visit.department_id else None
    print(f"{p.anc_number} | mother={p.mother.full_name} | visit_id={p.visit_id} | visit_branch={visit_branch} | dept_branch_id={dept_branch}")

print()
print("=" * 60)
print("STEP 3: Test with a specific user — replace username below")
print("=" * 60)
username = "REPLACE_ME"
u = User.objects.filter(username=username).first()
if u:
    print(f"User: {u.username} | role={u.role} | branch_id={u.branch_id} | branch={u.branch.name if u.branch else None}")
    accessible = get_accessible_branch_ids(u)
    print(f"accessible branch ids: {accessible}")
else:
    print(f"User '{username}' not found — edit the script and set the real username.")
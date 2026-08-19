from api.models import Department
from branches.models import Branch

nrb = Branch.objects.get(code="NRB")
msa = Branch.objects.get(code="MSA")

# Step 1: existing departments (created before branch scoping) become NRB's.
n = Department.objects.filter(branch__isnull=True).update(branch=nrb)
print(f"Assigned {n} existing departments to NRB.")

# Step 2: clone every NRB department into MSA if MSA doesn't already have
# one with the same name — so MSA isn't left with zero departments.
nrb_departments = Department.objects.filter(branch=nrb)
created = 0
for dept in nrb_departments:
    exists = Department.objects.filter(name=dept.name, branch=msa).exists()
    if not exists:
        Department.objects.create(
            name=dept.name,
            branch=msa,
            consultation_fee=dept.consultation_fee,
            description=dept.description,
            is_active=dept.is_active,
            # head_of_department deliberately NOT copied — MSA needs its
            # own HOD assigned per department, not NRB's.
        )
        created += 1

print(f"Created {created} matching departments at MSA.")
print(f"MSA now has {Department.objects.filter(branch=msa).count()} departments total.")
print(f"NRB now has {Department.objects.filter(branch=nrb).count()} departments total.")
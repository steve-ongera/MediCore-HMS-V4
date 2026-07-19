"""
Management command to seed the mortuary module with realistic demo data.

Creates (idempotently, safe to re-run):
  - A handful of staff Users (if none exist for the required roles)
  - MortuaryUnit compartments
  - MortuaryServiceCatalog items (embalming, washing, viewing, transport, etc.)
  - Patient records for the deceased (plus one unidentified BID case using
    deceased_name_freetext instead of a Patient)
  - Invoice records (source_type=MORTUARY isn't in InvoiceSourceType, so we
    reuse INPATIENT... see note below) tied to each case
  - MortuaryAdmission cases in a mix of states: freshly admitted, admitted
    with services ordered, and fully released
  - MortuaryServiceRecord entries linked to invoices
  - MortuaryCharge rows recording the daily storage billing
  - BodyRelease records for the released cases

Usage:
    python manage.py seed_mortuary
    python manage.py seed_mortuary --flush   # wipe previously seeded rows first
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import User, Patient, Invoice, InvoiceSourceType, Gender, Role
from mortuary.models import (
    MortuaryUnit,
    CompartmentStatus,
    MortuaryAdmission,
    DeathSource,
    MortuaryStatus,
    MortuaryServiceCatalog,
    MortuaryServiceRecord,
    MortuaryServiceStatus,
    MortuaryCharge,
    BodyRelease,
    ReleaseRelationship,
)

# NOTE: InvoiceSourceType has no MORTUARY member in api/models.py. Rather than
# silently misclassify these invoices, we default to INPATIENT (mortuary
# admissions most often originate from an inpatient death) and prefix the
# invoice description with "[MORTUARY]" so they're easy to find/report on.
# Swap this to InvoiceSourceType.MORTUARY once that choice is added upstream.
MORTUARY_SOURCE_TYPE = InvoiceSourceType.INPATIENT


class Command(BaseCommand):
    help = "Seed demo data for the mortuary module (compartments, services, cases, invoices)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete previously seeded mortuary demo data before re-seeding.",
        )

    def handle(self, *args, **options):
        with transaction.atomic():
            if options["flush"]:
                self._flush()

            staff = self._seed_staff()
            compartments = self._seed_compartments()
            services = self._seed_service_catalog()
            patients = self._seed_patients(staff["receptionist"])

            self._seed_cases(staff, compartments, services, patients)

        self.stdout.write(self.style.SUCCESS("Mortuary demo data seeded successfully."))

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------
    def _flush(self):
        self.stdout.write("Flushing previously seeded mortuary data...")
        BodyRelease.all_objects.filter(mortuary_case__case_number__startswith="MRT-DEMO").delete()
        MortuaryCharge.all_objects.filter(mortuary_case__case_number__startswith="MRT-DEMO").delete()
        MortuaryServiceRecord.all_objects.filter(mortuary_case__case_number__startswith="MRT-DEMO").delete()
        MortuaryAdmission.all_objects.filter(case_number__startswith="MRT-DEMO").delete()
        Invoice.all_objects.filter(description__startswith="[MORTUARY]").delete()
        Patient.all_objects.filter(hospital_number__startswith="DEMO-MRT").delete()
        MortuaryServiceCatalog.all_objects.filter(code__startswith="MSV-DEMO").delete()
        MortuaryUnit.all_objects.filter(compartment_number__startswith="C-DEMO").delete()

    # ------------------------------------------------------------------
    # Staff
    # ------------------------------------------------------------------
    def _seed_staff(self):
        self.stdout.write("Seeding staff users...")

        def get_or_create_staff(username, first_name, last_name, role):
            user, created = User.objects.get_or_create(
                username=username,
                defaults=dict(
                    first_name=first_name,
                    last_name=last_name,
                    email=f"{username}@demo.hospital.local",
                    role=role,
                    password=make_password("Demo@12345"),
                    is_active_staff=True,
                ),
            )
            return user

        return {
            "receptionist": get_or_create_staff("j.mwangi", "Jane", "Mwangi", Role.RECEPTIONIST),
            "mortuary_attendant": get_or_create_staff("o.kiptoo", "Oscar", "Kiptoo", Role.NURSE),
            "cashier": get_or_create_staff("a.wanjiru", "Alice", "Wanjiru", Role.CASHIER),
        }

    # ------------------------------------------------------------------
    # Compartments
    # ------------------------------------------------------------------
    def _seed_compartments(self):
        self.stdout.write("Seeding mortuary compartments...")
        compartments = []
        for i in range(1, 7):
            unit, _ = MortuaryUnit.objects.get_or_create(
                compartment_number=f"C-DEMO-{i:02d}",
                defaults=dict(
                    daily_storage_rate=Decimal("500.00"),
                    status=CompartmentStatus.AVAILABLE,
                    is_active=True,
                ),
            )
            compartments.append(unit)
        return compartments

    # ------------------------------------------------------------------
    # Service catalog
    # ------------------------------------------------------------------
    def _seed_service_catalog(self):
        self.stdout.write("Seeding mortuary service catalog...")
        catalog_data = [
            ("MSV-DEMO-01", "Body Washing & Preparation", Decimal("1000.00")),
            ("MSV-DEMO-02", "Embalming", Decimal("6000.00")),
            ("MSV-DEMO-03", "Viewing Room Access", Decimal("1500.00")),
            ("MSV-DEMO-04", "Mortuary Transport (within town)", Decimal("3000.00")),
            ("MSV-DEMO-05", "Postmortem Assistance", Decimal("4500.00")),
        ]
        services = []
        for code, name, price in catalog_data:
            svc, _ = MortuaryServiceCatalog.objects.get_or_create(
                code=code, defaults=dict(name=name, price=price, is_active=True)
            )
            services.append(svc)
        return services

    # ------------------------------------------------------------------
    # Patients (deceased)
    # ------------------------------------------------------------------
    def _seed_patients(self, created_by):
        self.stdout.write("Seeding deceased patient records...")
        patient_data = [
            ("Samuel Otieno", Gender.MALE, "1958-03-12", "0722100001"),
            ("Grace Njoki", Gender.FEMALE, "1972-11-02", "0733100002"),
            ("David Kimutai", Gender.MALE, "1990-06-25", "0711100003"),
            ("Mary Achieng", Gender.FEMALE, "1945-01-19", "0700100004"),
        ]
        patients = []
        for idx, (name, gender, dob, phone) in enumerate(patient_data, start=1):
            patient, _ = Patient.objects.get_or_create(
                hospital_number=f"DEMO-MRT-{idx:03d}",
                defaults=dict(
                    full_name=name,
                    gender=gender,
                    dob=dob,
                    phone=phone,
                    address="Nairobi, Kenya",
                    next_of_kin_name="Peter " + name.split()[-1],
                    next_of_kin_phone="0799100000",
                    next_of_kin_relationship="Sibling",
                    created_by=created_by,
                ),
            )
            patients.append(patient)
        return patients

    # ------------------------------------------------------------------
    # Cases: admissions, invoices, services, charges, releases
    # ------------------------------------------------------------------
    def _seed_cases(self, staff, compartments, services, patients):
        self.stdout.write("Seeding mortuary admissions, invoices, services and charges...")
        now = timezone.now()

        # 1) Freshly admitted case, still in mortuary, no services yet.
        self._create_case(
            staff=staff,
            compartments=compartments,
            services=services,
            patient=patients[0],
            deceased_name_freetext="",
            case_suffix="0001",
            date_of_death=now - timedelta(days=1),
            source=DeathSource.INPATIENT,
            days_in_storage=1,
            order_services=False,
            release_case=False,
        )

        # 2) Admitted with services ordered/completed, still in storage.
        self._create_case(
            staff=staff,
            compartments=compartments,
            services=services,
            patient=patients[1],
            deceased_name_freetext="",
            case_suffix="0002",
            date_of_death=now - timedelta(days=3),
            source=DeathSource.EMERGENCY,
            days_in_storage=3,
            order_services=True,
            release_case=False,
        )

        # 3) Fully released case with a completed BodyRelease record.
        self._create_case(
            staff=staff,
            compartments=compartments,
            services=services,
            patient=patients[2],
            deceased_name_freetext="",
            case_suffix="0003",
            date_of_death=now - timedelta(days=6),
            source=DeathSource.MCH,
            days_in_storage=5,
            order_services=True,
            release_case=True,
        )

        # 4) Unidentified Brought-In-Dead case — no Patient record, uses
        #    deceased_name_freetext, has a police OB number instead.
        self._create_case(
            staff=staff,
            compartments=compartments,
            services=services,
            patient=None,
            deceased_name_freetext="Unknown Male, approx. 40yrs",
            case_suffix="0004",
            date_of_death=now - timedelta(days=2),
            source=DeathSource.BROUGHT_IN_DEAD,
            days_in_storage=2,
            order_services=False,
            release_case=False,
            police_ob_number="OB/45/2026",
            brought_by="Kilimani Police Station",
            estimated_age=40,
            gender="MALE",
        )

    def _create_case(
        self,
        staff,
        compartments,
        services,
        patient,
        deceased_name_freetext,
        case_suffix,
        date_of_death,
        source,
        days_in_storage,
        order_services,
        release_case,
        police_ob_number="",
        brought_by="",
        estimated_age=None,
        gender=None,
    ):
        case_number = f"MRT-DEMO-{case_suffix}"

        # Skip if this exact demo case already exists (idempotent re-run).
        if MortuaryAdmission.objects.filter(case_number=case_number).exists():
            self.stdout.write(f"  - {case_number} already exists, skipping.")
            return

        compartment = random.choice(compartments)
        compartment.status = CompartmentStatus.OCCUPIED
        compartment.save(update_fields=["status"])

        # Determine deceased name/patient link for invoice + display purposes.
        if patient:
            deceased_display = patient.full_name
            invoice_patient = patient
            case_gender = patient.gender
        else:
            deceased_display = deceased_name_freetext or "Unidentified"
            # Invoice.patient is required (non-nullable FK), so an
            # unidentified/BID case still needs *a* Patient to bill against.
            # We create a lightweight placeholder Patient for it.
            invoice_patient, _ = Patient.objects.get_or_create(
                hospital_number=f"DEMO-MRT-BID-{case_suffix}",
                defaults=dict(
                    full_name=deceased_name_freetext or "Unidentified BID Case",
                    gender=gender or "UNKNOWN",
                    address="Unknown",
                ),
            )
            case_gender = gender or "UNKNOWN"

        # --- Case-level invoice (storage charges) ---
        storage_rate = compartment.daily_storage_rate
        storage_amount = storage_rate * days_in_storage
        storage_invoice = Invoice.objects.create(
            patient=invoice_patient,
            source_type=MORTUARY_SOURCE_TYPE,
            description=f"[MORTUARY] Storage charges - {case_number}",
            amount=storage_amount,
        )

        # --- MortuaryAdmission itself ---
        admission_kwargs = dict(
            case_number=case_number,
            patient=patient,
            deceased_name_freetext=deceased_name_freetext,
            gender=case_gender,
            estimated_age=estimated_age,
            date_of_death=date_of_death,
            cause_of_death="Pending postmortem report" if source == DeathSource.BROUGHT_IN_DEAD else "Natural causes",
            source=source,
            compartment=compartment,
            brought_by=brought_by or "Hospital ward staff",
            police_ob_number=police_ob_number,
            status=MortuaryStatus.RELEASED if release_case else MortuaryStatus.ADMITTED,
            admitted_by=staff["receptionist"],
        )
        case = MortuaryAdmission.objects.create(**admission_kwargs)
        # admitted_at is auto_now_add; backdate it to line up with days_in_storage.
        MortuaryAdmission.objects.filter(pk=case.pk).update(
            admitted_at=timezone.now() - timedelta(days=days_in_storage)
        )
        case.refresh_from_db()

        # --- Storage charge line item ---
        MortuaryCharge.objects.create(
            mortuary_case=case,
            invoice=storage_invoice,
            description=f"Storage @ KES {storage_rate}/day x {days_in_storage} day(s)",
        )

        # --- Optional services ---
        if order_services:
            picked_services = random.sample(services, k=2)
            for svc in picked_services:
                service_invoice = Invoice.objects.create(
                    patient=invoice_patient,
                    source_type=MORTUARY_SOURCE_TYPE,
                    description=f"[MORTUARY] {svc.name} - {case_number}",
                    amount=svc.price,
                )
                MortuaryServiceRecord.objects.create(
                    mortuary_case=case,
                    service=svc,
                    status=MortuaryServiceStatus.COMPLETED,
                    notes="Completed as part of demo seed.",
                    ordered_by=staff["receptionist"],
                    performed_by=staff["mortuary_attendant"],
                    invoice=service_invoice,
                    completed_at=timezone.now() - timedelta(days=1),
                )
                MortuaryCharge.objects.create(
                    mortuary_case=case,
                    invoice=service_invoice,
                    description=svc.name,
                )

        # --- Optional release ---
        if release_case:
            BodyRelease.objects.create(
                mortuary_case=case,
                collector_name="Peter " + deceased_display.split()[-1],
                collector_id_number="12345678",
                collector_phone="0799100000",
                relationship=ReleaseRelationship.SIBLING,
                funeral_home="Lee Funeral Home",
                burial_permit_number=f"BP-{case_suffix}",
                released_by=staff["mortuary_attendant"],
                notes="Body released after full payment and documentation verified.",
            )
            compartment.status = CompartmentStatus.AVAILABLE
            compartment.save(update_fields=["status"])

        # --- Mark all invoices for this case as paid, for a clean demo state ---
        case_invoices = Invoice.objects.filter(description__endswith=f"- {case_number}")
        for inv in case_invoices:
            inv.amount_paid = inv.amount
            inv.recalculate_status()

        self.stdout.write(f"  - Created {case_number} ({deceased_display})")
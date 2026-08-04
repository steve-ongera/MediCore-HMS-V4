# biomed/management/commands/seed_biomed.py
import random
from datetime import date, datetime, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import User, Supplier, Role
from biomed.models import (
    Equipment, EquipmentCategory, EquipmentStatus, RiskClass,
    ServiceRequest, ServiceRequestPriority, ServiceRequestStatus,
    MaintenanceRecord, MaintenanceType, MaintenanceRecordStatus,
    Calibration, CalibrationStatus,
    SparePart, SparePartUsage,
    ServiceContract,
)


EQUIPMENT_CATALOG = [
    # (name, category, risk_class, pm_days, calibration_days)
    ("Patient Monitor - Philips IntelliVue MX450", EquipmentCategory.LIFE_SUPPORT, RiskClass.HIGH, 60, 180),
    ("Patient Monitor - Mindray uMEC12", EquipmentCategory.LIFE_SUPPORT, RiskClass.HIGH, 60, 180),
    ("Ventilator - Drager Evita V300", EquipmentCategory.LIFE_SUPPORT, RiskClass.HIGH, 30, 90),
    ("Ventilator - Hamilton C1", EquipmentCategory.LIFE_SUPPORT, RiskClass.HIGH, 30, 90),
    ("Infusion Pump - B.Braun Infusomat Space", EquipmentCategory.THERAPEUTIC, RiskClass.HIGH, 90, 180),
    ("Syringe Pump - Terumo TE-712", EquipmentCategory.THERAPEUTIC, RiskClass.HIGH, 90, 180),
    ("Defibrillator - Zoll R Series", EquipmentCategory.LIFE_SUPPORT, RiskClass.HIGH, 30, 90),
    ("ECG Machine - Nihon Kohden ECG-1350", EquipmentCategory.DIAGNOSTIC, RiskClass.MEDIUM, 90, 180),
    ("Ultrasound Machine - GE Voluson E8", EquipmentCategory.IMAGING, RiskClass.MEDIUM, 90, 365),
    ("Digital X-Ray Unit - Shimadzu RADspeed Pro", EquipmentCategory.IMAGING, RiskClass.HIGH, 90, 365),
    ("CT Scanner - Siemens SOMATOM go.Now", EquipmentCategory.IMAGING, RiskClass.HIGH, 30, 180),
    ("Autoclave - Tuttnauer 3870EA", EquipmentCategory.STERILIZATION, RiskClass.MEDIUM, 60, 180),
    ("Hematology Analyzer - Sysmex XN-550", EquipmentCategory.LABORATORY, RiskClass.MEDIUM, 60, 180),
    ("Chemistry Analyzer - Mindray BS-240", EquipmentCategory.LABORATORY, RiskClass.MEDIUM, 60, 180),
    ("Blood Gas Analyzer - Radiometer ABL800", EquipmentCategory.LABORATORY, RiskClass.HIGH, 30, 90),
    ("Anesthesia Machine - Drager Fabius Plus", EquipmentCategory.LIFE_SUPPORT, RiskClass.HIGH, 30, 90),
    ("Pulse Oximeter - Masimo Rad-8", EquipmentCategory.DIAGNOSTIC, RiskClass.MEDIUM, 90, 180),
    ("Suction Machine - Medela Basic 30", EquipmentCategory.THERAPEUTIC, RiskClass.LOW, 90, None),
    ("Fetal Doppler - Contec Sonoline B", EquipmentCategory.DIAGNOSTIC, RiskClass.LOW, 120, None),
    ("Incubator - Drager Caleo", EquipmentCategory.LIFE_SUPPORT, RiskClass.HIGH, 45, 180),
    ("Phototherapy Unit - GE Lullaby LED", EquipmentCategory.THERAPEUTIC, RiskClass.MEDIUM, 90, None),
    ("Nebulizer - Omron NE-C801", EquipmentCategory.THERAPEUTIC, RiskClass.LOW, 120, None),
    ("Centrifuge - Hettich Rotina 380", EquipmentCategory.LABORATORY, RiskClass.LOW, 120, 365),
    ("Dialysis Machine - Fresenius 4008S", EquipmentCategory.LIFE_SUPPORT, RiskClass.HIGH, 30, 90),
    ("Diathermy Machine - Valleylab FT10", EquipmentCategory.THERAPEUTIC, RiskClass.HIGH, 60, 180),
    ("Weighing Scale - Seca 704", EquipmentCategory.DIAGNOSTIC, RiskClass.LOW, 180, 365),
    ("Refrigerator (Vaccine/Blood) - Haier HBC-260", EquipmentCategory.OTHER, RiskClass.MEDIUM, 90, None),
    ("Operating Table - Mindray HyBase 8100", EquipmentCategory.OTHER, RiskClass.MEDIUM, 180, None),
    ("Surgical Light - Berchtold Chromophare F3", EquipmentCategory.OTHER, RiskClass.LOW, 180, None),
    ("Oxygen Concentrator - Philips EverFlo", EquipmentCategory.LIFE_SUPPORT, RiskClass.HIGH, 60, 180),
]

DEPARTMENTS = [
    "ICU", "Theatre 1", "Theatre 2", "Emergency Department", "Maternity Ward",
    "Radiology", "Laboratory", "General Ward A", "General Ward B", "Pediatric Ward",
    "Outpatient Clinic", "Dialysis Unit", "Pharmacy", "NICU",
]

SPARE_PARTS_CATALOG = [
    ("SP-BATT-001", "Lithium-Ion Battery Pack (Monitor)"),
    ("SP-BATT-002", "SLA Battery 12V 7Ah (Ventilator)"),
    ("SP-SENS-001", "SpO2 Sensor - Adult Finger Clip"),
    ("SP-SENS-002", "NIBP Cuff - Adult"),
    ("SP-SENS-003", "ECG Lead Set - 5 Lead"),
    ("SP-TUBE-001", "Ventilator Breathing Circuit"),
    ("SP-TUBE-002", "Suction Tubing Set"),
    ("SP-FILT-001", "HEPA Filter - Ventilator"),
    ("SP-FILT-002", "Water Filter - Dialysis Machine"),
    ("SP-FUSE-001", "Fuse 5A 250V"),
    ("SP-PCB-001", "Power Supply PCB - Infusion Pump"),
    ("SP-BULB-001", "Halogen Bulb - Surgical Light"),
    ("SP-PROBE-001", "Ultrasound Probe Cable"),
    ("SP-VALVE-001", "Autoclave Safety Valve"),
    ("SP-BELT-001", "Centrifuge Drive Belt"),
]

VENDORS = [
    ("SVC-2024-001", "Philips Healthcare EA Ltd"),
    ("SVC-2024-002", "GE Healthcare Kenya"),
    ("SVC-2024-003", "Mindray Medical (Nairobi Branch)"),
    ("SVC-2024-004", "Medtronic East Africa"),
    ("SVC-2024-005", "Bio-Medica Solutions Ltd"),
]

PROBLEM_DESCRIPTIONS = [
    "Device not powering on",
    "Screen displaying error code E-04",
    "Battery not holding charge",
    "Unusual noise during operation",
    "Alarm not triggering on threshold breach",
    "Calibration drift noticed during use",
    "Leaking fluid from housing",
    "Intermittent shutdown during operation",
    "Display readings inconsistent with manual check",
    "Physical damage to casing after fall",
]


class Command(BaseCommand):
    help = "Seeds the Biomedical Engineering module with equipment, service requests, maintenance, calibrations, spare parts, and service contracts. Uses existing Users and Suppliers from the api app."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing biomed records before seeding.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write(self.style.WARNING("Flushing existing biomed data..."))
            SparePartUsage.objects.all().delete()
            MaintenanceRecord.objects.all().delete()
            Calibration.objects.all().delete()
            ServiceRequest.objects.all().delete()
            ServiceContract.objects.all().delete()
            SparePart.objects.all().delete()
            Equipment.objects.all().delete()

        engineers = list(User.objects.filter(role=Role.BIOMEDICAL_ENGINEER, is_active_staff=True))
        if not engineers:
            self.stdout.write(self.style.WARNING(
                "No BIOMEDICAL_ENGINEER users found. Service requests/maintenance will be left unassigned "
                "where an engineer would normally be picked."
            ))

        reporters = list(User.objects.filter(
            role__in=[Role.NURSE, Role.DOCTOR, Role.RECEPTIONIST, Role.BIOMEDICAL_ENGINEER],
            is_active_staff=True,
        ))
        if not reporters:
            self.stdout.write(self.style.ERROR(
                "No staff users found at all (NURSE/DOCTOR/RECEPTIONIST/BIOMEDICAL_ENGINEER). "
                "Seed the api/users module first. Aborting."
            ))
            return

        suppliers = list(Supplier.objects.all())
        if not suppliers:
            self.stdout.write(self.style.WARNING(
                "No Suppliers found — equipment/spare parts will be created without a supplier link."
            ))

        with transaction.atomic():
            equipment_list = self._seed_equipment(engineers, suppliers)
            self._seed_service_requests(equipment_list, reporters, engineers)
            self._seed_maintenance_records(equipment_list, engineers)
            self._seed_calibrations(equipment_list, engineers)
            spare_parts = self._seed_spare_parts(equipment_list, suppliers)
            self._seed_spare_part_usage(spare_parts)
            self._seed_service_contracts(equipment_list)

        self.stdout.write(self.style.SUCCESS("Biomedical Engineering module seeded successfully."))

    # -----------------------------------------------------------------
    # Equipment
    # -----------------------------------------------------------------
    def _seed_equipment(self, engineers, suppliers):
        self.stdout.write("Seeding equipment register...")
        equipment_list = []

        for name, category, risk_class, pm_days, cal_days in EQUIPMENT_CATALOG:
            manufacturer = name.split(" - ")[-1].split()[0] if " - " in name else ""
            status_choices = [EquipmentStatus.OPERATIONAL] * 7 + [
                EquipmentStatus.UNDER_MAINTENANCE,
                EquipmentStatus.AWAITING_PARTS,
                EquipmentStatus.OUT_OF_SERVICE,
            ]
            purchase_date = date.today() - timedelta(days=random.randint(180, 1800))
            warranty_years = random.choice([1, 2, 3])

            equipment = Equipment.objects.create(
                name=name,
                category=category,
                manufacturer=manufacturer,
                model_number=f"MDL-{random.randint(1000, 9999)}",
                serial_number=f"SN{random.randint(100000, 999999)}",
                department=random.choice(DEPARTMENTS),
                risk_class=risk_class,
                status=random.choice(status_choices),
                supplier=random.choice(suppliers) if suppliers else None,
                purchase_date=purchase_date,
                purchase_cost=random.choice([
                    150000, 350000, 800000, 1200000, 2500000, 4500000, 8000000,
                ]),
                warranty_expiry=purchase_date + timedelta(days=365 * warranty_years),
                preventive_maintenance_interval_days=pm_days,
                calibration_interval_days=cal_days,
                is_active=True,
                registered_by=random.choice(engineers) if engineers else None,
            )
            equipment_list.append(equipment)

        self.stdout.write(self.style.SUCCESS(f"  Created {len(equipment_list)} equipment records."))
        return equipment_list

    # -----------------------------------------------------------------
    # Service Requests
    # -----------------------------------------------------------------
    def _seed_service_requests(self, equipment_list, reporters, engineers):
        self.stdout.write("Seeding service requests...")
        count = 0

        # A subset of equipment gets one or more service requests raised against it
        sample = random.sample(equipment_list, k=min(18, len(equipment_list)))

        for equipment in sample:
            num_requests = random.randint(1, 2)
            for _ in range(num_requests):
                status = random.choices(
                    [
                        ServiceRequestStatus.OPEN,
                        ServiceRequestStatus.ASSIGNED,
                        ServiceRequestStatus.IN_PROGRESS,
                        ServiceRequestStatus.RESOLVED,
                        ServiceRequestStatus.CANCELLED,
                    ],
                    weights=[15, 15, 15, 45, 10],
                )[0]

                priority = random.choices(
                    [
                        ServiceRequestPriority.ROUTINE,
                        ServiceRequestPriority.URGENT,
                        ServiceRequestPriority.EMERGENCY,
                    ],
                    weights=[55, 30, 15],
                )[0]

                reported_days_ago = random.randint(1, 120)
                reported_at = timezone.now() - timedelta(days=reported_days_ago)

                sr = ServiceRequest.objects.create(
                    equipment=equipment,
                    reported_by=random.choice(reporters),
                    priority=priority,
                    problem_description=random.choice(PROBLEM_DESCRIPTIONS),
                    status=status,
                    caused_downtime=random.random() > 0.2,
                )
                # reported_at is auto_now_add, backdate it explicitly
                ServiceRequest.objects.filter(pk=sr.pk).update(reported_at=reported_at)
                sr.refresh_from_db()

                if status in (ServiceRequestStatus.ASSIGNED, ServiceRequestStatus.IN_PROGRESS,
                              ServiceRequestStatus.RESOLVED) and engineers:
                    sr.assigned_to = random.choice(engineers)

                if status == ServiceRequestStatus.RESOLVED:
                    resolved_at = reported_at + timedelta(hours=random.randint(2, 96))
                    sr.resolved_at = min(resolved_at, timezone.now())

                sr.save()
                count += 1

        self.stdout.write(self.style.SUCCESS(f"  Created {count} service requests."))

    # -----------------------------------------------------------------
    # Maintenance Records (preventive + corrective from resolved SRs)
    # -----------------------------------------------------------------
    def _seed_maintenance_records(self, equipment_list, engineers):
        self.stdout.write("Seeding maintenance records...")
        count = 0

        # Preventive maintenance — scheduled/completed history per equipment
        for equipment in equipment_list:
            num_records = random.randint(1, 3)
            for _ in range(num_records):
                status = random.choices(
                    [
                        MaintenanceRecordStatus.COMPLETED,
                        MaintenanceRecordStatus.SCHEDULED,
                        MaintenanceRecordStatus.IN_PROGRESS,
                        MaintenanceRecordStatus.CANCELLED,
                    ],
                    weights=[65, 20, 10, 5],
                )[0]

                scheduled_date = date.today() - timedelta(days=random.randint(-30, 300))

                record = MaintenanceRecord.objects.create(
                    equipment=equipment,
                    maintenance_type=MaintenanceType.PREVENTIVE,
                    status=status,
                    scheduled_date=scheduled_date,
                    performed_by=random.choice(engineers) if engineers and status != MaintenanceRecordStatus.SCHEDULED else None,
                    work_done="Routine preventive maintenance: inspection, cleaning, function test, safety check." if status == MaintenanceRecordStatus.COMPLETED else "",
                    parts_used="",
                    cost=random.choice([0, 1500, 3000, 5000, 8000]) if status == MaintenanceRecordStatus.COMPLETED else 0,
                )

                if status == MaintenanceRecordStatus.COMPLETED:
                    completed_at = timezone.make_aware(
                        datetime.combine(scheduled_date, datetime.min.time())
                    ) + timedelta(hours=random.randint(1, 6))
                    record.completed_at = completed_at
                    record.save(update_fields=["completed_at"])

                count += 1

        # Corrective maintenance linked to resolved service requests
        resolved_requests = ServiceRequest.objects.filter(status=ServiceRequestStatus.RESOLVED)
        for sr in resolved_requests:
            record = MaintenanceRecord.objects.create(
                equipment=sr.equipment,
                service_request=sr,
                maintenance_type=MaintenanceType.CORRECTIVE,
                status=MaintenanceRecordStatus.COMPLETED,
                scheduled_date=sr.reported_at.date(),
                performed_by=sr.assigned_to or (random.choice(engineers) if engineers else None),
                work_done=f"Diagnosed and resolved: {sr.problem_description.lower()}.",
                parts_used="",
                cost=random.choice([0, 2000, 4500, 7500, 12000]),
                completed_at=sr.resolved_at,
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"  Created {count} maintenance records."))

    # -----------------------------------------------------------------
    # Calibrations
    # -----------------------------------------------------------------
    def _seed_calibrations(self, equipment_list, engineers):
        self.stdout.write("Seeding calibration records...")
        count = 0

        cal_needed = [e for e in equipment_list if e.calibration_interval_days]

        for equipment in cal_needed:
            num_records = random.randint(1, 2)
            for _ in range(num_records):
                status = random.choices(
                    [
                        CalibrationStatus.COMPLETED,
                        CalibrationStatus.SCHEDULED,
                        CalibrationStatus.FAILED,
                        CalibrationStatus.OVERDUE,
                    ],
                    weights=[60, 20, 10, 10],
                )[0]

                scheduled_date = date.today() - timedelta(days=random.randint(-20, 200))

                calibration = Calibration.objects.create(
                    equipment=equipment,
                    scheduled_date=scheduled_date,
                    status=status,
                    performed_by=random.choice(engineers) if engineers and status in (
                        CalibrationStatus.COMPLETED, CalibrationStatus.FAILED
                    ) else None,
                    reference_standard=random.choice([
                        "Fluke Biomedical ESA615", "Fluke Impulse 7000DP",
                        "Rigel 288 Plus", "NIST-traceable reference weights",
                    ]),
                    result_notes="Within tolerance." if status == CalibrationStatus.COMPLETED else (
                        "Out of tolerance — flagged for corrective calibration." if status == CalibrationStatus.FAILED else ""
                    ),
                    certificate_number=f"CAL-{scheduled_date.year}-{random.randint(1000, 9999)}" if status == CalibrationStatus.COMPLETED else "",
                )

                if status in (CalibrationStatus.COMPLETED, CalibrationStatus.FAILED):
                    calibrated_at = timezone.make_aware(
                        datetime.combine(scheduled_date, datetime.min.time())
                    ) + timedelta(hours=random.randint(1, 6))
                    calibration.calibrated_at = calibrated_at
                    calibration.save(update_fields=["calibrated_at"])

                count += 1

        self.stdout.write(self.style.SUCCESS(f"  Created {count} calibration records."))

    # -----------------------------------------------------------------
    # Spare Parts
    # -----------------------------------------------------------------
    def _seed_spare_parts(self, equipment_list, suppliers):
        self.stdout.write("Seeding spare parts inventory...")
        spare_parts = []

        for part_number, name in SPARE_PARTS_CATALOG:
            part, created = SparePart.objects.get_or_create(
                part_number=part_number,
                defaults=dict(
                    name=name,
                    quantity_in_stock=random.randint(0, 40),
                    reorder_level=random.choice([2, 3, 5, 8]),
                    unit_cost=random.choice([500, 1200, 2500, 4000, 8500, 15000]),
                    supplier=random.choice(suppliers) if suppliers else None,
                ),
            )
            # Link to a handful of compatible equipment for realism
            compatible = random.sample(equipment_list, k=min(random.randint(2, 5), len(equipment_list)))
            part.compatible_equipment.set(compatible)
            spare_parts.append(part)

        self.stdout.write(self.style.SUCCESS(f"  Created/verified {len(spare_parts)} spare parts."))
        return spare_parts

    # -----------------------------------------------------------------
    # Spare Part Usage (consumed against completed maintenance jobs)
    # -----------------------------------------------------------------
    def _seed_spare_part_usage(self, spare_parts):
        self.stdout.write("Seeding spare part usage records...")
        count = 0

        completed_records = list(MaintenanceRecord.objects.filter(status=MaintenanceRecordStatus.COMPLETED))
        sample = random.sample(completed_records, k=min(15, len(completed_records)))

        for record in sample:
            part = random.choice(spare_parts)
            quantity = random.randint(1, 3)
            if part.quantity_in_stock < quantity:
                continue

            SparePartUsage.objects.create(
                maintenance_record=record,
                spare_part=part,
                quantity=quantity,
            )
            part.quantity_in_stock = max(0, part.quantity_in_stock - quantity)
            part.save(update_fields=["quantity_in_stock"])

            record.parts_used = f"{part.name} x{quantity}"
            record.save(update_fields=["parts_used"])
            count += 1

        self.stdout.write(self.style.SUCCESS(f"  Created {count} spare part usage records."))

    # -----------------------------------------------------------------
    # Service Contracts
    # -----------------------------------------------------------------
    def _seed_service_contracts(self, equipment_list):
        self.stdout.write("Seeding service contracts...")
        count = 0

        for contract_number, vendor_name in VENDORS:
            start_date = date.today() - timedelta(days=random.randint(30, 700))
            duration_days = random.choice([365, 730])
            end_date = start_date + timedelta(days=duration_days)

            contract, created = ServiceContract.objects.get_or_create(
                contract_number=contract_number,
                defaults=dict(
                    vendor_name=vendor_name,
                    vendor_contact=f"support@{vendor_name.lower().replace(' ', '').replace('(', '').replace(')', '')[:20]}.com",
                    start_date=start_date,
                    end_date=end_date,
                    coverage_details="Comprehensive maintenance cover including labour, preventive maintenance visits, and priority emergency callout within 24 hours.",
                    annual_cost=random.choice([250000, 480000, 750000, 1200000]),
                    is_active=True,
                ),
            )
            covered_equipment = random.sample(equipment_list, k=min(random.randint(3, 6), len(equipment_list)))
            contract.equipment.set(covered_equipment)
            count += 1

        self.stdout.write(self.style.SUCCESS(f"  Created/verified {count} service contracts."))
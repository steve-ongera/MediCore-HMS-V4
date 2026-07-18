"""
Seed data for the Asset Management module.

Usage:
    python manage.py seed_assets
    python manage.py seed_assets --flush   # wipe asset data first, then reseed

Creates (idempotent via get_or_create):
    - AssetCategory  (Medical Equipment, ICT Equipment, Furniture & Fittings, Vehicles)
    - Department      (only creates the ones it needs, reuses existing rows otherwise)
    - Supplier         (3 vendors used as the purchase source for assets)
    - Asset            (a spread of assets across categories/departments/status/condition)
    - AssetMaintenance (a couple of maintenance records per a subset of assets)
    - AssetTransfer    (a department-to-department transfer example)
    - AssetDisposal    (one disposed asset, to exercise that flow)
"""

import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Department, Supplier, User
from assets.models import (
    Asset,
    AssetCategory,
    AssetCondition,
    AssetDisposal,
    AssetMaintenance,
    AssetStatus,
    AssetTransfer,
    DisposalMethod,
    MaintenanceStatus,
    MaintenanceType,
)


class Command(BaseCommand):
    help = "Seed asset management demo data (categories, departments, suppliers, assets)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing asset records (categories, assets, maintenance, transfers, disposals) before seeding.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.flush_assets()

        with transaction.atomic():
            categories = self.seed_categories()
            departments = self.seed_departments()
            suppliers = self.seed_suppliers()
            staff = self.get_staff()
            assets = self.seed_assets(categories, departments, suppliers, staff)
            self.seed_maintenance(assets, suppliers, staff)
            self.seed_transfers(assets, departments, staff)
            self.seed_disposal(assets, staff)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(categories)} categories, {len(departments)} departments, "
            f"{len(suppliers)} suppliers, {len(assets)} assets."
        ))

    # ------------------------------------------------------------------
    def flush_assets(self):
        self.stdout.write("Flushing existing asset data...")
        AssetDisposal.objects.all().delete()
        AssetTransfer.objects.all().delete()
        AssetMaintenance.objects.all().delete()
        Asset.all_objects.all().delete()
        AssetCategory.all_objects.all().delete()

    # ------------------------------------------------------------------
    def seed_categories(self):
        data = [
            ("Medical Equipment", "Clinical and diagnostic equipment used in patient care.", 7),
            ("ICT Equipment", "Computers, networking gear, and other IT hardware.", 4),
            ("Furniture & Fittings", "Office and ward furniture, fixtures.", 10),
            ("Vehicles", "Ambulances and hospital-owned vehicles.", 8),
        ]
        categories = []
        for name, description, life_years in data:
            category, _ = AssetCategory.objects.get_or_create(
                name=name,
                defaults={
                    "description": description,
                    "default_useful_life_years": life_years,
                },
            )
            categories.append(category)
        return categories

    # ------------------------------------------------------------------
    def seed_departments(self):
        """
        Reuses whatever Departments already exist in the DB (e.g. Consultation
        departments seeded elsewhere) and only creates the two support
        departments assets specifically need: IT and Finance.
        """
        wanted = [
            ("IT", 0),
            ("Finance", 0),
        ]
        departments = list(Department.objects.filter(is_deleted=False))
        existing_names = {d.name for d in departments}

        for name, fee in wanted:
            if name in existing_names:
                continue
            dept, _ = Department.objects.get_or_create(
                name=name,
                defaults={
                    "consultation_fee": fee,
                    "description": f"{name} support department",
                },
            )
            departments.append(dept)

        return departments

    # ------------------------------------------------------------------
    def seed_suppliers(self):
        data = [
            ("MedTech Solutions Kenya Ltd", "0722334455", "sales@medtechke.co.ke", "Enterprise Road, Industrial Area, Nairobi"),
            ("Copycat Office Supplies", "0733112233", "orders@copycat.co.ke", "Moi Avenue, Nairobi"),
            ("Autoxpress Kenya", "0700998877", "fleet@autoxpress.co.ke", "Mombasa Road, Nairobi"),
        ]
        suppliers = []
        for name, phone, email, address in data:
            supplier, _ = Supplier.objects.get_or_create(
                name=name,
                defaults={"phone": phone, "email": email, "address": address},
            )
            suppliers.append(supplier)
        return suppliers

    # ------------------------------------------------------------------
    def get_staff(self):
        """
        Grabs an existing admin/staff user to attribute records to, falling
        back to None (the FKs are all nullable) if none exists yet.
        """
        return User.objects.filter(is_active_staff=True).first()

    # ------------------------------------------------------------------
    def seed_assets(self, categories, departments, suppliers, staff):
        by_name = {c.name: c for c in categories}
        dept_by_name = {d.name: d for d in departments}
        it_dept = dept_by_name.get("IT") or (departments[0] if departments else None)
        finance_dept = dept_by_name.get("Finance") or (departments[0] if departments else None)

        med_supplier, office_supplier, auto_supplier = suppliers

        asset_data = [
            # (name, category, department, supplier, cost, purchase_days_ago, condition, status, serial, manufacturer, model)
            ("Digital X-Ray Machine", "Medical Equipment", None, med_supplier, 2_800_000, 900, AssetCondition.GOOD, AssetStatus.IN_USE, "XR-2021-014", "Siemens", "Ysio Max"),
            ("Patient Monitor - ICU Bay 1", "Medical Equipment", None, med_supplier, 320_000, 500, AssetCondition.EXCELLENT, AssetStatus.IN_USE, "PM-2023-101", "Mindray", "uMEC12"),
            ("Ultrasound Scanner", "Medical Equipment", None, med_supplier, 1_450_000, 1200, AssetCondition.FAIR, AssetStatus.UNDER_MAINTENANCE, "US-2019-007", "GE Healthcare", "Voluson E8"),
            ("Autoclave Sterilizer", "Medical Equipment", None, med_supplier, 180_000, 700, AssetCondition.GOOD, AssetStatus.IN_USE, "AC-2022-033", "Tuttnauer", "3870EA"),
            ("Dell OptiPlex Desktop - Reception", "ICT Equipment", None, office_supplier, 65_000, 400, AssetCondition.GOOD, AssetStatus.IN_USE, "PC-2023-055", "Dell", "OptiPlex 7010"),
            ("HP LaserJet Printer - Records Office", "ICT Equipment", None, office_supplier, 32_000, 250, AssetCondition.GOOD, AssetStatus.IN_USE, "PR-2024-012", "HP", "LaserJet Pro M404"),
            ("Cisco Network Switch - Server Room", "ICT Equipment", it_dept, office_supplier, 45_000, 600, AssetCondition.EXCELLENT, AssetStatus.IN_USE, "SW-2022-004", "Cisco", "Catalyst 2960"),
            ("UPS Backup - Server Room", "ICT Equipment", it_dept, office_supplier, 85_000, 600, AssetCondition.GOOD, AssetStatus.IN_USE, "UPS-2022-002", "APC", "Smart-UPS 3000VA"),
            ("Laptop - Finance Manager", "ICT Equipment", finance_dept, office_supplier, 95_000, 200, AssetCondition.EXCELLENT, AssetStatus.IN_USE, "LT-2025-009", "Lenovo", "ThinkPad T14"),
            ("Waiting Area Bench Set", "Furniture & Fittings", None, office_supplier, 28_000, 1500, AssetCondition.FAIR, AssetStatus.IN_USE, "FB-2018-021", "Homecraft", "3-Seater Steel Bench"),
            ("Reception Desk", "Furniture & Fittings", None, office_supplier, 40_000, 1500, AssetCondition.GOOD, AssetStatus.IN_USE, "FD-2018-005", "Homecraft", "Custom Reception Counter"),
            ("Filing Cabinet - Records", "Furniture & Fittings", None, office_supplier, 15_000, 1600, AssetCondition.POOR, AssetStatus.IN_STORE, "FC-2017-013", "Filex", "4-Drawer Steel Cabinet"),
            ("Ambulance - Toyota Land Cruiser", "Vehicles", None, auto_supplier, 6_500_000, 800, AssetCondition.GOOD, AssetStatus.IN_USE, "KDG-221A", "Toyota", "Land Cruiser HZJ79"),
            ("Staff Shuttle - Nissan Matatu", "Vehicles", None, auto_supplier, 1_800_000, 1100, AssetCondition.NON_FUNCTIONAL, AssetStatus.LOST, "KCM-455B", "Nissan", "Caravan"),
        ]

        assets = []
        for (name, cat_name, department, supplier, cost, days_ago, condition,
             status, serial, manufacturer, model) in asset_data:
            category = by_name[cat_name]
            asset, _ = Asset.objects.get_or_create(
                name=name,
                serial_number=serial,
                defaults={
                    "category": category,
                    "description": f"{name} used at South B Hospital.",
                    "manufacturer": manufacturer,
                    "model_number": model,
                    "supplier": supplier,
                    "purchase_date": date.today() - timedelta(days=days_ago),
                    "purchase_cost": cost,
                    "salvage_value": round(cost * 0.05, 2),
                    "warranty_expiry": date.today() + timedelta(days=random.randint(-200, 400)),
                    "department": department,
                    "location_notes": "" if department else "General Store",
                    "status": status,
                    "condition": condition,
                    "registered_by": staff,
                },
            )
            assets.append(asset)
        return assets

    # ------------------------------------------------------------------
    def seed_maintenance(self, assets, suppliers, staff):
        med_supplier = suppliers[0]
        under_maintenance = next(
            (a for a in assets if a.status == AssetStatus.UNDER_MAINTENANCE), None
        )
        records = [
            (assets[0], MaintenanceType.PREVENTIVE, MaintenanceStatus.COMPLETED, 180, 150, med_supplier.name, 25_000, "Annual calibration and inspection."),
            (assets[3], MaintenanceType.CALIBRATION, MaintenanceStatus.COMPLETED, 90, 88, med_supplier.name, 8_000, "Routine autoclave calibration."),
        ]
        if under_maintenance:
            records.append(
                (under_maintenance, MaintenanceType.CORRECTIVE, MaintenanceStatus.IN_PROGRESS, 5, None, med_supplier.name, 60_000, "Probe replacement after image artifact reported by radiology.")
            )

        for asset, m_type, status, sched_days_ago, completed_days_ago, vendor, cost, description in records:
            AssetMaintenance.objects.get_or_create(
                asset=asset,
                maintenance_type=m_type,
                description=description,
                defaults={
                    "status": status,
                    "scheduled_date": date.today() - timedelta(days=sched_days_ago),
                    "completed_date": (
                        date.today() - timedelta(days=completed_days_ago)
                        if completed_days_ago is not None else None
                    ),
                    "vendor": vendor,
                    "cost": cost,
                    "logged_by": staff,
                },
            )

    # ------------------------------------------------------------------
    def seed_transfers(self, assets, departments, staff):
        dept_by_name = {d.name: d for d in departments}
        it_dept = dept_by_name.get("IT")
        finance_dept = dept_by_name.get("Finance")
        laptop = next((a for a in assets if a.name == "Laptop - Finance Manager"), None)

        if laptop and it_dept and finance_dept:
            AssetTransfer.objects.get_or_create(
                asset=laptop,
                from_department=it_dept,
                to_department=finance_dept,
                defaults={
                    "reason": "Reassigned to Finance Manager after initial IT setup and imaging.",
                    "transferred_by": staff,
                },
            )

    # ------------------------------------------------------------------
    def seed_disposal(self, assets, staff):
        shuttle = next((a for a in assets if a.name == "Staff Shuttle - Nissan Matatu"), None)
        if not shuttle:
            return
        AssetDisposal.objects.get_or_create(
            asset=shuttle,
            defaults={
                "disposal_date": date.today() - timedelta(days=30),
                "disposal_method": DisposalMethod.STOLEN,
                "disposal_value": 0,
                "reason": "Vehicle reported stolen; police OB number on file with security office.",
                "approved_by": staff,
                "recorded_by": staff,
            },
        )
        shuttle.status = AssetStatus.DISPOSED
        shuttle.save(update_fields=["status"])
import os
import sys
import uuid
import random
from datetime import datetime, timedelta

# Set up Django environment manually
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")  # <-- Change 'your_project_name' to your settings module folder
import django
django.setup()

from django.utils import timezone
from api.models import Payment, OTCSale


def redistribute_july_22_payments(days_back=30):
    target_year = timezone.now().year
    july_22_start = timezone.make_aware(datetime(target_year, 7, 22, 0, 0, 0))
    july_22_end = timezone.make_aware(datetime(target_year, 7, 22, 23, 59, 59))

    now = timezone.now()
    start_window = now - timedelta(days=days_back)
    total_seconds_range = int((now - start_window).total_seconds())

    # 1. Process Payment Model
    payments_qs = Payment.objects.filter(paid_at__range=(july_22_start, july_22_end))
    total_payments = payments_qs.count()
    print(f"Found {total_payments:,} Payment records on July 22.")

    if total_payments > 0:
        batch = []
        count = 0
        for payment in payments_qs.iterator(chunk_size=5000):
            random_offset = timedelta(seconds=random.randint(0, total_seconds_range))
            new_timestamp = start_window + random_offset
            payment.paid_at = new_timestamp
            payment.created_at = new_timestamp
            batch.append(payment)
            count += 1

            if len(batch) >= 5000:
                Payment.objects.bulk_update(batch, fields=['paid_at', 'created_at'], batch_size=5000)
                print(f"Updated {count:,} / {total_payments:,} Payment records...")
                batch = []

        if batch:
            Payment.objects.bulk_update(batch, fields=['paid_at', 'created_at'], batch_size=5000)
            print(f"Finished updating all {total_payments:,} Payment records.")

    # 2. Process OTCSale Model
    otc_qs = OTCSale.objects.filter(sold_at__range=(july_22_start, july_22_end))
    total_otc = otc_qs.count()
    print(f"\nFound {total_otc:,} OTCSale records on July 22.")

    if total_otc > 0:
        batch = []
        count = 0
        for sale in otc_qs.iterator(chunk_size=5000):
            random_offset = timedelta(seconds=random.randint(0, total_seconds_range))
            new_timestamp = start_window + random_offset
            sale.sold_at = new_timestamp
            sale.created_at = new_timestamp
            batch.append(sale)
            count += 1

            if len(batch) >= 5000:
                OTCSale.objects.bulk_update(batch, fields=['sold_at', 'created_at'], batch_size=5000)
                print(f"Updated {count:,} / {total_otc:,} OTCSale records...")
                batch = []

        if batch:
            OTCSale.objects.bulk_update(batch, fields=['sold_at', 'created_at'], batch_size=5000)
            print(f"Finished updating all {total_otc:,} OTCSale records.")


if __name__ == "__main__":
    redistribute_july_22_payments()
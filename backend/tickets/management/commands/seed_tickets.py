# tickets/management/commands/seed_tickets.py
import random
import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import User, Role
from tickets.models import (
    Ticket, TicketCategory, TicketPriority, TicketStatus, TicketComment,
)


LOCATIONS = [
    "Reception Desk 1", "Reception Desk 2", "OPD Waiting Area", "Ward 1", "Ward 2",
    "Ward 3", "ICU", "NICU", "Maternity Ward", "Theatre 1", "Theatre 2",
    "Emergency Department", "Laboratory", "Radiology", "Pharmacy", "Billing Office",
    "Records Office", "HR Office", "Accounts Office", "Dialysis Unit",
    "Nurse Station - 2nd Floor", "Doctor's Office - Consultation 4", "Server Room",
    "Mortuary", "Ambulance Bay",
]

# (subject, description, category)
TICKET_TEMPLATES = [
    ("Printer not printing receipts", "The receipt printer at this station has stopped printing. Paper feeds but nothing comes out.", TicketCategory.HARDWARE),
    ("Scanner not detected", "Document scanner shows as offline in the system. Tried restarting, no change.", TicketCategory.HARDWARE),
    ("PC won't boot", "Workstation shows a black screen on power-up. Fans spin but no display output.", TicketCategory.HARDWARE),
    ("Monitor flickering", "Display flickers intermittently, especially when the AC comes on.", TicketCategory.HARDWARE),
    ("Keyboard keys not responding", "Several keys on the keyboard have stopped registering input.", TicketCategory.HARDWARE),
    ("WiFi keeps disconnecting", "Wireless connection drops every few minutes, requiring reconnection.", TicketCategory.NETWORK),
    ("No internet access", "This workstation has no internet connectivity, though the network cable is plugged in.", TicketCategory.NETWORK),
    ("Slow network speeds", "File transfers and page loads are extremely slow across the department.", TicketCategory.NETWORK),
    ("VPN not connecting", "Unable to establish VPN connection for remote access to the system.", TicketCategory.NETWORK),
    ("HMIS page not loading", "The patient records page hangs indefinitely and never loads.", TicketCategory.SOFTWARE),
    ("System throwing error on save", "Getting a server error whenever trying to save a new patient record.", TicketCategory.SOFTWARE),
    ("Unable to print invoice from system", "The invoice print button does nothing when clicked.", TicketCategory.SOFTWARE),
    ("Dashboard showing wrong figures", "The daily revenue figures on the dashboard don't match the till report.", TicketCategory.SOFTWARE),
    ("Software update needed", "Requesting the billing module be updated to the latest version reported by IT.", TicketCategory.SOFTWARE),
    ("CCTV camera offline", "Camera covering the main corridor has gone offline on the monitoring wall.", TicketCategory.CCTV),
    ("CCTV footage playback issue", "Unable to retrieve recorded footage for the requested date range.", TicketCategory.CCTV),
    ("Intercom not working", "Unable to reach the nurse station via the wall intercom unit.", TicketCategory.TELEPHONY),
    ("Extension line dead", "Desk phone shows no dial tone.", TicketCategory.TELEPHONY),
    ("Cannot log in to system", "Getting 'invalid credentials' error despite entering the correct password.", TicketCategory.ACCOUNT_ACCESS),
    ("Account locked out", "Account has been locked after multiple failed login attempts and needs reset.", TicketCategory.ACCOUNT_ACCESS),
    ("Need access to new module", "Requesting access permissions for the newly assigned department module.", TicketCategory.ACCOUNT_ACCESS),
    ("Password reset request", "Forgot password and needs a reset link sent or manually issued.", TicketCategory.ACCOUNT_ACCESS),
    ("UPS beeping continuously", "The backup power unit at this station is beeping and may need battery replacement.", TicketCategory.OTHER),
    ("Request for new workstation setup", "New staff member needs a workstation configured and connected to the network.", TicketCategory.OTHER),
    ("General IT consultation", "Would like guidance on best practices for handling patient data exports.", TicketCategory.OTHER),
]

COMMENT_TEMPLATES_STAFF = [
    "Looking into this now — will update shortly.",
    "Checked the hardware, ordering a replacement part.",
    "This appears to be a network configuration issue on our end, working on a fix.",
    "Applied a temporary fix, monitoring to confirm it holds.",
    "Escalating this to the vendor for support.",
    "Confirmed the issue and scheduled a site visit.",
]

COMMENT_TEMPLATES_RAISER = [
    "Thank you, please let me know once resolved.",
    "This is affecting our daily operations, any update?",
    "Still experiencing the same issue after the fix.",
    "Confirmed working now, thank you!",
    "Can someone come by in person to check this?",
]

RESOLUTION_NOTES = [
    "Replaced faulty cable and confirmed connectivity restored.",
    "Reinstalled printer drivers and ran a test print — resolved.",
    "Reset user password and verified successful login.",
    "Restarted network switch serving this segment — issue cleared.",
    "Updated software to latest patch, error no longer reproduces.",
    "Swapped out defective hardware unit with a spare from stock.",
    "Reconfigured camera network settings — feed restored.",
    "Cleared account lockout and reset failed login counter.",
]


class Command(BaseCommand):
    help = "Seeds the IT Support Tickets module with realistic tickets and comment threads. Uses existing Users from the api app."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing ticket records before seeding.",
        )
        parser.add_argument(
            "--count",
            type=int,
            default=60,
            help="Number of tickets to create (default: 60).",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write(self.style.WARNING("Flushing existing ticket data..."))
            TicketComment.objects.all().delete()
            Ticket.objects.all().delete()

        raisers = list(User.objects.filter(is_active_staff=True))
        if not raisers:
            self.stdout.write(self.style.ERROR(
                "No active staff users found. Seed the api/users module first. Aborting."
            ))
            return

        # No dedicated IT_SUPPORT role exists on the Role model as given, so
        # assignees fall back to Super Admins (or, if none, any active staff)
        # — swap this out once a real IT/helpdesk role is added to Role.
        assignees = list(User.objects.filter(role=Role.SUPER_ADMIN, is_active_staff=True))
        if not assignees:
            self.stdout.write(self.style.WARNING(
                "No SUPER_ADMIN users found to act as IT assignees — falling back to any active staff. "
                "Consider adding a dedicated IT_SUPPORT role to Role for more realistic seeding."
            ))
            assignees = raisers

        with transaction.atomic():
            self._seed_tickets(raisers, assignees, options["count"])

        self.stdout.write(self.style.SUCCESS("Ticket module seeded successfully."))

    def _seed_tickets(self, raisers, assignees, count):
        self.stdout.write(f"Seeding {count} tickets...")
        created = 0
        comment_count = 0

        for _ in range(count):
            subject, description, category = random.choice(TICKET_TEMPLATES)
            priority = random.choices(
                [
                    TicketPriority.LOW,
                    TicketPriority.MEDIUM,
                    TicketPriority.HIGH,
                    TicketPriority.CRITICAL,
                ],
                weights=[25, 40, 25, 10],
            )[0]

            status = random.choices(
                [
                    TicketStatus.OPEN,
                    TicketStatus.ASSIGNED,
                    TicketStatus.IN_PROGRESS,
                    TicketStatus.RESOLVED,
                    TicketStatus.CLOSED,
                    TicketStatus.REOPENED,
                ],
                weights=[15, 10, 15, 20, 35, 5],
            )[0]

            raised_days_ago = random.randint(0, 90)
            raised_at = timezone.now() - timedelta(days=raised_days_ago, hours=random.randint(0, 23))

            raiser = random.choice(raisers)

            ticket = Ticket.objects.create(
                raised_by=raiser,
                category=category,
                priority=priority,
                location=random.choice(LOCATIONS),
                subject=subject,
                description=description,
                status=status,
            )
            # raised_at is auto_now_add — backdate via update() then refresh
            Ticket.objects.filter(pk=ticket.pk).update(raised_at=raised_at)
            ticket.refresh_from_db()

            # Progress the ticket forward through its lifecycle based on status
            if status in (
                TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS,
                TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.REOPENED,
            ):
                ticket.assigned_to = random.choice(assignees)
                ticket.assigned_at = raised_at + timedelta(hours=random.randint(1, 12))

            if status in (TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.REOPENED):
                resolved_at = ticket.assigned_at + timedelta(hours=random.randint(2, 72))
                ticket.resolved_at = min(resolved_at, timezone.now())
                ticket.resolution_notes = random.choice(RESOLUTION_NOTES)

            if status == TicketStatus.CLOSED:
                closed_at = ticket.resolved_at + timedelta(hours=random.randint(1, 48))
                ticket.closed_at = min(closed_at, timezone.now())
                ticket.satisfaction_rating = random.choices(
                    [1, 2, 3, 4, 5], weights=[2, 3, 10, 35, 50]
                )[0]

            if status == TicketStatus.REOPENED:
                # Resolved once, then reopened — clear closed/resolved trail
                # to reflect it's back in the queue, keep resolution_notes as history.
                ticket.resolved_at = None

            ticket.save()
            created += 1

            # Comment thread — more comments on tickets further along their lifecycle
            num_comments = {
                TicketStatus.OPEN: random.randint(0, 1),
                TicketStatus.ASSIGNED: random.randint(1, 2),
                TicketStatus.IN_PROGRESS: random.randint(2, 4),
                TicketStatus.RESOLVED: random.randint(2, 4),
                TicketStatus.CLOSED: random.randint(2, 5),
                TicketStatus.REOPENED: random.randint(3, 5),
            }[status]

            comment_time = raised_at
            for i in range(num_comments):
                is_staff_turn = i % 2 == 1  # raiser opens, staff/raiser alternate
                author = (
                    (ticket.assigned_to or random.choice(assignees))
                    if is_staff_turn else raiser
                )
                text = random.choice(
                    COMMENT_TEMPLATES_STAFF if is_staff_turn else COMMENT_TEMPLATES_RAISER
                )
                comment_time = comment_time + timedelta(hours=random.randint(1, 10))
                if comment_time > timezone.now():
                    comment_time = timezone.now()

                comment = TicketComment.objects.create(
                    ticket=ticket,
                    author=author,
                    text=text,
                )
                TicketComment.objects.filter(pk=comment.pk).update(created_at=comment_time)
                comment_count += 1

        self.stdout.write(self.style.SUCCESS(f"  Created {created} tickets with {comment_count} comments."))
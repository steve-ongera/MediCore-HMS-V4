from datetime import date, timedelta

from .models import FollowUpTask, FollowUpStatus


def refresh_task_statuses():
    """
    Scheduled job (same pattern as bed charges / leakage scan) — walks
    every open task and updates its status based on today's date. This is
    what makes PENDING -> DUE_TODAY -> OVERDUE -> ESCALATED transitions
    happen automatically without anyone manually checking.
    """
    today = date.today()
    updated = {"due_today": 0, "overdue": 0, "escalated": 0}

    open_tasks = FollowUpTask.objects.filter(status__in=[FollowUpStatus.PENDING, FollowUpStatus.DUE_TODAY, FollowUpStatus.OVERDUE])

    for task in open_tasks:
        if task.due_date == today and task.status != FollowUpStatus.DUE_TODAY:
            task.status = FollowUpStatus.DUE_TODAY
            task.save(update_fields=["status"])
            updated["due_today"] += 1

        elif task.due_date < today:
            days_overdue = (today - task.due_date).days
            if days_overdue >= 7 and task.status != FollowUpStatus.ESCALATED:
                escalate_missed_task(task)
                updated["escalated"] += 1
            elif task.status != FollowUpStatus.OVERDUE:
                task.status = FollowUpStatus.OVERDUE
                task.save(update_fields=["status"])
                updated["overdue"] += 1

    return updated


def escalate_missed_task(task):
    """A follow-up missed for 7+ days escalates — notifies the department head/responsible doctor and the care plan owner, matching the notification pattern used everywhere else."""
    from notifications.services import notify
    from notifications.models import NotificationType, NotificationCategory, NotificationPriority
    from django.utils import timezone

    task.status = FollowUpStatus.ESCALATED
    task.escalated_at = timezone.now()

    escalate_to = task.care_plan.responsible_doctor or task.assigned_to
    task.escalated_to = escalate_to
    task.save(update_fields=["status", "escalated_at", "escalated_to"])

    if escalate_to:
        notify(
            escalate_to, NotificationType.CRITICAL_INCIDENT,
            f"Missed follow-up escalated: {task.care_plan.patient.full_name}",
            f"'{task.description}' was due {task.due_date} and remains uncompleted. Patient may need outreach.",
            link=f"/care-coordination/care-plans/{task.care_plan_id}",
            priority=NotificationPriority.HIGH, category=NotificationCategory.CLINICAL,
        )


def send_pending_reminders():
    """Sends a reminder for tasks due in the next 2 days that haven't been reminded yet — in production this triggers SMS/email to the patient; here it notifies the assigned clinician to prompt outreach, matching the notification infrastructure already built."""
    from notifications.services import notify
    from notifications.models import NotificationType, NotificationCategory, NotificationPriority
    from django.utils import timezone

    upcoming_cutoff = date.today() + timedelta(days=2)
    tasks = FollowUpTask.objects.filter(
        status=FollowUpStatus.PENDING, due_date__lte=upcoming_cutoff, due_date__gte=date.today(),
        reminder_sent=False,
    )

    count = 0
    for task in tasks:
        recipient = task.assigned_to or task.care_plan.responsible_doctor
        if recipient:
            notify(
                recipient, NotificationType.FOLLOWUP_DUE,
                f"Follow-up due soon: {task.care_plan.patient.full_name}",
                f"'{task.description}' due {task.due_date}. Consider reaching out to confirm the patient will attend.",
                link=f"/care-coordination/care-plans/{task.care_plan_id}",
                category=NotificationCategory.CLINICAL,
            )
        task.reminder_sent = True
        task.reminder_sent_at = timezone.now()
        task.save(update_fields=["reminder_sent", "reminder_sent_at"])
        count += 1

    return count
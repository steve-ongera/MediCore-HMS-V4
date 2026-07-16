from django.utils import timezone

from api.models import Invoice, Payment, PaymentMethod

from .gateways.factory import get_gateway
from .models import EligibilityCheck, InsuranceClaim, ClaimItem, ClaimStatus


def run_eligibility_check(policy, user=None):
    gateway = get_gateway(policy.insurer)
    result = gateway.verify_eligibility(policy)

    return EligibilityCheck.objects.create(
        policy=policy,
        is_eligible=result["eligible"],
        scheme_returned=result.get("scheme", ""),
        member_status=result.get("member_status", ""),
        raw_response=result.get("raw", {}),
        checked_by=user,
    )


def create_claim(patient, policy, invoice_ids, user, notes=""):
    invoices = list(Invoice.objects.filter(id__in=invoice_ids, patient=patient))
    if not invoices:
        raise ValueError("No matching invoices found for this patient.")

    visit = invoices[0].visit
    total_claimed = sum((inv.balance for inv in invoices), start=0)

    claim = InsuranceClaim.objects.create(
        patient=patient, policy=policy, visit=visit,
        total_claimed=total_claimed, notes=notes, created_by=user,
    )
    for inv in invoices:
        ClaimItem.objects.create(claim=claim, invoice=inv, amount_claimed=inv.balance)

    return claim


def submit_claim(claim, user=None):
    gateway = get_gateway(claim.policy.insurer)
    result = gateway.submit_claim(claim)

    claim.status = ClaimStatus.SUBMITTED
    claim.submitted_at = timezone.now()
    if result.get("gateway_reference"):
        claim.gateway_reference = result["gateway_reference"]
    claim.save(update_fields=["status", "submitted_at", "gateway_reference"])
    return result


def apply_manual_response(claim, status, approved_amount=None, rejection_reason="", user=None):
    """
    Staff-driven status update — used both for private insurers (manual
    reconciliation) and to record SHA's response once it's checked or
    arrives via webhook.
    """
    claim.status = status
    claim.responded_at = timezone.now()
    if approved_amount is not None:
        claim.total_approved = approved_amount
    if rejection_reason:
        claim.rejection_reason = rejection_reason
    claim.save(update_fields=["status", "responded_at", "total_approved", "rejection_reason"])
    return claim


def settle_claim(claim, user):
    """
    Creates a Payment (method=INSURANCE, reference=claim number) against
    each claim item's invoice, up to that item's approved amount and never
    exceeding the invoice's current outstanding balance. Assumes the same
    signal/mechanism that updates Invoice.amount_paid on a normal cash/mpesa
    Payment also fires here, since we create Payment via the same model —
    verify this holds in your codebase if balances don't update as expected.
    """
    if claim.status not in (ClaimStatus.APPROVED, ClaimStatus.PARTIALLY_APPROVED):
        raise ValueError("Only approved or partially approved claims can be settled.")

    created_payments = []
    for item in claim.items.select_related("invoice"):
        invoice = item.invoice
        amount = min(item.amount_approved, invoice.balance)
        if amount <= 0:
            continue
        payment = Payment.objects.create(
            invoice=invoice, amount=amount, method=PaymentMethod.INSURANCE,
            reference_number=claim.claim_number, cashier=user,
        )
        created_payments.append(payment)

    claim.status = ClaimStatus.SETTLED
    claim.settled_at = timezone.now()
    claim.save(update_fields=["status", "settled_at"])
    return created_payments
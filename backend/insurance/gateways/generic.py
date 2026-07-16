from datetime import date

from .base import InsuranceGateway


class GenericInsurerGateway(InsuranceGateway):
    """
    For private insurers (AAR, Britam, CIC, Jubilee, etc.) that don't expose
    a public real-time API to individual facilities — these are typically
    reached via a TPA portal, email, or manual/EDI batch claim submission.

    Eligibility is checked locally against the stored policy's active/expiry
    dates. Claim "submission" just marks the claim SUBMITTED for manual
    tracking — staff export/print the claim pack, upload it to the
    insurer/TPA portal or email it, then update the claim's status by hand
    once a response arrives.
    """

    def verify_eligibility(self, policy):
        eligible = policy.is_currently_valid
        return {
            "eligible": eligible,
            "scheme": policy.insurer.name,
            "member_status": "ACTIVE" if eligible else "INACTIVE / EXPIRED",
            "raw": {"local_check": True, "valid_to": str(policy.valid_to) if policy.valid_to else None},
        }

    def submit_claim(self, claim):
        return {"submitted": True, "gateway_reference": "", "manual": True}

    def check_claim_status(self, claim):
        return {"status": claim.status, "manual": True}
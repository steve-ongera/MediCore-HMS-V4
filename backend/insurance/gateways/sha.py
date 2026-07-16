import requests
from django.conf import settings

from .base import InsuranceGateway


class SHAGateway(InsuranceGateway):
    """
    Real integration point for Kenya's Social Health Authority (SHA/SHIF).

    In sandbox/dev (SHA_ENVIRONMENT != "production"), every call is mocked
    and returns instant success — this is the "bypass" you asked for so
    development isn't blocked on SHA credentials.

    In production, this calls SHA's actual eClaims/eligibility endpoints.
    NOTE: the exact endpoint paths, payload shape, and auth scheme below are
    placeholders — SHA does not publish this spec openly. You'll receive
    the real API documentation and credentials (API key, facility code)
    during SHA facility onboarding; update SHA_API_BASE_URL / the request
    bodies below to match what SHA actually issues you.
    """

    def __init__(self):
        self.sandbox = settings.SHA_ENVIRONMENT != "production"
        self.base_url = settings.SHA_API_BASE_URL
        self.api_key = settings.SHA_API_KEY
        self.facility_code = settings.SHA_FACILITY_CODE

    def _headers(self):
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    def verify_eligibility(self, policy):
        if self.sandbox:
            return {
                "eligible": True,
                "scheme": "SHIF (SANDBOX)",
                "member_status": "ACTIVE",
                "raw": {"mock": True, "member_number": policy.member_number},
            }

        # PRODUCTION — replace path/payload with SHA's real eligibility spec.
        resp = requests.post(
            f"{self.base_url}/eligibility/verify",
            headers=self._headers(),
            json={"member_number": policy.member_number, "facility_code": self.facility_code},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "eligible": bool(data.get("eligible")),
            "scheme": data.get("scheme", ""),
            "member_status": data.get("status", ""),
            "raw": data,
        }

    def submit_claim(self, claim):
        if self.sandbox:
            return {
                "submitted": True,
                "gateway_reference": f"SHA-SANDBOX-{claim.claim_number}",
                "manual": False,
            }

        # PRODUCTION — replace path/payload with SHA's real eClaims submission spec.
        payload = {
            "facility_code": self.facility_code,
            "member_number": claim.policy.member_number,
            "claim_reference": claim.claim_number,
            "total_amount": str(claim.total_claimed),
            "items": [
                {
                    "benefit_code": item.benefit_code,
                    "amount": str(item.amount_claimed),
                    "description": item.invoice.description,
                }
                for item in claim.items.all()
            ],
        }
        resp = requests.post(f"{self.base_url}/claims/submit", headers=self._headers(), json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return {"submitted": True, "gateway_reference": data.get("claim_id", ""), "manual": False, "raw": data}

    def check_claim_status(self, claim):
        if self.sandbox:
            return {"status": "APPROVED", "approved_amount": str(claim.total_claimed), "manual": False}

        # PRODUCTION — replace with SHA's real claim status endpoint.
        resp = requests.get(
            f"{self.base_url}/claims/{claim.gateway_reference}/status",
            headers=self._headers(), timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
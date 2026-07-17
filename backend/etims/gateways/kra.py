import requests
from django.conf import settings

from .base import ETIMSGateway


class KRAETIMSGateway(ETIMSGateway):
    """
    Real OSCU integration point. In sandbox/dev (ETIMS_ENVIRONMENT !=
    "production"), every call is mocked with an instant success response
    carrying a fake KRA invoice number and QR code URL — this is the bypass
    so development isn't blocked on KRA onboarding.

    In production, this calls KRA's actual eTIMS OSCU endpoints. NOTE: the
    endpoint paths, payload shape, and auth scheme below are placeholders —
    KRA does not publish this spec publicly. You'll receive the real API
    documentation, KRA PIN, branch ID, and Control Unit serial during eTIMS
    OSCU onboarding; update ETIMS_API_BASE_URL and the request bodies below
    to match what KRA actually issues you.
    """

    def __init__(self):
        self.sandbox = settings.ETIMS_ENVIRONMENT != "production"
        self.base_url = settings.ETIMS_API_BASE_URL
        self.api_key = settings.ETIMS_API_KEY
        self.kra_pin = settings.ETIMS_KRA_PIN
        self.branch_id = settings.ETIMS_BRANCH_ID
        self.cu_serial = settings.ETIMS_CU_SERIAL

    def _headers(self):
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    def fiscalize(self, receipt):
        if self.sandbox:
            fake_number = f"KRA-SANDBOX-{receipt.id.hex[:10].upper()}"
            return {
                "success": True,
                "kra_invoice_number": fake_number,
                "cu_invoice_number": fake_number,
                "qr_code_url": f"https://etims-sandbox.kra.go.ke/qr/{fake_number}",
                "cu_signature": "SANDBOX-SIGNATURE",
                "raw": {"mock": True},
            }

        # PRODUCTION — replace path/payload with KRA's real OSCU
        # "sales transmission" spec once you have onboarding docs.
        payload = {
            "kra_pin": self.kra_pin,
            "branch_id": self.branch_id,
            "cu_serial": self.cu_serial,
            "invoice_reference": str(receipt.id),
            "total_amount": str(receipt.total_amount),
            "items": [
                {
                    "description": item.description,
                    "quantity": str(item.quantity),
                    "unit_price": str(item.unit_price),
                    "vat_category": item.vat_category,
                    "line_total": str(item.line_total),
                }
                for item in receipt.items.all()
            ],
        }
        resp = requests.post(f"{self.base_url}/oscu/sales", headers=self._headers(), json=payload, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        return {
            "success": True,
            "kra_invoice_number": data.get("invoice_number", ""),
            "cu_invoice_number": data.get("cu_invoice_number", ""),
            "qr_code_url": data.get("qr_code_url", ""),
            "cu_signature": data.get("signature", ""),
            "raw": data,
        }

    def check_status(self, receipt):
        if self.sandbox:
            return {"status": "FISCALIZED", "raw": {"mock": True}}

        # PRODUCTION — replace with KRA's real status-check endpoint.
        resp = requests.get(
            f"{self.base_url}/oscu/sales/{receipt.kra_invoice_number}",
            headers=self._headers(), timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    def void(self, receipt):
        if self.sandbox:
            return {"success": True, "raw": {"mock": True}}

        # PRODUCTION — replace with KRA's real credit-note/void spec.
        resp = requests.post(
            f"{self.base_url}/oscu/sales/{receipt.kra_invoice_number}/void",
            headers=self._headers(), timeout=20,
        )
        resp.raise_for_status()
        return resp.json()
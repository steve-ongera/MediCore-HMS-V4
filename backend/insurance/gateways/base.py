class InsuranceGateway:
    """Contract every insurer gateway must implement."""

    def verify_eligibility(self, policy) -> dict:
        raise NotImplementedError

    def submit_claim(self, claim) -> dict:
        raise NotImplementedError

    def check_claim_status(self, claim) -> dict:
        raise NotImplementedError
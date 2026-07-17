class ETIMSGateway:
    def fiscalize(self, receipt) -> dict:
        raise NotImplementedError

    def check_status(self, receipt) -> dict:
        raise NotImplementedError

    def void(self, receipt) -> dict:
        raise NotImplementedError
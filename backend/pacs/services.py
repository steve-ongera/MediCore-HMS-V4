from django.conf import settings


def get_gateway():
    mode = getattr(settings, "PACS_MODE", "DEMO")
    if mode == "REAL":
        from .gateways.orthanc import OrthancPACSGateway
        return OrthancPACSGateway()
    from .gateways.mock import MockPACSGateway
    return MockPACSGateway()
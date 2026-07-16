from .sha import SHAGateway
from .generic import GenericInsurerGateway
from ..models import InsurerType


def get_gateway(insurer):
    if insurer.insurer_type == InsurerType.SHA:
        return SHAGateway()
    return GenericInsurerGateway()
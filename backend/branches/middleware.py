from .permissions import get_accessible_branch_ids


class BranchContextMiddleware:
    """
    Attaches request.accessible_branch_ids (None = unrestricted) and
    request.current_branch_id (the branch a GROUP_ADMIN is currently
    'viewing as', via an X-Branch-Context header the frontend sends when
    a group admin switches branches in the UI — defaults to their own
    branch for everyone else).
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            request.accessible_branch_ids = get_accessible_branch_ids(request.user)
            header_branch = request.headers.get("X-Branch-Context")
            if request.accessible_branch_ids is None:
                # GROUP_ADMIN — honor whichever branch they're currently viewing, default None (all branches)
                request.current_branch_id = header_branch or None
            else:
                request.current_branch_id = request.user.branch_id
        return self.get_response(request)
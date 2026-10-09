class ApiTrailingSlashMiddleware:
    """Serve /api/... with or without a trailing slash without redirecting.

    A redirect would drop POST bodies and loops with proxies that strip the slash,
    so the path is rewritten in place before URL resolution.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info
        if path.startswith("/api/") and not path.endswith("/") and "." not in path.rsplit("/", 1)[-1]:
            request.path_info = path + "/"
        return self.get_response(request)

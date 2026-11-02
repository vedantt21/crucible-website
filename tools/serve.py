"""Serve the static site locally with the same clean URLs used on Vercel."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
PAGES = {"what-we-do", "projects", "community", "team", "contact"}


class NoCache(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        route = urlsplit(path).path
        page = route.strip("/")
        if page in PAGES:
            route = f"/{page}.html"
        return super().translate_path(route)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    print("Preview: http://localhost:8000/")
    ThreadingHTTPServer(("", 8000), NoCache).serve_forever()

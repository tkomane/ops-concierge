#!/usr/bin/env python3
"""Local static server with optional security headers for demos."""

from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Baseline headers for a static, client-only mock (see SECURITY.md).
SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data:; "
        "font-src https://fonts.gstatic.com; "
        "connect-src 'self'; "
        "base-uri 'self'; "
        "form-action 'none'; "
        "frame-ancestors 'none'"
    ),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": (
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
        "magnetometer=(), microphone=(), payment=(), usb=()"
    ),
}


class SecureStaticHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        for name, value in SECURITY_HEADERS.items():
            self.send_header(name, value)
        super().end_headers()


def main():
    host, port = "127.0.0.1", 8765
    httpd = ThreadingHTTPServer((host, port), SecureStaticHandler)
    print(f"serving http://{host}:{port}/ (security headers on)")
    httpd.serve_forever()


if __name__ == "__main__":
    main()

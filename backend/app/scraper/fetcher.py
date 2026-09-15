"""SSRF-protected HTTP fetcher for CDN response sheets."""

import ipaddress
import logging
import os
import socket
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

_DEFAULT_ALLOWED = {"cdn3.digialm.com", "cdn.digialm.com", "digialm.com"}
_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))
_MAX_SIZE = int(os.getenv("MAX_RESPONSE_SIZE", str(10 * 1024 * 1024)))


def _allowed_domains() -> set[str]:
    env = os.getenv("ALLOWED_CDN_DOMAINS", "")
    if env:
        return {d.strip().lower() for d in env.split(",") if d.strip()}
    return _DEFAULT_ALLOWED


def _is_private_ip(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return True
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_reserved
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_unspecified
        or (isinstance(ip, ipaddress.IPv4Address) and (
            ip in ipaddress.ip_network("169.254.169.254/32")
        ))
    )


class FetchError(Exception):
    def __init__(self, message: str, code: str = "FETCH_ERROR"):
        super().__init__(message)
        self.code = code


def validate_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise FetchError("Only HTTP/HTTPS URLs are supported.", "INVALID_SCHEME")
    host = parsed.hostname
    if not host:
        raise FetchError("Invalid URL: no hostname.", "INVALID_URL")
    host_lower = host.lower()
    allowed = _allowed_domains()
    if not any(host_lower == d or host_lower.endswith(f".{d}") for d in allowed):
        raise FetchError(
            f"Domain '{host_lower}' is not in the allow-list. "
            f"Allowed: {', '.join(sorted(allowed))}",
            "DOMAIN_NOT_ALLOWED",
        )
    try:
        resolved = socket.getaddrinfo(host, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror:
        raise FetchError(f"Could not resolve hostname: {host}", "DNS_ERROR")
    for family, _, _, _, addr in resolved:
        ip_str = addr[0]
        if _is_private_ip(ip_str):
            raise FetchError("URL resolves to a private/internal IP address.", "SSRF_BLOCKED")
    return url


async def fetch_cdn_page(url: str) -> str:
    url = validate_url(url)
    logger.info("Fetching CDN page: %s", url)
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(_TIMEOUT),
        follow_redirects=True,
        max_redirects=5,
    ) as client:
        resp = await client.get(
            url,
            headers={
                "User-Agent": "CDN-Response-Evaluator/1.0",
                "Accept": "text/html,application/xhtml+xml,*/*",
            },
        )
        resp.raise_for_status()
        content_length = len(resp.content)
        if content_length > _MAX_SIZE:
            raise FetchError(
                f"Response too large ({content_length:,} bytes). Max: {_MAX_SIZE:,} bytes.",
                "RESPONSE_TOO_LARGE",
            )
        return resp.text

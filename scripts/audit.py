#!/usr/bin/env python3
"""Regression audit for justinchill.com (static GitHub Pages site).

Run from the repo root:

    python3 scripts/audit.py             # exit 1 on any finding
    python3 scripts/audit.py --warn-only # print findings, exit 0

Checks, per root *.html page:
  * every <script type="application/ld+json"> block parses as JSON
  * every JSON-LD node typed Dataset has creator/funder values whose @type is
    exactly Person or Organization (Google rejects other types there)
  * every <img> with a relative local src points to an existing file
  * every <img> has an alt attribute (empty alt is fine)
  * every page with <meta name="robots" content="all"> has a canonical link
    and a meta description
  * external scripts from cdn.jsdelivr.net/npm/ or unpkg.com/ pin a full
    x.y.z version (not bare, not @latest, not major-only)
Plus sitemap.xml consistency in both directions.

Standard library only. Output is one line per finding: "file: message".
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.parse
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

SITE_ORIGIN = "https://justinchill.com/"
SITEMAP = Path("sitemap.xml")
# Root pages that must never be in the sitemap, even if they look indexable.
SITEMAP_EXCLUDE = {"404.html", "blank.html", "index 2026.html"}
ALLOWED_PARTY_TYPES = {"Person", "Organization"}
CDN_RE = re.compile(
    r"^(?:https?:)?//(?:cdn\.jsdelivr\.net/npm|unpkg\.com)/"
    r"(?P<pkg>(?:@[^/@]+/)?[^/@]+)"  # name or @scope/name
    r"(?:@(?P<ver>[^/]+))?"  # optional @version
    r"(?P<rest>/.*)?$"
)
PINNED_RE = re.compile(r"^\d+\.\d+\.\d+(?:[-+.][0-9A-Za-z.+-]+)?$")


class PageParser(HTMLParser):
    """Collects the handful of tags the audit cares about."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.imgs: list[tuple[int, dict[str, str | None]]] = []
        self.metas: list[dict[str, str | None]] = []
        self.links: list[dict[str, str | None]] = []
        self.scripts: list[dict[str, str | None]] = []
        self.jsonld: list[tuple[int, str]] = []
        self._ld_line: int | None = None
        self._ld_buf: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): v for k, v in attrs}
        line = self.getpos()[0]
        if tag == "img":
            self.imgs.append((line, a))
        elif tag == "meta":
            self.metas.append(a)
        elif tag == "link":
            self.links.append(a)
        elif tag == "script":
            self.scripts.append(a)
            if (a.get("type") or "").strip().lower() == "application/ld+json":
                self._ld_line = line
                self._ld_buf = []

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_data(self, data):
        if self._ld_line is not None:
            self._ld_buf.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self._ld_line is not None:
            self.jsonld.append((self._ld_line, "".join(self._ld_buf)))
            self._ld_line = None
            self._ld_buf = []


def meta_value(metas, name: str) -> str | None:
    for m in metas:
        if (m.get("name") or "").strip().lower() == name:
            return m.get("content")
    return None


def is_indexable(path: Path, metas) -> bool:
    if path.name in SITEMAP_EXCLUDE:
        return False
    robots = (meta_value(metas, "robots") or "").lower()
    return "noindex" not in robots


def types_of(node: dict) -> list[str]:
    t = node.get("@type")
    if isinstance(t, str):
        return [t]
    if isinstance(t, list):
        return [x for x in t if isinstance(x, str)]
    return []


def walk_jsonld(obj, visit):
    """Depth-first visit of every dict in a parsed JSON-LD document."""
    if isinstance(obj, dict):
        visit(obj)
        for v in obj.values():
            walk_jsonld(v, visit)
    elif isinstance(obj, list):
        for v in obj:
            walk_jsonld(v, visit)


def check_dataset_parties(node: dict, line: int, report) -> None:
    if "Dataset" not in types_of(node):
        return
    label = node.get("name") or node.get("@id") or "unnamed Dataset"
    for field in ("creator", "funder"):
        if field not in node:
            continue
        values = node[field]
        if not isinstance(values, list):
            values = [values]
        for v in values:
            if not isinstance(v, dict):
                report(
                    f"line {line}: Dataset '{label}' {field} must be an object "
                    f"with @type Person or Organization, got {json.dumps(v)}"
                )
                continue
            t = v.get("@type")
            if t not in ALLOWED_PARTY_TYPES:
                report(
                    f"line {line}: Dataset '{label}' {field}.@type is "
                    f"{json.dumps(t)}; must be exactly Person or Organization"
                )


def local_src_path(src: str) -> str | None:
    """Return a filesystem-relative path for a local src, or None if external."""
    s = src.strip()
    if not s or s.startswith(("http://", "https://", "//", "data:", "blob:")):
        return None
    if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", s):  # any other scheme
        return None
    s = s.split("#", 1)[0].split("?", 1)[0]
    s = urllib.parse.unquote(s)
    return s.lstrip("/") if s else None


def check_cdn_pin(src: str) -> str | None:
    m = CDN_RE.match(src.strip())
    if not m:
        return None
    ver = m.group("ver")
    if ver is None:
        return f"unpinned CDN script {src} (add @x.y.z)"
    if ver.lower() == "latest":
        return f"CDN script {src} uses @latest; pin @x.y.z"
    if not PINNED_RE.match(ver):
        return f"CDN script {src} pins @{ver}; pin a full @x.y.z version"
    return None


def audit_page(path: Path, findings: list[str]) -> bool:
    """Audit one page. Returns whether it is indexable (for the sitemap check)."""

    def report(msg: str) -> None:
        findings.append(f"{path}: {msg}")

    text = path.read_text(encoding="utf-8", errors="replace")
    p = PageParser()
    try:
        p.feed(text)
        p.close()
    except Exception as e:  # pragma: no cover - html.parser is very lenient
        report(f"HTML parse error: {e}")
        return False

    # JSON-LD
    for line, raw in p.jsonld:
        try:
            doc = json.loads(raw)
        except json.JSONDecodeError as e:
            report(f"line {line}: JSON-LD does not parse: {e.msg} (line {e.lineno} col {e.colno} of block)")
            continue
        walk_jsonld(doc, lambda node: check_dataset_parties(node, line, report))

    # Images
    for line, a in p.imgs:
        if "alt" not in a:
            report(f"line {line}: <img src=\"{a.get('src') or ''}\"> has no alt attribute")
        src = a.get("src")
        if src:
            rel = local_src_path(src)
            if rel is not None:
                target = path.parent / rel
                if not target.is_file():
                    report(f"line {line}: <img> src {src!r} does not exist")

    # Indexable-page head requirements
    robots = (meta_value(p.metas, "robots") or "").strip().lower()
    if robots == "all":
        has_canonical = any(
            (l.get("rel") or "").strip().lower() == "canonical" and l.get("href")
            for l in p.links
        )
        if not has_canonical:
            report('robots=all page is missing <link rel="canonical">')
        if not (meta_value(p.metas, "description") or "").strip():
            report('robots=all page is missing <meta name="description">')

    # CDN pins
    for a in p.scripts:
        src = a.get("src")
        if src:
            msg = check_cdn_pin(src)
            if msg:
                report(msg)

    return is_indexable(path, p.metas)


def audit_sitemap(indexable: set[str], findings: list[str]) -> None:
    def report(msg: str) -> None:
        findings.append(f"{SITEMAP}: {msg}")

    if not SITEMAP.is_file():
        report("file is missing")
        return
    try:
        root = ET.parse(SITEMAP).getroot()
    except ET.ParseError as e:
        report(f"XML does not parse: {e}")
        return

    in_sitemap: set[str] = set()
    for loc in root.iter():
        if not loc.tag.endswith("}loc") and loc.tag != "loc":
            continue
        url = (loc.text or "").strip()
        if not url.startswith(SITE_ORIGIN):
            report(f"<loc>{url}</loc> is not under {SITE_ORIGIN}")
            continue
        rel = urllib.parse.unquote(url[len(SITE_ORIGIN):])
        rel = rel or "index.html"
        if rel in in_sitemap:
            report(f"<loc>{url}</loc> is listed more than once")
        in_sitemap.add(rel)
        if not Path(rel).is_file():
            report(f"<loc>{url}</loc> points to a file that does not exist")
        elif "/" not in rel and rel.endswith(".html") and rel not in indexable:
            report(f"<loc>{url}</loc> is a noindex or excluded page")

    for name in sorted(indexable, key=str.lower):
        if name not in in_sitemap:
            report(f"indexable page {name} is missing from the sitemap")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--warn-only", action="store_true", help="print findings but exit 0")
    args = ap.parse_args(argv)

    if not Path("index.html").is_file():
        print("audit.py: run this from the repo root (index.html not found)", file=sys.stderr)
        return 2

    findings: list[str] = []
    indexable: set[str] = set()
    pages = sorted(Path(".").glob("*.html"), key=lambda p: p.name.lower())
    for page in pages:
        if audit_page(page, findings):
            indexable.add(page.name)
    audit_sitemap(indexable, findings)

    for line in findings:
        print(line)
    n = len(findings)
    print(
        f"audit: {len(pages)} pages checked, {n} finding{'s' if n != 1 else ''}"
        + (" (warn-only)" if args.warn_only and n else ""),
        file=sys.stderr,
    )
    if n and not args.warn_only:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

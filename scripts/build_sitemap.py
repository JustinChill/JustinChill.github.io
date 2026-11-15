#!/usr/bin/env python3
"""Regenerate sitemap.xml for justinchill.com from the indexable root pages.

Run from the repo root:

    python3 scripts/build_sitemap.py          # rewrite sitemap.xml
    python3 scripts/build_sitemap.py --check  # exit 1 if sitemap.xml is stale

A root *.html page is indexable unless its <meta name="robots"> contains
"noindex" or it is one of 404.html, blank.html, "index 2026.html".
<lastmod> comes from the page's <meta name="dateModified">, falling back to
the first "dateModified" in the page's JSON-LD, then the file's last git
commit date, then the file's mtime.
Entries are sorted by filename, case-insensitively; the homepage
(index.html) is written as https://justinchill.com/ but sorts as index.html.

Standard library only.
"""

from __future__ import annotations

import argparse
import datetime as dt
import difflib
import json
import re
import subprocess
import sys
import urllib.parse
from html.parser import HTMLParser
from pathlib import Path
from xml.sax.saxutils import escape

SITE_ORIGIN = "https://justinchill.com/"
SITEMAP = Path("sitemap.xml")
SITEMAP_EXCLUDE = {"404.html", "blank.html", "index 2026.html"}
HOMEPAGE = "index.html"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}")


class HeadParser(HTMLParser):
    """Reads <meta> tags and JSON-LD blocks in <head>; stops at <body>."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.metas: dict[str, str] = {}
        self.jsonld: list[str] = []
        self._in_ld = False
        self._buf: list[str] = []
        self.done = False

    def handle_starttag(self, tag, attrs):
        if self.done:
            return
        if tag == "body":
            self.done = True
            return
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "meta":
            name = a.get("name", "").strip().lower()
            if name and name not in self.metas:
                self.metas[name] = a.get("content", "")
        elif tag == "script" and a.get("type", "").strip().lower() == "application/ld+json":
            self._in_ld = True
            self._buf = []

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_data(self, data):
        if self._in_ld:
            self._buf.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self._in_ld:
            self.jsonld.append("".join(self._buf))
            self._in_ld = False


def read_head(path: Path) -> HeadParser:
    p = HeadParser()
    p.feed(path.read_text(encoding="utf-8", errors="replace"))
    p.close()
    return p


def jsonld_date_modified(blocks: list[str]) -> str | None:
    """First dateModified found in the page's JSON-LD (top-level node first)."""

    def find(obj):
        if isinstance(obj, dict):
            v = obj.get("dateModified")
            if isinstance(v, str) and DATE_RE.match(v):
                return v[:10]
            for child in obj.values():
                hit = find(child)
                if hit:
                    return hit
        elif isinstance(obj, list):
            for child in obj:
                hit = find(child)
                if hit:
                    return hit
        return None

    for raw in blocks:
        try:
            doc = json.loads(raw)
        except json.JSONDecodeError:
            continue  # audit.py reports broken JSON-LD
        hit = find(doc)
        if hit:
            return hit
    return None


def is_indexable(path: Path, metas: dict[str, str]) -> bool:
    if path.name in SITEMAP_EXCLUDE:
        return False
    return "noindex" not in metas.get("robots", "").lower()


def git_commit_date(path: Path) -> str | None:
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", str(path)],
            capture_output=True,
            text=True,
            check=False,
        ).stdout.strip()
    except OSError:
        return None
    return out if DATE_RE.match(out) else None


def lastmod_for(path: Path, head: HeadParser) -> str:
    meta = head.metas.get("datemodified", "").strip()
    if DATE_RE.match(meta):
        return meta[:10]
    ld = jsonld_date_modified(head.jsonld)
    if ld:
        return ld
    git = git_commit_date(path)
    if git:
        return git
    return dt.date.fromtimestamp(path.stat().st_mtime).isoformat()


def page_url(name: str) -> str:
    if name == HOMEPAGE:
        return SITE_ORIGIN
    # Apostrophes are legal in URL paths (to-don't.html); keep them readable.
    return SITE_ORIGIN + urllib.parse.quote(name, safe="'")


def build() -> str:
    pages = []
    for path in Path(".").glob("*.html"):
        head = read_head(path)
        if is_indexable(path, head.metas):
            pages.append((path.name, lastmod_for(path, head)))

    pages.sort(key=lambda t: t[0].lower())

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for name, lastmod in pages:
        lines += [
            "<url>",
            f"  <loc>{escape(page_url(name))}</loc>",
            f"  <lastmod>{escape(lastmod)}</lastmod>",
            "</url>",
        ]
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def normalize(text: str) -> list[str]:
    return [line.rstrip() for line in text.strip().splitlines()]


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument(
        "--check",
        action="store_true",
        help="compare against the current sitemap.xml and exit 1 if it differs; write nothing",
    )
    args = ap.parse_args(argv)

    if not Path(HOMEPAGE).is_file():
        print("build_sitemap.py: run this from the repo root (index.html not found)", file=sys.stderr)
        return 2

    new = build()
    count = new.count("<url>")

    if args.check:
        current = SITEMAP.read_text(encoding="utf-8") if SITEMAP.is_file() else ""
        if normalize(current) == normalize(new):
            print(f"sitemap.xml is up to date ({count} urls)", file=sys.stderr)
            return 0
        diff = difflib.unified_diff(
            normalize(current), normalize(new), "sitemap.xml (current)", "sitemap.xml (generated)", lineterm=""
        )
        for line in diff:
            print(line)
        print("sitemap.xml is stale; run: python3 scripts/build_sitemap.py", file=sys.stderr)
        return 1

    SITEMAP.write_text(new, encoding="utf-8")
    print(f"wrote sitemap.xml ({count} urls)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

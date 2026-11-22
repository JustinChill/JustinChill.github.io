#!/usr/bin/env python3
"""Order the cards in each blog.html section by the linked page's date modified.

Run from the repo root:

    python3 scripts/sort_blog.py          # rewrite blog.html in place
    python3 scripts/sort_blog.py --check  # exit 1 if the cards are out of order

Each section (Posts, Books and Culture, Code, Just for Fun) is a
`class="container"` element holding a run of `<article class="card">` blocks.
Cards are sorted within their own section, newest first, by the date of the
page their "Read More" link points to: the page's <meta name="dateModified">,
then its JSON-LD dateModified, then its last git commit (the same rule as
scripts/build_sitemap.py uses for <lastmod>). Ties are broken by card title.
Cards whose link is not a local page sort last, in their current order.

Image loading is normalised afterwards: the first row of Posts (three cards,
inside the first viewport on desktop) loads eagerly, the very first cover with
fetchpriority="high"; every other cover is loading="lazy".

Standard library only.
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_sitemap import lastmod_for, read_head  # noqa: E402

BLOG = Path("blog.html")
EAGER_CARDS = 3  # first row of the Posts grid
CONTAINER_RE = re.compile(r'<(section|div) class="container(?: [^"]*)?">')
CARD_RE = re.compile(r'[ \t]*<article class="card"[^>]*>.*?</article>\n?', re.S)
HREF_RE = re.compile(r'class="card-footer">\s*<a href="([^"]+)"')
TITLE_RE = re.compile(r"<h3>(.*?)</h3>", re.S)
IMG_RE = re.compile(r'(<div class="card-image">\s*<img\b)([^>]*)(>)', re.S)


def card_date(card: str, cache: dict[str, str]) -> str:
    m = HREF_RE.search(card)
    if not m:
        return ""
    href = m.group(1).split("#")[0].split("?")[0]
    path = Path(html.unescape(href))
    if not href.endswith(".html") or "/" in href or not path.is_file():
        return ""
    if href not in cache:
        cache[href] = lastmod_for(path, read_head(path))
    return cache[href]


def card_title(card: str) -> str:
    m = TITLE_RE.search(card)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", m.group(1)))).strip().lower() if m else ""


def set_loading(card: str, rank: int) -> str:
    """Cover hint by position on the page: high priority, eager, or lazy."""

    def fix(m: re.Match) -> str:
        attrs = m.group(2)
        attrs = re.sub(r'\s+loading="[^"]*"', "", attrs)
        attrs = re.sub(r'\s+fetchpriority="[^"]*"', "", attrs)
        if rank == 0:
            hint = ' fetchpriority="high"'
        elif rank < EAGER_CARDS:
            hint = ""  # eager is the browser default
        else:
            hint = ' loading="lazy"'
        # Keep decoding/width/height where they were; put the hint just before decoding
        if hint and ' decoding="' in attrs:
            attrs = attrs.replace(' decoding="', hint + ' decoding="', 1)
        else:
            attrs += hint
        return m.group(1) + attrs + m.group(3)

    return IMG_RE.sub(fix, card, count=1)


def sort_cards(text: str) -> tuple[str, list[tuple[int, int]]]:
    cache: dict[str, str] = {}
    out: list[str] = []
    pos = 0
    sections: list[tuple[int, int]] = []
    rank = 0
    for cm in CONTAINER_RE.finditer(text):
        start = cm.end()
        # The section's cards are one contiguous run of card blocks after the opening tag
        run_start = start + (len(text[start:]) - len(text[start:].lstrip("\n")))
        cards: list[str] = []
        cursor = run_start
        while True:
            m = CARD_RE.match(text, cursor)
            if not m:
                break
            cards.append(m.group(0))
            cursor = m.end()
        if not cards:
            continue
        dates = [card_date(c, cache) for c in cards]
        undated = dates.count("")

        def key(i: int) -> tuple:
            if not dates[i]:
                return (1, 0, "", i)  # no local page: last, in current order
            return (0, -int(dates[i].replace("-", "")), card_title(cards[i]), i)

        order = sorted(range(len(cards)), key=key)
        ordered = []
        for i in order:
            ordered.append(set_loading(cards[i], rank))
            rank += 1
        out.append(text[pos:run_start])
        out.append("".join(ordered))
        pos = cursor
        sections.append((len(cards), undated))
    out.append(text[pos:])
    return "".join(out), sections


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true", help="exit 1 if blog.html is out of order; write nothing")
    args = ap.parse_args(argv)

    if not BLOG.is_file():
        print("sort_blog.py: run this from the repo root (blog.html not found)", file=sys.stderr)
        return 2

    old = BLOG.read_text(encoding="utf-8")
    new, sections = sort_cards(old)
    summary = ", ".join(f"{n} cards" + (f" ({u} without a local page)" if u else "") for n, u in sections)

    if args.check:
        if new != old:
            print(f"blog.html cards are out of order; run: python3 scripts/sort_blog.py ({summary})")
            return 1
        print(f"blog.html cards are in order ({summary})")
        return 0

    if new != old:
        BLOG.write_text(new, encoding="utf-8")
        print(f"sorted blog.html ({summary})")
    else:
        print(f"blog.html already in order ({summary})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

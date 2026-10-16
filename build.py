"""Static site builder for the Eval Research site.

    python build.py                 # build into dist/ for GitHub Pages (base path from config)
    python build.py --base ""       # build for local preview at the server root
    python -m http.server -d dist   # then open http://localhost:8000

Content lives in site/content/{notes,research}/*.md with YAML front matter:

    ---
    title: Benchmarks saturate in months
    date: 2026-10-15
    summary: One sentence shown in lists.
    tags: [saturation, indices]
    app: saturation        # optional: embed an interactive app (research pages)
    draft: false           # optional: drafts are skipped
    ---
"""
import argparse
import datetime as dt
import re
import shutil
from pathlib import Path

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "site"
SECTIONS = {
    "notes": {"title": "Eval notes", "blurb": "Daily notes on how AI systems are measured: benchmarks, indices, methods and their limits."},
    "research": {"title": "Research", "blurb": "Projects that turn those notes into data, tools and new benchmarks."},
}
FM = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.S)


def read_page(path, section):
    text = path.read_text(encoding="utf-8")
    m = FM.match(text)
    meta = yaml.safe_load(m.group(1)) if m else {}
    body = text[m.end():] if m else text
    md = markdown.Markdown(extensions=["extra", "toc", "sane_lists", "smarty"],
                           extension_configs={"toc": {"permalink": "#", "permalink_class": "anchor"}})
    html = md.convert(body)
    date = meta.get("date")
    if isinstance(date, str):
        date = dt.date.fromisoformat(date)
    slug = meta.get("slug") or re.sub(r"^\d{4}-\d{2}-\d{2}-", "", path.stem)
    words = len(re.findall(r"\w+", body))
    return {**meta, "date": date, "slug": slug, "section": section, "html": html,
            "toc": md.toc if "[TOC]" not in body else "", "url": f"/{section}/{slug}/",
            "minutes": max(1, round(words / 220)), "tags": meta.get("tags") or []}


def build(base):
    cfg = yaml.safe_load((SITE / "config.yaml").read_text(encoding="utf-8"))
    base = cfg.get("base_path", "") if base is None else base
    out = ROOT / "dist"
    shutil.rmtree(out, ignore_errors=True)
    shutil.copytree(SITE / "static", out / "static")
    (out / ".nojekyll").write_text("")

    env = Environment(loader=FileSystemLoader(SITE / "templates"), autoescape=select_autoescape(["html"]))
    env.filters["date"] = lambda d, f="%b %-d, %Y": d.strftime(f) if d else ""
    env.globals.update(site=cfg, base=base, sections=SECTIONS, year=dt.date.today().year)
    env.globals["u"] = lambda p: base + p  # prefix internal links with the base path

    pages = {}
    for sec in SECTIONS:
        items = [read_page(p, sec) for p in sorted((SITE / "content" / sec).glob("*.md"))]
        items = [i for i in items if not i.get("draft")]
        items.sort(key=lambda i: (i["date"] or dt.date.min, i["slug"]), reverse=True)
        pages[sec] = items

    def write(rel, tpl, **ctx):
        dest = out / rel.strip("/") / "index.html" if rel != "/" else out / "index.html"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(env.get_template(tpl).render(path=rel, **ctx), encoding="utf-8")

    write("/", "home.html", notes=pages["notes"][:5], research=pages["research"])
    for sec, items in pages.items():
        write(f"/{sec}/", "list.html", section=sec, items=items)
        for i, item in enumerate(items):
            newer = items[i - 1] if i > 0 else None
            older = items[i + 1] if i + 1 < len(items) else None
            write(item["url"], "post.html", page=item, newer=newer, older=older)
    write("/404/", "404.html")
    shutil.move(out / "404" / "index.html", out / "404.html")
    shutil.rmtree(out / "404")
    n = sum(len(v) for v in pages.values())
    print(f"built {n} pages into {out} (base path '{base}')")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=None, help="URL base path, e.g. /eval-research; default from site/config.yaml")
    build(ap.parse_args().base)

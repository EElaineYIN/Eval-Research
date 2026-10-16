# Eval Research

Personal site and research code on AI evaluation: daily **Eval notes** and **Research** projects.

Live site: https://eelaineyin.github.io/eval-research/

## Layout

```
site/
  config.yaml            site title, links, base path
  content/notes/         one Markdown file per note (YYYY-MM-DD-slug.md)
  content/research/      one Markdown file per project
  templates/             Jinja2 templates
  static/                CSS, JS, data served as-is
research/
  benchlm-saturation/    pipeline + item counts + benchmark families
build.py                 static site builder (Markdown + Jinja2 → dist/)
.github/workflows/       builds and deploys to GitHub Pages on push to main
```

## Write a note

Create `site/content/notes/2026-10-16-my-topic.md`:

```markdown
---
title: What I learned today
date: 2026-10-16
summary: One sentence shown in the list.
tags: [IRT, contamination]
---

Markdown body. Tables, footnotes and code blocks work.
```

Push to `main`; the workflow rebuilds the site. Add `draft: true` to keep a note out of the build.

## Preview locally

```bash
pip install -r requirements.txt
python build.py --base ""
python -m http.server -d dist 8000   # http://localhost:8000
```

## Refresh the saturation data

Download `benchmarks.json` and `models.json` from BenchLM into `raw/` (not committed; CC BY-NC 4.0), then:

```bash
python research/benchlm-saturation/pipeline.py \
  --benchmarks raw/benchmarks.json --models raw/models.json --snapshot 2026-10-15
```

This writes `site/static/data/agentic_saturation.json`. Item counts live in
`research/benchlm-saturation/item_counts.csv` and benchmark families in `families.json`; edit them by hand as you verify more benchmarks.

## Licenses

- Code: MIT.
- Benchmark scores: data from [BenchLM.ai](https://www.benchlm.ai), CC BY-NC 4.0 (non-commercial use, attribution required).
- d3 is vendored under its ISC license (`site/static/js/vendor/d3-LICENSE.txt`).

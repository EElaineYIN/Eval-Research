"""Build the agentic-benchmark saturation dataset from a BenchLM snapshot.

Usage:
    python research/benchlm-saturation/pipeline.py \
        --benchmarks raw/benchmarks.json --models raw/models.json \
        --out site/static/data/agentic_saturation.json

Inputs
  benchmarks.json, models.json  BenchLM JSON downloads (CC BY-NC 4.0, not committed).
  item_counts.csv               Item count n per benchmark key, with provenance.
  families.json                 Groups versions / re-runs / metrics of one benchmark.

Output: one row per agentic benchmark key with top-5 statistics. The page computes
the S-index, labels and saturation score in the browser so thresholds stay adjustable.
"""
import argparse
import collections
import csv
import json
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
# Tokens in a benchmark's format/name that mark a score as not on a 0-100 % scale.
NONPCT = ("elo", "turn", "step reached", "average step", "usd", "index", "aggregated")


def load_items(path):
    data = json.load(open(path, encoding="utf-8"))
    return data["items"] if isinstance(data, dict) else data


def build(benchmarks_path, models_path):
    bench = {}
    for item in load_items(benchmarks_path):
        bench.setdefault(item["benchmarkKey"], item)
    models = load_items(models_path)

    # Models whose scores BenchLM generated (not reported) are excluded entirely.
    generated = {m["canonicalModelKey"] for m in models
                 if (m.get("coverage") or {}).get("generatedBenchmarkCount")}

    # Best score per model family, so reasoning-effort variants don't fill the top 5.
    scores = collections.defaultdict(dict)  # key -> {family: (score, model name)}
    agentic_bucket = set()
    for m in models:
        if m["canonicalModelKey"] in generated:
            continue
        fam = (m.get("family") or {}).get("familyKey") or m["canonicalModelKey"]
        for bucket, d in (m.get("benchmarks") or {}).items():
            for k, v in d.items():
                if not isinstance(v, (int, float)):
                    continue
                if bucket == "agentic":
                    agentic_bucket.add(k)
                cur = scores[k].get(fam)
                if cur is None or v > cur[0]:
                    scores[k][fam] = (float(v), m["model"])

    def is_agentic(k):
        meta = bench.get(k)
        if meta is None:
            return False
        return meta["category"] == "agentic" or (
            meta["category"] == "external" and meta.get("capabilityCategory") == "agentic")

    keys = sorted({k for k in scores if is_agentic(k)} | (agentic_bucket & set(scores)))

    counts = {r["key"]: r for r in csv.DictReader(open(HERE / "item_counts.csv", encoding="utf-8"))}
    families = json.load(open(HERE / "families.json", encoding="utf-8"))
    key_to_family = {k: (fid, f["label"]) for fid, f in families.items() for k in f["keys"]}

    rows = []
    for k in keys:
        meta = bench.get(k, {})
        ranked = sorted(scores[k].values(), reverse=True)
        vals = [v for v, _ in ranked]
        n_fam = len(vals)
        fmt = meta.get("format") or ""
        name = meta.get("fullName") or meta.get("name") or k
        pct = vals[0] <= 100 and not any(t in fmt.lower() or t in name.lower() for t in NONPCT)
        c = counts.get(k, {})
        fid, flabel = key_to_family.get(k, (k, name.split(":")[0].strip()))
        rows.append(dict(
            key=k, name=name, year=int(meta["year"]) if str(meta.get("year", "")).isdigit() else None,
            fmt=fmt, n_families=n_fam, top1=vals[0], top5=vals[4] if n_fam >= 5 else None,
            median=round(statistics.median(vals), 1), top1_model=ranked[0][1], percent_like=pct,
            headroom=round(100 - vals[0], 1) if pct else None,
            spread_1_5=round(vals[0] - vals[4], 1) if n_fam >= 5 else None,
            n=int(c["n"]) if c.get("n") else None, n_conf=c.get("n_source", "Not found"),
            family=fid, family_label=flabel,
        ))
    rows.sort(key=lambda r: -r["n_families"])
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--benchmarks", required=True)
    ap.add_argument("--models", required=True)
    ap.add_argument("--out", default="site/static/data/agentic_saturation.json")
    ap.add_argument("--snapshot", default=None, help="Snapshot date label, e.g. 2026-10-15")
    a = ap.parse_args()
    rows = build(a.benchmarks, a.models)
    out = {"source": "Data from BenchLM.ai (CC BY-NC 4.0)", "snapshot": a.snapshot, "rows": rows}
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    json.dump(out, open(a.out, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{len(rows)} agentic benchmarks -> {a.out}")


if __name__ == "__main__":
    main()

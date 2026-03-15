#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import datetime, timedelta, timezone

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from db.database import init_db
from services.github_search import refresh_github_cases


def run(duration_hours: float, interval_minutes: float) -> None:
    init_db()
    start = datetime.now(timezone.utc)
    end = start + timedelta(hours=duration_hours)
    cycle = 0
    print(
        f"[hunter] start={start.isoformat()} end={end.isoformat()} "
        f"interval={interval_minutes}m"
    )
    while datetime.now(timezone.utc) < end:
        cycle += 1
        print(f"[hunter] cycle={cycle} at={datetime.now(timezone.utc).isoformat()}")
        result = refresh_github_cases()
        print(f"[hunter] cycle={cycle} saved_total={result.get('saved_total', 0)}")
        sleep_seconds = int(interval_minutes * 60)
        if datetime.now(timezone.utc) + timedelta(seconds=sleep_seconds) > end:
            break
        time.sleep(sleep_seconds)
    print(f"[hunter] finished at={datetime.now(timezone.utc).isoformat()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Continuous GitHub case hunter")
    parser.add_argument("--duration-hours", type=float, default=4.0)
    parser.add_argument("--interval-minutes", type=float, default=10.0)
    args = parser.parse_args()
    run(duration_hours=args.duration_hours, interval_minutes=args.interval_minutes)

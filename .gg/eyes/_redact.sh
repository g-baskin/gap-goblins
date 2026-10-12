#!/usr/bin/env bash
set -euo pipefail

python3 -c '
import re
import sys

text = sys.stdin.read()
patterns = [
    (re.compile(r"(?i)(authorization:\\s*bearer\\s+)[^\\r\\n]+"), r"\\1[REDACTED]"),
    (re.compile(r"(?i)(cookie:\\s*)[^\\r\\n]+"), r"\\1[REDACTED]"),
    (re.compile(r"(?i)(set-cookie:\\s*)[^\\r\\n]+"), r"\\1[REDACTED]"),
    (re.compile(r"sk-(?:ant|live|test)-[A-Za-z0-9_-]{12,}"), "[REDACTED_SECRET]"),
    (re.compile(r"re_[A-Za-z0-9_-]{12,}"), "[REDACTED_SECRET]"),
    (re.compile(r"whsec_[A-Za-z0-9_-]{12,}"), "[REDACTED_SECRET]"),
    (re.compile(r"postgres(?:ql)?://[^\\s@]+:[^\\s@]+@[^\\s]+"), "postgresql://[REDACTED]"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "[REDACTED_AWS_KEY]"),
]

for pattern, replacement in patterns:
    text = pattern.sub(replacement, text)

sys.stdout.write(text)
'

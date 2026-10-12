#!/usr/bin/env bash
set -euo pipefail

EYES_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

eyes_root() {
  printf '%s\n' "$EYES_ROOT"
}

eyes_die() {
  printf 'eyes: %s\n' "$*" >&2
  exit 1
}

eyes_require() {
  command -v "$1" >/dev/null 2>&1 || eyes_die "missing required command: $1"
}

eyes_project_root() {
  git -C "$EYES_ROOT" rev-parse --show-toplevel 2>/dev/null || pwd
}

eyes_out_dir() {
  local out_dir="$EYES_ROOT/out"
  mkdir -p "$out_dir"
  printf '%s\n' "$out_dir"
}

eyes_timestamp() {
  date '+%Y%m%d-%H%M%S'
}

eyes_os() {
  local kernel
  kernel="$(uname -s | tr '[:upper:]' '[:lower:]')"
  case "$kernel" in
    darwin*) printf 'darwin\n' ;;
    linux*) printf 'linux\n' ;;
    *) printf '%s\n' "$kernel" ;;
  esac
}

eyes_redact() {
  "$EYES_ROOT/_redact.sh"
}

eyes_timeout() {
  local seconds="$1"
  shift

  if command -v timeout >/dev/null 2>&1; then
    timeout "$seconds" "$@"
    return $?
  fi

  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$seconds" "$@"
    return $?
  fi

  "$@" &
  local command_pid=$!
  (
    sleep "$seconds"
    if kill -0 "$command_pid" >/dev/null 2>&1; then
      kill "$command_pid" >/dev/null 2>&1 || true
    fi
  ) &
  local watcher_pid=$!

  local status=0
  wait "$command_pid" || status=$?
  kill "$watcher_pid" >/dev/null 2>&1 || true
  wait "$watcher_pid" 2>/dev/null || true
  return "$status"
}

eyes_state_get() {
  local key="$1"
  local file="$EYES_ROOT/state/$key"

  if [ -f "$file" ]; then
    cat "$file"
    return 0
  fi

  case "$key" in
    mailpit.http_port) printf '65241\n' ;;
    mailpit.smtp_port) printf '65240\n' ;;
    *) return 0 ;;
  esac
}

#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="${1:-all}"
if [[ "$#" -gt 0 ]]; then
  shift
fi

TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
RUN_DIR="$ROOT_DIR/test-report/$TIMESTAMP"
LOG_DIR="$RUN_DIR/logs"

mkdir -p "$LOG_DIR"

UNIT_LOG="$LOG_DIR/unit.log"
E2E_LOG="$LOG_DIR/e2e.log"
SUMMARY_FILE="$RUN_DIR/summary.txt"

UNIT_STATUS=0
E2E_STATUS=0

run_unit() {
  local coverage_dir="$RUN_DIR/unit/coverage"
  mkdir -p "$coverage_dir"

  set +e
  npx vitest run \
    --coverage.enabled \
    --coverage.provider=v8 \
    --coverage.reporter=text-summary \
    --coverage.reporter=html \
    --coverage.reporter=json-summary \
    --coverage.reportsDirectory="$coverage_dir" \
    "$@" | tee "$UNIT_LOG"
  UNIT_STATUS=${PIPESTATUS[0]}
  set -e
}

run_e2e() {
  local e2e_output_dir="$RUN_DIR/e2e/test-results"
  local e2e_html_dir="$RUN_DIR/e2e/html-report"
  mkdir -p "$e2e_output_dir" "$e2e_html_dir"

  set +e
  PLAYWRIGHT_HTML_OUTPUT_DIR="$e2e_html_dir" \
  PLAYWRIGHT_HTML_OPEN=never \
  npx playwright test \
    --reporter=list,html \
    --output="$e2e_output_dir" \
    "$@" | tee "$E2E_LOG"
  E2E_STATUS=${PIPESTATUS[0]}
  set -e
}

case "$MODE" in
  all)
    run_unit "$@"
    run_e2e "$@"
    ;;
  unit)
    run_unit "$@"
    ;;
  e2e)
    run_e2e "$@"
    ;;
  *)
    echo "Invalid mode: $MODE"
    echo "Usage: scripts/run-automated-tests.sh [all|unit|e2e] [additional test args]"
    exit 1
    ;;
esac

{
  echo "Automated test run: $TIMESTAMP"
  echo "Mode: $MODE"
  echo "Run directory: $RUN_DIR"
  if [[ "$MODE" == "all" || "$MODE" == "unit" ]]; then
    echo "Unit status: $UNIT_STATUS (log: $UNIT_LOG)"
    echo "Unit coverage: $RUN_DIR/unit/coverage"
  fi
  if [[ "$MODE" == "all" || "$MODE" == "e2e" ]]; then
    echo "E2E status: $E2E_STATUS (log: $E2E_LOG)"
    echo "E2E HTML report: $RUN_DIR/e2e/html-report/index.html"
    echo "E2E artifacts: $RUN_DIR/e2e/test-results"
  fi
} | tee "$SUMMARY_FILE"

if [[ "$MODE" == "all" ]]; then
  exit $(( UNIT_STATUS || E2E_STATUS ))
fi

if [[ "$MODE" == "unit" ]]; then
  exit "$UNIT_STATUS"
fi

exit "$E2E_STATUS"

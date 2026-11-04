#!/usr/bin/env bash
# Runs the headless engine tests with a temporary home folder.
# Usage: tests/run.sh

set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_home="$(mktemp -d)"
trap 'rm -rf "${test_home}"' EXIT

cd "${root_dir}"
HOME="${test_home}" gjs --include-path="${root_dir}" "${root_dir}/tests/engine-test.js"

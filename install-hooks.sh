#!/usr/bin/env bash
# install-hooks.sh — Akhilam Inc.
# One-time setup per developer machine. Run after cloning any Akhilam repo.

set -euo pipefail

echo "Installing Akhilam dev tools..."

# Python tools
pip install --upgrade pre-commit semgrep "ruff==0.11.0"

# Frappe official semgrep rules (cloned once at ~/frappe-semgrep-rules)
if [[ -d ~/frappe-semgrep-rules ]]; then
  echo "  ~/frappe-semgrep-rules already exists — pulling latest..."
  git -C ~/frappe-semgrep-rules pull --ff-only 2>/dev/null || true
else
  git clone --depth 1 --branch develop \
    https://github.com/frappe/semgrep-rules.git ~/frappe-semgrep-rules
  echo "  Cloned frappe-semgrep-rules to ~/frappe-semgrep-rules"
fi

# Install pre-commit hooks
pre-commit install
pre-commit install --hook-type pre-push

echo ""
echo "✓ Akhilam dev hooks installed successfully."
echo "  pre-commit:  runs on every commit (ruff + semgrep ERROR gates)"
echo "  pre-push:    runs full semgrep scan before push"

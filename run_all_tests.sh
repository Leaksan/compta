#!/bin/bash
set -e

echo "Installing dependencies..."
pip install -r requirements.txt pytest pytest-flask playwright pytest-playwright requests openpyxl

echo "Initializing Playwright..."
playwright install chromium

echo "Running API tests..."
PYTHONPATH=. pytest tests/test_api.py

echo "Running UI tests..."
# UI tests might need a display or be run in headless mode.
# Playwright by default runs headless.
PYTHONPATH=. pytest tests/test_ui.py

echo "All tests passed!"

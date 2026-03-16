import pytest
from playwright.sync_api import Page, expect
import os
import subprocess
import time
import requests

@pytest.fixture(scope="module", autouse=True)
def server():
    # Use a different DB for UI tests to avoid pollution
    db_path = "instance/test_ui.db"
    if os.path.exists(db_path):
        os.remove(db_path)

    env = os.environ.copy()
    env["FLASK_ENV"] = "development"
    env["SQLALCHEMY_DATABASE_URI"] = "sqlite:///test_ui.db"

    proc = subprocess.Popen(["python", "api/index.py"], env=env)

    # Wait for server to start
    timeout = 10
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get("http://localhost:5000/auth")
            if response.status_code == 200:
                break
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(0.5)

    yield proc
    proc.terminate()
    if os.path.exists(db_path):
        os.remove(db_path)

def test_login_flow(page: Page):
    page.goto("http://localhost:5000/auth")

    # Switch to register mode
    page.get_by_role("button", name="S'inscrire").click()

    # Fill registration details
    page.get_by_placeholder("Votre prénom").fill("UI")
    page.get_by_placeholder("Votre entreprise").fill("UI Corp")
    page.get_by_placeholder("01 23 45 67").fill("999999999")
    page.get_by_placeholder("••••••••").fill("password")

    page.get_by_role("button", name="Créer mon compte").click()

    # Wait for navigation to dashboard
    expect(page).to_have_url("http://localhost:5000/")
    expect(page.get_by_text("Solde Net")).to_be_visible()

def test_add_transaction(page: Page):
    # Log in if needed
    page.goto("http://localhost:5000/auth")
    if "auth" in page.url:
        page.get_by_placeholder("01 23 45 67").fill("999999999")
        page.get_by_placeholder("••••••••").fill("password")
        page.get_by_role("button", name="Se connecter").click()

    # Wait for dashboard to load
    expect(page).to_have_url("http://localhost:5000/")

    # Click on add transaction button
    page.locator("button[onclick='openNewModal()']").click()

    # Fill form
    page.get_by_placeholder("Ex: Vente de chaussures").fill("Test UI Transaction")
    page.get_by_placeholder("0").first.fill("1500") # Income amount

    page.get_by_role("button", name="Enregistrer").click()

    # Check if transaction appears in the list
    expect(page.get_by_text("Test UI Transaction")).to_be_visible()
    # Use first() or a more specific locator to avoid strict mode violation
    expect(page.get_by_text("1 500 FCFA").first).to_be_visible()

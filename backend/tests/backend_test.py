"""Backend test suite for STB Singapore Node.js/Express app (post-Vercel refactor)."""
import os
import json
import time
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = "http://localhost:3000"
DATA_FILE = "/app/data/bookings.json"

# Shared voucher for lifecycle tests
VOUCHER = f"STB-TEST-{int(time.time())}"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    return s


# ---------------- Health & static ----------------
class TestHealthAndStatic:
    def test_health(self, client):
        r = client.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert data.get("smtp") is True
        assert data.get("storage") == "local-file"
        assert "node" in data

    def test_root_html(self, client):
        r = client.get(f"{BASE_URL}/")
        assert r.status_code == 200
        assert "STB Singapore" in r.text

    def test_logo(self, client):
        r = client.get(f"{BASE_URL}/stb-logo.png")
        assert r.status_code == 200
        assert "image/png" in r.headers.get("Content-Type", "")

    def test_main_js(self, client):
        r = client.get(f"{BASE_URL}/src/main.js")
        assert r.status_code == 200
        ct = r.headers.get("Content-Type", "")
        assert "javascript" in ct.lower()

    def test_styles_css(self, client):
        r = client.get(f"{BASE_URL}/src/styles.css")
        assert r.status_code == 200
        ct = r.headers.get("Content-Type", "")
        assert "css" in ct.lower()


# ---------------- Bookings ----------------
class TestBookings:
    def test_create_booking_missing_fields(self, client):
        r = client.post(f"{BASE_URL}/api/bookings", json={"vehicle": "Mercedes"})
        assert r.status_code == 400
        assert "error" in r.json()

    def test_create_booking_success(self, client):
        pickup_time = (datetime.now(timezone.utc) + timedelta(hours=11)).isoformat()
        payload = {
            "voucherCode": VOUCHER,
            "passengerName": "Test Passenger",
            "passengerEmail": "tensketch285@gmail.com",
            "passengerPhone": "+6591234567",
            "vehicle": "Mercedes S-Class",
            "pickup": "Changi Airport T3",
            "destination": "Marina Bay Sands",
            "dateTime": pickup_time,
            "flightNo": "SQ123",
            "fare": "250",
            "currency": "SGD",
            "paymentMethod": "Card",
            "pax": "2 pax",
        }
        r = client.post(f"{BASE_URL}/api/bookings", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert data["booking"]["voucherCode"] == VOUCHER
        emails = data.get("emailsSent", {})
        assert emails.get("customer", {}).get("ok") is True, f"Customer email failed: {emails.get('customer')}"
        assert emails.get("admin", {}).get("ok") is True, f"Admin email failed: {emails.get('admin')}"
        wa = data.get("whatsappUrl", "")
        assert ("wa.me" in wa) or ("api.whatsapp.com" in wa)

    def test_booking_persisted(self):
        with open(DATA_FILE) as f:
            bookings = json.load(f)
        codes = [b.get("voucherCode") for b in bookings]
        assert VOUCHER in codes


# ---------------- Assign driver ----------------
class TestAssign:
    def test_get_assign_page(self, client):
        r = client.get(f"{BASE_URL}/assign/{VOUCHER}")
        assert r.status_code == 200
        html = r.text
        assert "Test Passenger" in html
        assert "Changi Airport T3" in html
        assert "Marina Bay Sands" in html
        assert 'method="POST"' in html or "method='POST'" in html
        assert "<form" in html

    def test_get_assign_not_found(self, client):
        r = client.get(f"{BASE_URL}/assign/NON-EXISTENT-CODE")
        assert r.status_code == 404
        assert "Booking not found" in r.text

    def test_post_assign_driver(self, client):
        r = client.post(
            f"{BASE_URL}/assign/{VOUCHER}",
            data={
                "driverName": "Chandran Raj",
                "driverPhone": "+6598765432",
                "driverPlate": "sgx 1234 a",
                "driverPhotoUrl": "https://example.com/driver.jpg",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert r.status_code == 200
        assert "✓ Saved." in r.text

    def test_assign_prefilled_after_save(self, client):
        r = client.get(f"{BASE_URL}/assign/{VOUCHER}")
        assert r.status_code == 200
        html = r.text
        assert "Chandran Raj" in html
        assert "+6598765432" in html
        assert "SGX 1234 A" in html  # uppercased
        assert "https://example.com/driver.jpg" in html


# ---------------- Reminder cron ----------------
class TestReminderCron:
    def test_cron_first_call_sends(self, client):
        r = client.get(f"{BASE_URL}/api/cron/reminders")
        assert r.status_code == 200
        data = r.json()
        assert "scanned" in data
        assert isinstance(data.get("sent"), list)
        assert isinstance(data.get("failed"), list)
        assert VOUCHER in data["sent"], f"Voucher not sent. Response: {data}"

    def test_reminder_persisted_in_file(self):
        with open(DATA_FILE) as f:
            bookings = json.load(f)
        b = next((x for x in bookings if x.get("voucherCode") == VOUCHER), None)
        assert b is not None
        assert b.get("reminderSentAt") is not None
        # validate ISO timestamp
        datetime.fromisoformat(b["reminderSentAt"].replace("Z", "+00:00"))

    def test_cron_second_call_idempotent(self, client):
        r = client.get(f"{BASE_URL}/api/cron/reminders")
        assert r.status_code == 200
        data = r.json()
        assert VOUCHER not in data["sent"], "Reminder was re-sent — guard broken"


# ---------------- Vercel serverless structural checks ----------------
class TestVercelStructure:
    def _check_default_export(self, path):
        with open(path) as f:
            src = f.read()
        assert "export default" in src, f"{path} missing default export"
        return src

    def test_api_bookings_exists(self):
        self._check_default_export("/app/api/bookings.js")

    def test_api_assign_exists(self):
        self._check_default_export("/app/api/assign/[voucherCode].js")

    def test_api_cron_reminders_exists(self):
        self._check_default_export("/app/api/cron/reminders.js")

    def test_vercel_json_valid(self):
        with open("/app/vercel.json") as f:
            cfg = json.load(f)
        assert "crons" in cfg and isinstance(cfg["crons"], list) and len(cfg["crons"]) > 0
        assert "rewrites" in cfg and isinstance(cfg["rewrites"], list)

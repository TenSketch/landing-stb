"""Backend test suite for STB Singapore (post cron-removal, inline chauffeur email)."""
import os
import json
import time
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = os.getenv("BASE_URL", "http://localhost:3003")
DATA_FILE = "/app/data/bookings.json"

VOUCHER = f"STB-TEST-{int(time.time())}"


@pytest.fixture(scope="session")
def client():
    return requests.Session()


# ---------------- Health & static ----------------
class TestHealthAndStatic:
    def test_health(self, client):
        r = client.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert data.get("smtp") is True
        assert data.get("storage") == "local-file"

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
        assert "javascript" in r.headers.get("Content-Type", "").lower()

    def test_styles_css(self, client):
        r = client.get(f"{BASE_URL}/src/styles.css")
        assert r.status_code == 200
        assert "css" in r.headers.get("Content-Type", "").lower()


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

    def test_booking_persisted(self):
        with open(DATA_FILE) as f:
            bookings = json.load(f)
        assert VOUCHER in [b.get("voucherCode") for b in bookings]


# ---------------- Assign driver (inline chauffeur email) ----------------
class TestAssign:
    def test_get_assign_page(self, client):
        r = client.get(f"{BASE_URL}/assign/{VOUCHER}")
        assert r.status_code == 200
        html = r.text
        assert "Test Passenger" in html
        assert "Changi Airport T3" in html
        assert "Marina Bay Sands" in html
        assert "<form" in html

    def test_get_assign_not_found(self, client):
        r = client.get(f"{BASE_URL}/assign/NON-EXISTENT-CODE")
        assert r.status_code == 404
        assert "Booking not found" in r.text

    def test_post_assign_sends_chauffeur_email(self, client):
        # Pre-check: reminderSentAt should be null before
        with open(DATA_FILE) as f:
            before = next(b for b in json.load(f) if b.get("voucherCode") == VOUCHER)
        assert before.get("reminderSentAt") in (None, "")

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
        assert "Chauffeur details emailed to tensketch285@gmail.com" in r.text, r.text[:500]

        # Post-check: reminderSentAt + reminderMessageId populated
        with open(DATA_FILE) as f:
            after = next(b for b in json.load(f) if b.get("voucherCode") == VOUCHER)
        assert after.get("reminderSentAt"), "reminderSentAt not set after POST /assign"
        datetime.fromisoformat(after["reminderSentAt"].replace("Z", "+00:00"))
        assert after.get("reminderMessageId"), "reminderMessageId not populated"
        # driver fields persisted
        assert after.get("driverName") == "Chandran Raj"
        assert after.get("driverPlate") == "SGX 1234 A"

    def test_assign_prefilled_after_save(self, client):
        r = client.get(f"{BASE_URL}/assign/{VOUCHER}")
        assert r.status_code == 200
        html = r.text
        assert "Chandran Raj" in html
        assert "+6598765432" in html
        assert "SGX 1234 A" in html
        assert "https://example.com/driver.jpg" in html

    def test_post_assign_second_time_updates(self, client):
        r = client.post(
            f"{BASE_URL}/assign/{VOUCHER}",
            data={
                "driverName": "New Driver",
                "driverPhone": "+6590000000",
                "driverPlate": "sgy 9999 z",
                "driverPhotoUrl": "https://example.com/new.jpg",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert r.status_code == 200
        with open(DATA_FILE) as f:
            b = next(x for x in json.load(f) if x.get("voucherCode") == VOUCHER)
        assert b.get("driverName") == "New Driver"
        assert b.get("driverPlate") == "SGY 9999 Z"


# ---------------- Cron removal checks ----------------
class TestCronRemoval:
    def test_cron_endpoint_gone(self, client):
        r = client.get(f"{BASE_URL}/api/cron/reminders")
        # Either 404 or SPA fallback (index.html) is acceptable
        if r.status_code == 200:
            assert "STB Singapore" in r.text  # SPA fallback
        else:
            assert r.status_code == 404

    def test_cron_directory_removed(self):
        assert not os.path.exists("/app/api/cron"), "/app/api/cron directory still exists"

    def test_vercel_json_no_crons(self):
        with open("/app/vercel.json") as f:
            cfg = json.load(f)
        assert "crons" not in cfg, "vercel.json still contains 'crons' field"
        assert "rewrites" in cfg
        assert "headers" in cfg
        assert cfg.get("cleanUrls") is True

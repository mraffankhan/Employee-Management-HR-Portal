from datetime import date
from fastapi.testclient import TestClient

def test_attendance_today_and_monthly(employee_client: TestClient):
    # Check today's status
    res = employee_client.get("/api/attendance/today")
    assert res.status_code == 200

    # Monthly calendar view
    monthly_res = employee_client.get("/api/attendance/monthly?year=2026&month=11")
    assert monthly_res.status_code == 200
    data = monthly_res.json()
    assert data["year"] == 2026
    assert data["month"] == 11
    assert "days" in data
    assert len(data["days"]) == 30  # November has 30 days

def test_manager_team_attendance(manager_client: TestClient):
    res = manager_client.get("/api/attendance/team")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


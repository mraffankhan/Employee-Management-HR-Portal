from datetime import date, timedelta
from fastapi.testclient import TestClient

def test_leave_types_and_balances(employee_client: TestClient):
    # Fetch leave types
    types_res = employee_client.get("/api/leaves/types")
    assert types_res.status_code == 200
    types = types_res.json()
    type_codes = [t["code"] for t in types]
    assert "casual" in type_codes
    assert "sick" in type_codes
    assert "earned" in type_codes

    # Fetch balances
    bal_res = employee_client.get("/api/leaves/balances")
    assert bal_res.status_code == 200
    balances = bal_res.json()
    assert len(balances) >= 3

def test_probation_rule_earned_leave_blocked(probation_client: TestClient):
    # Rohit Verma is on probation. Attempt to apply for Earned Leave (code: earned, id: 3)
    # Find Earned leave type id
    types_res = probation_client.get("/api/leaves/types")
    earned_type = next(t for t in types_res.json() if t["code"] == "earned")

    res = probation_client.post("/api/leaves/apply", json={
        "leave_type_id": earned_type["id"],
        "start_date": "2026-12-01",
        "end_date": "2026-12-02",
        "is_half_day": False,
        "reason": "Attempting earned leave during probation period."
    })
    assert res.status_code == 400
    assert "not permitted during probation period" in res.json()["detail"]

def test_probation_can_apply_casual_half_day(probation_client: TestClient):
    types_res = probation_client.get("/api/leaves/types")
    casual_type = next(t for t in types_res.json() if t["code"] == "casual")

    res = probation_client.post("/api/leaves/apply", json={
        "leave_type_id": casual_type["id"],
        "start_date": "2026-12-10",
        "end_date": "2026-12-10",
        "is_half_day": True,
        "half_day_session": "first_half",
        "reason": "Dental appointment in morning."
    })
    assert res.status_code == 201
    data = res.json()
    assert data["total_days"] == 0.5
    assert data["status"] == "pending"

def test_overlap_validation(probation_client: TestClient):
    types_res = probation_client.get("/api/leaves/types")
    casual_type = next(t for t in types_res.json() if t["code"] == "casual")

    # Attempt to apply overlapping on same date (2026-12-10)
    res = probation_client.post("/api/leaves/apply", json={
        "leave_type_id": casual_type["id"],
        "start_date": "2026-12-10",
        "end_date": "2026-12-10",
        "is_half_day": True,
        "half_day_session": "second_half",
        "reason": "Overlapping attempt."
    })
    assert res.status_code == 400
    assert "Overlapping leave request already exists" in res.json()["detail"]

def test_manager_approve_leave_and_deduct_balance(client: TestClient):
    # 1. Vikram applies for Sick Leave for 1 day
    client.post("/api/auth/login", json={"email": "vikram.aditya@company.com", "password": "Employee@1234"})
    types_res = client.get("/api/leaves/types")
    sick_type = next(t for t in types_res.json() if t["code"] == "sick")

    # Check balance before
    bal_before = client.get("/api/leaves/balances").json()
    sick_bal_before = next(b for b in bal_before if b["leave_type_code"] == "sick")
    initial_remaining = sick_bal_before["remaining"]

    apply_res = client.post("/api/leaves/apply", json={
        "leave_type_id": sick_type["id"],
        "start_date": "2026-12-20",
        "end_date": "2026-12-20",
        "is_half_day": False,
        "reason": "Routine health checkup."
    })
    assert apply_res.status_code == 201
    leave_id = apply_res.json()["id"]

    # 2. Manager (Rajesh Kumar) reviews pending leaves
    client.post("/api/auth/login", json={"email": "rajesh.kumar@company.com", "password": "Manager@1234"})
    pending_res = client.get("/api/leaves/pending")
    assert pending_res.status_code == 200
    pending_ids = [l["id"] for l in pending_res.json()]
    assert leave_id in pending_ids

    # 3. Manager approves
    action_res = client.post(f"/api/leaves/{leave_id}/action", json={
        "status": "approved",
        "manager_comments": "Approved. Get well soon."
    })
    assert action_res.status_code == 200
    assert action_res.json()["status"] == "approved"

    # 4. Vikram checks remaining balance (should be deducted by 1.0)
    client.post("/api/auth/login", json={"email": "vikram.aditya@company.com", "password": "Employee@1234"})
    bal_after = client.get("/api/leaves/balances").json()
    sick_bal_after = next(b for b in bal_after if b["leave_type_code"] == "sick")
    assert sick_bal_after["remaining"] == initial_remaining - 1.0


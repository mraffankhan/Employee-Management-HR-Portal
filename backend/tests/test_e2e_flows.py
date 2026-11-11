import pytest
from fastapi.testclient import TestClient

def test_full_admin_flow(admin_client: TestClient):
    # 1. Dashboard stats
    dash = admin_client.get("/api/dashboard/stats")
    assert dash.status_code == 200
    assert dash.json()["headcount"] >= 20
    assert len(dash.json()["department_split"]) >= 4

    # 2. Create department
    new_dept = admin_client.post("/api/departments", json={
        "name": "Research & Development",
        "code": "RND",
        "description": "Next-generation research and algorithms"
    })
    assert new_dept.status_code == 201
    dept_id = new_dept.json()["id"]

    # 3. Add designation
    new_desig = admin_client.post(f"/api/departments/{dept_id}/designations", json={
        "title": "Principal Scientist",
        "description": "Leads algorithmic research"
    })
    assert new_desig.status_code == 201
    desig_id = new_desig.json()["id"]

    # 4. Create new employee
    new_emp = admin_client.post("/api/employees", json={
        "first_name": "Anya",
        "last_name": "Roy",
        "email": "anya.roy@company.com",
        "password": "Employee@1234",
        "phone": "+91 99000 88776",
        "department_id": dept_id,
        "designation_id": desig_id,
        "joining_date": "2026-11-01",
        "employment_status": "active",
        "role": "employee"
    })
    assert new_emp.status_code == 201
    emp_id = new_emp.json()["id"]

    # 5. Verify employee in directory
    emp_detail = admin_client.get(f"/api/employees/{emp_id}")
    assert emp_detail.status_code == 200
    assert emp_detail.json()["department_name"] == "Research & Development"

    # 6. Data Manager access
    tables_res = admin_client.get("/api/data-manager/tables")
    assert tables_res.status_code == 200
    assert any(t["name"] == "employees" for t in tables_res.json())

    # 7. Query Data Manager
    query_res = admin_client.post("/api/data-manager/query", json={
        "table_name": "employees",
        "page": 1,
        "page_size": 10,
        "search": "Anya"
    })
    assert query_res.status_code == 200
    assert query_res.json()["total"] >= 1

    # 8. Export CSV
    csv_res = admin_client.get("/api/data-manager/export/departments?format=csv")
    assert csv_res.status_code == 200
    assert "Research & Development" in csv_res.text

    # 9. Audit Logs
    audit_res = admin_client.get("/api/data-manager/audit-logs?table_name=employees")
    assert audit_res.status_code == 200
    assert len(audit_res.json()) >= 1

def test_full_manager_flow(client: TestClient):
    # Login as Manager Rajesh Kumar (Engineering Manager)
    login_res = client.post("/api/auth/login", json={
        "email": "rajesh.kumar@company.com",
        "password": "Manager@1234"
    })
    assert login_res.status_code == 200

    # 1. Team Attendance
    team_att = client.get("/api/attendance/team")
    assert team_att.status_code == 200

    # 2. View Pending Leaves
    pending = client.get("/api/leaves/pending")
    assert pending.status_code == 200
    pending_list = pending.json()

    # 3. Manager tries to access Data Manager -> 403 Forbidden
    dm_res = client.get("/api/data-manager/tables")
    assert dm_res.status_code == 403

def test_full_employee_flow(client: TestClient):
    # Login as Employee Vikram Aditya
    login_res = client.post("/api/auth/login", json={
        "email": "vikram.aditya@company.com",
        "password": "Employee@1234"
    })
    assert login_res.status_code == 200

    # 1. Check in / out or check today's status
    today_res = client.get("/api/attendance/today")
    assert today_res.status_code == 200

    # 2. Monthly attendance calendar
    monthly = client.get("/api/attendance/monthly?year=2026&month=11")
    assert monthly.status_code == 200
    assert len(monthly.json()["days"]) == 30

    # 3. Leave Balances
    bals = client.get("/api/leaves/balances")
    assert bals.status_code == 200
    assert len(bals.json()) >= 3

    # 4. Employee tries to access Data Manager -> 403 Forbidden
    dm_res = client.get("/api/data-manager/tables")
    assert dm_res.status_code == 403

def test_full_probation_policy_flow(client: TestClient):
    # Login as Rohit Verma (on probation)
    client.post("/api/auth/login", json={
        "email": "rohit.verma@company.com",
        "password": "Employee@1234"
    })

    # Earned leave blocked
    types = client.get("/api/leaves/types").json()
    earned_type = next(t for t in types if t["code"] == "earned")
    casual_type = next(t for t in types if t["code"] == "casual")

    block_res = client.post("/api/leaves/apply", json={
        "leave_type_id": earned_type["id"],
        "start_date": "2026-12-15",
        "end_date": "2026-12-16",
        "reason": "Attempting earned leave in probation"
    })
    assert block_res.status_code == 400
    assert "not permitted during probation period" in block_res.json()["detail"]


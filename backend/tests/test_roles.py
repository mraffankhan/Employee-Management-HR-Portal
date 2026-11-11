from fastapi.testclient import TestClient

def test_employee_cannot_access_datamanager(employee_client: TestClient):
    res = employee_client.get("/api/data-manager/tables")
    assert res.status_code == 403
    assert "Administrator access required" in res.json()["detail"]

def test_manager_cannot_access_datamanager(manager_client: TestClient):
    res = manager_client.get("/api/data-manager/tables")
    assert res.status_code == 403
    assert "Administrator access required" in res.json()["detail"]

def test_admin_can_access_datamanager(admin_client: TestClient):
    res = admin_client.get("/api/data-manager/tables")
    assert res.status_code == 200
    tables = res.json()
    assert isinstance(tables, list)
    table_names = [t["name"] for t in tables]
    assert "employees" in table_names
    assert "users" in table_names

def test_employee_cannot_create_department(employee_client: TestClient):
    res = employee_client.post("/api/departments", json={
        "name": "Secret Lab",
        "code": "SLB",
        "description": "Unauthorized lab"
    })
    assert res.status_code == 403

def test_admin_can_create_and_delete_department(admin_client: TestClient):
    res = admin_client.post("/api/departments", json={
        "name": "Security & Compliance",
        "code": "SEC",
        "description": "Information security and audit compliance"
    })
    assert res.status_code == 201
    dept_id = res.json()["id"]

    # Delete
    del_res = admin_client.delete(f"/api/departments/{dept_id}")
    assert del_res.status_code == 200


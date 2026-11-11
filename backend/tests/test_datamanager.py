from fastapi.testclient import TestClient

def test_datamanager_table_listing(admin_client: TestClient):
    res = admin_client.get("/api/data-manager/tables")
    assert res.status_code == 200
    tables = res.json()
    assert len(tables) >= 8

def test_datamanager_query_and_search(admin_client: TestClient):
    res = admin_client.post("/api/data-manager/query", json={
        "table_name": "departments",
        "page": 1,
        "page_size": 10,
        "search": "Engineering",
        "sort_by": "id",
        "sort_dir": "asc"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert any("Engineering" in r["name"] for r in data["rows"])

def test_datamanager_row_lifecycle_and_audit(admin_client: TestClient):
    # 1. Add Row to leave_types
    create_res = admin_client.post("/api/data-manager/rows/leave_types", json={
        "data": {
            "code": "maternity",
            "name": "Maternity Leave",
            "annual_allowance": 180.0,
            "probation_allowed": False
        }
    })
    assert create_res.status_code == 200
    pk = create_res.json()["id"]

    # 2. Update Row
    update_res = admin_client.put(f"/api/data-manager/rows/leave_types/{pk}", json={
        "data": {
            "annual_allowance": 182.0
        }
    })
    assert update_res.status_code == 200

    # 3. Export table as CSV
    export_res = admin_client.get("/api/data-manager/export/leave_types?format=csv")
    assert export_res.status_code == 200
    assert "maternity" in export_res.text
    assert "text/csv" in export_res.headers["content-type"]

    # 4. Delete Row
    del_res = admin_client.delete(f"/api/data-manager/rows/leave_types/{pk}")
    assert del_res.status_code == 200

    # 5. Check Audit Logs
    audit_res = admin_client.get("/api/data-manager/audit-logs?table_name=leave_types")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) >= 2
    actions = [l["action"] for l in logs]
    assert "CREATE" in actions
    assert "DELETE" in actions


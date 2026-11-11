from fastapi.testclient import TestClient

def test_login_success_and_cookie(client: TestClient):
    res = client.post("/api/auth/login", json={
        "email": "admin@company.com",
        "password": "Admin@1234"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "admin@company.com"
    assert data["role"] == "admin"
    assert "hrportal_access_token" in res.cookies

def test_login_invalid_password(client: TestClient):
    res = client.post("/api/auth/login", json={
        "email": "admin@company.com",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]

def test_get_current_user_me(client: TestClient):
    # Before login
    res_unauth = client.get("/api/auth/me")
    assert res_unauth.status_code == 401

    # After login
    client.post("/api/auth/login", json={
        "email": "rajesh.kumar@company.com",
        "password": "Manager@1234"
    })
    res_auth = client.get("/api/auth/me")
    assert res_auth.status_code == 200
    data = res_auth.json()
    assert data["email"] == "rajesh.kumar@company.com"
    assert data["role"] == "manager"
    assert data["employee"]["first_name"] == "Rajesh"

def test_logout(client: TestClient):
    client.post("/api/auth/login", json={
        "email": "admin@company.com",
        "password": "Admin@1234"
    })
    res_logout = client.post("/api/auth/logout")
    assert res_logout.status_code == 200
    assert res_logout.json()["success"] is True

    # Next call should be unauthenticated
    res_after = client.get("/api/auth/me")
    assert res_after.status_code == 401


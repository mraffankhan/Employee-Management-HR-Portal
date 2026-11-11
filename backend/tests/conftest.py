import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure project root is in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.services.seed_service import seed_database
from backend.app.config import settings

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure database is seeded before running tests."""
    seed_database()
    yield

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def admin_client(client):
    res = client.post("/api/auth/login", json={"email": "admin@company.com", "password": "Admin@1234"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return client

@pytest.fixture
def manager_client(client):
    res = client.post("/api/auth/login", json={"email": "rajesh.kumar@company.com", "password": "Manager@1234"})
    assert res.status_code == 200, f"Manager login failed: {res.text}"
    return client

@pytest.fixture
def employee_client(client):
    res = client.post("/api/auth/login", json={"email": "vikram.aditya@company.com", "password": "Employee@1234"})
    assert res.status_code == 200, f"Employee login failed: {res.text}"
    return client

@pytest.fixture
def probation_client(client):
    res = client.post("/api/auth/login", json={"email": "rohit.verma@company.com", "password": "Employee@1234"})
    assert res.status_code == 200, f"Probation employee login failed: {res.text}"
    return client


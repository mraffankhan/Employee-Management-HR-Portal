import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from backend.app.services.seed_service import seed_database

if __name__ == "__main__":
    print("Seeding database with realistic Indian enterprise sample data...")
    seed_database()
    print("Seed complete! You can now run the backend and frontend.")


import csv
import io
import json
import os
import shutil
import sqlite3
from datetime import date, datetime, time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import (
    Table,
    select,
    insert,
    update,
    delete,
    func,
    or_,
    cast,
    String,
    inspect,
)
from sqlalchemy.orm import Session

from backend.app.config import settings, BACKUP_DIR, DATA_DIR
from backend.app.database import Base, engine
from backend.app.models.user import User
from backend.app.services.audit_service import log_audit_event
from backend.app.auth import hash_password

MANAGED_TABLE_NAMES = [
    "users",
    "departments",
    "designations",
    "employees",
    "attendances",
    "leave_types",
    "leave_balances",
    "leave_requests",
    "documents",
    "audit_logs",
]

def get_table_by_name(name: str) -> Table:
    if name not in Base.metadata.tables:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{name}' is not recognized or managed."
        )
    return Base.metadata.tables[name]

def get_all_tables_meta(db: Session) -> List[Dict[str, Any]]:
    tables_meta = []
    for table_name in MANAGED_TABLE_NAMES:
        if table_name in Base.metadata.tables:
            table = Base.metadata.tables[table_name]
            # Get row count
            count_res = db.execute(select(func.count()).select_from(table)).scalar() or 0
            
            columns = []
            for col in table.columns:
                fk_target = None
                if col.foreign_keys:
                    fk_target = list(col.foreign_keys)[0].target_fullname
                
                columns.append({
                    "name": col.name,
                    "type": str(col.type),
                    "nullable": bool(col.nullable),
                    "primary_key": bool(col.primary_key),
                    "default": str(col.default.arg) if col.default is not None and hasattr(col.default, 'arg') else None,
                    "foreign_key": fk_target
                })
            
            tables_meta.append({
                "name": table_name,
                "row_count": count_res,
                "columns": columns
            })
    return tables_meta

def cast_value_for_column(col, raw_value: Any) -> Any:
    if raw_value is None or raw_value == "":
        if col.nullable:
            return None
        if col.primary_key:
            return None

    str_type = str(col.type).lower()
    val_str = str(raw_value).strip() if raw_value is not None else ""

    try:
        if "bool" in str_type:
            if isinstance(raw_value, bool):
                return raw_value
            return val_str.lower() in ("true", "1", "yes", "t")
        elif "int" in str_type:
            return int(val_str)
        elif "float" in str_type or "numeric" in str_type or "real" in str_type:
            return float(val_str)
        elif "datetime" in str_type:
            if isinstance(raw_value, datetime):
                return raw_value
            # Try ISO formats
            return datetime.fromisoformat(val_str.replace("Z", "+00:00"))
        elif "date" in str_type:
            if isinstance(raw_value, date):
                return raw_value
            return date.fromisoformat(val_str[:10])
        elif "time" in str_type:
            if isinstance(raw_value, time):
                return raw_value
            parts = val_str.split(":")
            return time(int(parts[0]), int(parts[1]), int(parts[2].split(".")[0]) if len(parts) > 2 else 0)
        else:
            return str(raw_value)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Field '{col.name}' could not be converted to {str_type}. Error: {str(e)}"
        )

def query_table(
    db: Session,
    table_name: str,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: Optional[str] = "asc",
    filters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    table = get_table_by_name(table_name)
    query = select(table)

    # Apply search across text-like columns
    if search:
        search_terms = []
        for col in table.columns:
            search_terms.append(cast(col, String).ilike(f"%{search}%"))
        if search_terms:
            query = query.where(or_(*search_terms))

    # Apply specific column filters
    if filters:
        for col_name, filter_val in filters.items():
            if col_name in table.c and filter_val is not None and filter_val != "":
                col = table.c[col_name]
                if isinstance(filter_val, str) and ("%" in filter_val or "*" in filter_val):
                    query = query.where(cast(col, String).ilike(filter_val.replace("*", "%")))
                else:
                    query = query.where(col == cast_value_for_column(col, filter_val))

    # Total count query
    count_query = select(func.count()).select_from(query.subquery())
    total_count = db.execute(count_query).scalar() or 0

    # Sort
    if sort_by and sort_by in table.c:
        col = table.c[sort_by]
        query = query.order_by(col.desc() if sort_dir.lower() == "desc" else col.asc())
    else:
        # Default sort by primary key asc/desc
        pk_cols = [c for c in table.columns if c.primary_key]
        if pk_cols:
            query = query.order_by(pk_cols[0].asc())

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    results = db.execute(query).fetchall()

    # Format rows
    columns_info = []
    for col in table.columns:
        fk_target = None
        if col.foreign_keys:
            fk_target = list(col.foreign_keys)[0].target_fullname
        columns_info.append({
            "name": col.name,
            "type": str(col.type),
            "nullable": bool(col.nullable),
            "primary_key": bool(col.primary_key),
            "foreign_key": fk_target
        })

    rows_data = []
    for row in results:
        row_dict = {}
        for col_name, val in row._mapping.items():
            if isinstance(val, (datetime, date, time)):
                row_dict[col_name] = val.isoformat()
            else:
                row_dict[col_name] = val
        rows_data.append(row_dict)

    total_pages = (total_count + page_size - 1) // page_size if page_size > 0 else 1

    return {
        "table_name": table_name,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "columns": columns_info,
        "rows": rows_data
    }

def create_table_row(
    db: Session,
    table_name: str,
    data: Dict[str, Any],
    current_user: User
) -> Dict[str, Any]:
    table = get_table_by_name(table_name)
    cleaned_data = {}

    for col in table.columns:
        if col.name in data:
            raw_val = data[col.name]
            # If inserting into users.password_hash and plain text was given, auto-hash if needed
            if table_name == "users" and col.name == "password_hash" and raw_val:
                if not str(raw_val).startswith("$2b$"):
                    raw_val = hash_password(str(raw_val))
            
            cleaned_data[col.name] = cast_value_for_column(col, raw_val)

    try:
        stmt = insert(table).values(**cleaned_data)
        result = db.execute(stmt)
        db.commit()
        
        # Primary key of inserted row
        inserted_pk = result.inserted_primary_key[0] if result.inserted_primary_key else None
        
        log_audit_event(
            db=db,
            user=current_user,
            action="CREATE",
            target_table=table_name,
            target_id=str(inserted_pk),
            change_summary=f"Inserted row with data: {json.dumps({k: str(v) for k, v in cleaned_data.items()})}"
        )

        return {"success": True, "id": inserted_pk, "message": f"Row inserted successfully into {table_name}."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create row: {str(e)}"
        )

def update_table_row(
    db: Session,
    table_name: str,
    pk_value: Any,
    data: Dict[str, Any],
    current_user: User
) -> Dict[str, Any]:
    table = get_table_by_name(table_name)
    pk_cols = [c for c in table.columns if c.primary_key]
    if not pk_cols:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Table does not have a primary key.")
    pk_col = pk_cols[0]

    # Verify row exists
    typed_pk = cast_value_for_column(pk_col, pk_value)
    existing = db.execute(select(table).where(pk_col == typed_pk)).first()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Row with ID {pk_value} not found.")

    cleaned_data = {}
    for col in table.columns:
        if col.name in data and col.name != pk_col.name:
            raw_val = data[col.name]
            if table_name == "users" and col.name == "password_hash" and raw_val:
                if not str(raw_val).startswith("$2b$"):
                    raw_val = hash_password(str(raw_val))
            cleaned_data[col.name] = cast_value_for_column(col, raw_val)

    if not cleaned_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided to update.")

    try:
        stmt = update(table).where(pk_col == typed_pk).values(**cleaned_data)
        db.execute(stmt)
        db.commit()

        log_audit_event(
            db=db,
            user=current_user,
            action="UPDATE",
            target_table=table_name,
            target_id=str(pk_value),
            change_summary=f"Updated fields: {list(cleaned_data.keys())}"
        )

        return {"success": True, "id": pk_value, "message": f"Row {pk_value} in {table_name} updated successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update row: {str(e)}"
        )

def delete_table_row(
    db: Session,
    table_name: str,
    pk_value: Any,
    current_user: User
) -> Dict[str, Any]:
    table = get_table_by_name(table_name)
    pk_cols = [c for c in table.columns if c.primary_key]
    if not pk_cols:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Table has no primary key.")
    pk_col = pk_cols[0]

    typed_pk = cast_value_for_column(pk_col, pk_value)
    existing = db.execute(select(table).where(pk_col == typed_pk)).first()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Row with ID {pk_value} not found.")

    try:
        stmt = delete(table).where(pk_col == typed_pk)
        db.execute(stmt)
        db.commit()

        log_audit_event(
            db=db,
            user=current_user,
            action="DELETE",
            target_table=table_name,
            target_id=str(pk_value),
            change_summary=f"Deleted row ID {pk_value} from {table_name}"
        )

        return {"success": True, "message": f"Row {pk_value} deleted from {table_name}."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete row: {str(e)}"
        )

def export_table_data(db: Session, table_name: str, format_type: str = "json") -> Tuple[str, str]:
    table = get_table_by_name(table_name)
    query = select(table)
    results = db.execute(query).fetchall()

    rows = []
    for row in results:
        d = {}
        for k, v in row._mapping.items():
            if isinstance(v, (datetime, date, time)):
                d[k] = v.isoformat()
            else:
                d[k] = v
        rows.append(d)

    if format_type.lower() == "csv":
        output = io.StringIO()
        fieldnames = [c.name for c in table.columns]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
        return output.getvalue(), "text/csv"
    else:
        return json.dumps(rows, indent=2), "application/json"

def import_table_data(
    db: Session,
    table_name: str,
    records: List[Dict[str, Any]],
    current_user: User
) -> Dict[str, Any]:
    table = get_table_by_name(table_name)
    pk_cols = [c for c in table.columns if c.primary_key]
    pk_col = pk_cols[0] if pk_cols else None

    inserted = 0
    updated = 0
    errors = []

    for idx, raw_record in enumerate(records):
        try:
            cleaned = {}
            for col in table.columns:
                if col.name in raw_record:
                    cleaned[col.name] = cast_value_for_column(col, raw_record[col.name])

            # Check if pk exists for update
            pk_val = cleaned.get(pk_col.name) if pk_col else None
            existing = None
            if pk_val is not None:
                existing = db.execute(select(table).where(pk_col == pk_val)).first()

            if existing and pk_val is not None:
                update_vals = {k: v for k, v in cleaned.items() if k != pk_col.name}
                if update_vals:
                    db.execute(update(table).where(pk_col == pk_val).values(**update_vals))
                    updated += 1
            else:
                db.execute(insert(table).values(**cleaned))
                inserted += 1
        except Exception as e:
            errors.append(f"Row {idx + 1}: {str(e)}")

    if inserted > 0 or updated > 0:
        db.commit()
        log_audit_event(
            db=db,
            user=current_user,
            action="IMPORT",
            target_table=table_name,
            change_summary=f"Imported {inserted} new, {updated} updated rows. {len(errors)} errors."
        )
    else:
        db.rollback()

    return {
        "table_name": table_name,
        "inserted_count": inserted,
        "updated_count": updated,
        "errors": errors
    }

def create_db_backup(db: Session, current_user: User) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"hrportal_backup_{timestamp}.db"
    
    # Flush SQLite DB
    db.commit()
    
    # Ensure source DB exists
    src_db = settings.DATABASE_PATH
    if not src_db.exists():
        raise HTTPException(status_code=500, detail="Source database file not found.")

    shutil.copy2(src_db, backup_file)
    
    log_audit_event(
        db=db,
        user=current_user,
        action="BACKUP",
        target_table="SYSTEM",
        change_summary=f"Created database backup: {backup_file.name}"
    )
    return backup_file

def validate_and_restore_backup(
    db: Session,
    uploaded_file_path: Path,
    current_user: User
) -> Dict[str, Any]:
    # 1. Check SQLite magic header
    with open(uploaded_file_path, "rb") as f:
        header = f.read(16)
        if header != b"SQLite format 3\x00":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid backup file: not a valid SQLite database."
            )

    # 2. Check that it contains required tables
    try:
        conn = sqlite3.connect(uploaded_file_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = {row[0] for row in cursor.fetchall()}
        conn.close()

        required = {"users", "employees", "departments", "attendances", "leave_types"}
        missing = required - tables
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Corrupt backup file: missing core tables: {list(missing)}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Verification failed on backup file: {str(e)}"
        )

    # 3. Create a safety snapshot of current DB first
    create_db_backup(db, current_user)

    # 4. Close active session connections
    db.close()
    engine.dispose()

    # 5. Overwrite database file
    target_db = settings.DATABASE_PATH
    shutil.copy2(uploaded_file_path, target_db)

    # 6. Reconnect and log
    from backend.app.database import SessionLocal
    new_db = SessionLocal()
    try:
        log_audit_event(
            db=new_db,
            user=current_user,
            action="RESTORE",
            target_table="SYSTEM",
            change_summary=f"Restored database from backup file {uploaded_file_path.name}"
        )
    finally:
        new_db.close()

    return {"success": True, "message": "Database restored successfully."}


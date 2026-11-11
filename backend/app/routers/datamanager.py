import json
import csv
import io
import shutil
import tempfile
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response, status
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.deps import require_admin
from backend.app.models.user import User
from backend.app.models.audit import AuditLog
from backend.app.schemas.datamanager import (
    TableMeta,
    TableQueryRequest,
    TableQueryResponse,
    RowCreateRequest,
    RowUpdateRequest,
    BulkImportResponse,
)
from backend.app.schemas.audit import AuditLogResponse
from backend.app.services.datamanager_service import (
    get_all_tables_meta,
    query_table,
    create_table_row,
    update_table_row,
    delete_table_row,
    export_table_data,
    import_table_data,
    create_db_backup,
    validate_and_restore_backup,
)
from backend.app.services.seed_service import seed_database
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/data-manager", tags=["Data Manager (Admin Only)"])

@router.get("/tables", response_model=List[TableMeta])
def list_tables(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    return get_all_tables_meta(db)

@router.post("/query", response_model=TableQueryResponse)
def query_table_data(
    payload: TableQueryRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    res = query_table(
        db=db,
        table_name=payload.table_name,
        page=payload.page,
        page_size=payload.page_size,
        search=payload.search,
        sort_by=payload.sort_by,
        sort_dir=payload.sort_dir,
        filters=payload.filters
    )
    return TableQueryResponse(**res)

@router.post("/rows/{table_name}")
def add_row(
    table_name: str,
    payload: RowCreateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    return create_table_row(
        db=db,
        table_name=table_name,
        data=payload.data,
        current_user=admin_user
    )

@router.put("/rows/{table_name}/{pk}")
def edit_row(
    table_name: str,
    pk: str,
    payload: RowUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    return update_table_row(
        db=db,
        table_name=table_name,
        pk_value=pk,
        data=payload.data,
        current_user=admin_user
    )

@router.delete("/rows/{table_name}/{pk}")
def remove_row(
    table_name: str,
    pk: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    return delete_table_row(
        db=db,
        table_name=table_name,
        pk_value=pk,
        current_user=admin_user
    )

@router.get("/export/{table_name}")
def export_table(
    table_name: str,
    format: str = Query(default="csv", pattern="^(csv|json)$"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    content, media_type = export_table_data(db, table_name, format)
    filename = f"{table_name}_export.{format}"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/import/{table_name}", response_model=BulkImportResponse)
async def import_table(
    table_name: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    contents = await file.read()
    text = contents.decode("utf-8")
    records = []

    if file.filename.endswith(".csv"):
        reader = csv.DictReader(io.StringIO(text))
        records = [row for row in reader]
    elif file.filename.endswith(".json"):
        records = json.loads(text)
        if not isinstance(records, list):
            raise HTTPException(status_code=400, detail="JSON must contain a list of objects.")
    else:
        raise HTTPException(status_code=400, detail="Uploaded file must be a .csv or .json file.")

    res = import_table_data(db, table_name, records, admin_user)
    return BulkImportResponse(**res)

@router.get("/backup")
def download_backup(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    backup_path = create_db_backup(db, admin_user)
    return FileResponse(
        path=str(backup_path),
        filename=backup_path.name,
        media_type="application/x-sqlite3"
    )

@router.post("/restore")
async def restore_database(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    temp_dir = tempfile.mkdtemp()
    temp_path = Path(temp_dir) / file.filename
    try:
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        res = validate_and_restore_backup(db, temp_path, admin_user)
        return res
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

@router.post("/reset")
def reset_to_sample_data(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    seed_database(db)
    log_audit_event(
        db=db,
        user=admin_user,
        action="RESET",
        target_table="ALL",
        change_summary="Reset database to realistic enterprise sample data."
    )
    return {"success": True, "message": "Database reset to sample data successfully."}

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    action: Optional[str] = Query(default=None),
    table_name: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action.upper())
    if table_name:
        query = query.filter(AuditLog.target_table == table_name)
    
    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    return logs

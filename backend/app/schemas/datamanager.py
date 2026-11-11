from typing import Any, Optional, List, Dict
from pydantic import BaseModel

class TableColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool
    primary_key: bool
    default: Optional[str] = None
    foreign_key: Optional[str] = None

class TableMeta(BaseModel):
    name: str
    row_count: int
    columns: List[TableColumnInfo]

class TableQueryRequest(BaseModel):
    table_name: str
    page: int = 1
    page_size: int = 20
    search: Optional[str] = None
    sort_by: Optional[str] = None
    sort_dir: Optional[str] = "asc"  # "asc" or "desc"
    filters: Optional[Dict[str, Any]] = None

class TableQueryResponse(BaseModel):
    table_name: str
    total: int
    page: int
    page_size: int
    total_pages: int
    columns: List[TableColumnInfo]
    rows: List[Dict[str, Any]]

class RowCreateRequest(BaseModel):
    data: Dict[str, Any]

class RowUpdateRequest(BaseModel):
    data: Dict[str, Any]

class BulkImportResponse(BaseModel):
    table_name: str
    inserted_count: int
    updated_count: int
    errors: List[str] = []


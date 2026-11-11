from typing import Optional
from sqlalchemy.orm import Session
from backend.app.models.audit import AuditLog
from backend.app.models.user import User

def log_audit_event(
    db: Session,
    user: Optional[User],
    action: str,
    target_table: str,
    target_id: Optional[str] = None,
    change_summary: Optional[str] = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else "system",
        action=action,
        target_table=target_table,
        target_id=str(target_id) if target_id is not None else None,
        change_summary=change_summary,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


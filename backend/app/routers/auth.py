from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
from backend.app.database import get_db
from backend.app.config import settings
from backend.app.models.user import User, Collector, Recycler, UserRole, AuthorizationStatus
from backend.app.schemas.auth import Token, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    phone = login_data.phone.strip()
    user = db.query(User).filter(User.phone == phone).first()
    
    if not user:
        # Auto-create user for field accessibility (phone-based onboarding without complicated password barriers)
        role = login_data.role or UserRole.COLLECTOR.value
        user = User(
            phone=phone,
            name=login_data.name or ("Informal Collector" if role == UserRole.COLLECTOR.value else "Recycler Representative"),
            role=role,
            preferred_language=login_data.preferred_language or "hi"
        )
        db.add(user)
        db.flush()
        
        if role == UserRole.COLLECTOR.value:
            collector = Collector(
                user_id=user.id,
                collector_code=f"COL-MH-{user.id:04d}",
                city="Mumbai",
                state="Maharashtra"
            )
            db.add(collector)
        elif role == UserRole.RECYCLER.value:
            recycler = Recycler(
                user_id=user.id,
                company_name="New Authorized Recycler Partner",
                contact_person=user.name,
                address="Industrial Estate, MIDC",
                city="Mumbai",
                authorization_status=AuthorizationStatus.PENDING_VERIFICATION.value
            )
            db.add(recycler)
        db.commit()
        db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "phone": user.phone, "role": user.role})
    
    return Token(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        phone=user.phone,
        name=user.name,
        role=user.role,
        preferred_language=user.preferred_language
    )

@router.get("/me", response_model=UserOut)
def get_current_user_profile(phone: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.models.models import User, Boat
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, Token
from fastapi.security import OAuth2PasswordBearer
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    clean_phone = user_in.phone.strip()
    clean_name = user_in.name.strip()
    
    existing_phone = db.query(User).filter(User.phone == clean_phone).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="This phone number is already registered. Please log in.")
        
    existing_name = db.query(User).filter(User.name == clean_name).first()
    if existing_name:
        raise HTTPException(status_code=400, detail="This username is already taken. Please choose another username.")
    
    user_id = str(uuid.uuid4())
    boat_reg = user_in.boat_id or ("IND-TN-02-MM-4410" if user_in.role == "fisher" else "Poseidon Alpha (MM-01)")
    
    # Check or create Boat in boats sub-database
    boat = db.query(Boat).filter(Boat.registration_number == boat_reg).first()
    if not boat:
        boat = Boat(
            id=str(uuid.uuid4()),
            name=boat_reg,
            registration_number=boat_reg,
            harbour="Kasimedu",
            owner_id=user_id
        )
        db.add(boat)
    else:
        if not boat.owner_id:
            boat.owner_id = user_id
    
    new_user = User(
        id=user_id,
        name=clean_name,
        phone=clean_phone,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        boat_id=boat.registration_number
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    clean_identifier = login_data.phone.strip()
    user = db.query(User).filter(
        (User.phone == clean_identifier) | (User.name == clean_identifier)
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found. Please create an account first."
        )
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please check your password and try again."
        )
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

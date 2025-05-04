from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from api.routers.schemas.models import User
from api.db.database import get_db
from api.db import models
from api.db.utils.hashing import *


router = APIRouter()

@router.post("/sign_up/", status_code=status.HTTP_201_CREATED)
async def register_user(user: User, db: Session = Depends(get_db)):
    try:
        # Check if user already exists
        existing_user = db.query(models.User).filter(models.User.email == user.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Hash the password
        hashed_password = hash_password(user.password)
        
        # Create new user
        db_user = models.User(
            email=user.email,
            password=hashed_password
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return {
            "message": "User created successfully",
            "user_id": str(db_user.id),
            "email": db_user.email
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/sign_in/")
async def sign_in(user: User, db: Session = Depends(get_db)):
    try:
        existing_user = db.query(models.User).filter(models.User.email == user.email).first()
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")

        hashed_password = hash_password(user.password)

        if not verify_password(hashed_password, existing_user.password):
            raise HTTPException(status_code=401, detail="Incorrect password")

        return {
            "message": "User signed in successfully",
            "user_id": str(existing_user.id),
            "email": existing_user.email
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
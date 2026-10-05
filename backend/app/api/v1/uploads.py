import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
from typing import Dict, Any

router = APIRouter(prefix="/uploads", tags=["Photo Uploads"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/photo", status_code=status.HTTP_201_CREATED)
async def upload_gear_photo(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Accepts net photos from mobile phone cameras, saves locally/to object storage,
    and returns a public URL for the report record.
    """
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Allowed formats: JPEG, PNG, WEBP."
        )

    # Generate unique filename
    extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save image: {str(e)}"
        )

    # Return accessible relative URL
    photo_url = f"/api/v1/uploads/photo/{filename}"
    return {
        "filename": filename,
        "photo_url": photo_url,
        "content_type": file.content_type
    }

@router.get("/photo/{filename}")
async def get_uploaded_photo(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(file_path)

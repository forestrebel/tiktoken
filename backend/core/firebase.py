"""Firebase service for video storage and auth."""
from typing import Optional
import asyncio
from firebase_admin import credentials, storage, auth, exceptions
import firebase_admin
from fastapi import UploadFile
from pydantic import BaseModel

from .config import get_firebase_settings

class FirebaseError(Exception):
    """Base class for Firebase errors."""
    pass

class StorageError(FirebaseError):
    """Firebase storage specific errors."""
    pass

class AuthError(FirebaseError):
    """Firebase auth specific errors."""
    pass

class ProcessedVideo(BaseModel):
    """Processed video ready for storage."""
    file_path: str
    content_type: str
    metadata: dict
    user_id: Optional[str] = None

class FirebaseService:
    """Firebase service for video storage and auth."""
    def __init__(self):
        """Initialize Firebase with service account."""
        self.settings = get_firebase_settings()
        
        try:
            firebase_admin.get_app()
        except ValueError:
            cred = credentials.Certificate(self.settings.credentials_path)
            firebase_admin.initialize_app(cred, {
                'storageBucket': self.settings.storage_bucket
            })
        
        self.bucket = storage.bucket()
    
    async def store_video(self, video: ProcessedVideo) -> str:
        """Store processed video in Firebase Storage with retries."""
        blob = self.bucket.blob(f"videos/{video.file_path}")
        blob.content_type = video.content_type
        if video.metadata:
            blob.metadata = video.metadata
        
        for attempt in range(self.settings.max_retry_attempts):
            try:
                # Upload with timeout
                async with asyncio.timeout(self.settings.timeout_seconds):
                    with open(video.file_path, 'rb') as file:
                        blob.upload_from_file(file)
                    
                    # Make public and get URL
                    blob.make_public()
                    return blob.public_url
                    
            except asyncio.TimeoutError:
                if attempt == self.settings.max_retry_attempts - 1:
                    raise StorageError("Upload timeout after retries")
                await asyncio.sleep(1)  # Wait before retry
                
            except Exception as e:
                if attempt == self.settings.max_retry_attempts - 1:
                    # Clean up failed upload
                    try:
                        blob.delete()
                    except:
                        pass
                    raise StorageError(f"Failed to store video: {str(e)}")
                await asyncio.sleep(1)
    
    async def verify_token(self, token: str) -> dict:
        """Verify Firebase auth token with proper error handling."""
        try:
            decoded_token = auth.verify_id_token(token)
            return decoded_token
        except auth.InvalidIdTokenError:
            raise AuthError("Invalid or expired token")
        except auth.RevokedIdTokenError:
            raise AuthError("Token has been revoked")
        except Exception as e:
            raise AuthError(f"Authentication failed: {str(e)}")

# Global instance
_firebase = None

def get_firebase() -> FirebaseService:
    """Get Firebase service singleton."""
    global _firebase
    if _firebase is None:
        _firebase = FirebaseService()
    return _firebase 
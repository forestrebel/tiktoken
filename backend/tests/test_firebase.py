"""Test Firebase integration."""
import pytest
from unittest.mock import Mock, patch
from core.firebase import (
    FirebaseService,
    ProcessedVideo,
    StorageError,
    AuthError
)

@pytest.fixture
def mock_firebase():
    """Mock Firebase service."""
    with patch('firebase_admin.credentials.Certificate'), \
         patch('firebase_admin.initialize_app'), \
         patch('firebase_admin.get_app', side_effect=ValueError):
        service = FirebaseService()
        
        # Mock storage bucket
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        service.bucket = mock_bucket
        
        yield service

@pytest.mark.asyncio
async def test_store_video_success(mock_firebase, tmp_path):
    """Test successful video storage."""
    # Create test file
    test_file = tmp_path / "test.mp4"
    test_file.write_bytes(b"test content")
    
    video = ProcessedVideo(
        file_path=str(test_file),
        content_type="video/mp4",
        metadata={"test": "data"},
        user_id="test_user"
    )
    
    # Mock successful upload
    mock_blob = mock_firebase.bucket.blob.return_value
    mock_blob.public_url = "https://test.url/video.mp4"
    
    # Test storage
    url = await mock_firebase.store_video(video)
    assert url == "https://test.url/video.mp4"
    assert mock_blob.upload_from_file.called
    assert mock_blob.make_public.called

@pytest.mark.asyncio
async def test_store_video_retry(mock_firebase, tmp_path):
    """Test video storage with retry."""
    test_file = tmp_path / "test.mp4"
    test_file.write_bytes(b"test content")
    
    video = ProcessedVideo(
        file_path=str(test_file),
        content_type="video/mp4",
        metadata={},
    )
    
    # Mock blob to fail twice then succeed
    mock_blob = mock_firebase.bucket.blob.return_value
    mock_blob.upload_from_file.side_effect = [
        Exception("First failure"),
        Exception("Second failure"),
        None  # Success
    ]
    mock_blob.public_url = "https://test.url/video.mp4"
    
    # Test storage with retries
    url = await mock_firebase.store_video(video)
    assert url == "https://test.url/video.mp4"
    assert mock_blob.upload_from_file.call_count == 3

@pytest.mark.asyncio
async def test_store_video_failure(mock_firebase, tmp_path):
    """Test video storage failure."""
    test_file = tmp_path / "test.mp4"
    test_file.write_bytes(b"test content")
    
    video = ProcessedVideo(
        file_path=str(test_file),
        content_type="video/mp4",
        metadata={},
    )
    
    # Mock persistent failure
    mock_blob = mock_firebase.bucket.blob.return_value
    mock_blob.upload_from_file.side_effect = Exception("Upload failed")
    
    # Test storage failure
    with pytest.raises(StorageError):
        await mock_firebase.store_video(video)
    
    # Verify cleanup attempted
    assert mock_blob.delete.called

@pytest.mark.asyncio
async def test_verify_token(mock_firebase):
    """Test token verification."""
    with patch('firebase_admin.auth.verify_id_token') as mock_verify:
        mock_verify.return_value = {"uid": "test_user"}
        
        # Test valid token
        result = await mock_firebase.verify_token("valid_token")
        assert result["uid"] == "test_user"
        
        # Test invalid token
        mock_verify.side_effect = auth.InvalidIdTokenError("Invalid token")
        with pytest.raises(AuthError):
            await mock_firebase.verify_token("invalid_token") 
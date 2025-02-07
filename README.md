# TikToken Video Processing System

A high-performance video processing system for 9:16 portrait videos with real-time validation and status tracking.

## Features

- ⚡ Fast video upload and processing
- 📱 9:16 aspect ratio validation
- 🔄 Real-time status updates
- 📊 Performance monitoring
- 🛠️ Error handling with recovery

## Quick Start

### Prerequisites

```bash
# Install dependencies
pipenv install

# Start backend services
docker-compose up -d

# Run backend
cd backend
uvicorn main:app --reload
```

### System Architecture

```
Frontend (React Native)
  │
  ├─ Video Upload
  │   └─ Multipart Form Data
  │
Backend (FastAPI)
  ├─ Video Validation
  │   ├─ FFmpeg Processing
  │   └─ Format Checking
  │
  ├─ Status Tracking
  │   ├─ Processing State
  │   └─ Progress Updates
  │
  └─ Storage (Local)
      └─ Processed Videos
```

## API Endpoints

### Upload Video
```http
POST /upload
Content-Type: multipart/form-data

Response:
{
  "id": "video_id",
  "url": "video_url",
  "specs": {
    "width": 720,
    "height": 1280,
    "fps": 30,
    "duration": 30
  }
}
```

### Check Status
```http
GET /videos/{video_id}/status

Response:
{
  "id": "video_id",
  "state": "completed",
  "progress": 100
}
```

### Get Metadata
```http
GET /videos/{video_id}/metadata

Response:
{
  "id": "video_id",
  "filename": "video.mp4",
  "url": "video_url",
  "specs": {...},
  "storage_info": {...}
}
```

### System Health
```http
GET /health

Response:
{
  "status": "ok",
  "dependencies": {
    "ffmpeg": {"status": "ok", "version": "..."},
    "magic": {"status": "ok"}
  },
  "storage": {"status": "ok"}
}
```

## Performance Targets

- Upload Time: < 3 seconds
- API Latency: < 100ms
- Memory Usage: < 500MB
- Concurrent Uploads: 10+
- Status Polling: 50+ clients

## Video Requirements

- Resolution: 720x1280 (9:16)
- Frame Rate: 29.97-30 fps
- Format: H.264/HEVC
- Color Space: BT.709
- Max Duration: 60 seconds
- Max Size: 6MB

## Error Handling

The system provides clear error messages and recovery suggestions:

```json
{
  "error": "Invalid resolution: 1920x1080",
  "suggestions": [
    "Video must be exactly 720x1280",
    "Use a video editor to resize",
    "Most phones can record in this resolution natively"
  ]
}
```

## Development

### Running Tests
```bash
# Run all tests
pytest

# Run specific test categories
pytest tests/test_integration.py
pytest tests/test_performance.py
pytest tests/test_demo.py
```

### Performance Testing
```bash
# Test upload throughput
pytest tests/test_performance.py::test_upload_throughput

# Test system stability
pytest tests/test_demo.py::test_system_stability_flow
```

## Monitoring

The system provides real-time monitoring through the health endpoint:
- Component status
- Performance metrics
- Resource usage
- System stability

## Known Limitations

- Local storage only (no cloud)
- Single-node processing
- No authentication
- Basic error recovery 
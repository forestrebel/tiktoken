# TikToken Video Processing System

A high-performance video processing system for 9:16 portrait videos with real-time validation and status tracking.

## Features

- ⚡ Fast video upload and processing
- 📱 9:16 aspect ratio validation
- 🔄 Real-time status updates
- 📊 Performance monitoring
- 🛠️ Error handling with recovery

## Quick Start

1. Install Android Studio and create a Pixel7Pro AVD
2. Run the app:
   ```bash
   make start
   ```

That's it! The command will:
- Check and install dependencies
- Set up the environment
- Start the emulator
- Launch the app

## Available Commands

```bash
make check    # Check environment and dependencies
make install  # Install project dependencies
make setup    # Set up environment
make start    # Start the app (emulator + metro + app)
make stop     # Stop all services
make clean    # Clean up everything
```

## Troubleshooting

If you see any errors, try these steps:

1. Clean and restart:
   ```bash
   make clean
   make start
   ```

2. Check environment:
   ```bash
   make check
   ```

3. Verify Android Studio setup:
   - Open Android Studio
   - Tools -> Device Manager
   - Create Pixel7Pro AVD if missing

## System Requirements

- Java 11 (OpenJDK)
- Android Studio
- Node.js & Yarn
- Linux/macOS

The `make check` command will help install missing dependencies.

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
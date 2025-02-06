# TikToken Video Validation Service

A lightweight video validation service that performs fast, critical validations for video uploads. Uses container-first testing approach for consistent validation across environments.

## Video Requirements

- Resolution: 720x1280 (portrait)
- Color Space: BT.709
- FPS: 29.97-30
- Size: Max 6MB
- Duration: Max 60s

## Container Testing

### Prerequisites
- Docker
- Docker Compose
- Node.js 14+ (for local development)

### Running Tests

```bash
# Run tests in container (recommended)
./scripts/test-container.sh

# Run tests locally (requires ffmpeg)
npm test
```

### Test Environment

The container test environment is configured with:
- Memory limit: 256MB
- CPU limit: 0.5 cores
- Read-only fixtures
- Isolated state
- 5s test timeout

## Usage

```javascript
const { validateVideo } = require('@tiktoken/validation');

// Validate a video file
const result = await validateVideo('/path/to/video.mp4');

// Result structure
{
  valid: boolean,       // true if video meets all requirements
  specs: {             // video specifications
    width: number,     // video width in pixels
    height: number,    // video height in pixels
    duration: number,  // duration in seconds
    size: number,      // file size in bytes
    fps: number,       // frames per second
    colorSpace: string,// color space (e.g. 'bt709')
    bitrate: number    // video bitrate in bits/second
  },
  errors: [{          // detailed validation errors
    code: string,     // error code (e.g. 'INVALID_RESOLUTION')
    message: string,  // human-readable error message
    suggestion: string,// suggested fix
    specs: Object     // relevant specifications
  }],
  issues: string[]    // list of error messages
}
```

## Development

```bash
# Generate test fixtures
node scripts/generate_fixtures.js

# Run tests with watch mode
docker compose -f docker-compose.test.yml run \
    --rm \
    validation \
    npm run test:watch
```

## Notes

- Container-first testing approach
- Fast validation with early exits
- Clean state management
- Resource-constrained testing
- Minimal dependencies

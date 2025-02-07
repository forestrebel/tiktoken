# Firebase Migration Context

## Branch: `firebase-centric`

This document provides context for the ongoing migration from a FastAPI + Supabase backend to a Firebase-centric architecture.

## Current State

### 1. Architecture Migration Progress

#### Completed ✅
- Removed Supabase dependencies
- Set up Firebase Storage emulator
- Established basic testing infrastructure
- Implemented initial storage rules
- Fixed authentication token issues (switched from `uid` to `sub`)

#### In Progress 🚧
- Video metadata validation in storage rules
- Client-side Firebase integration
- Video processing triggers

#### Not Started ❌
- Firebase Functions setup
- Mobile app Firebase Storage integration
- User-specific video collections
- Production deployment configuration

### 2. Current Testing Setup

The testing environment is configured in `test/storage.rules.test.js` with the following structure:

```javascript
const testEnv = await initializeTestEnvironment({
  projectId: "demo-tiktoken",
  storage: {
    rules: fs.readFileSync('storage.rules', 'utf8'),
    host: "127.0.0.1",
    port: 9199
  }
});
```

Key test cases:
- Basic authentication flow
- Test user uploads
- Public read access
- Upload validation

### 3. Storage Rules Structure

Current rules (`storage.rules`):
```javascript
service firebase.storage {
  match /b/{bucket}/o {
    // Core validation functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isValidVideo() {
      return request.resource.contentType == 'video/mp4'
        && request.resource.size <= 100 * 1024 * 1024;
    }

    function isTestUser() {
      return request.auth != null 
        && request.auth.token.sub.matches('test_.*');
    }

    match /videos/{videoId} {
      allow read: if true;
      allow write: if isTestUser() && isValidVideo();
    }

    match /test/{filename} {
      allow read: if true;
      allow write: if isAuthenticated();
    }
  }
}
```

## Development Environment

### Required Tools
- Firebase CLI
- Node.js (for testing)
- Firebase Emulator Suite

### Running the Environment

1. Start Firebase emulator:
```bash
firebase emulators:start --only storage
```

2. Run tests:
```bash
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 npm run test:storage
```

### Known Issues

1. IPv6 Binding Warning
   - Symptom: Warning about port 4500 not available on ::1
   - Workaround: Using 127.0.0.1 instead of localhost
   - Status: Non-blocking, tests run successfully

2. Authentication Token Format
   - Issue: Changed from `uid` to `sub` for user identification
   - Fixed in test setup
   - Remember to use `sub` in all new auth contexts

## Next Steps

### Immediate Priorities
1. Complete video metadata validation
   - Port validation logic from `backend/api/validation.py`
   - Implement in storage rules
   - Add corresponding tests

2. Client Integration
   - Update `app/src/services/video.js`
   - Replace FastAPI calls with Firebase Storage
   - Implement client-side validation

3. Testing Infrastructure
   - Add more comprehensive video validation tests
   - Test error cases and recovery
   - Add performance tests

### Future Work
1. Firebase Functions
   - Video processing triggers
   - Metadata extraction
   - Thumbnail generation

2. User Management
   - User-specific video collections
   - Access control refinement
   - Sharing functionality

3. Production Setup
   - Environment configuration
   - Security rules review
   - Performance optimization

## Reference Files

Key files to understand the current state:
- `storage.rules` - Firebase Storage security rules
- `test/storage.rules.test.js` - Storage rules tests
- `firebase.json` - Firebase configuration
- `backend/api/validation.py` - Original validation logic to port
- `app/src/services/video.js` - Client service to update

## Migration Strategy

1. **Phase 1** (Current)
   - Basic Firebase Storage setup
   - Simple validation rules
   - Test infrastructure

2. **Phase 2** (Next)
   - Complete validation rules
   - Client integration
   - Basic video processing

3. **Phase 3** (Future)
   - Advanced features
   - Production optimization
   - Performance tuning

## Questions and Decisions Needed

1. Video Processing
   - Should we use Firebase Functions or maintain a separate processing service?
   - How to handle video transcoding?
   - Thumbnail generation strategy?

2. Client Architecture
   - How to handle offline support?
   - Client-side validation extent?
   - Progress tracking implementation?

3. Testing Strategy
   - Integration test coverage targets?
   - Performance test thresholds?
   - Production testing approach?

## Additional Resources

- [Firebase Storage Rules Documentation](https://firebase.google.com/docs/storage/security)
- [Firebase Emulator Suite Guide](https://firebase.google.com/docs/emulator-suite)
- [Testing Rules Documentation](https://firebase.google.com/docs/rules/unit-tests)

## Contact

For questions about this migration:
- Original implementer: Claude (AI Assistant)
- Project context: See conversation history in Cursor 
# Parallel Development Strategy

## Current Situation
- One Claude working on `t` CLI tool
- We're focused on Creator path MVP
- Deadline today for 2-3 user stories

## Independent Development Path

### 1. Manual Verification (Instead of `t verify`)
```bash
# Video format checking
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,color_space \
  -of json input.mp4

# Size and duration
ffprobe -v error -show_entries format=size,duration \
  -of json input.mp4
```

### 2. Direct Firebase Commands (Instead of `t deploy`)
```bash
# Firebase deployment
firebase deploy --only hosting
firebase deploy --only functions

# Local development
firebase emulators:start
```

### 3. Manual Quality Checks (Instead of `t verify flow`)
- Use React Native debug tools
- Firebase Console monitoring
- Manual testing checklist

### 4. Development Flow
1. Local Development:
   ```bash
   # Start React Native dev server
   cd app && npm start
   
   # In another terminal
   firebase emulators:start
   ```

2. Testing:
   ```bash
   # Run tests
   cd app && npm test
   
   # Manual verification
   npm run lint
   ```

3. Deployment:
   ```bash
   # Build app
   cd app && npm run build
   
   # Deploy
   firebase deploy
   ```

## Integration Points
- We can consume CLI features when ready
- CLI team can use our video validation specs
- Both paths meet at Firebase integration

## Success Metrics (Independent of CLI)
1. Video Recording:
   - Correct format (720x1280)
   - BT.709 color space
   - 29.97-30 FPS
   - Size/duration limits

2. Upload Flow:
   - Firebase Storage upload
   - Progress tracking
   - Basic validation

3. Creator Dashboard:
   - Video list
   - Basic stats
   - Token UI (stubbed)

## Next Steps
1. Set up React Native project
2. Implement camera/recording
3. Add Firebase integration
4. Create basic dashboard

When the `t` CLI is ready, we can integrate it into our workflow, but we're not blocked waiting for it.

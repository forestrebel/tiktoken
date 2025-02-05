# Creator Path Documentation

## Overview
TikToken is a platform for nature content creators to share high-quality videos and earn tokens based on viewer engagement.

## User Stories (MVP)
1. Video Recording
```
"As a creator, I want to record nature videos in the correct format"
- Portrait mode (720x1280)
- BT.709 color space
- 29.97-30 FPS
- Duration limit indicator
- Size limit warning
```

2. Upload & Validation
```
"As a creator, I want immediate feedback on video quality"
- Technical spec validation
- Upload progress
- Quality feedback
- (Stub) Token potential indicator
```

3. Creator Dashboard
```
"As a creator, I want to see my uploaded content"
- List of uploaded videos
- Basic stats (views stubbed)
- (Stub) Token balance
```

## Implementation Priority
1. Video Recording (Today)
   - Camera implementation
   - Real-time format validation
   - Basic UI/UX

2. Upload Flow (Today)
   - Firebase Storage integration
   - Progress tracking
   - Quality feedback

3. Creator Dashboard (Today)
   - Simple list view
   - Basic metadata
   - Placeholder stats

4. Token Integration (Week 2)
   - Real token distribution
   - Enhanced analytics
   - Engagement metrics

# TikToken Project Structure

## Core Files
1. `project3-reelai.md` - Main project requirements and deadlines
2. `RAILS_FOUNDATION.md` - Our development approach and patterns
3. `STATUS.md` - Current project status and blockers

## Project Organization
```
tiktoken/
├── app/                    # React Native mobile app
│   ├── src/               # Source code
│   │   ├── screens/       # Main screens
│   │   ├── components/    # Reusable components
│   │   └── services/      # Firebase, video processing
│   ├── package.json       # Dependencies
│   └── README.md         # Setup instructions
│
├── docs/                  # Documentation
│   ├── SETUP.md          # Development setup
│   ├── VIDEO_SPEC.md     # Video requirements
│   └── CREATOR.md        # Creator path docs
│
└── tools/                # Development tools
    └── cli/             # Video validation CLI
```

## Key Files to Keep
1. Project Definition:
   - `project3-reelai.md`
   - `RAILS_FOUNDATION.md`
   - `STATUS.md`

2. Documentation:
   - `docs/architecture/REACT_NATIVE_STRATEGY.md`
   - `docs/coordination/MULTICLAUDE.md`

## Files to Archive
Most other files can be archived as they were from previous iterations. We're focusing on the React Native mobile app for nature video creators.

## Next Steps
1. Create `app/` directory with React Native project
2. Move relevant docs to `docs/` directory
3. Set up basic creator path implementation
4. Archive unused files and directories

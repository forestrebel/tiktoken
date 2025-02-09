# TikToken 🎥

Mobile-first video platform for nature content creators with Ethereum-based recognition tokens. Built with Next.js, Supabase, and FFmpeg.

## Features
- 📱 Portrait video optimization
- 🎬 Client-side video compression
- 🖼️ Automatic thumbnail generation
- ⧫ Ethereum-based recognition tokens
- 📱 PWA support

## Quick Start
1. Clone repo
2. Copy `.env.example` to `.env` and configure:
   ```
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   ```
3. Install dependencies:
   ```bash
   pipenv install
   pipenv shell
   ```
4. Start Supabase:
   ```bash
   supabase start
   supabase db reset
   ```

## Core Features

### Video Features
- Portrait video optimization
- Client-side video compression
- Automatic thumbnail generation

### Token Features
- Ethereum-based recognition tokens (simulated)
- IPFS metadata integration (stubbed)
- Token value growth simulation
- On-chain metadata preview

## Token Details
Each recognition generates a simulated Ethereum token with:
- Unique token ID (ERC-721 compatible)
- IPFS metadata URI
- Simple ETH value representation (≈ 0.001 ETH base)
- Age-based value growth
- Nature-specific attributes

## Tech Stack

- **Frontend**: Next.js 14, TailwindCSS
- **Backend**: Supabase (Storage + Database)
- **Video Processing**: FFmpeg WASM
- **Token Simulation**: ERC-721 Compatible
- **State Management**: Zustand

## Environment Variables

```bash
# Required variables
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
VIDEO_MAX_SIZE_MB=100
ALLOWED_VIDEO_TYPES=["video/mp4","video/quicktime","video/x-m4v"]
```

## Development

### Environment Setup
- Python 3.8+
- Supabase CLI
- Docker

### Database Migrations
```bash
supabase db reset
```

### Storage
Videos and tokens are stored in Supabase with:
- Max file size: 100MB
- Allowed formats: mp4, mov, m4v
- Public access enabled
- Storage path: `/videos/`
- Token metadata: IPFS-compatible format

## Common Issues

### Database Issues
```bash
# Reset database
supabase db reset

# Check migrations
supabase migration list
```

### Storage Issues
```bash
# Check bucket
supabase storage ls videos/

# Verify policies
supabase db dump --schema=storage
```

### Token Issues
```bash
# Check token table
supabase db dump --table public.tokens

# Verify Ethereum fields
supabase db dump --schema=public

# Check token URIs
SELECT token_uri FROM tokens WHERE token_uri IS NOT NULL LIMIT 5;
```

## Development Status

Week 1 MVP features:
- [x] Video upload with compression
- [x] Grid view of videos
- [x] Portrait mode playback
- [x] Basic error handling
- [x] Ethereum token simulation

Coming in Week 2:
- [ ] Enhanced token analytics
- [ ] Token marketplace simulation
- [ ] Video analytics
- [ ] Performance optimizations

## Token Simulation Details

### Token Structure
```javascript
{
  "name": "TikToken #0x1234abcd",
  "description": "Nature Content Recognition Token",
  "image": "ipfs://Qm.../0x1234abcd.png",
  "attributes": [
    {"trait_type": "Type", "value": "Nature Content"},
    {"trait_type": "Platform", "value": "TikToken"},
    {"trait_type": "Chain", "value": "Ethereum"}
  ]
}
```

### Value Simulation
- Base value: 0.001 ETH
- Daily growth: 0.0001 ETH
- Value display: "≈ X.XXXX ETH"

## Demo

Visit: [TikToken Demo](https://tiktoken-fign8btoi-jons-projects-1a511fdc.vercel.app) 
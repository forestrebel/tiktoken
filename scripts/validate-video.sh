#!/bin/bash

# Validate video format and dimensions
# Usage: ./validate-video.sh <video_file>

VIDEO_FILE=$1

if [ ! -f "$VIDEO_FILE" ]; then
    echo "Error: Video file not found"
    exit 1
fi

# Check file format (must be MP4)
MIME_TYPE=$(file -b --mime-type "$VIDEO_FILE")
if [ "$MIME_TYPE" != "video/mp4" ]; then
    echo "Error: Video must be MP4 format"
    exit 1
fi

# Check file size (max 100MB)
SIZE=$(stat -f%z "$VIDEO_FILE")
MAX_SIZE=$((100 * 1024 * 1024))  # 100MB in bytes
if [ "$SIZE" -gt "$MAX_SIZE" ]; then
    echo "Error: Video must be under 100MB"
    exit 1
fi

# Check dimensions (must be 9:16 aspect ratio)
DIMENSIONS=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$VIDEO_FILE")
WIDTH=$(echo $DIMENSIONS | cut -d'x' -f1)
HEIGHT=$(echo $DIMENSIONS | cut -d'x' -f2)

# Calculate aspect ratio (should be approximately 0.5625 for 9:16)
ASPECT=$(echo "scale=4; $WIDTH / $HEIGHT" | bc)
TARGET=0.5625
TOLERANCE=0.01

if (( $(echo "$ASPECT < ($TARGET - $TOLERANCE)" | bc -l) )) || (( $(echo "$ASPECT > ($TARGET + $TOLERANCE)" | bc -l) )); then
    echo "Error: Video must be in portrait mode (9:16 aspect ratio)"
    exit 1
fi

echo "Video validation passed"
exit 0 
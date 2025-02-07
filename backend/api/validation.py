"""Video validation module ported from validation/src/validate.js."""
import os
from enum import Enum
from typing import Dict, Optional, TypedDict
from pydantic import BaseModel
import ffmpeg
import magic

# Keep exact same validation limits from JS version
LIMITS = {
    "MAX_SIZE": 6 * 1024 * 1024,  # 6MB
    "WIDTH": 720,
    "HEIGHT": 1280,
    "MIN_FPS": 29.97,
    "MAX_FPS": 30,
    "MAX_DURATION": 60
}

class VideoSpecs(BaseModel):
    """Video specification model."""
    width: int
    height: int
    fps: float
    duration: float
    colorSpace: str
    codec: Optional[str] = None
    size: Optional[int] = None

class ValidationError(Enum):
    """Validation error types."""
    INVALID_FORMAT = "Invalid video format"
    NO_VIDEO_STREAM = "No video stream found"
    FILE_TOO_LARGE = "File too large"
    INVALID_RESOLUTION = "Invalid resolution"
    INVALID_FPS = "Invalid frame rate"
    VIDEO_TOO_LONG = "Video too long"
    INVALID_COLOR_SPACE = "Invalid color space"
    INVALID_MIME = "Invalid file type"
    SYSTEM_ERROR = "System error"

class ValidationResult(BaseModel):
    """Validation result model."""
    valid: bool
    error: Optional[str] = None
    specs: Optional[VideoSpecs] = None
    suggestions: Optional[list[str]] = None

def get_mime_type(path: str) -> str:
    """Get file MIME type."""
    return magic.from_file(path, mime=True)

def get_specs(path: str) -> VideoSpecs:
    """Get video specifications using ffprobe."""
    try:
        probe = ffmpeg.probe(path)
        video_stream = next(
            (stream for stream in probe['streams'] 
             if stream['codec_type'] == 'video'),
            None
        )
        
        if not video_stream:
            raise ValueError(ValidationError.NO_VIDEO_STREAM.value)
            
        # Parse framerate fraction (e.g. "30000/1001" -> 29.97)
        fps_fraction = video_stream['r_frame_rate'].split('/')
        fps = float(fps_fraction[0]) / float(fps_fraction[1])
            
        return VideoSpecs(
            width=int(video_stream['width']),
            height=int(video_stream['height']),
            fps=fps,
            duration=float(probe['format']['duration']),
            colorSpace=video_stream.get('color_space', 'unknown'),
            codec=video_stream.get('codec_name'),
            size=int(probe['format']['size'])
        )
    except Exception as e:
        if isinstance(e, ValueError):
            raise
        raise ValueError(ValidationError.INVALID_FORMAT.value) from e

def get_error(specs: VideoSpecs) -> Optional[ValidationResult]:
    """Get validation result if specs are invalid."""
    if specs.width != LIMITS['WIDTH'] or specs.height != LIMITS['HEIGHT']:
        return ValidationResult(
            valid=False,
            error=f"{ValidationError.INVALID_RESOLUTION.value}: {specs.width}x{specs.height}",
            specs=specs,
            suggestions=[
                f"Video must be exactly {LIMITS['WIDTH']}x{LIMITS['HEIGHT']}",
                "Use a video editor to resize the video",
                "Most phones can record in this resolution natively"
            ]
        )
    
    if specs.fps < LIMITS['MIN_FPS'] or specs.fps > LIMITS['MAX_FPS']:
        return ValidationResult(
            valid=False,
            error=f"{ValidationError.INVALID_FPS.value}: {specs.fps}",
            specs=specs,
            suggestions=[
                f"Frame rate must be between {LIMITS['MIN_FPS']} and {LIMITS['MAX_FPS']} FPS",
                "Try recording at 30 FPS",
                "Convert using a video editor"
            ]
        )
    
    if specs.duration > LIMITS['MAX_DURATION']:
        return ValidationResult(
            valid=False,
            error=f"{ValidationError.VIDEO_TOO_LONG.value}: {specs.duration}s",
            specs=specs,
            suggestions=[
                f"Video must be under {LIMITS['MAX_DURATION']} seconds",
                "Trim your video to be shorter",
                "Split long videos into multiple parts"
            ]
        )
    
    if specs.colorSpace.lower() != 'bt709':
        return ValidationResult(
            valid=False,
            error=f"{ValidationError.INVALID_COLOR_SPACE.value}: {specs.colorSpace}",
            specs=specs,
            suggestions=[
                "Video must use BT.709 color space",
                "Most modern phones record in this format",
                "Try converting with a video editor"
            ]
        )
    
    return None

def validate_video(path: str) -> ValidationResult:
    """Main validation function."""
    try:
        # Check MIME type first
        mime = get_mime_type(path)
        if not mime.startswith('video/'):
            return ValidationResult(
                valid=False,
                error=f"{ValidationError.INVALID_MIME.value}: {mime}",
                suggestions=["Only video files are accepted"]
            )

        # Quick size check
        stats = os.stat(path)
        if stats.st_size > LIMITS['MAX_SIZE']:
            return ValidationResult(
                valid=False,
                error=ValidationError.FILE_TOO_LARGE.value,
                suggestions=[
                    f"File must be under {LIMITS['MAX_SIZE'] // (1024*1024)}MB",
                    "Try compressing the video",
                    "Use a lower quality setting when recording"
                ]
            )

        # Get and validate specs
        specs = get_specs(path)
        error_result = get_error(specs)
        if error_result:
            return error_result
        
        return ValidationResult(
            valid=True,
            specs=specs
        )
    except Exception as e:
        error_msg = str(e)
        if isinstance(e, ValueError):
            error_msg = e.args[0]
        
        return ValidationResult(
            valid=False,
            error=error_msg,
            suggestions=[
                "Ensure the video file is not corrupted",
                "Try re-recording or converting the video",
                "Check if your device supports the required format"
            ]
        ) 
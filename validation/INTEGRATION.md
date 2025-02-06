# Video Validation Integration Guide

This guide shows how to integrate the video validation service with different platforms and frameworks.

## React Native Integration

```javascript
import { validateVideo } from '@tiktoken/validation';
import { Alert } from 'react-native';
import RNFS from 'react-native-fs';

const VideoUpload = () => {
  const checkVideo = async (uri) => {
    try {
      // Convert content URI to file path
      const filePath = uri.replace('file://', '');
      
      // Validate video
      const result = await validateVideo(filePath);
      
      if (!result.valid) {
        // Show first error with suggestion
        const error = result.errors[0];
        Alert.alert(
          'Invalid Video',
          `${error.message}\n\nSuggestion: ${error.suggestion}`,
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Video validation failed:', err);
      Alert.alert('Error', 'Failed to validate video');
      return false;
    }
  };

  const handleVideoSelect = async () => {
    try {
      // Your video picker logic here
      const video = await pickVideo();
      
      // Validate before upload
      if (await checkVideo(video.uri)) {
        // Proceed with upload
        await uploadVideo(video.uri);
      }
    } catch (err) {
      console.error('Video selection failed:', err);
    }
  };

  return (
    // Your video upload UI
  );
};
```

## Node.js Server Integration

```javascript
const express = require('express');
const multer = require('multer');
const { validateVideo } = require('@tiktoken/validation');

const upload = multer({ dest: 'uploads/' });
const app = express();

app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const result = await validateVideo(req.file.path);
    
    if (!result.valid) {
      // Return detailed validation errors
      return res.status(400).json({
        valid: false,
        errors: result.errors,
        suggestions: result.errors.map(e => e.suggestion)
      });
    }

    // Video is valid, proceed with processing
    return res.json({
      valid: true,
      specs: result.specs
    });
  } catch (err) {
    console.error('Video validation failed:', err);
    return res.status(500).json({ error: 'Video validation failed' });
  }
});
```

## Performance Considerations

1. Early Exits
   - File size is checked first (fastest)
   - Resolution and duration next
   - Color space last (requires full probe)

2. Caching
   ```javascript
   const cache = new Map();
   
   const validateWithCache = async (videoPath) => {
     const cacheKey = `${videoPath}:${await getFileSize(videoPath)}`;
     
     if (cache.has(cacheKey)) {
       return cache.get(cacheKey);
     }
     
     const result = await validateVideo(videoPath);
     cache.set(cacheKey, result);
     
     return result;
   };
   ```

3. Batch Processing
   ```javascript
   const validateBatch = async (videos) => {
     return Promise.all(
       videos.map(async video => ({
         path: video,
         result: await validateVideo(video)
       }))
     );
   };
   ```

## Error Handling

The validation service provides detailed error information:

```javascript
{
  valid: false,
  specs: {
    width: 1080,
    height: 1920,
    // ... other specs
  },
  errors: [{
    code: 'INVALID_RESOLUTION',
    message: 'Invalid resolution: 1080x1920. Required: 720x1280',
    suggestion: 'Use 720x1280 portrait mode resolution',
    specs: { ... }
  }],
  issues: [
    'Invalid resolution: 1080x1920. Required: 720x1280'
  ]
}
```

## Platform-Specific Notes

### iOS
- Use `assets-library://` or `file://` URIs
- Convert HEIC to MP4 if needed

### Android
- Handle content:// URIs
- Check storage permissions

### Web
- Use File API for client-side validation
- Consider using Web Workers for performance

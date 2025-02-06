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

## Firebase Storage Integration

```javascript
const { validateVideo } = require('@tiktoken/validation');
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');

// Initialize Firebase
const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function uploadToFirebase(filePath) {
  try {
    // Validate video first
    const validationResult = await validateVideo(filePath);
    
    if (!validationResult.valid) {
      throw new Error(`Video validation failed: ${validationResult.error}`);
    }
    
    // Generate unique filename
    const filename = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
    const storageRef = ref(storage, filename);
    
    // Read file and upload
    const fileBuffer = await fs.readFile(filePath);
    const snapshot = await uploadBytes(storageRef, fileBuffer, {
      contentType: 'video/mp4',
      customMetadata: {
        width: validationResult.specs.width.toString(),
        height: validationResult.specs.height.toString(),
        fps: validationResult.specs.fps.toString(),
        duration: validationResult.specs.duration.toString(),
        colorSpace: validationResult.specs.colorSpace
      }
    });
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      path: filename,
      specs: validationResult.specs
    };
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// Example usage with Express
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    const result = await uploadToFirebase(req.file.path);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Security Rules

Add these Firebase Storage security rules to enforce video validation:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /videos/{videoId} {
      allow read: if true;
      allow write: if request.resource.size <= 6 * 1024 * 1024 // 6MB
                   && request.resource.contentType == 'video/mp4'
                   && request.resource.metadata.width == '720'
                   && request.resource.metadata.height == '1280';
    }
  }
}
```

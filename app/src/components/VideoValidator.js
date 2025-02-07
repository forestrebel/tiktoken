import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Video from 'react-native-video';

const PORTRAIT_RATIO = 9 / 16; // Target aspect ratio
const RATIO_TOLERANCE = 0.1; // 10% tolerance for aspect ratio

const VideoValidator = ({ videoUri, onValidationComplete, onRetry }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    if (videoUri) {
      setIsValidating(true);
      setError(null);
      setMetadata(null);
    }
  }, [videoUri]);

  const validateAspectRatio = (width, height) => {
    const ratio = width / height;
    const targetRatio = PORTRAIT_RATIO;
    const tolerance = RATIO_TOLERANCE;

    // Check if video is portrait and close to 9:16
    const isPortrait = height > width;
    const ratioWithinTolerance = Math.abs(ratio - targetRatio) <= tolerance;

    if (!isPortrait) {
      throw new Error('Video must be in portrait orientation');
    }

    if (!ratioWithinTolerance) {
      throw new Error('Video should have a 9:16 aspect ratio');
    }

    return true;
  };

  const handleLoad = (meta) => {
    try {
      console.log('Video metadata:', meta);
      const { width, height } = meta.naturalSize;
      
      // Validate aspect ratio
      validateAspectRatio(width, height);

      // Store metadata for future use
      setMetadata(meta);
      setIsValidating(false);
      
      // Report success
      onValidationComplete?.({
        isValid: true,
        metadata: {
          width,
          height,
          duration: meta.duration,
          orientation: meta.orientation
        }
      });
    } catch (error) {
      console.error('Validation error:', error);
      setError(error.message);
      setIsValidating(false);
      
      // Report failure
      onValidationComplete?.({
        isValid: false,
        error: error.message
      });
    }
  };

  const handleError = (error) => {
    console.error('Video loading error:', error);
    setError('Unable to load video for validation');
    setIsValidating(false);
    
    onValidationComplete?.({
      isValid: false,
      error: 'Video format not supported'
    });
  };

  const handleRetry = () => {
    setIsValidating(true);
    setError(null);
    setMetadata(null);
    onRetry?.();
  };

  return (
    <View style={styles.container}>
      {/* Hidden video for validation */}
      {videoUri && (
        <Video
          source={{ uri: videoUri }}
          style={styles.hiddenVideo}
          onLoad={handleLoad}
          onError={handleError}
          paused={true}
          muted={true}
        />
      )}

      {/* Validation UI */}
      <View style={styles.content}>
        {isValidating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              Validating video format...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Format Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>Try Another Video</Text>
            </TouchableOpacity>
          </View>
        ) : metadata ? (
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Video Format Valid</Text>
            <Text style={styles.successText}>
              Portrait mode confirmed ({metadata.naturalSize.width}x{metadata.naturalSize.height})
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 9/16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  hiddenVideo: {
    width: 1,
    height: 1,
    opacity: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff3b30',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34c759',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default VideoValidator; 
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Video from 'react-native-video';

const PORTRAIT_RATIO = 9 / 16;
const RATIO_TOLERANCE = 0.05; // Reduced tolerance for stricter validation

const VideoValidator = ({ videoUri, onValidationComplete }) => {
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    validateVideo();
  }, [videoUri]);

  const validateAspectRatio = (width, height) => {
    const ratio = width / height;
    const difference = Math.abs(ratio - PORTRAIT_RATIO);
    return difference <= RATIO_TOLERANCE;
  };

  const validateVideo = async () => {
    try {
      setValidating(true);
      setError(null);

      // Load video metadata
      const meta = await new Promise((resolve, reject) => {
        const video = new Video({
          source: { uri: videoUri },
          onLoad: (data) => resolve(data),
          onError: (error) => reject(error),
        });
      });

      setMetadata(meta);

      // Validate aspect ratio
      if (!validateAspectRatio(meta.width, meta.height)) {
        throw new Error('Please use a vertical (portrait) video');
      }

      // Validate resolution
      if (meta.width !== 720 || meta.height !== 1280) {
        throw new Error('Video must be 720x1280 resolution');
      }

      // Success
      onValidationComplete?.({
        status: 'success',
        metadata: meta,
      });
    } catch (error) {
      console.error('Validation error:', error);
      setError(error.message || 'Unable to validate video');
      onValidationComplete?.({
        status: 'error',
        error: error.message,
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <View style={styles.container}>
      {validating ? (
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.validatingText}>
            Checking video format...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.content}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.helpText}>
            Try recording in portrait mode with your phone held vertically
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.successText}>
            ✓ Video format looks good
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  content: {
    alignItems: 'center',
    padding: 16,
  },
  validatingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
});

export default VideoValidator;

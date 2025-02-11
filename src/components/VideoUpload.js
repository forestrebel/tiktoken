import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { api } from '../api';

const VIDEO_CONSTRAINTS = {
  maxSizeMB: 100,
  formats: ['mp4', 'quicktime', 'x-m4v'],
};

const VideoUpload = ({ onUploadComplete, onError }) => {
  const [isUploading, setIsUploading] = useState(false);

  const validateVideo = (file) => {
    if (!file || !file.uri) {
      throw new Error('Invalid file selected');
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > VIDEO_CONSTRAINTS.maxSizeMB) {
      throw new Error(`Video must be under ${VIDEO_CONSTRAINTS.maxSizeMB}MB (current: ${Math.round(sizeMB)}MB)`);
    }

    const format = file.type?.toLowerCase();
    if (!format?.includes('video/')) {
      throw new Error('Please select a valid video file');
    }
  };

  const handleUpload = async () => {
    try {
      setIsUploading(true);

      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
        copyTo: 'cachesDirectory',
      });

      const file = result[0];
      validateVideo(file);
      
      // Upload using our API
      const uploadedVideo = await api.uploadVideo(file);
      onUploadComplete?.(uploadedVideo);

    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        onError?.(error.message || 'Failed to upload video');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isUploading && styles.buttonDisabled]}
        onPress={handleUpload}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Upload Video</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VideoUpload; 
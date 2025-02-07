import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Platform,
  Alert,
  PermissionsAndroid,
  ToastAndroid,
  Dimensions,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { videoService } from '../services/video';
import RNFS from 'react-native-fs';

// Constants for video validation
const VIDEO_CONSTRAINTS = {
  formats: ['mp4'],
  maxSizeMB: 100,
  minDurationSec: 1,
  maxDurationSec: 60, // Reduced to 60 seconds for nature content
  aspectRatio: {
    width: 9,
    height: 16
  },
  resolution: {
    width: 720,
    height: 1280
  }
};

const VideoImport = ({ onImportStart, onImportComplete, onError }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);

  // Permission check on mount
  useEffect(() => {
    checkPermissions();
    return () => {
      cleanupTempFiles();
    };
  }, []);

  const checkPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        console.log('Checking Android permissions...');
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);

        const allGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        console.log('Permissions status:', granted);
        setHasPermission(allGranted);

        if (!allGranted) {
          showError('Storage access is required to import nature videos');
        } else {
          console.log('All permissions granted');
        }
      } else {
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      setHasPermission(false);
    }
  };

  const cleanupTempFiles = async () => {
    try {
      const tempDir = `${RNFS.CachesDirectoryPath}/VideoImport`;
      if (await RNFS.exists(tempDir)) {
        await RNFS.unlink(tempDir);
        console.log('Cleaned up temp directory:', tempDir);
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  };

  const validateVideoFormat = async (file) => {
    console.log('Validating video format:', {
      name: file.name,
      type: file.type,
      size: file.size,
      uri: file.uri
    });
    
    // Basic validation
    if (!file || !file.uri) {
      throw new Error('Invalid file selected');
    }

    // Size validation
    const sizeMB = file.size / (1024 * 1024);
    console.log('File size:', sizeMB.toFixed(2), 'MB');
    if (sizeMB > VIDEO_CONSTRAINTS.maxSizeMB) {
      throw new Error(`Video must be under ${VIDEO_CONSTRAINTS.maxSizeMB}MB (current: ${Math.round(sizeMB)}MB)`);
    }

    // Format validation
    const format = file.type?.toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase();
    console.log('File format:', format, 'Extension:', extension);
    
    if (!format?.includes('video/mp4') || !VIDEO_CONSTRAINTS.formats.includes(extension)) {
      throw new Error('Please select an MP4 video file');
    }

    try {
      // Create secure temp directory for validation
      const tempDir = `${RNFS.CachesDirectoryPath}/VideoImport`;
      await RNFS.mkdir(tempDir);
      console.log('Created temp directory:', tempDir);

      // Copy to secure location for validation
      const tempPath = `${tempDir}/${file.name}`;
      console.log('Copying file to:', tempPath);
      await RNFS.copyFile(file.uri, tempPath);

      // Validate file integrity
      const stats = await RNFS.stat(tempPath);
      console.log('File stats:', stats);
      
      if (!stats.size || stats.size !== file.size) {
        throw new Error('Video file appears to be corrupted');
      }

      // Clean up temp file
      await RNFS.unlink(tempPath);
      console.log('Format validation successful');
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      throw new Error('Video validation failed: ' + error.message);
    }
  };

  const showError = (message) => {
    console.error('Import error:', message);
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    }
    Alert.alert(
      'Video Import Error',
      message,
      [
        { 
          text: 'Settings',
          onPress: () => {
            if (message.includes('permission')) {
              // Open app settings if permission denied
              // Implement based on platform
            }
          },
          style: 'default'
        },
        { text: 'OK', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };

  const handleImport = async () => {
    if (!hasPermission) {
      console.log('No permissions, requesting...');
      await checkPermissions();
      if (!hasPermission) {
        return;
      }
    }

    try {
      // Start import flow
      setIsImporting(true);
      setProgress(0);
      onImportStart?.();
      console.log('Starting nature video import...');

      // Configure file picker for videos
      console.log('Opening document picker...');
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
        copyTo: 'cachesDirectory',
        mode: 'open',
        allowMultiSelection: false,
      });
      
      const file = result[0];
      console.log('Selected file:', file);
      
      // Validate video format and size
      await validateVideoFormat(file);

      // Upload with progress tracking
      console.log('Starting video import with service...');
      const video = await videoService.importVideo(
        file.fileCopyUri || file.uri,
        (progress) => {
          const progressPercent = Math.round(progress * 100);
          console.log('Import progress:', progressPercent + '%');
          setProgress(progressPercent);
        }
      );
      
      console.log('Import completed successfully:', video);
      onImportComplete?.(video);
      
      // Clear state
      setProgress(0);
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Import error:', error);
        showError(error.message || 'Failed to import video');
        onError?.(error);
      } else {
        console.log('Document picker cancelled by user');
      }
    } finally {
      setIsImporting(false);
      cleanupTempFiles();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          isImporting && styles.buttonDisabled,
          !hasPermission && styles.buttonDisabled,
        ]}
        onPress={handleImport}
        disabled={isImporting || !hasPermission}
        activeOpacity={0.8}
      >
        {isImporting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#fff" size="small" />
            {progress > 0 && (
              <Text style={styles.progressText}>{progress}%</Text>
            )}
          </View>
        ) : (
          <Text style={styles.buttonText}>Import Nature Video</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.helpText}>
        {hasPermission 
          ? 'Select a vertical nature video (60 sec max)'
          : 'Storage access required for nature videos'}
      </Text>
      {hasPermission && (
        <Text style={styles.infoText}>
          Best for waterfalls, trees, and landscapes in portrait mode
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: 200,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50', // Nature-themed green
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.7,
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  progressText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  helpText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  infoText: {
    marginTop: 4,
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default VideoImport; 
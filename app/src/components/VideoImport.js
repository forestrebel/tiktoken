import React, { useState, useEffect, useRef } from 'react';
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
    height: 16,
  },
  resolution: {
    width: 720,
    height: 1280,
  },
};

const VideoImport = ({ onImportStart, onImportComplete, onError }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const permissionChecked = useRef(false);

  // Optimized permission check
  useEffect(() => {
    if (!permissionChecked.current) {
      checkPermissions();
      permissionChecked.current = true;
    }
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

        setHasPermission(allGranted);

        if (!allGranted) {
          showError('Storage access required for nature videos');
        }
      } else {
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      setHasPermission(false);
      showError('Unable to verify permissions');
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

  // Optimized validation for speed
  const validateVideoFormat = async (file) => {
    if (!file?.uri) {
      throw new Error('Invalid file selected');
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > VIDEO_CONSTRAINTS.maxSizeMB) {
      throw new Error(`Video must be under ${VIDEO_CONSTRAINTS.maxSizeMB}MB`);
    }

    const format = file.type?.toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!format?.includes('video/mp4') || !VIDEO_CONSTRAINTS.formats.includes(extension)) {
      throw new Error('Please select an MP4 video file');
    }

    // Fast path: Skip extra validation in demo mode
    if (__DEV__ && file.name.startsWith('demo_')) {
      return true;
    }

    try {
      const tempDir = `${RNFS.CachesDirectoryPath}/VideoImport`;
      await RNFS.mkdir(tempDir);
      
      const tempPath = `${tempDir}/${file.name}`;
      await RNFS.copyFile(file.uri, tempPath);

      const stats = await RNFS.stat(tempPath);
      if (!stats.size || stats.size !== file.size) {
        throw new Error('Video appears corrupted');
      }

      await RNFS.unlink(tempPath);
      return true;
    } catch (error) {
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
          style: 'default',
        },
        { text: 'OK', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleImport = async () => {
    if (!hasPermission) {
      await checkPermissions();
      if (!hasPermission) return;
    }

    try {
      setIsImporting(true);
      setProgress(0);
      onImportStart?.();

      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
        copyTo: 'cachesDirectory',
        mode: 'open',
        allowMultiSelection: false,
      });

      const file = result[0];
      
      // Start validation in parallel with upload prep
      const validationPromise = validateVideoFormat(file);
      const uploadPrepPromise = videoService.prepareUpload(file.fileCopyUri || file.uri);
      
      await Promise.all([validationPromise, uploadPrepPromise]);

      const video = await videoService.importVideo(
        file.fileCopyUri || file.uri,
        (progress) => setProgress(Math.round(progress * 100))
      );

      onImportComplete?.(video);
      setProgress(0);
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Import error:', error);
        showError(error.message || 'Failed to import video');
        onError?.(error);
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
    padding: 20,
  },
  button: {
    width: 220,  // Slightly wider for better touch target
    height: 48,  // Taller for better visibility
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ scale: 1 }], // For animation
  },
  buttonDisabled: {
    opacity: 0.7,
    backgroundColor: '#A5D6A7', // Lighter green when disabled
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  helpText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoText: {
    marginTop: 8,
    fontSize: 13,
    color: '#4CAF50',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  formatGuide: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  formatText: {
    fontSize: 12,
    color: '#2E7D32',
    marginBottom: 4,
  }
});

export default VideoImport;

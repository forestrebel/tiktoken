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
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { videoService } from '../services/video';
import RNFS from 'react-native-fs';

const VALID_FORMATS = ['mp4', 'mov', 'quicktime'];
const MAX_SIZE_MB = 100;
const MIN_DURATION_SEC = 1;
const MAX_DURATION_SEC = 300; // 5 minutes
const MAX_RESOLUTION = 1920 * 1080; // Full HD max

const VideoImport = ({ onImportStart, onImportComplete, onError }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);

  // Permission check on mount
  useEffect(() => {
    checkPermissions();
    return () => {
      // Cleanup any temp files on unmount
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
          showError('Storage permissions are required to import videos');
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

  const validateVideo = async (file) => {
    console.log('Validating video file:', {
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
    if (sizeMB > MAX_SIZE_MB) {
      throw new Error(`Video must be under ${MAX_SIZE_MB}MB (current: ${Math.round(sizeMB)}MB)`);
    }

    // Format validation - more permissive
    const format = file.type?.toLowerCase();
    console.log('File format:', format);
    if (!format || !format.startsWith('video/')) {
      throw new Error('Please select a valid video file');
    }

    try {
      // Create secure temp directory
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
      
      // Basic integrity check
      if (!stats.size || stats.size !== file.size) {
        throw new Error('File integrity check failed');
      }

      // Clean up temp file
      await RNFS.unlink(tempPath);
      console.log('Validation successful');
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
      'Import Error',
      message,
      [
        { 
          text: 'Settings',
          onPress: () => {
            // Open app settings if permission denied
            if (message.includes('permissions')) {
              // Implement opening settings
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
      console.log('Starting video import...');

      // Pick video file with specific configuration
      console.log('Opening document picker...');
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
        copyTo: 'cachesDirectory',
        mode: 'open',
        allowMultiSelection: false,
      });
      
      const file = result[0];
      console.log('Selected file:', file);
      
      // Validate before proceeding
      await validateVideo(file);

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
      // Complete flow
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
      // Cleanup any remaining temp files
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
          <Text style={styles.buttonText}>+</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.helpText}>
        {hasPermission 
          ? `Tap to select video (${VALID_FORMATS.join(', ')}, max ${MAX_SIZE_MB}MB)`
          : 'Storage permission required'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
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
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
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
});

export default VideoImport; 
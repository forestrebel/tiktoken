import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Text,
  Platform,
  StatusBar,
} from 'react-native';
import VideoImport from '../components/VideoImport';
import VideoValidator from '../components/VideoValidator';
import VideoPreview from '../components/VideoPreview';
import UploadProgress from '../components/UploadProgress';
import ShareSuccess from '../components/ShareSuccess';
import { videoService } from '../services/video';

// Upload flow states
const UPLOAD_STATES = {
  SELECT: 'select',
  VALIDATE: 'validate',
  PREVIEW: 'preview',
  UPLOADING: 'uploading',
  SHARE: 'share',
};

const UploadScreen = () => {
  const [currentState, setCurrentState] = useState(UPLOAD_STATES.SELECT);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState(UploadProgress.STATES.PREPARING);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImportStart = () => {
    setSelectedVideo(null);
    setValidationResult(null);
    setError(null);
    setUploadProgress(0);
    setUploadState(UploadProgress.STATES.PREPARING);
    setUploadResult(null);
    setCurrentState(UPLOAD_STATES.SELECT);
  };

  const handleImportComplete = (video) => {
    console.log('Video imported:', video);
    setSelectedVideo(video);
    setError(null);
    setCurrentState(UPLOAD_STATES.VALIDATE);
  };

  const handleImportError = (error) => {
    console.error('Import error:', error);
    setError(error.message || 'Failed to import video');
    setSelectedVideo(null);
    setValidationResult(null);
    setCurrentState(UPLOAD_STATES.SELECT);
  };

  const handleValidationComplete = (result) => {
    console.log('Validation result:', result);
    setValidationResult(result);
    if (result.isValid) {
      setCurrentState(UPLOAD_STATES.PREVIEW);
    } else {
      setError(result.error);
    }
  };

  const handleRetry = () => {
    setSelectedVideo(null);
    setValidationResult(null);
    setError(null);
    setUploadProgress(0);
    setUploadState(UploadProgress.STATES.PREPARING);
    setUploadResult(null);
    setCurrentState(UPLOAD_STATES.SELECT);
  };

  const handleUpload = async () => {
    try {
      setCurrentState(UPLOAD_STATES.UPLOADING);
      setUploadState(UploadProgress.STATES.PREPARING);
      setError(null);

      // Start upload
      setUploadState(UploadProgress.STATES.UPLOADING);
      const result = await videoService.uploadVideo(
        selectedVideo.uri,
        validationResult.metadata,
        (progress) => {
          setUploadProgress(progress * 100);
        }
      );

      // Handle success
      console.log('Upload complete:', result);
      setUploadResult(result);
      setUploadState(UploadProgress.STATES.SUCCESS);
      setCurrentState(UPLOAD_STATES.SHARE);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Upload failed');
      setUploadState(UploadProgress.STATES.ERROR);
    }
  };

  const handleUploadCancel = async () => {
    try {
      await videoService.cancelUpload();
      handleRetry();
    } catch (error) {
      console.error('Cancel error:', error);
      setError('Failed to cancel upload');
    }
  };

  const handleUploadRetry = () => {
    setUploadProgress(0);
    setUploadState(UploadProgress.STATES.PREPARING);
    handleUpload();
  };

  const renderContent = () => {
    switch (currentState) {
      case UPLOAD_STATES.VALIDATE:
        return (
          <VideoValidator
            videoUri={selectedVideo.uri}
            onValidationComplete={handleValidationComplete}
            onRetry={handleRetry}
          />
        );
      
      case UPLOAD_STATES.PREVIEW:
        return (
          <VideoPreview
            videoUri={selectedVideo.uri}
            onUpload={handleUpload}
            onCancel={handleRetry}
          />
        );
      
      case UPLOAD_STATES.UPLOADING:
        return (
          <UploadProgress
            uploadState={uploadState}
            progress={uploadProgress}
            error={error}
            onCancel={handleUploadCancel}
            onRetry={handleUploadRetry}
            onComplete={handleRetry}
          />
        );
      
      case UPLOAD_STATES.SHARE:
        return (
          <ShareSuccess
            videoPath={uploadResult.path}
            onDone={handleRetry}
          />
        );
      
      case UPLOAD_STATES.SELECT:
      default:
        return (
          <View style={styles.importContainer}>
            <Text style={styles.importTitle}>Select Video</Text>
            <Text style={styles.importSubtitle}>
              Choose a portrait nature video to upload
            </Text>
            <VideoImport
              onImportStart={handleImportStart}
              onImportComplete={handleImportComplete}
              onError={handleImportError}
            />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Upload Nature Video</Text>
        {error && currentState !== UPLOAD_STATES.UPLOADING && (
          <Text style={styles.error}>{error}</Text>
        )}
      </View>

      <View style={styles.content}>
        {renderContent()}
      </View>

      {currentState === UPLOAD_STATES.PREVIEW && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Preview your video before uploading
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  error: {
    marginTop: 8,
    fontSize: 14,
    color: '#ff3b30',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  importContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  importSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});

export default UploadScreen; 
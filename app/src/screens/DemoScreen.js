import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Text,
  Platform,
  StatusBar,
} from 'react-native';
import VideoPlayer from '../components/VideoPlayer';
import VideoImport from '../components/VideoImport';
import { videoService } from '../services/video';

const DemoScreen = () => {
  const [currentVideo, setCurrentVideo] = useState(null);
  const [error, setError] = useState(null);

  const handleImportStart = () => {
    setError(null);
  };

  const handleImportComplete = (video) => {
    setCurrentVideo(video);
    setError(null);
  };

  const handleError = (error) => {
    setError(error.message || 'An error occurred');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Video Demo</Text>
        {error && (
          <Text style={styles.error}>{error}</Text>
        )}
      </View>

      <View style={styles.content}>
        {currentVideo ? (
          <VideoPlayer
            url={currentVideo.uri}
            onError={handleError}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Select a video to begin
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <VideoImport
          onImportStart={handleImportStart}
          onImportComplete={handleImportComplete}
          onError={handleError}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 16,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  error: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    padding: 20,
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  footer: {
    padding: 16,
    borderTopColor: '#333',
    borderTopWidth: 1,
  },
});

export default DemoScreen; 
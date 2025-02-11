/**
 * TikToken Nature Video App
 * @format
 */

import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import VideoPlayer from './src/components/VideoPlayer';
import VideoGrid from './src/components/VideoGrid';
import VideoUpload from './src/components/VideoUpload';
import ErrorView from './src/components/ErrorView';

const App = () => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [error, setError] = useState(null);

  const handleUploadComplete = (video) => {
    setSelectedVideo(video);
    setError(null);
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    setError(null);
  };

  const handleError = (message) => {
    setError(message);
  };

  const handleBack = () => {
    setSelectedVideo(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {error ? (
        <ErrorView 
          message={error} 
          onRetry={() => setError(null)} 
        />
      ) : (
        <View style={styles.content}>
          {selectedVideo ? (
            <VideoPlayer 
              uri={selectedVideo.uri}
              onBack={handleBack}
            />
          ) : (
            <VideoGrid onVideoSelect={handleVideoSelect} />
          )}
          <VideoUpload 
            onUploadComplete={handleUploadComplete}
            onError={handleError}
          />
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
  content: {
    flex: 1,
  },
});

export default App;

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native';
import Video from 'react-native-video';

const PortraitPreview = ({ videoUri }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [orientation, setOrientation] = useState('portrait');
  const videoRef = useRef(null);

  const handleLoad = ({ naturalSize }) => {
    const isPortrait = naturalSize.height > naturalSize.width;
    setOrientation(isPortrait ? 'portrait' : 'landscape');
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.video}
          resizeMode="contain"
          onLoad={handleLoad}
          paused={!isPlaying}
          repeat={true}
        />
        
        <TouchableOpacity 
          style={styles.playButton}
          onPress={togglePlayback}
        >
          <Text style={styles.playButtonText}>
            {isPlaying ? 'Pause' : 'Play'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Orientation: {orientation}
        </Text>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: width,
    aspectRatio: 9/16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 8,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  infoContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
  }
});

export default PortraitPreview; 
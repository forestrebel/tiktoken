import React, { useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { videoService } from '../services';

/**
 * Screen component that provides UI for video recording
 */
export default function RecordScreen({ navigation }) {
  const camera = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  const handlePressStart = async () => {
    if (camera.current) {
      try {
        setIsRecording(true);
        const { uri } = await camera.current.recordAsync({
          quality: RNCamera.Constants.VideoQuality['720p'],
          maxDuration: 60, // 1 minute max
        });
        
        // Save recording
        const result = await videoService.saveVideo(uri);
        if (result.status === 'success') {
          navigation.navigate('View', { videoId: result.data.id });
        } else {
          throw new Error('Failed to save video');
        }
      } catch (error) {
        Alert.alert('Recording Error', error.message);
      } finally {
        setIsRecording(false);
      }
    }
  };

  const handlePressStop = async () => {
    if (camera.current && isRecording) {
      await camera.current.stopRecording();
    }
  };

  return (
    <View style={styles.container}>
      <RNCamera
        ref={camera}
        style={styles.camera}
        type={RNCamera.Constants.Type.back}
        captureAudio={true}
      />
      
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, isRecording && styles.recording]}
          onPress={isRecording ? handlePressStop : handlePressStart}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    borderWidth: 6,
    borderColor: '#4444ff',
  },
  recording: {
    backgroundColor: '#ff4444',
    borderColor: '#fff',
  },
}); 
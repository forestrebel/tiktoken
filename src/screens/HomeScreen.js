import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import VideoGrid from '../components/VideoGrid';
import VideoPlayer from '../components/VideoPlayer';
import TokenDisplay from '../components/TokenDisplay';
import VideoService from '../services/video';
import database from '../services/database';

const HomeScreen = ({ navigation }) => {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [tokenHistory, setTokenHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await database.init();
      await refreshData();
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      // Load videos
      const videoList = await VideoService.getVideos();
      setVideos(videoList);

      // Load token data
      const balance = await database.getTokenBalance();
      setTokenBalance(balance);

      // TODO: Implement token history loading
      setTokenHistory([]);
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleVideoPress = (video) => {
    setSelectedVideo(video);
  };

  const handleVideoUpload = async () => {
    try {
      const video = await VideoService.pickVideo();
      if (video) {
        setVideos([video, ...videos]);
        Alert.alert('Success', 'Video uploaded successfully');
      }
    } catch (error) {
      if (error.message !== 'User cancelled the picker') {
        Alert.alert('Error', error.message);
      }
    }
  };

  const handleHistoryPress = (transaction) => {
    // TODO: Implement transaction details view
    console.log('Transaction pressed:', transaction);
  };

  return (
    <View style={styles.container}>
      {selectedVideo ? (
        <View style={styles.playerContainer}>
          <VideoPlayer
            source={{ uri: selectedVideo.path }}
            style={styles.player}
            onError={(error) => {
              Alert.alert('Error', 'Failed to play video');
              setSelectedVideo(null);
            }}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedVideo(null)}
          >
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>My Videos</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleVideoUpload}
            >
              <Icon name="add" size={24} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload</Text>
            </TouchableOpacity>
          </View>

          <VideoGrid
            videos={videos}
            onVideoPress={handleVideoPress}
            refreshing={refreshing}
            onRefresh={refreshData}
          />

          <TokenDisplay
            balance={tokenBalance}
            history={tokenHistory}
            refreshing={refreshing}
            onRefresh={refreshData}
            onHistoryPress={handleHistoryPress}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  player: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;

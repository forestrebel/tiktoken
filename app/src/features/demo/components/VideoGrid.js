import React from 'react';
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import RNFS from 'react-native-fs';

const VideoGrid = ({ videos, onVideoSelect }) => {
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.item}
      onPress={() => onVideoSelect(item)}
    >
      <Image
        source={{ uri: `file://${item.thumbnailPath}` }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={videos}
      renderItem={renderItem}
      keyExtractor={item => item.uri}
      numColumns={3}
      contentContainerStyle={styles.grid}
    />
  );
};

const { width } = Dimensions.get('window');
const itemSize = width / 3 - 2;

const styles = StyleSheet.create({
  grid: {
    padding: 1,
  },
  item: {
    margin: 1,
    width: itemSize,
    height: itemSize,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eee',
  },
});

export default VideoGrid; 
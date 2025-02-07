import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';

export function ShareSuccess({ videoId, onClose }) {
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out my nature video! https://tiktoken.app/v/${videoId}`,
        title: 'Share Nature Video',
      });
      
      if (result.action === Share.sharedAction) {
        onClose?.();
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Ready!</Text>
      <Text style={styles.subtitle}>Your nature video has been processed</Text>
      
      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareText}>Share Video</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  shareButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 12,
  },
  shareText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 8,
  },
  closeText: {
    color: '#666',
    fontSize: 14,
  },
});

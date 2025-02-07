import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Share,
  Platform,
  Clipboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const ShareSuccess = ({ videoPath, onDone }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      const shareUrl = `https://nature.app/watch/${encodeURIComponent(videoPath)}`;
      const result = await Share.share({
        message: 'Check out my nature video!',
        url: shareUrl,
      });

      if (result.action === Share.sharedAction) {
        console.log('Shared successfully');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCopy = () => {
    const shareUrl = `https://nature.app/watch/${encodeURIComponent(videoPath)}`;
    Clipboard.setString(shareUrl);
    setCopied(true);

    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      {/* Success Icon */}
      <View style={styles.iconContainer}>
        <Icon
          name="checkmark-circle"
          size={64}
          color="#34c759"
        />
      </View>

      {/* Success Message */}
      <Text style={styles.title}>
        Upload Complete!
      </Text>
      <Text style={styles.subtitle}>
        Your nature video is ready to share
      </Text>

      {/* Share Options */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.shareButton]}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Icon
            name="share-outline"
            size={20}
            color="#fff"
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>
            Share Video
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.copyButton]}
          onPress={handleCopy}
          activeOpacity={0.8}
        >
          <Icon
            name={copied ? 'checkmark-outline' : 'copy-outline'}
            size={20}
            color="#007AFF"
            style={styles.buttonIcon}
          />
          <Text style={[styles.buttonText, styles.copyText]}>
            {copied ? 'Link Copied!' : 'Copy Link'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Done Button */}
      <TouchableOpacity
        style={styles.doneButton}
        onPress={onDone}
        activeOpacity={0.8}
      >
        <Text style={styles.doneText}>
          Done
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: '#007AFF',
  },
  copyButton: {
    backgroundColor: '#f5f5f5',
  },
  copyText: {
    color: '#007AFF',
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  doneText: {
    fontSize: 16,
    color: '#666',
  },
});

export default ShareSuccess;

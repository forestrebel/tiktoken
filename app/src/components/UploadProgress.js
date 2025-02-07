import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const STATES = {
  PREPARING: 'preparing',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error',
};

const UploadProgress = ({
  onCancel,
  onRetry,
  onComplete,
  uploadState = STATES.PREPARING,
  progress = 0,
  error = null,
}) => {
  const [progressAnim] = useState(new Animated.Value(0));

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const renderIcon = () => {
    switch (uploadState) {
      case STATES.SUCCESS:
        return (
          <Icon
            name="checkmark-circle"
            size={48}
            color="#34c759"
          />
        );

      case STATES.ERROR:
        return (
          <Icon
            name="alert-circle"
            size={48}
            color="#ff3b30"
          />
        );

      default:
        return (
          <ActivityIndicator
            size="large"
            color="#007AFF"
          />
        );
    }
  };

  const renderMessage = () => {
    switch (uploadState) {
      case STATES.PREPARING:
        return 'Preparing your video...';

      case STATES.UPLOADING:
        return `Uploading: ${Math.round(progress)}%`;

      case STATES.SUCCESS:
        return 'Upload complete!';

      case STATES.ERROR:
        return error || 'Upload failed';

      default:
        return '';
    }
  };

  const renderAction = () => {
    switch (uploadState) {
      case STATES.UPLOADING:
        return (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>Cancel</Text>
          </TouchableOpacity>
        );

      case STATES.ERROR:
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.retryButton]}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>Retry Upload</Text>
          </TouchableOpacity>
        );

      case STATES.SUCCESS:
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.doneButton]}
            onPress={onComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>Done</Text>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress Circle */}
      <View style={styles.iconContainer}>
        {renderIcon()}
        {uploadState === STATES.UPLOADING && (
          <View style={styles.progressRing}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* Status Message */}
      <Text style={styles.message}>
        {renderMessage()}
      </Text>

      {/* Action Button */}
      {renderAction()}
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
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#e5e5ea',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
  },
  message: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ff3b30',
    minWidth: 100,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
  },
  doneButton: {
    backgroundColor: '#34c759',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

// Export states for external use
UploadProgress.STATES = STATES;

export default UploadProgress;

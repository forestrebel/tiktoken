import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Text,
} from 'react-native';
import { PERFORMANCE_TARGETS } from '../utils/performance';

const NATURE_PROGRESS_MESSAGES = {
  import: {
    start: 'Preparing your nature footage...',
    mid: 'Processing wildlife content...',
    end: 'Adding final nature touches...',
  },
  preview: {
    start: 'Setting up your nature preview...',
    mid: 'Optimizing wildlife display...',
    end: 'Perfecting your view...',
  },
  recovery: {
    start: 'Quick nature reset...',
    mid: 'Almost back...',
    end: 'Ready for your creativity...',
  },
};

const PerformanceMonitor = ({ 
  operation,
  startTime,
  targetTime,
  onComplete,
  type = 'import', // 'import' | 'preview' | 'recovery'
}) => {
  const [progress] = useState(new Animated.Value(0));
  const [timeLeft, setTimeLeft] = useState(targetTime);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Animate progress bar
    Animated.timing(progress, {
      toValue: 1,
      duration: targetTime,
      useNativeDriver: false,
    }).start();

    // Update countdown
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, targetTime - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        // Fade out before completion
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onComplete?.());
      }
    }, 50); // More frequent updates for smoother countdown

    return () => clearInterval(interval);
  }, [startTime, targetTime]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const getStatusColor = () => {
    const elapsed = targetTime - timeLeft;
    if (elapsed > targetTime) return '#FF3B30';
    if (elapsed > targetTime * 0.8) return '#FFCC00';
    return '#4CD964';
  };

  const getNatureMessage = () => {
    const messages = NATURE_PROGRESS_MESSAGES[type];
    const progress = 1 - (timeLeft / targetTime);
    
    if (progress < 0.3) return messages.start;
    if (progress < 0.7) return messages.mid;
    return messages.end;
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.operationContainer}>
          <Text style={styles.operation}>{operation}</Text>
          <Text style={[styles.time, { color: getStatusColor() }]}>
            {(timeLeft / 1000).toFixed(1)}s
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <Animated.View 
            style={[
              styles.progressBar,
              { 
                width: progressWidth,
                backgroundColor: getStatusColor(),
              }
            ]}
          />
        </View>
      </View>

      <Text style={styles.natureHint}>
        {getNatureMessage()}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    borderRadius: 12,
    margin: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  header: {
    marginBottom: 4,
  },
  operationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  operation: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    height: 3,
    backgroundColor: '#E8F5E9',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  natureHint: {
    fontSize: 12,
    color: '#66BB6A',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default PerformanceMonitor; 
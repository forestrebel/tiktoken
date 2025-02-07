import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { demoVideoService } from '../services/demoVideos';
import { demoPrepService } from '../services/demoPrep';
import { cacheManager } from '../services/cacheManager';
import { UploadScreen } from './UploadScreen';

// Demo scenario descriptions
const DEMO_DESCRIPTIONS = {
  perfect: {
    title: 'Perfect Upload Flow',
    steps: [
      'Select portrait video (720x1280)',
      'Pass validation checks',
      'Preview in portrait mode',
      'Upload successfully',
      'Share video link'
    ],
    time: '~10 seconds'
  },
  landscape: {
    title: 'Aspect Ratio Validation',
    steps: [
      'Select landscape video',
      'Show validation error',
      'Display retry option',
      'Guide to portrait mode'
    ],
    time: '~5 seconds'
  },
  oversized: {
    title: 'Size Limit Check',
    steps: [
      'Select large video (>100MB)',
      'Show size error',
      'Display size limits',
      'Offer retry option'
    ],
    time: '~5 seconds'
  },
  network_error: {
    title: 'Network Error Recovery',
    steps: [
      'Start upload normally',
      'Simulate network error',
      'Show retry option',
      'Demonstrate recovery'
    ],
    time: '~15 seconds'
  }
};

const DemoScreen = () => {
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [demoVideo, setDemoVideo] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quickMode, setQuickMode] = useState(true);
  const [expandedInfo, setExpandedInfo] = useState(null);
  const [prepStatus, setPrepStatus] = useState({ message: '', progress: 0 });
  const [isPrepping, setIsPrepping] = useState(false);

  // Get available demo types
  const demoTypes = demoVideoService.getAvailableTypes();

  // Load saved state on mount
  useEffect(() => {
    loadSavedState();
    return () => {
      // Save state on unmount
      saveCurrentState();
    };
  }, []);

  // Update demo service when quick mode changes
  useEffect(() => {
    demoVideoService.setQuickMode(quickMode);
    // Persist quick mode setting
    cacheManager.saveSettings({ quickMode });
  }, [quickMode]);

  // Set up prep service status callback
  useEffect(() => {
    demoPrepService.setStatusCallback((message, progress) => {
      setPrepStatus({ message, progress });
    });
  }, []);

  const loadSavedState = async () => {
    try {
      // Load settings
      const settings = await cacheManager.loadSettings();
      if (settings?.quickMode !== undefined) {
        setQuickMode(settings.quickMode);
      }

      // Load demo state
      const state = await cacheManager.loadDemoState();
      if (state) {
        if (state.selectedDemo) {
          setSelectedDemo(state.selectedDemo);
        }
        if (state.expandedInfo) {
          setExpandedInfo(state.expandedInfo);
        }
      }
    } catch (error) {
      console.warn('Failed to load saved state:', error);
    }
  };

  const saveCurrentState = async () => {
    try {
      await cacheManager.saveDemoState({
        selectedDemo,
        expandedInfo,
        lastAccessed: Date.now()
      });
    } catch (error) {
      console.warn('Failed to save state:', error);
    }
  };

  const handlePrepareDemo = async () => {
    try {
      setIsPrepping(true);
      await demoPrepService.prepareForRecording();
      Alert.alert(
        'Demo Ready',
        'All demo videos have been prepared and cached. Ready for recording!'
      );
    } catch (error) {
      Alert.alert(
        'Preparation Failed',
        error.message || 'Failed to prepare demo videos'
      );
    } finally {
      setIsPrepping(false);
    }
  };

  const handleCheckReadiness = async () => {
    const status = await demoPrepService.checkReadiness();
    Alert.alert(
      'Demo Status',
      status.message,
      [
        {
          text: 'Prepare Now',
          onPress: handlePrepareDemo,
          style: 'default',
          enabled: !status.ready
        },
        { text: 'OK', style: 'cancel' }
      ]
    );
  };

  const handleDemoSelect = useCallback(async (type) => {
    try {
      setIsGenerating(true);
      setSelectedDemo(type);
      
      // Generate demo video
      const video = await demoVideoService.generateVideo(type);
      
      // Add to cache manager
      await cacheManager.addFile(type, video.uri, {
        width: video.width,
        height: video.height,
        duration: video.duration
      });
      
      setDemoVideo(video);
      
      // Save state after successful selection
      await saveCurrentState();
    } catch (error) {
      Alert.alert(
        'Demo Generation Failed',
        error.message || 'Failed to generate demo video'
      );
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleReset = useCallback(async () => {
    try {
      setSelectedDemo(null);
      setDemoVideo(null);
      
      // Clean up demo service
      await demoVideoService.cleanup();
      
      // Trigger cache cleanup
      await cacheManager.performCleanup();
      
      // Save clean state
      await saveCurrentState();
    } catch (error) {
      console.warn('Reset error:', error);
    }
  }, []);

  const toggleInfo = (type) => {
    setExpandedInfo(expandedInfo === type ? null : type);
  };

  // Render prep status
  const renderPrepStatus = () => {
    if (!isPrepping && prepStatus.progress === 0) return null;

    return (
      <View style={styles.prepStatus}>
        <ActivityIndicator 
          size="small" 
          color="#2196f3"
          style={styles.prepSpinner}
        />
        <Text style={styles.prepMessage}>
          {prepStatus.message}
        </Text>
        <Text style={styles.prepProgress}>
          {Math.round(prepStatus.progress * 100)}%
        </Text>
      </View>
    );
  };

  // If demo video is selected, show upload screen
  if (demoVideo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
          >
            <Text style={styles.resetButtonText}>← Back to Demo Selection</Text>
          </TouchableOpacity>
          
          {selectedDemo && DEMO_DESCRIPTIONS[selectedDemo] && (
            <View style={styles.demoInfo}>
              <Text style={styles.demoInfoTitle}>
                {DEMO_DESCRIPTIONS[selectedDemo].title}
              </Text>
              <Text style={styles.demoInfoTime}>
                Expected time: {DEMO_DESCRIPTIONS[selectedDemo].time}
              </Text>
            </View>
          )}
        </View>
        
        <UploadScreen
          initialVideo={demoVideo}
          onComplete={handleReset}
        />
      </View>
    );
  }

  // Show demo selection screen
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nature Video Upload Demo</Text>
        <Text style={styles.subtitle}>Select a demo scenario:</Text>
        
        <View style={styles.controls}>
          <View style={styles.quickModeContainer}>
            <Text style={styles.quickModeLabel}>Quick Demo Mode</Text>
            <Switch
              value={quickMode}
              onValueChange={setQuickMode}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={quickMode ? '#2196f3' : '#f4f3f4'}
            />
          </View>

          <View style={styles.prepControls}>
            <TouchableOpacity
              style={[styles.prepButton, isPrepping && styles.prepButtonDisabled]}
              onPress={handlePrepareDemo}
              disabled={isPrepping}
            >
              <Text style={styles.prepButtonText}>
                Prepare Demo Videos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkButton}
              onPress={handleCheckReadiness}
            >
              <Text style={styles.checkButtonText}>
                Check Status
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderPrepStatus()}
      </View>

      <ScrollView style={styles.demoList}>
        {demoTypes.map(demo => (
          <View key={demo.type}>
            <TouchableOpacity
              style={[
                styles.demoButton,
                selectedDemo === demo.type && styles.selectedDemo,
                isGenerating && styles.disabledDemo
              ]}
              onPress={() => handleDemoSelect(demo.type)}
              disabled={isGenerating}
            >
              <Text style={styles.demoTitle}>
                {DEMO_DESCRIPTIONS[demo.type]?.title || demo.type.toUpperCase()}
              </Text>
              <Text style={styles.demoDescription}>{demo.description}</Text>
              <Text style={styles.demoSpecs}>
                {`${demo.width}x${demo.height} @ ${demo.fps}fps (${demo.duration}s)`}
              </Text>
              
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => toggleInfo(demo.type)}
              >
                <Text style={styles.infoButtonText}>
                  {expandedInfo === demo.type ? 'Hide Steps' : 'Show Steps'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {expandedInfo === demo.type && DEMO_DESCRIPTIONS[demo.type] && (
              <View style={styles.stepsContainer}>
                {DEMO_DESCRIPTIONS[demo.type].steps.map((step, index) => (
                  <View key={index} style={styles.stepItem}>
                    <Text style={styles.stepNumber}>{index + 1}.</Text>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {isGenerating && (
        <View style={styles.generatingOverlay}>
          <Text style={styles.generatingText}>
            Generating Demo Video...
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  controls: {
    marginTop: 10,
  },
  quickModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  quickModeLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  demoList: {
    flex: 1,
    padding: 20,
  },
  demoButton: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedDemo: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  disabledDemo: {
    opacity: 0.5,
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2196f3',
  },
  demoDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  demoSpecs: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  infoButton: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  infoButtonText: {
    fontSize: 12,
    color: '#2196f3',
  },
  stepsContainer: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    marginTop: -10,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepNumber: {
    width: 20,
    fontSize: 12,
    color: '#2196f3',
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  resetButton: {
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  resetButtonText: {
    color: '#2196f3',
    fontSize: 16,
  },
  demoInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  demoInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196f3',
    textAlign: 'center',
  },
  demoInfoTime: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingText: {
    fontSize: 18,
    color: '#2196f3',
  },
  prepControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  prepButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  prepButtonDisabled: {
    opacity: 0.5,
  },
  prepButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  checkButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  checkButtonText: {
    color: '#2196f3',
    fontSize: 14,
    fontWeight: '600',
  },
  prepStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
  },
  prepSpinner: {
    marginRight: 10,
  },
  prepMessage: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  prepProgress: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196f3',
    marginLeft: 10,
  },
});

export default DemoScreen; 
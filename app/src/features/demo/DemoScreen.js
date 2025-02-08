import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LocalImport from './components/LocalImport';
import PortraitPreview from './components/PortraitPreview';
import VideoGrid from './components/VideoGrid';
import NatureGuidance from './components/NatureGuidance';
import PerformanceMonitor from './components/PerformanceMonitor';
import { generateThumbnail } from './utils/thumbnails';
import { measureTiming, PERFORMANCE_TARGETS } from './utils/performance';

const DemoScreen = () => {
  // State management
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeGuidance, setActiveGuidance] = useState('import');
  const [showGuidance, setShowGuidance] = useState(true);
  const [currentOperation, setCurrentOperation] = useState(null);
  
  // Performance tracking
  const performanceMetrics = useRef({
    importStart: 0,
    previewStart: 0,
    recoveryStart: 0,
  });

  const handleImport = useCallback(async (fileInfo) => {
    try {
      const startTime = Date.now();
      performanceMetrics.current.importStart = startTime;
      setIsLoading(true);
      setShowGuidance(false);
      
      // Story 2: Quick Format Validation (100ms)
      setCurrentOperation({
        name: 'Format Check',
        startTime,
        targetTime: 100,
        type: 'import'
      });

      if (!fileInfo.name.toLowerCase().match(/\.(mp4|mov)$/)) {
        throw new Error('Please select an MP4 or MOV video file');
      }

      // Story 1: Main Import
      setCurrentOperation({
        name: 'Importing Nature Video',
        startTime: Date.now(),
        targetTime: PERFORMANCE_TARGETS.IMPORT - 100,
        type: 'import'
      });

      const { result: thumbnailPath } = await measureTiming(async () => {
        return await generateThumbnail(fileInfo.uri);
      });

      const videoData = {
        ...fileInfo,
        thumbnailPath,
        importedAt: Date.now(),
        type: 'nature',
      };

      setVideos(prev => [videoData, ...prev]);
      setSelectedVideo(videoData);
      setActiveGuidance('preview');
      setShowGuidance(true);
      
    } catch (error) {
      // Story 4: Error Recovery (1s)
      performanceMetrics.current.recoveryStart = Date.now();
      setCurrentOperation({
        name: 'Quick Recovery',
        startTime: Date.now(),
        targetTime: PERFORMANCE_TARGETS.RECOVERY,
        type: 'recovery'
      });
      
      const isFormatError = error.message.includes('MP4 or MOV');
      Alert.alert(
        isFormatError ? 'Nature Video Check' : 'Import Issue',
        isFormatError 
          ? 'For the best wildlife quality, please use MP4 or MOV format.'
          : 'We had trouble importing your nature video. Let\'s try a quick fix.',
        [
          { 
            text: 'Try Again',
            onPress: handleErrorRecovery,
            style: 'default'
          },
          {
            text: 'View Tips',
            onPress: () => {
              handleErrorRecovery();
              setShowGuidance(true);
            }
          }
        ]
      );
    } finally {
      setIsLoading(false);
      setCurrentOperation(null);
    }
  }, []);

  // Story 3: Preview (3s)
  const handleVideoSelect = useCallback((video) => {
    const startTime = Date.now();
    performanceMetrics.current.previewStart = startTime;
    setCurrentOperation({
      name: 'Loading Preview',
      startTime,
      targetTime: PERFORMANCE_TARGETS.PREVIEW,
      type: 'preview'
    });
    setSelectedVideo(video);
    setActiveGuidance('preview');
    setShowGuidance(true);
  }, []);

  // Story 4: Recovery (1s)
  const handleErrorRecovery = useCallback(() => {
    const recoveryTime = Date.now() - performanceMetrics.current.recoveryStart;
    if (recoveryTime > PERFORMANCE_TARGETS.RECOVERY) {
      console.warn(`Recovery exceeded ${PERFORMANCE_TARGETS.RECOVERY}ms target: ${recoveryTime}ms`);
    }
    setIsLoading(false);
    setSelectedVideo(null);
    setActiveGuidance('import');
    setCurrentOperation(null);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nature Video Collection</Text>
        <Text style={styles.subtitle}>
          Import and preview your wildlife content
        </Text>
      </View>

      {currentOperation && (
        <PerformanceMonitor
          operation={currentOperation.name}
          startTime={currentOperation.startTime}
          targetTime={currentOperation.targetTime}
          type={currentOperation.type}
          onComplete={() => setCurrentOperation(null)}
        />
      )}

      {showGuidance && (
        <NatureGuidance
          context={activeGuidance}
          onDismiss={() => setShowGuidance(false)}
        />
      )}

      <LocalImport 
        onImportComplete={handleImport}
        isLoading={isLoading}
      />

      {selectedVideo ? (
        <View style={styles.previewContainer}>
          <PortraitPreview 
            videoUri={selectedVideo.uri}
            onLoadStart={() => {
              const startTime = Date.now();
              performanceMetrics.current.previewStart = startTime;
              setCurrentOperation({
                name: 'Loading Preview',
                startTime,
                targetTime: PERFORMANCE_TARGETS.PREVIEW,
                type: 'preview'
              });
            }}
            onLoad={() => {
              const previewTime = Date.now() - performanceMetrics.current.previewStart;
              if (previewTime > PERFORMANCE_TARGETS.PREVIEW) {
                console.warn(`Preview exceeded ${PERFORMANCE_TARGETS.PREVIEW}ms target: ${previewTime}ms`);
              }
              setCurrentOperation(null);
            }}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={styles.loadingText}>
                Optimizing your wildlife footage...
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>
            Select or import wildlife footage
          </Text>
          <Text style={styles.placeholderSubtext}>
            Perfect for nature and wildlife content
          </Text>
        </View>
      )}

      {/* Story 5: Grid View */}
      <View style={styles.gridContainer}>
        <Text style={styles.sectionTitle}>Your Nature Collection</Text>
        {videos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Import your first wildlife video
            </Text>
          </View>
        ) : (
          <VideoGrid 
            videos={videos}
            onVideoSelect={handleVideoSelect}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F7',
  },
  header: {
    padding: 16,
    backgroundColor: '#2E7D32',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#E8F5E9',
    marginTop: 4,
  },
  previewContainer: {
    height: 400,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  placeholderContainer: {
    height: 400,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#66BB6A',
    textAlign: 'center',
  },
  gridContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#66BB6A',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default DemoScreen; 
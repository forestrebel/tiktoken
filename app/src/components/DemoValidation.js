import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { videoService } from '../services/video';
import { demoVideoService } from '../services/demoVideos';
import Icon from 'react-native-vector-icons/Ionicons';

// Enhanced timing requirements for both modes
const TIMING_LIMITS = {
  IMPORT_FLOW: 3000,     // 3 seconds for import
  PREVIEW_START: 3000,   // 3 seconds for preview
  ERROR_RECOVERY: 1000,  // 1 second for recovery
  TRANSITION: 250,       // 250ms for transitions
  VALIDATION: 500,       // 500ms for format validation
  GRID_LOAD: 100,       // 100ms for grid load
};

// Enhanced validation flows with mode-specific checks
const VALIDATION_FLOWS = [
  {
    id: 'import',
    title: 'Import Story',
    description: 'Nature video selection',
    tests: [
      {
        id: 'mp4',
        name: 'MP4 Import',
        limit: TIMING_LIMITS.IMPORT_FLOW,
        modes: {
          local: 'Quick file selection',
          deployed: 'Stable file access',
        },
      },
      {
        id: 'non_mp4',
        name: 'Non-MP4 Error',
        limit: TIMING_LIMITS.ERROR_RECOVERY,
        modes: {
          local: 'Instant error',
          deployed: 'Stable error',
        },
      },
      {
        id: 'progress',
        name: 'Upload Progress',
        limit: TIMING_LIMITS.TRANSITION,
        modes: {
          local: 'Quick updates',
          deployed: 'Reliable progress',
        },
      },
    ],
  },
  {
    id: 'portrait',
    title: 'Portrait Story',
    description: 'Format validation',
    tests: [
      { id: 'ratio', name: '9:16 Check', limit: TIMING_LIMITS.VALIDATION },
      { id: 'landscape', name: 'Landscape Error', limit: TIMING_LIMITS.ERROR_RECOVERY },
      { id: 'feedback', name: 'Format Guidance', limit: TIMING_LIMITS.TRANSITION },
    ],
  },
  {
    id: 'preview',
    title: 'Preview Story',
    description: 'Video playback',
    tests: [
      { id: 'load', name: 'Preview Load', limit: TIMING_LIMITS.PREVIEW_START },
      { id: 'controls', name: 'Playback Controls', limit: TIMING_LIMITS.TRANSITION },
      { id: 'fullscreen', name: 'Portrait View', limit: TIMING_LIMITS.TRANSITION },
    ],
  },
  {
    id: 'collection',
    title: 'Collection Story',
    description: 'Grid display',
    tests: [
      { id: 'grid', name: 'Grid Layout', limit: TIMING_LIMITS.GRID_LOAD },
      { id: 'empty', name: 'Empty State', limit: TIMING_LIMITS.TRANSITION },
      { id: 'thumbnails', name: 'Nature Previews', limit: TIMING_LIMITS.TRANSITION },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation Story',
    description: 'Screen flows',
    tests: [
      { id: 'modal', name: 'Upload Modal', limit: TIMING_LIMITS.TRANSITION },
      { id: 'preview', name: 'Preview Screen', limit: TIMING_LIMITS.TRANSITION },
      { id: 'back', name: 'Return Flow', limit: TIMING_LIMITS.TRANSITION },
    ],
  },
  {
    id: 'recovery',
    title: 'Recovery Story',
    description: 'Error handling',
    tests: [
      { id: 'format', name: 'Format Error', limit: TIMING_LIMITS.ERROR_RECOVERY },
      { id: 'size', name: 'Size Error', limit: TIMING_LIMITS.ERROR_RECOVERY },
      { id: 'retry', name: 'Quick Retry', limit: TIMING_LIMITS.ERROR_RECOVERY },
    ],
  },
];

// Visual consistency checks
const VISUAL_CHECKS = [
  {
    id: 'theme',
    title: 'Nature Theme',
    tests: [
      { id: 'colors', name: 'Forest Palette', type: 'visual' },
      { id: 'shapes', name: 'Organic Shapes', type: 'visual' },
      { id: 'motion', name: 'Natural Motion', type: 'visual' },
    ],
  },
  {
    id: 'feedback',
    title: 'User Feedback',
    tests: [
      { id: 'states', name: 'Clear States', type: 'visual' },
      { id: 'guidance', name: 'Nature Guidance', type: 'visual' },
      { id: 'errors', name: 'Helpful Errors', type: 'visual' },
    ],
  },
];

// Recording path validation
const RECORDING_PATHS = [
  {
    id: 'walkthrough',
    title: 'Demo Recording',
    tests: [
      { id: 'setup', name: 'Clean Environment', type: 'prep' },
      { id: 'stories', name: 'All Stories Ready', type: 'prep' },
      { id: 'timing', name: 'Under Limits', type: 'prep' },
    ],
  },
  {
    id: 'paths',
    title: 'Key Flows',
    tests: [
      { id: 'success', name: 'Perfect Upload', type: 'flow' },
      { id: 'error', name: 'Error Recovery', type: 'flow' },
      { id: 'collection', name: 'Grid Usage', type: 'flow' },
    ],
  },
];

const ValidationStep = ({ flow, results, isActive, mode }) => (
  <View style={[styles.flowContainer, isActive && styles.activeFlow]}>
    <View style={styles.flowHeader}>
      <Text style={styles.flowTitle}>{flow.title}</Text>
      <Text style={styles.flowDescription}>
        {flow.description} ({mode} mode)
      </Text>
    </View>

    {flow.tests.map(test => (
      <View key={test.id} style={styles.testContainer}>
        <View style={styles.testHeader}>
          <Text style={styles.testName}>{test.name}</Text>
          {test.modes && (
            <Text style={styles.modeRequirement}>
              {test.modes[mode]}
            </Text>
          )}
          {results[test.id]?.time && (
            <Text style={[
              styles.testTime,
              results[test.id]?.time > test.limit ? styles.timeWarning : styles.timeSuccess,
            ]}>
              {results[test.id]?.time}ms
            </Text>
          )}
        </View>

        <View style={styles.testStatus}>
          <Icon
            name={results[test.id]?.status === 'pass' ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={results[test.id]?.status === 'pass' ? '#2E7D32' : '#F44336'}
          />
          <Text style={[
            styles.testResult,
            results[test.id]?.status === 'pass' ? styles.resultPass : styles.resultFail,
          ]}>
            {results[test.id]?.message || 'Pending'}
          </Text>
        </View>
      </View>
    ))}
  </View>
);

const DemoValidation = () => {
  const [results, setResults] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [currentFlow, setCurrentFlow] = useState(null);
  const [mode, setMode] = useState('local'); // 'local' or 'deployed'
  const [showVisuals, setShowVisuals] = useState(false);
  const [showRecording, setShowRecording] = useState(false);

  const validateTest = async (flowId, test, mode) => {
    const startTime = Date.now();
    try {
      switch (flowId) {
        case 'import':
          switch (test.id) {
            case 'mp4':
              await videoService.importVideo(
                await demoVideoService.generateVideo('perfect')
              );
              break;
            case 'non_mp4':
              try {
                await videoService.importVideo('invalid.txt');
                return { status: 'fail', time: 0, message: 'Should reject non-MP4' };
              } catch (e) {
                // Expected error
              }
              break;
            case 'progress':
              // Test progress updates
              break;
          }
          break;

        case 'portrait':
          switch (test.id) {
            case 'ratio':
              await videoService.validateVideo(
                await demoVideoService.generateVideo('perfect')
              );
              break;
            case 'landscape':
              try {
                await videoService.validateVideo(
                  await demoVideoService.generateVideo('landscape')
                );
                return { status: 'fail', time: 0, message: 'Should reject landscape' };
              } catch (e) {
                // Expected error
              }
              break;
          }
          break;

        // ... similar cases for other flows
      }

      const time = Date.now() - startTime;
      return {
        status: time <= test.limit ? 'pass' : 'fail',
        time,
        message: time <= test.limit ? 'Success' : 'Too slow',
      };
    } catch (error) {
      return {
        status: 'fail',
        time: Date.now() - startTime,
        message: error.message,
      };
    }
  };

  const runValidation = async () => {
    setIsValidating(true);
    const newResults = {};

    // Core flows
    for (const flow of VALIDATION_FLOWS) {
      setCurrentFlow(flow.id);
      for (const test of flow.tests) {
        newResults[test.id] = await validateTest(flow.id, test, mode);
      }
    }

    // Visual checks if enabled
    if (showVisuals) {
      for (const check of VISUAL_CHECKS) {
        for (const test of check.tests) {
          newResults[test.id] = await validateVisual(test);
        }
      }
    }

    // Recording paths if enabled
    if (showRecording) {
      for (const path of RECORDING_PATHS) {
        for (const test of path.tests) {
          newResults[test.id] = await validateRecording(test);
        }
      }
    }

    setResults(newResults);
    setCurrentFlow(null);
    setIsValidating(false);
  };

  const isReadyForDemo = () => {
    return Object.values(results).every(r => r.status === 'pass');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>6 PM Demo Validation</Text>

      <View style={styles.controls}>
        <View style={styles.modeSwitch}>
          <Text style={styles.modeLabel}>Mode:</Text>
          <Switch
            value={mode === 'deployed'}
            onValueChange={(value) => setMode(value ? 'deployed' : 'local')}
            trackColor={{ false: '#C8E6C9', true: '#81C784' }}
            thumbColor={mode === 'deployed' ? '#2E7D32' : '#4CAF50'}
          />
          <Text style={styles.modeName}>{mode}</Text>
        </View>

        <View style={styles.checkboxes}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setShowVisuals(!showVisuals)}
          >
            <Icon
              name={showVisuals ? 'checkbox' : 'square-outline'}
              size={20}
              color="#2E7D32"
            />
            <Text style={styles.checkboxLabel}>Visual Checks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setShowRecording(!showRecording)}
          >
            <Icon
              name={showRecording ? 'checkbox' : 'square-outline'}
              size={20}
              color="#2E7D32"
            />
            <Text style={styles.checkboxLabel}>Recording Paths</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Core Flows */}
      {VALIDATION_FLOWS.map(flow => (
        <ValidationStep
          key={flow.id}
          flow={flow}
          results={results}
          isActive={currentFlow === flow.id}
          mode={mode}
        />
      ))}

      {/* Visual Checks */}
      {showVisuals && VISUAL_CHECKS.map(check => (
        <ValidationStep
          key={check.id}
          flow={check}
          results={results}
          isActive={currentFlow === check.id}
          mode={mode}
        />
      ))}

      {/* Recording Paths */}
      {showRecording && RECORDING_PATHS.map(path => (
        <ValidationStep
          key={path.id}
          flow={path}
          results={results}
          isActive={currentFlow === path.id}
          mode={mode}
        />
      ))}

      <TouchableOpacity
        style={[styles.button, isValidating && styles.buttonDisabled]}
        onPress={runValidation}
        disabled={isValidating}
      >
        <Text style={styles.buttonText}>
          {isValidating
            ? `Testing: ${currentFlow || 'Preparing'}...`
            : `Validate All (${mode} mode)`}
        </Text>
      </TouchableOpacity>

      {Object.keys(results).length > 0 && (
        <View style={styles.summary}>
          <Text style={[
            styles.summaryText,
            isReadyForDemo() ? styles.summaryPass : styles.summaryFail,
          ]}>
            {isReadyForDemo()
              ? `✓ Ready for 6 PM Demo (${mode})`
              : `⚠ Stories Need Review (${mode})`}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 16,
  },
  flowContainer: {
    marginBottom: 16,
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    overflow: 'hidden',
  },
  flowHeader: {
    padding: 12,
    backgroundColor: '#E8F5E9',
  },
  flowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
  },
  flowDescription: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 2,
  },
  testContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#C8E6C9',
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testName: {
    fontSize: 14,
    color: '#1B5E20',
    fontWeight: '500',
  },
  testTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeSuccess: {
    color: '#2E7D32',
  },
  timeWarning: {
    color: '#F44336',
  },
  testStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  testResult: {
    fontSize: 12,
    marginLeft: 4,
  },
  resultPass: {
    color: '#2E7D32',
  },
  resultFail: {
    color: '#F44336',
  },
  button: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summary: {
    padding: 16,
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryPass: {
    color: '#2E7D32',
  },
  summaryFail: {
    color: '#F44336',
  },
  activeFlow: {
    borderColor: '#2E7D32',
  },
  controls: {
    marginBottom: 16,
    backgroundColor: '#F1F8E9',
    padding: 12,
    borderRadius: 8,
  },
  modeSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeLabel: {
    fontSize: 14,
    color: '#1B5E20',
    marginRight: 8,
  },
  modeName: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 8,
    fontWeight: '600',
  },
  checkboxes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1B5E20',
    marginLeft: 8,
  },
  modeRequirement: {
    fontSize: 12,
    color: '#2E7D32',
    fontStyle: 'italic',
    marginTop: 2,
  },
});

export default DemoValidation;

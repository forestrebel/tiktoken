const fs = require('fs');
const path = require('path');

// Import chalk dynamically
let chalk;
import('chalk').then(module => {
  chalk = module.default;
  // Run verification after chalk is loaded
  runVerification().catch(console.error);
});

async function runVerification() {
  if (!chalk) {
    console.error('Chalk module not loaded');
    process.exit(1);
  }

  console.log(chalk.blue('\n🔍 Starting Pre-Demo Verification\n'));

  try {
    // 1. Check Project Structure
    console.log(chalk.yellow('1. Checking Project Structure...'));
    const structure = verifyProjectStructure();
    logResults('Project Structure', structure);

    if (!structure.success) {
      throw new Error('Project structure verification failed');
    }

    // 2. Check Dependencies
    console.log(chalk.yellow('\n2. Checking Dependencies...'));
    const deps = verifyDependencies();
    logResults('Dependencies', deps);

    if (!deps.success) {
      throw new Error('Dependencies verification failed');
    }

    // 3. Check Test Data
    console.log(chalk.yellow('\n3. Checking Test Data...'));
    const testData = verifyTestData();
    logResults('Test Data', testData);

    if (!testData.success) {
      throw new Error('Test data verification failed');
    }

    // Generate Final Report
    console.log(chalk.blue('\n📊 Verification Summary'));
    console.log('------------------------');
    console.log(`Project Structure: ${structure.success ? '✓' : '✗'}`);
    console.log(`Dependencies: ${deps.success ? '✓' : '✗'}`);
    console.log(`Test Data: ${testData.success ? '✓' : '✗'}`);
    console.log(`Timestamp: ${new Date().toLocaleString()}`);

    if (structure.success && deps.success && testData.success) {
      console.log(chalk.green('\n✅ All Verifications Passed'));
      console.log('\nDemo Checklist:');
      console.log('1. Project Structure: All required files present ✓');
      console.log('2. Dependencies: All packages installed ✓');
      console.log('3. Test Data: 5 nature videos ready ✓');
    } else {
      console.log(chalk.red('\n❌ Verification Failed'));
      console.log('Please fix the above issues before proceeding.');
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Verification Error:'), error);
    process.exit(1);
  }
}

function verifyProjectStructure() {
  try {
    const requiredFiles = [
      'src/services/video.js',
      'src/services/database.js',
      'src/services/demo/testData.js',
      'src/components/VideoGrid.js',
      'src/components/VideoPlayer.js',
      'src/screens/HomeScreen.js',
      'package.json'
    ];

    const missingFiles = requiredFiles.filter(file => 
      !fs.existsSync(path.join(process.cwd(), file))
    );

    return {
      success: missingFiles.length === 0,
      missingFiles,
      checkedFiles: requiredFiles.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function verifyDependencies() {
  try {
    const pkg = require('../package.json');
    const requiredDeps = [
      '@react-native-async-storage/async-storage',
      'react-native-fs',
      'ffmpeg-kit-react-native',
      'firebase',
      'react-native-document-picker',
      'uuid',
      '@supabase/supabase-js',
      '@react-native-community/netinfo'
    ];

    const missingDeps = requiredDeps.filter(dep => 
      !pkg.dependencies[dep] && !pkg.devDependencies[dep]
    );

    return {
      success: missingDeps.length === 0,
      missingDeps,
      installedDeps: Object.keys(pkg.dependencies || {}).length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function verifyTestData() {
  try {
    const testData = require('../src/services/demo/testData');
    const videos = testData.DEMO_VIDEOS;

    const validVideos = videos.filter(video => 
      video.type === 'nature' &&
      video.duration >= 15 &&
      video.duration <= 30
    );

    return {
      success: validVideos.length === 5,
      totalVideos: videos.length,
      validVideos: validVideos.length,
      natureVideos: videos.filter(v => v.type === 'nature').length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function logResults(title, results) {
  const success = results.success !== false;
  const icon = success ? '✓' : '✗';
  const color = success ? chalk.green : chalk.red;
  
  console.log(color(`    ${icon} ${title}`));
  
  if (!success) {
    console.log(chalk.red(`      Error: ${results.error || 'Verification failed'}`));
  }
  
  // Log detailed results if available
  Object.entries(results)
    .filter(([key]) => key !== 'success' && key !== 'error')
    .forEach(([key, value]) => {
      if (Array.isArray(value)) {
        console.log(`      ${key}: ${value.join(', ')}`);
      } else if (typeof value === 'object') {
        console.log(`      ${key}:`);
        Object.entries(value).forEach(([subKey, subValue]) => {
          console.log(`        ${subKey}: ${subValue}`);
        });
      } else {
        console.log(`      ${key}: ${value}`);
      }
    });
} 
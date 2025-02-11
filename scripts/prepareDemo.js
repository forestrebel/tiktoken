const preparation = require('../src/services/demo/preparation').default;
const chalk = require('chalk');

async function prepareDemo() {
  console.log(chalk.blue('\n🎯 Starting Demo Preparation\n'));
  const startTime = Date.now();

  try {
    // 1. Data Preparation (30 min)
    console.log(chalk.yellow('1. Preparing Test Data (0:00)'));
    const dataStart = Date.now();
    
    const dataResults = await preparation.prepareData();
    logResults('Data Preparation', dataResults);
    logTiming(dataStart);

    if (!dataResults.success) {
      throw new Error('Data preparation failed');
    }

    // 2. Flow Verification (30 min)
    console.log(chalk.yellow('\n2. Verifying Demo Flow (0:30)'));
    const flowStart = Date.now();
    
    const flowResults = await preparation.verifyFlow();
    logResults('Flow Verification', flowResults);
    logTiming(flowStart);

    if (!flowResults.success) {
      throw new Error('Flow verification failed');
    }

    // 3. Final Polish (30 min)
    console.log(chalk.yellow('\n3. Applying Final Polish (1:00)'));
    const polishStart = Date.now();
    
    const polishResults = await preparation.applyPolish();
    logResults('Final Polish', polishResults);
    logTiming(polishStart);

    if (!polishResults.success) {
      throw new Error('Polish application failed');
    }

    // Generate Final Report
    const report = preparation.getFinalReport();
    const totalTime = Math.floor((Date.now() - startTime) / 1000 / 60);

    console.log(chalk.blue('\n📊 Demo Preparation Summary'));
    console.log('------------------------');
    console.log(`Total Time: ${totalTime} minutes`);
    console.log(`Videos Ready: ${dataResults.videos.videos.length}`);
    console.log(`Main Path: ${flowResults.mainPath.success ? '✓' : '✗'}`);
    console.log(`Transitions: ${flowResults.transitions.success ? '✓' : '✗'}`);
    console.log(`Error Handling: ${flowResults.errorStates.success ? '✓' : '✗'}`);
    console.log(`Performance: ${polishResults.performance ? '✓' : '✗'}`);

    if (report.success) {
      console.log(chalk.green('\n✅ Demo Preparation Complete'));
      console.log('\nDemo Flow Reminders:');
      console.log('1. Launch to grid (30s)');
      console.log('2. Play video (30s)');
      console.log('3. Return to grid (30s)');
      console.log('4. Upload new video (30s)');
      console.log('5. Show error handling (30s)');
      console.log('6. Demonstrate polish (30s)');
    } else {
      console.log(chalk.red('\n❌ Demo Preparation Failed'));
      console.log('Please fix the above issues before proceeding.');
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Preparation Error:'), error);
    process.exit(1);
  }
}

function logResults(title, results) {
  const success = results.success !== false;
  const icon = success ? '✓' : '✗';
  const color = success ? chalk.green : chalk.red;
  
  console.log(color(`    ${icon} ${title}`));
  
  if (!success) {
    console.log(chalk.red(`      Error: ${results.error}`));
  }
  
  // Log detailed results if available
  Object.entries(results)
    .filter(([key]) => key !== 'success' && key !== 'error')
    .forEach(([key, value]) => {
      if (typeof value === 'object') {
        console.log(`      ${key}:`);
        Object.entries(value).forEach(([subKey, subValue]) => {
          console.log(`        ${subKey}: ${subValue}`);
        });
      } else {
        console.log(`      ${key}: ${value}`);
      }
    });
}

function logTiming(startTime) {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  console.log(chalk.gray(`    Time: ${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`));
}

// Run preparation
prepareDemo().catch(console.error); 
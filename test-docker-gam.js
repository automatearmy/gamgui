// Use CommonJS require
const dockerGam = require('./gamgui-server/utils/dockerGam');

// Wait for the module to be fully initialized
setTimeout(() => {
  console.log('Testing GAM command execution...');

  try {
    const gamProcess = dockerGam.executeGamCommand('version', {
      onStdout: (data) => {
        console.log('STDOUT:', data.toString());
      },
      onStderr: (data) => {
        console.error('STDERR:', data.toString());
      },
      onClose: (code) => {
        console.log(`Process exited with code ${code}`);
        process.exit(0);
      },
      onError: (err) => {
        console.error(`Process error: ${err.message}`);
        process.exit(1);
      }
    });

    console.log('GAM command process started. Waiting for output...');
  } catch (error) {
    console.error('Error executing GAM command:', error);
    process.exit(1);
  }
}, 100); // Small delay to ensure module initialization

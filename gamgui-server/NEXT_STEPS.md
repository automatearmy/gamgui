# Next Steps for Integrating the Refactored Code

This document provides detailed instructions for the next steps to fully integrate the refactored WebSocket terminal management code into your application.

## 1. Testing the Refactored Code

Before integrating the refactored code into your main application, it's important to test it thoroughly to ensure it works as expected.

### Running the Test Server

```bash
# Make the script executable
chmod +x run-test-server.sh

# Run the test server
./run-test-server.sh
```

This will start a simple server on http://localhost:3001 that demonstrates the refactored code in action.

### What to Test

1. **Session Creation**: Click the "Create Session" button to create a new session.
2. **WebSocket Connection**: Click the "Join Session" button to establish a WebSocket connection.
3. **Command Execution**: Enter commands in the input field and press Enter to execute them.
4. **Terminal Output**: Verify that command output is displayed correctly in the terminal.
5. **Disconnection**: Click the "Leave Session" button to disconnect from the session.

### Testing Kubernetes Integration

If you have Kubernetes enabled, you can test the Kubernetes integration by setting the appropriate environment variables:

```bash
export GKE_CLUSTER_NAME=your-cluster-name
export GKE_CLUSTER_LOCATION=your-cluster-location
export PROJECT_ID=your-project-id
export K8S_NAMESPACE=gamgui

# Run the test server
./run-test-server.sh
```

## 2. Updating Dependencies

The refactored code uses the same dependencies as the original code, so no changes are needed to your package.json file. However, if you want to add unit testing capabilities, you might want to add Jest:

```bash
npm install --save-dev jest
```

And add a test script to your package.json:

```json
"scripts": {
  "test": "jest"
}
```

## 3. Updating Server Configuration

The server.js file already uses the socketHandler module, so no changes are needed there. The refactored socketHandler module exports the same interface as the original one, so it should work seamlessly with your existing server configuration.

If you want to customize the configuration, you can modify the config.js file:

```javascript
// config/config.js
class Config {
  constructor(env = process.env) {
    // Customize configuration here
    this.kubernetes.enabled = true; // Force Kubernetes mode
    this.docker.gamImage = 'your-custom-image'; // Use a custom image
    this.socket.pingTimeout = 120000; // Increase ping timeout
  }
}
```

## 4. Updating Session Routes

The sessionRoutes.js file has been updated to use the new SessionService and SessionRepository instead of the in-memory sessions and containerSessions. This change has already been made.

If you have customized the sessionRoutes.js file, you'll need to merge your changes with the refactored version. Here are the key differences:

1. **Service Creation**: The refactored code creates services at the top of the file:

```javascript
// Create services
const sessionRepository = new SessionRepository();
const containerService = ContainerFactory.createContainerService(config, logger);
const sessionService = new SessionService(sessionRepository, containerService);
```

2. **Session Creation**: The refactored code uses the SessionService to create sessions:

```javascript
// Create the session
const result = await sessionService.createSession({
  name,
  imageId: imageId || DEFAULT_IMAGE.id,
  imageName: image.imageName,
  config: sessionConfig || {},
  credentialsSecret: credentialsSecret || 'gam-credentials'
});
```

3. **Session Retrieval**: The refactored code uses the SessionService to retrieve sessions:

```javascript
// Get all sessions
const sessions = await sessionService.getSessions();

// Get a session by ID
const session = await sessionService.getSession(req.params.id);
```

4. **Session Deletion**: The refactored code uses the SessionService to delete sessions:

```javascript
// Delete a session
await sessionService.deleteSession(req.params.id);
```

5. **WebSocket Information**: The refactored code uses the SessionService to get WebSocket information:

```javascript
// Get WebSocket information
const websocketInfo = await sessionService.getWebsocketInfo(req.params.id);
```

6. **Exports**: The refactored code exports the services instead of the in-memory data:

```javascript
// Export router and services
module.exports = { 
  router,
  sessionService,
  sessionRepository
};
```

## 5. Updating Other Files

If you have any other files that use the old sessions and containerSessions variables, you'll need to update them to use the new services. For example, the executeGamCommandInDocker.js file has been updated to use the new services.

Here's how to update a file that uses the old variables:

1. **Import the Services**: Import the services from the sessionRoutes module:

```javascript
const { sessionService } = require('./sessionRoutes');
```

2. **Replace sessions References**: Replace references to the sessions array with calls to the SessionService:

```javascript
// Old code
const session = sessions.find(s => s.id === sessionId);

// New code
const session = await sessionService.getSession(sessionId);
```

3. **Replace containerSessions References**: Replace references to the containerSessions map with calls to the SessionService:

```javascript
// Old code
const containerInfo = containerSessions.get(sessionId);

// New code
const containerInfo = await sessionService.getContainerInfo(sessionId);
```

## 6. Adding Unit Tests

To ensure the refactored code works as expected, it's a good idea to add unit tests. Here's an example of how to test the SessionService:

```javascript
// tests/services/session/SessionService.test.js
const { SessionService } = require('../../../services/session');
const { NotFoundError } = require('../../../utils/errorHandler');

describe('SessionService', () => {
  let sessionService;
  let mockSessionRepository;
  let mockContainerService;

  beforeEach(() => {
    // Create mocks
    mockSessionRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      getContainerInfo: jest.fn(),
      saveContainerInfo: jest.fn(),
      deleteContainerInfo: jest.fn()
    };

    mockContainerService = {
      executeCommand: jest.fn(),
      createContainer: jest.fn(),
      deleteContainer: jest.fn(),
      uploadFile: jest.fn(),
      downloadFile: jest.fn(),
      getStatus: jest.fn(),
      getWebsocketPath: jest.fn()
    };

    // Create the service
    sessionService = new SessionService(mockSessionRepository, mockContainerService);
  });

  describe('getSession', () => {
    it('should return a session if it exists', async () => {
      // Arrange
      const sessionId = '123';
      const session = { id: sessionId, name: 'Test Session' };
      mockSessionRepository.findById.mockReturnValue(session);
      
      // Act
      const result = await sessionService.getSession(sessionId);
      
      // Assert
      expect(result).toEqual(session);
      expect(mockSessionRepository.findById).toHaveBeenCalledWith(sessionId);
    });

    it('should throw NotFoundError if session does not exist', async () => {
      // Arrange
      const sessionId = '123';
      mockSessionRepository.findById.mockReturnValue(null);
      
      // Act & Assert
      await expect(sessionService.getSession(sessionId)).rejects.toThrow(NotFoundError);
      expect(mockSessionRepository.findById).toHaveBeenCalledWith(sessionId);
    });
  });

  // Add more tests for other methods...
});
```

To run the tests:

```bash
npm test
```

## 7. Cloud Run Adapter Fix

We've implemented a fix for the "docker: not found" error that occurs when running the server in Cloud Run. The fix ensures that the server always uses the KubernetesAdapter when running in Cloud Run, even if kubernetes.enabled is set to false.

### Testing the Fix

You can test the fix by running the test-cloud-run-adapter.js script:

```bash
node test-cloud-run-adapter.js
```

This script simulates a Cloud Run environment and verifies that the ContainerFactory correctly returns a KubernetesAdapter instance.

### Documentation

For more details about the fix, refer to the CLOUD_RUN_ADAPTER_FIX.md file.

## Conclusion

By following these steps, you should be able to successfully integrate the refactored WebSocket terminal management code into your application. The refactored code provides a solid foundation for building interactive web applications that need to communicate with GAM in real-time.

If you encounter any issues during integration, refer to the troubleshooting section in the INTEGRATION_GUIDE.md file.

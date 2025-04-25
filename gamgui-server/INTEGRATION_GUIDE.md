# Integration Guide for Refactored WebSocket Code

This guide provides instructions for integrating the refactored WebSocket terminal management code into your application.

## Overview

The WebSocket terminal management code has been refactored to follow modern JavaScript best practices, including:

- Modular structure with clear responsibilities
- Class-based organization
- Dependency injection for better testability
- Consistent error handling
- Comprehensive documentation
- Separation of business logic from infrastructure
- Service layers for different concerns
- Single responsibility principle
- Consistent naming conventions
- Design patterns for better code organization

## Testing the Refactored Code

Before integrating the refactored code into your application, you can test it using the provided test script:

```bash
# Make the script executable (if not already)
chmod +x run-test-server.sh

# Run the test server
./run-test-server.sh
```

This will start a simple server that uses the refactored code and provides a web interface for testing WebSocket connections. Open http://localhost:3001 in your browser to test the WebSocket terminal.

## Integration Steps

Follow these steps to integrate the refactored code into your application:

### 1. Update Dependencies

The refactored code uses the same dependencies as the original code, so no changes are needed to your package.json file.

### 2. Update Server Configuration

The server.js file already uses the socketHandler module, so no changes are needed there.

### 3. Update Session Routes

The sessionRoutes.js file has been updated to use the new SessionService and SessionRepository instead of the in-memory sessions and containerSessions. This change has already been made.

### 4. Update Other Files

If you have any other files that use the old sessions and containerSessions variables, you'll need to update them to use the new services. For example, the executeGamCommandInDocker.js file has been updated to use the new services.

### 5. Add Unit Tests

Consider adding unit tests for the new services to ensure they work as expected. Here's an example of how to test the SessionService:

```javascript
const { SessionService } = require('./services/session');
const { ContainerFactory } = require('./services/container');
const config = require('./config/config');
const logger = require('./utils/logger');

// Create a mock SessionRepository
const mockSessionRepository = {
  findById: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  getContainerInfo: jest.fn(),
  saveContainerInfo: jest.fn(),
  deleteContainerInfo: jest.fn()
};

// Create a mock ContainerService
const mockContainerService = {
  executeCommand: jest.fn(),
  createContainer: jest.fn(),
  deleteContainer: jest.fn(),
  uploadFile: jest.fn(),
  downloadFile: jest.fn(),
  getStatus: jest.fn(),
  getWebsocketPath: jest.fn()
};

// Create the SessionService with the mocks
const sessionService = new SessionService(mockSessionRepository, mockContainerService);

// Test the getSession method
test('getSession should return a session if it exists', async () => {
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
```

### 6. Update Client Code

If you have client code that interacts with the WebSocket server, you may need to update it to handle the new events and data formats. The refactored code maintains the same WebSocket events and data formats as the original code, so no changes should be needed.

## Troubleshooting

If you encounter any issues during integration, check the following:

1. **Missing Dependencies**: Make sure all required dependencies are installed.
2. **Configuration Issues**: Check that the configuration is correct, especially for Kubernetes integration.
3. **Socket.IO Version**: Make sure the Socket.IO version on the client matches the version on the server.
4. **Event Handlers**: Check that all event handlers are registered correctly.
5. **Logging**: Enable debug logging to see more detailed information about what's happening.

## Next Steps

After integrating the refactored code, consider the following next steps:

1. **Add More Tests**: Add more unit tests to ensure the code works as expected.
2. **Improve Error Handling**: Add more specific error handling for different types of errors.
3. **Add Monitoring**: Add monitoring to track WebSocket connections and performance.
4. **Add Authentication**: Add authentication to secure WebSocket connections.
5. **Add Rate Limiting**: Add rate limiting to prevent abuse of the WebSocket API.

## Conclusion

The refactored WebSocket terminal management code provides a solid foundation for building interactive web applications that need to communicate with GAM in real-time. By following the integration steps in this guide, you can take advantage of the improved code organization, testability, and maintainability.

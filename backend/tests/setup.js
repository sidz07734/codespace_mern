// tests/setup.js
// Global test setup and configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.JWT_EXPIRE = '1d';
process.env.PORT = 5001; // Use different port for tests

// Increase timeout for slow CI environments
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(), // Mock console.log
  error: jest.fn(), // Keep error for debugging
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Global test utilities
global.testUtils = {
  // Generate random email
  randomEmail: () => `test${Date.now()}${Math.random().toString(36).substring(7)}@example.com`,
  
  // Generate random username
  randomUsername: () => `user${Date.now()}${Math.random().toString(36).substring(7)}`,
  
  // Create test user data
  createUserData: (overrides = {}) => ({
    username: global.testUtils.randomUsername(),
    email: global.testUtils.randomEmail(),
    password: 'password123',
    ...overrides
  }),
  
  // Create test code data
  createCodeData: (overrides = {}) => ({
    title: 'Test Code',
    description: 'Test description',
    language: 'javascript',
    code: 'console.log("test");',
    tags: ['test'],
    ...overrides
  })
};

// Clean up function to ensure all connections are closed
afterAll(async () => {
  // Give time for any pending operations
  await new Promise(resolve => setTimeout(resolve, 500));
});
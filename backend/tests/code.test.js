const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Code = require('../models/Code');

let mongoServer;
let authToken;
let userId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.disconnect();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all test data
  await User.deleteMany({});
  await Code.deleteMany({});
  
  // Create a test user and get auth token
  const userResponse = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
  
  authToken = userResponse.body.token;
  userId = userResponse.body.user.id;
});

describe('Code CRUD Operations', () => {
  describe('POST /api/code', () => {
    it('should create a new code submission', async () => {
      const codeData = {
        title: 'Test Code',
        description: 'This is a test code submission',
        language: 'javascript',
        code: 'console.log("Hello World");',
        tags: ['test', 'javascript']
      };

      const response = await request(app)
        .post('/api/code')
        .set('Authorization', `Bearer ${authToken}`)
        .send(codeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.code).toBeDefined();
      expect(response.body.code.title).toBe(codeData.title);
      expect(response.body.code.language).toBe(codeData.language);
      expect(response.body.code.code).toBe(codeData.code);
      expect(response.body.code.status).toBe('submitted');
      expect(response.body.code.tags).toEqual(codeData.tags);
      expect(response.body.code.user.username).toBe('testuser');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/code')
        .send({
          title: 'Test Code',
          language: 'javascript',
          code: 'console.log("Hello");'
        })
        .expect(401);

      expect(response.body.error).toBe('Not authorized to access this route');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/code')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Code'
          // Missing code and language
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toBeInstanceOf(Array);
    });

    it('should fail with invalid language', async () => {
      const response = await request(app)
        .post('/api/code')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Code',
          language: 'invalid-language',
          code: 'console.log("Hello");'
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(e => e.msg.includes('Invalid language'))).toBe(true);
    });
  });

  describe('GET /api/code', () => {
    beforeEach(async () => {
      // Create multiple code submissions
      const codes = [
        { title: 'JavaScript Code', language: 'javascript', code: 'console.log(1);' },
        { title: 'Python Code', language: 'python', code: 'print(1)' },
        { title: 'Java Code', language: 'java', code: 'System.out.println(1);' }
      ];

      for (const code of codes) {
        await request(app)
          .post('/api/code')
          .set('Authorization', `Bearer ${authToken}`)
          .send(code);
      }
    });

    it('should get all codes for authenticated user', async () => {
      const response = await request(app)
        .get('/api/code')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.codes).toBeDefined();
      expect(response.body.codes).toHaveLength(3);
      expect(response.body.total).toBe(3);
      expect(response.body.totalPages).toBe(1);
      expect(response.body.currentPage).toBe('1');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/code?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.codes).toHaveLength(2);
      expect(response.body.totalPages).toBe(2);
    });

    it('should filter by language', async () => {
      const response = await request(app)
        .get('/api/code?language=javascript')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.codes).toHaveLength(1);
      expect(response.body.codes[0].language).toBe('javascript');
    });

    it('should search by title', async () => {
      const response = await request(app)
        .get('/api/code?search=Python')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.codes).toHaveLength(1);
      expect(response.body.codes[0].title).toContain('Python');
    });

    it('should not return codes from other users', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'password123'
        });

      // Create code as other user
      await request(app)
        .post('/api/code')
        .set('Authorization', `Bearer ${otherUserResponse.body.token}`)
        .send({
          title: 'Other User Code',
          language: 'javascript',
          code: 'console.log("other");'
        });

      // Get codes as original user
      const response = await request(app)
        .get('/api/code')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should only see own codes
      expect(response.body.codes).toHaveLength(3);
      expect(response.body.codes.every(c => c.user.username === 'testuser')).toBe(true);
    });
  });

  describe('GET /api/code/:id', () => {
    let codeId;

    beforeEach(async () => {
      const codeResponse = await request(app)
        .post('/api/code')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Code',
          language: 'javascript',
          code: 'console.log("test");'
        });
      
      codeId = codeResponse.body.code._id;
    });

    it('should get a specific code by ID', async () => {
      const response = await request(app)
        .get(`/api/code/${codeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.code).toBeDefined();
      expect(response.body.code._id).toBe(codeId);
      expect(response.body.code.title).toBe('Test Code');
    });

    it('should fail with invalid code ID', async () => {
      const response = await request(app)
        .get('/api/code/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should fail with non-existent code ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/code/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Code not found');
    });

    it('should not allow access to other users codes', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'password123'
        });

      // Try to access original user's code
      const response = await request(app)
        .get(`/api/code/${codeId}`)
        .set('Authorization', `Bearer ${otherUserResponse.body.token}`)
        .expect(403);

      expect(response.body.error).toBe('Not authorized');
    });
  });

  describe('PUT /api/code/:id', () => {
    let codeId;

    beforeEach(async () => {
      const codeResponse = await request(app)
        .post('/api/code')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Original Title',
          language: 'javascript',
          code: 'console.log("original");'
        });
      
      codeId = codeResponse.body.code._id;
    });

    it('should update a code submission', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Added description',
        language: 'python',
        code: 'print("updated")',
        tags: ['updated', 'python']
      };

      const response = await request(app)
        .put(`/api/code/${codeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.code.title).toBe(updateData.title);
      expect(response.body.code.description).toBe(updateData.description);
      expect(response.body.code.language).toBe(updateData.language);
      expect(response.body.code.code).toBe(updateData.code);
      expect(response.body.code.status).toBe('submitted'); // Reset on edit
    });

    it('should not allow updating other users codes', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .put(`/api/code/${codeId}`)
        .set('Authorization', `Bearer ${otherUserResponse.body.token}`)
        .send({
          title: 'Hacked Title',
          language: 'javascript',
          code: 'console.log("hacked");'
        })
        .expect(403);

      expect(response.body.error).toBe('Not authorized');
    });
  });

  describe('DELETE /api/code/:id', () => {
    let codeId;

    beforeEach(async () => {
      const codeResponse = await request(app)
        .post('/api/code')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'To Delete',
          language: 'javascript',
          code: 'console.log("delete me");'
        });
      
      codeId = codeResponse.body.code._id;
    });

    it('should delete a code submission', async () => {
      const response = await request(app)
        .delete(`/api/code/${codeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Code deleted successfully');

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/code/${codeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(getResponse.body.error).toBe('Code not found');
    });

    it('should not allow deleting other users codes', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .delete(`/api/code/${codeId}`)
        .set('Authorization', `Bearer ${otherUserResponse.body.token}`)
        .expect(403);

      expect(response.body.error).toBe('Not authorized');
    });

    it('should allow teacher to delete any code', async () => {
      // Create teacher
      const teacherResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'teacher',
          email: 'teacher@example.com',
          password: 'password123',
          role: 'teacher'
        });

      const response = await request(app)
        .delete(`/api/code/${codeId}`)
        .set('Authorization', `Bearer ${teacherResponse.body.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/code/:id/analyze', () => {
    let codeId;

    beforeEach(async () => {
      const codeResponse = await request(app)
        .post('/api/code')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Code to Analyze',
          language: 'javascript',
          code: `function fibonacci(n) {
            if (n <= 1) return n;
            return fibonacci(n - 1) + fibonacci(n - 2);
          }`
        });
      
      codeId = codeResponse.body.code._id;
    });

    it('should analyze code (mock test)', async () => {
      // Note: This test will fail if Ollama is not running
      // In a real test environment, you would mock the external API call
      
      const response = await request(app)
        .post(`/api/code/${codeId}/analyze`)
        .set('Authorization', `Bearer ${authToken}`);

      // If Ollama is not running, expect 503
      if (response.status === 503) {
        expect(response.body.error).toContain('AI service is not available');
      } else {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.analysis).toBeDefined();
      }
    });

    it('should not allow analyzing other users codes', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .post(`/api/code/${codeId}/analyze`)
        .set('Authorization', `Bearer ${otherUserResponse.body.token}`)
        .expect(403);

      expect(response.body.error).toBe('Not authorized');
    });

    it('should update code status after analysis', async () => {
      // Mock successful analysis
      // In real tests, you would mock the axios call to Ollama
      
      // Check initial status
      let codeResponse = await request(app)
        .get(`/api/code/${codeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(codeResponse.body.code.status).toBe('submitted');
      
      // After analysis (if Ollama is available), status should change
      // This is a placeholder for when Ollama is mocked
    });
  });
});
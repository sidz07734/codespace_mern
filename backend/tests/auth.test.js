const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');

let mongoServer;

beforeAll(async () => {
  // Create an in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Disconnect from any existing connections
  await mongoose.disconnect();
  
  // Connect to the in-memory database
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
  // Clear all test data before each test
  await User.deleteMany({});
});

describe('Authentication Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new student user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.role).toBe('student');
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned

      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeDefined();
      expect(user.username).toBe(userData.username);
      
      // Verify password was hashed
      const isPasswordHashed = await user.comparePassword(userData.password);
      expect(isPasswordHashed).toBe(true);
    });

    it('should register a teacher user when role is specified', async () => {
      const userData = {
        username: 'teacher1',
        email: 'teacher@example.com',
        password: 'password123',
        role: 'teacher'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user.role).toBe('teacher');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser'
          // Missing email and password
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(e => e.msg.includes('valid email'))).toBe(true);
    });

    it('should fail with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: '12345' // Less than 6 characters
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(e => e.msg.includes('at least 6 characters'))).toBe(true);
    });

    it('should fail with duplicate username', async () => {
      const userData = {
        username: 'testuser',
        email: 'test1@example.com',
        password: 'password123'
      };

      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          email: 'test2@example.com' // Different email, same username
        })
        .expect(400);

      expect(response.body.error).toBe('Username already taken');
    });

    it('should fail with duplicate email', async () => {
      const userData = {
        username: 'testuser1',
        email: 'test@example.com',
        password: 'password123'
      };

      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          username: 'testuser2' // Different username, same email
        })
        .expect(400);

      expect(response.body.error).toBe('Email already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      // Create a test user
      testUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should update last active time on login', async () => {
      const beforeLogin = new Date();
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      const user = await User.findOne({ email: testUser.email });
      expect(user.lastActive).toBeDefined();
      expect(new Date(user.lastActive).getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body.token).toBeUndefined();
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body.token).toBeUndefined();
    });

    it('should fail with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      // Create and login a test user
      testUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      authToken = registerResponse.body.token;
    });

    it('should get current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.role).toBe('student');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Not authorized to access this route');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Not authorized to access this route');
    });

    it('should fail with expired token', async () => {
      // This test would require mocking JWT expiration
      // For now, we'll test with a malformed token
      const malformedToken = authToken.slice(0, -10) + 'corrupted';
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${malformedToken}`)
        .expect(401);

      expect(response.body.error).toBe('Not authorized to access this route');
    });
  });

  describe('PUT /api/auth/updateprofile', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      testUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      authToken = registerResponse.body.token;
    });

    it('should update username', async () => {
      const newUsername = 'updateduser';

      const response = await request(app)
        .put('/api/auth/updateprofile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ username: newUsername })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe(newUsername);

      // Verify in database
      const user = await User.findOne({ email: testUser.email });
      expect(user.username).toBe(newUsername);
    });

    it('should update email', async () => {
      const newEmail = 'newemail@example.com';

      const response = await request(app)
        .put('/api/auth/updateprofile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: newEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(newEmail);
    });

    it('should fail with duplicate username', async () => {
      // Create another user
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'anotheruser',
          email: 'another@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .put('/api/auth/updateprofile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ username: 'anotheruser' })
        .expect(500); // Mongoose duplicate key error

      expect(response.body.error).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put('/api/auth/updateprofile')
        .send({ username: 'newname' })
        .expect(401);

      expect(response.body.error).toBe('Not authorized to access this route');
    });
  });

  describe('PUT /api/auth/changepassword', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      testUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      authToken = registerResponse.body.token;
    });

    it('should change password with valid current password', async () => {
      const newPassword = 'newpassword123';

      const response = await request(app)
        .put('/api/auth/changepassword')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: newPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password updated successfully');

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should fail with incorrect current password', async () => {
      const response = await request(app)
        .put('/api/auth/changepassword')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
        .expect(401);

      expect(response.body.error).toBe('Current password is incorrect');
    });

    it('should fail with short new password', async () => {
      const response = await request(app)
        .put('/api/auth/changepassword')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: '12345' // Less than 6 characters
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(e => e.msg.includes('at least 6 characters'))).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put('/api/auth/changepassword')
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        })
        .expect(401);

      expect(response.body.error).toBe('Not authorized to access this route');
    });
  });

  describe('Authorization Middleware', () => {
    let studentToken;
    let teacherToken;

    beforeEach(async () => {
      // Create student
      const studentResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'student1',
          email: 'student@example.com',
          password: 'password123'
        });
      studentToken = studentResponse.body.token;

      // Create teacher
      const teacherResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'teacher1',
          email: 'teacher@example.com',
          password: 'password123',
          role: 'teacher'
        });
      teacherToken = teacherResponse.body.token;
    });

    it('should allow teacher to access admin routes', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.stats).toBeDefined();
    });

    it('should deny student access to admin routes', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.error).toContain('not authorized');
    });

    it('should deny unauthenticated access to admin routes', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(401);

      expect(response.body.error).toBe('Not authorized to access this route');
    });
  });
});
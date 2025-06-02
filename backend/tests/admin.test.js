const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Code = require('../models/Code');

let mongoServer;
let teacherToken;
let studentToken;
let studentId;

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
  
  // Create a teacher
  const teacherResponse = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'teacher',
      email: 'teacher@example.com',
      password: 'password123',
      role: 'teacher'
    });
  teacherToken = teacherResponse.body.token;
  
  // Create a student
  const studentResponse = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'student1',
      email: 'student1@example.com',
      password: 'password123'
    });
  studentToken = studentResponse.body.token;
  studentId = studentResponse.body.user.id;
});

describe('Admin Routes', () => {
  describe('GET /api/admin/dashboard', () => {
    beforeEach(async () => {
      // Create more students
      for (let i = 2; i <= 5; i++) {
        await request(app)
          .post('/api/auth/register')
          .send({
            username: `student${i}`,
            email: `student${i}@example.com`,
            password: 'password123'
          });
      }

      // Create some code submissions
      const codes = [
        { title: 'Code 1', language: 'javascript', code: 'console.log(1);' },
        { title: 'Code 2', language: 'python', code: 'print(1)' },
        { title: 'Code 3', language: 'java', code: 'System.out.println(1);' }
      ];

      for (const code of codes) {
        await request(app)
          .post('/api/code')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(code);
      }
    });

    it('should get dashboard statistics as teacher', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.totalStudents).toBe(5);
      expect(response.body.stats.totalSubmissions).toBe(3);
      expect(response.body.stats.languageStats).toBeDefined();
      expect(response.body.stats.recentSubmissions).toBeDefined();
      expect(response.body.stats.gradeStats).toBeDefined();
    });

    it('should not allow student access', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.error).toContain('not authorized');
    });

    it('should track active students today', async () => {
      // Update a student's last active time
      await User.findByIdAndUpdate(studentId, { lastActive: new Date() });

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.stats.activeToday).toBeGreaterThanOrEqual(1);
    });

    it('should include language statistics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      const langStats = response.body.stats.languageStats;
      expect(langStats).toBeInstanceOf(Array);
      expect(langStats.some(stat => stat._id === 'javascript' && stat.count === 1)).toBe(true);
      expect(langStats.some(stat => stat._id === 'python' && stat.count === 1)).toBe(true);
      expect(langStats.some(stat => stat._id === 'java' && stat.count === 1)).toBe(true);
    });
  });

  describe('GET /api/admin/students', () => {
    beforeEach(async () => {
      // Create multiple students
      for (let i = 2; i <= 15; i++) {
        await request(app)
          .post('/api/auth/register')
          .send({
            username: `student${i}`,
            email: `student${i}@example.com`,
            password: 'password123'
          });
      }
    });

    it('should get all students with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/students?page=1&limit=5')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.students).toHaveLength(5);
      expect(response.body.total).toBe(15);
      expect(response.body.totalPages).toBe(3);
      expect(response.body.currentPage).toBe('1');
    });

    it('should search students by username', async () => {
      const response = await request(app)
        .get('/api/admin/students?search=student1')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.students.length).toBeGreaterThanOrEqual(1);
      expect(response.body.students.every(s => s.username.includes('student1'))).toBe(true);
    });

    it('should search students by email', async () => {
      const response = await request(app)
        .get('/api/admin/students?search=student5@')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.students).toHaveLength(1);
      expect(response.body.students[0].email).toBe('student5@example.com');
    });

    it('should include submission count for each student', async () => {
      // Create submissions for student1
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/code')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            title: `Code ${i}`,
            language: 'javascript',
            code: `console.log(${i});`
          });
      }

      const response = await request(app)
        .get('/api/admin/students?search=student1')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      const student = response.body.students.find(s => s.username === 'student1');
      expect(student.submissionCount).toBe(3);
    });

    it('should sort by last active by default', async () => {
      const response = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      // Check that results are sorted by lastActive descending
      const dates = response.body.students.map(s => new Date(s.lastActive).getTime());
      const sortedDates = [...dates].sort((a, b) => b - a);
      expect(dates).toEqual(sortedDates);
    });
  });

  describe('GET /api/admin/students/:studentId/codes', () => {
    let codeIds = [];

    beforeEach(async () => {
      // Create multiple code submissions for the student
      const codes = [
        { title: 'JavaScript Code', language: 'javascript', code: 'console.log(1);', status: 'submitted' },
        { title: 'Python Code', language: 'python', code: 'print(1)', status: 'analyzed' },
        { title: 'Java Code', language: 'java', code: 'System.out.println(1);', status: 'submitted' }
      ];

      for (const code of codes) {
        const response = await request(app)
          .post('/api/code')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(code);
        codeIds.push(response.body.code._id);
      }
    });

    it('should get all codes for a specific student', async () => {
      const response = await request(app)
        .get(`/api/admin/students/${studentId}/codes`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.student).toBeDefined();
      expect(response.body.student.username).toBe('student1');
      expect(response.body.codes).toHaveLength(3);
      expect(response.body.total).toBe(3);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/admin/students/${studentId}/codes?page=1&limit=2`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.codes).toHaveLength(2);
      expect(response.body.totalPages).toBe(2);
    });

    it('should filter by language', async () => {
      const response = await request(app)
        .get(`/api/admin/students/${studentId}/codes?language=python`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.codes).toHaveLength(1);
      expect(response.body.codes[0].language).toBe('python');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get(`/api/admin/students/${studentId}/codes?status=analyzed`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.codes).toHaveLength(1);
      expect(response.body.codes[0].status).toBe('analyzed');
    });

    it('should not allow student to view other students codes', async () => {
      // Create another student
      const otherStudentResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otherstudent',
          email: 'other@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .get(`/api/admin/students/${studentId}/codes`)
        .set('Authorization', `Bearer ${otherStudentResponse.body.token}`)
        .expect(403);

      expect(response.body.error).toContain('not authorized');
    });
  });

  describe('POST /api/admin/codes/:codeId/feedback', () => {
    let codeId;

    beforeEach(async () => {
      const codeResponse = await request(app)
        .post('/api/code')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Code for Feedback',
          language: 'javascript',
          code: 'console.log("test");'
        });
      
      codeId = codeResponse.body.code._id;
    });

    it('should add feedback to student code', async () => {
      const feedbackData = {
        comment: 'Good work! Consider using const instead of var.',
        grade: 85
      };

      const response = await request(app)
        .post(`/api/admin/codes/${codeId}/feedback`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(feedbackData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.code.feedback).toBeDefined();
      expect(response.body.code.feedback.comment).toBe(feedbackData.comment);
      expect(response.body.code.feedback.grade).toBe(feedbackData.grade);
      expect(response.body.code.feedback.teacher.username).toBe('teacher');
      expect(response.body.code.status).toBe('graded');
    });

    it('should add feedback without grade', async () => {
      const feedbackData = {
        comment: 'Please add more comments to your code.'
      };

      const response = await request(app)
        .post(`/api/admin/codes/${codeId}/feedback`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(feedbackData)
        .expect(200);

      expect(response.body.code.feedback.comment).toBe(feedbackData.comment);
      expect(response.body.code.feedback.grade).toBeNull();
      expect(response.body.code.status).toBe('reviewed');
    });

    it('should update existing feedback', async () => {
      // Add initial feedback
      await request(app)
        .post(`/api/admin/codes/${codeId}/feedback`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          comment: 'Initial feedback',
          grade: 75
        });

      // Update feedback
      const updatedFeedback = {
        comment: 'Updated feedback - Much better!',
        grade: 90
      };

      const response = await request(app)
        .post(`/api/admin/codes/${codeId}/feedback`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updatedFeedback)
        .expect(200);

      expect(response.body.code.feedback.comment).toBe(updatedFeedback.comment);
      expect(response.body.code.feedback.grade).toBe(updatedFeedback.grade);
    });

    it('should fail without feedback comment', async () => {
      const response = await request(app)
        .post(`/api/admin/codes/${codeId}/feedback`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          grade: 80
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should validate grade range', async () => {
      const response = await request(app)
        .post(`/api/admin/codes/${codeId}/feedback`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          comment: 'Good work',
          grade: 150 // Invalid grade
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(e => e.msg.includes('between 0 and 100'))).toBe(true);
    });

    it('should not allow students to add feedback', async () => {
      const response = await request(app)
        .post(`/api/admin/codes/${codeId}/feedback`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          comment: 'Self feedback',
          grade: 100
        })
        .expect(403);

      expect(response.body.error).toContain('not authorized');
    });
  });

  describe('POST /api/admin/users', () => {
    it('should create a new student account', async () => {
      const newStudent = {
        username: 'newstudent',
        email: 'newstudent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(newStudent)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(newStudent.username);
      expect(response.body.user.email).toBe(newStudent.email);
      expect(response.body.user.role).toBe('student');

      // Verify student can login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: newStudent.email,
          password: newStudent.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should fail with duplicate username', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          username: 'student1', // Already exists
          email: 'newstudent@example.com',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.error).toBe('Username already taken');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          username: 'newstudent'
          // Missing email and password
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should not allow students to create accounts', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          username: 'newstudent',
          email: 'new@example.com',
          password: 'password123'
        })
        .expect(403);

      expect(response.body.error).toContain('not authorized');
    });
  });

  describe('DELETE /api/admin/users/:userId', () => {
    let userToDelete;

    beforeEach(async () => {
      // Create a user to delete
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'deleteme',
          email: 'delete@example.com',
          password: 'password123'
        });
      
      userToDelete = response.body.user.id;
      
      // Create some codes for this user
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/code')
          .set('Authorization', `Bearer ${response.body.token}`)
          .send({
            title: `Code ${i}`,
            language: 'javascript',
            code: `console.log(${i});`
          });
      }
    });

    it('should delete student and their codes', async () => {
      // Verify user exists
      const usersBeforeDelete = await User.countDocuments({ role: 'student' });
      const codesBeforeDelete = await Code.countDocuments({ user: userToDelete });
      expect(codesBeforeDelete).toBe(3);

      const response = await request(app)
        .delete(`/api/admin/users/${userToDelete}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user and codes are deleted
      const usersAfterDelete = await User.countDocuments({ role: 'student' });
      const codesAfterDelete = await Code.countDocuments({ user: userToDelete });
      
      expect(usersAfterDelete).toBe(usersBeforeDelete - 1);
      expect(codesAfterDelete).toBe(0);
    });

    it('should not allow deleting teacher accounts', async () => {
      // Get teacher's ID
      const teacher = await User.findOne({ email: 'teacher@example.com' });

      const response = await request(app)
        .delete(`/api/admin/users/${teacher._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);

      expect(response.body.error).toBe('Cannot delete teacher accounts');
    });

    it('should handle non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should not allow students to delete users', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${userToDelete}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.error).toContain('not authorized');
    });
  });
});
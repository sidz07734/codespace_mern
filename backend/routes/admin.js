const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Code = require('../models/Code');
const { protect, authorize } = require('../middleware/auth');

// All routes require teacher role
router.use(protect, authorize('teacher'));

// @route   GET /api/admin/dashboard
// @desc    Get dashboard statistics
// @access  Private/Teacher
router.get('/dashboard', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalSubmissions = await Code.countDocuments();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeToday = await User.countDocuments({
      role: 'student',
      lastActive: { $gte: today }
    });
    
    const recentSubmissions = await Code.find()
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .limit(5);
    
    const languageStats = await Code.aggregate([
      { $group: { _id: '$language', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const gradeStats = await Code.aggregate([
      { $match: { 'feedback.grade': { $exists: true } } },
      { $group: { 
        _id: null, 
        avgGrade: { $avg: '$feedback.grade' },
        minGrade: { $min: '$feedback.grade' },
        maxGrade: { $max: '$feedback.grade' }
      }}
    ]);

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalSubmissions,
        activeToday,
        languageStats,
        gradeStats: gradeStats[0] || { avgGrade: 0, minGrade: 0, maxGrade: 0 },
        recentSubmissions
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/admin/students
// @desc    Get all students
// @access  Private/Teacher
router.get('/students', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'lastActive' } = req.query;
    
    const query = { role: 'student' };
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const students = await User.find(query)
      .select('-password')
      .sort({ [sortBy]: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(query);
    
    // Get submission count for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const submissionCount = await Code.countDocuments({ user: student._id });
        const lastSubmission = await Code.findOne({ user: student._id })
          .sort({ createdAt: -1 })
          .select('createdAt');
        
        return {
          ...student.toObject(),
          submissionCount,
          lastSubmission: lastSubmission?.createdAt
        };
      })
    );

    res.json({
      success: true,
      students: studentsWithStats,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/admin/students/:studentId/codes
// @desc    Get specific student's codes
// @access  Private/Teacher
router.get('/students/:studentId/codes', async (req, res) => {
  try {
    const { page = 1, limit = 10, language, status } = req.query;
    
    const query = { user: req.params.studentId };
    
    if (language) query.language = language;
    if (status) query.status = status;
    
    const codes = await Code.find(query)
      .populate('user', 'username email')
      .populate('feedback.teacher', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Code.countDocuments(query);
    
    const student = await User.findById(req.params.studentId).select('username email');
    
    res.json({
      success: true,
      student,
      codes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/admin/codes/:codeId/feedback
// @desc    Add feedback to student's code
// @access  Private/Teacher
router.post('/codes/:codeId/feedback', [
  body('comment').trim().notEmpty().withMessage('Feedback comment is required'),
  body('grade').optional().isInt({ min: 0, max: 100 }).withMessage('Grade must be between 0 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { comment, grade } = req.body;

    const code = await Code.findById(req.params.codeId);
    if (!code) {
      return res.status(404).json({ error: 'Code not found' });
    }

    await code.addFeedback(req.user._id, comment, grade);
    await code.populate('user', 'username email');
    await code.populate('feedback.teacher', 'username');

    res.json({
      success: true,
      code
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/admin/users
// @desc    Create new student account
// @access  Private/Teacher
router.post('/users', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.email === email ? 'Email already exists' : 'Username already taken' 
      });
    }

    const user = await User.create({
      username,
      email,
      password,
      role: 'student'
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/admin/users/:userId
// @desc    Delete student account
// @access  Private/Teacher
router.delete('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.role === 'teacher') {
      return res.status(403).json({ error: 'Cannot delete teacher accounts' });
    }
    
    // Delete user's codes
    await Code.deleteMany({ user: user._id });
    
    // Delete user
    await user.deleteOne();
    
    res.json({
      success: true,
      message: 'User and associated data deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const Code = require('../models/Code');
const { protect } = require('../middleware/auth');

// Validation rules
const validateCode = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('code').notEmpty().withMessage('Code is required'),
  body('language').isIn(['javascript', 'python', 'java', 'cpp', 'c']).withMessage('Invalid language')
];

// @route   POST /api/code
// @desc    Create new code submission
// @access  Private
router.post('/', protect, validateCode, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, language, code, tags } = req.body;

    const newCode = await Code.create({
      user: req.user._id,
      title,
      description,
      language,
      code,
      tags
    });

    await newCode.populate('user', 'username email');

    res.status(201).json({
      success: true,
      code: newCode
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/code
// @desc    Get all codes for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, language, status, search } = req.query;
    
    const query = { user: req.user._id };
    
    if (language) query.language = language;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const codes = await Code.find(query)
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Code.countDocuments(query);

    res.json({
      success: true,
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

// @route   GET /api/code/:id
// @desc    Get single code by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const code = await Code.findById(req.params.id)
      .populate('user', 'username email')
      .populate('feedback.teacher', 'username email');

    if (!code) {
      return res.status(404).json({ error: 'Code not found' });
    }

    // Check if user owns the code or is a teacher
    if (code.user._id.toString() !== req.user._id.toString() && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({
      success: true,
      code
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/code/:id
// @desc    Update code
// @access  Private
router.put('/:id', protect, validateCode, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let code = await Code.findById(req.params.id);

    if (!code) {
      return res.status(404).json({ error: 'Code not found' });
    }

    // Check ownership
    if (code.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, language, code: codeContent, tags } = req.body;

    // Update fields
    code.title = title;
    code.description = description || code.description;
    code.language = language;
    code.code = codeContent;
    code.tags = tags || code.tags;
    code.status = 'submitted'; // Reset status on edit
    code.analysis = undefined; // Clear previous analysis

    await code.save();
    await code.populate('user', 'username email');

    res.json({
      success: true,
      code
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/code/:id
// @desc    Delete code
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const code = await Code.findById(req.params.id);

    if (!code) {
      return res.status(404).json({ error: 'Code not found' });
    }

    // Check ownership
    if (code.user.toString() !== req.user._id.toString() && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await code.deleteOne();

    res.json({
      success: true,
      message: 'Code deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/code/:id/analyze
// @desc    Analyze code with AI
// @access  Private
router.post('/:id/analyze', protect, async (req, res) => {
  try {
    const code = await Code.findById(req.params.id);

    if (!code) {
      return res.status(404).json({ error: 'Code not found' });
    }

    // Check ownership
    if (code.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Prepare prompt based on language
    const languagePrompts = {
      javascript: 'Analyze this JavaScript code for best practices, potential bugs, and performance issues:',
      python: 'Analyze this Python code for PEP 8 compliance, potential bugs, and Pythonic practices:',
      java: 'Analyze this Java code for best practices, potential bugs, and design patterns:',
      cpp: 'Analyze this C++ code for best practices, memory management, and potential issues:',
      c: 'Analyze this C code for best practices, memory management, and potential issues:'
    };

    const prompt = `${languagePrompts[code.language] || 'Analyze this code:'}
    
${code.code}

Please provide:
1. Code quality assessment
2. Potential bugs or issues
3. Performance considerations
4. Best practice recommendations
5. Security considerations (if applicable)`;

    // Call Ollama API
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'codellama:7b';

    const response = await axios.post(`${ollamaUrl}/api/generate`, {
      model: ollamaModel,
      prompt,
      stream: false
    }, {
      timeout: 120000 // 2 minute timeout
    });

    const analysis = response.data.response;

    // Save analysis
    await code.addAnalysis(analysis);

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'AI service is not available. Please ensure Ollama is running.' 
      });
    }
    res.status(500).json({ error: 'Failed to analyze code' });
  }
});

module.exports = router;
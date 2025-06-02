const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  language: {
    type: String,
    required: [true, 'Language is required'],
    enum: ['javascript', 'python', 'java', 'cpp', 'c'],
    default: 'javascript'
  },
  code: {
    type: String,
    required: [true, 'Code is required']
  },
  analysis: {
    result: String,
    analyzedAt: Date
  },
  feedback: {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: String,
    grade: {
      type: Number,
      min: 0,
      max: 100
    },
    feedbackAt: Date
  },
  status: {
    type: String,
    enum: ['submitted', 'analyzed', 'reviewed', 'graded'],
    default: 'submitted'
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for faster queries
codeSchema.index({ user: 1, createdAt: -1 });
codeSchema.index({ status: 1 });
codeSchema.index({ language: 1 });

// Virtual for formatted date
codeSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Method to add analysis
codeSchema.methods.addAnalysis = function(analysisResult) {
  this.analysis = {
    result: analysisResult,
    analyzedAt: new Date()
  };
  this.status = 'analyzed';
  return this.save();
};

// Method to add teacher feedback
codeSchema.methods.addFeedback = function(teacherId, comment, grade = null) {
  this.feedback = {
    teacher: teacherId,
    comment,
    grade,
    feedbackAt: new Date()
  };
  this.status = grade ? 'graded' : 'reviewed';
  return this.save();
};

module.exports = mongoose.model('Code', codeSchema);
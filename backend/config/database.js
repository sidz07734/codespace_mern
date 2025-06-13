const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Remove the deprecated options - just keep the URI
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    // Create default admin user
    const User = require('../models/User');
    const adminExists = await User.findOne({ email: 'admin@codespace.com' });
    
    if (!adminExists) {
      const admin = new User({
        username: 'admin',
        email: 'admin@codespace.com',
        password: 'admin123',
        role: 'teacher'
      });
      await admin.save();
      console.log('Default admin user created (username: admin, password: admin123)');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
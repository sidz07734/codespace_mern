# CodeSpace - AI-Powered Code Learning Platform 🚀

![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

A comprehensive code learning platform built with the MERN stack that enables students to write, analyze, and improve their code with AI-powered feedback, while teachers can monitor progress and provide personalized guidance.

## 🌟 Features

### For Students 👨‍🎓
- **Multi-language Support**: Write code in JavaScript, Python, Java, C++, and C
- **AI-Powered Analysis**: Get instant feedback on code quality, bugs, and improvements using Ollama
- **Code Management**: Full CRUD operations for managing code submissions
- **Progress Tracking**: View submission history and improvement over time
- **Syntax Highlighting**: Beautiful code editor with Monaco Editor integration

### For Teachers 👩‍🏫
- **Dashboard Analytics**: Monitor student activity and submission statistics
- **Code Review System**: Review student submissions with detailed view
- **Feedback & Grading**: Provide personalized feedback and grades
- **Student Management**: Create and manage student accounts
- **Performance Insights**: Track class progress with visual analytics

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Secure authentication
- **bcryptjs** - Password hashing
- **Ollama** - Local AI integration

### Frontend
- **React 18** - UI library
- **Material-UI** - Component library
- **Monaco Editor** - Code editor
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **React Router v6** - Navigation

### DevOps & Tools
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **Jest** - Testing framework
- **ESLint** - Code linting

## 📋 Prerequisites

- Node.js 16+ and npm
- MongoDB 6.0+
- Ollama (for AI features)
- Git

## 🚀 Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/codespace-mern.git
cd codespace-mern
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 4. Install Ollama (for AI Analysis)
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the CodeLlama model
ollama pull codellama:7b

# Start Ollama
ollama serve
```

## 🔧 Configuration

Create a `.env` file in the backend directory:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/codespace_db
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=codellama:7b
FRONTEND_URL=http://localhost:3000
```

## 🐳 Docker Setup

```bash
# Run with Docker Compose
docker-compose up -d

# Stop services
docker-compose down
```

## 📱 Usage

### Default Admin Account
- **Email**: admin@codespace.com
- **Password**: admin123

### Student Workflow
1. Register/Login to the platform
2. Create new code submission
3. Write your code in the editor
4. Save and analyze your code
5. View AI-powered feedback
6. Track your progress

### Teacher Workflow
1. Login with admin credentials
2. View dashboard statistics
3. Browse student submissions
4. Provide feedback and grades
5. Monitor class progress

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run with coverage
npm run test:coverage

# Run frontend tests
cd frontend
npm test
```

## 📊 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updateprofile` - Update profile
- `PUT /api/auth/changepassword` - Change password

### Code Operations
- `POST /api/code` - Create new code
- `GET /api/code` - Get user's codes
- `GET /api/code/:id` - Get specific code
- `PUT /api/code/:id` - Update code
- `DELETE /api/code/:id` - Delete code
- `POST /api/code/:id/analyze` - Analyze code with AI

### Admin Operations
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/students` - List all students
- `GET /api/admin/students/:id/codes` - Get student's codes
- `POST /api/admin/codes/:id/feedback` - Add feedback
- `POST /api/admin/users` - Create new user
- `DELETE /api/admin/users/:id` - Delete user

## 🚀 Deployment

### Using GitHub Actions
The project includes GitHub Actions workflow for CI/CD:
1. Automated testing
2. Docker image building
3. Deployment to staging/production

### Manual Deployment
1. Build the frontend: `npm run build`
2. Set environment variables
3. Start with PM2: `pm2 start server.js`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👏 Acknowledgments

- [Ollama](https://ollama.ai) for local AI capabilities
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the code editor
- [Material-UI](https://mui.com/) for the component library

## 📞 Support

For support, email support@codespace.com or open an issue in the GitHub repository.

## 🔮 Future Enhancements

- [ ] Real-time collaboration
- [ ] Video tutorials integration
- [ ] Advanced analytics dashboard
- [ ] Mobile application
- [ ] Integration with GitHub
- [ ] Plagiarism detection
- [ ] Competitive coding challenges

---

Made with ❤️ by [Siddharth Acharya]
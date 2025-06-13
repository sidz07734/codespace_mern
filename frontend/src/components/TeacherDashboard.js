import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Avatar,
  MenuItem,
  Rating,
  Tabs,
  Tab,
  Divider,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Code as CodeIcon,
  Assessment as AssessmentIcon,
  Visibility as ViewIcon,
  Grade as GradeIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Logout as LogoutIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ArrowBack as ArrowBackIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSubmissions: 0,
    activeToday: 0,
    languageStats: [],
    gradeStats: {},
    recentSubmissions: []
  });
  
  // Students state
  const [students, setStudents] = useState([]);
  const [studentPage, setStudentPage] = useState(0);
  const [studentRowsPerPage, setStudentRowsPerPage] = useState(10);
  const [studentSearch, setStudentSearch] = useState('');
  const [totalStudents, setTotalStudents] = useState(0);
  
  // Selected student codes - IMPROVED WORKFLOW
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentCodes, setStudentCodes] = useState([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [gradingMode, setGradingMode] = useState(false); // New state for grading workflow
  
  // Dialogs
  const [viewCodeDialog, setViewCodeDialog] = useState({ open: false, code: null });
  const [feedbackDialog, setFeedbackDialog] = useState({ open: false, code: null });
  const [newStudentDialog, setNewStudentDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, userId: null });
  
  // Feedback form
  const [feedbackForm, setFeedbackForm] = useState({
    comment: '',
    grade: null
  });

  useEffect(() => {
    fetchDashboardData();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (studentSearch) {
      const timer = setTimeout(() => {
        fetchStudents();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      fetchStudents();
    }
  }, [studentSearch, studentPage, studentRowsPerPage]);

  const fetchDashboardData = async () => {
    try {
      const response = await adminAPI.getDashboard();
      setStats(response.data.stats);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await adminAPI.getStudents({
        page: studentPage + 1,
        limit: studentRowsPerPage,
        search: studentSearch
      });
      setStudents(response.data.students);
      setTotalStudents(response.data.total);
    } catch (error) {
      toast.error('Failed to load students');
    }
  };

  const fetchStudentCodes = async (studentId) => {
    setCodesLoading(true);
    try {
      const response = await adminAPI.getStudentCodes(studentId, { limit: 50 });
      setStudentCodes(response.data.codes);
      setSelectedStudent(response.data.student);
    } catch (error) {
      toast.error('Failed to load student codes');
    } finally {
      setCodesLoading(false);
    }
  };

  // NEW: Start grading workflow
  const startGradingForStudent = (student) => {
    setGradingMode(true);
    setActiveTab(3); // Switch to grading tab
    fetchStudentCodes(student._id);
  };

  // NEW: Exit grading mode
  const exitGradingMode = () => {
    setGradingMode(false);
    setSelectedStudent(null);
    setStudentCodes([]);
    setActiveTab(1); // Go back to students tab
  };

  const handleAddFeedback = async () => {
    if (!feedbackForm.comment.trim()) {
      toast.error('Please provide feedback comment');
      return;
    }

    try {
      await adminAPI.addFeedback(feedbackDialog.code._id, feedbackForm);
      toast.success('Feedback added successfully!');
      setFeedbackDialog({ open: false, code: null });
      setFeedbackForm({ comment: '', grade: null });
      
      // Refresh data
      if (selectedStudent) {
        fetchStudentCodes(selectedStudent._id);
      }
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to add feedback');
    }
  };

  const handleCreateStudent = async (data) => {
    try {
      await adminAPI.createUser(data);
      toast.success('Student account created successfully!');
      setNewStudentDialog(false);
      fetchStudents();
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create student');
    }
  };

  const handleDeleteStudent = async () => {
    try {
      await adminAPI.deleteUser(deleteDialog.userId);
      toast.success('Student deleted successfully');
      setDeleteDialog({ open: false, userId: null });
      fetchStudents();
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to delete student');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      submitted: 'default',
      analyzed: 'primary',
      reviewed: 'secondary',
      graded: 'success'
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Teacher Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome, {user?.username}! Monitor student progress and provide feedback.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={logout}
          color="secondary"
        >
          Logout
        </Button>
      </Box>

      {/* Breadcrumb for grading mode */}
      {gradingMode && selectedStudent && (
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
            <Link 
              component="button" 
              variant="body1" 
              onClick={exitGradingMode}
              sx={{ textDecoration: 'none' }}
            >
              Students
            </Link>
            <Typography color="text.primary">
              {selectedStudent.username}'s Submissions
            </Typography>
          </Breadcrumbs>
        </Box>
      )}

      {/* Tabs - Hide when in grading mode */}
      {!gradingMode && (
        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="Overview" icon={<DashboardIcon />} iconPosition="start" />
            <Tab label="Students & Grading" icon={<PeopleIcon />} iconPosition="start" />
            <Tab label="Analytics" icon={<AssessmentIcon />} iconPosition="start" />
          </Tabs>
        </Paper>
      )}

      {/* Overview Tab */}
      {activeTab === 0 && !gradingMode && (
        <>
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Total Students
                      </Typography>
                      <Typography variant="h4">
                        {stats.totalStudents}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <PeopleIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Total Submissions
                      </Typography>
                      <Typography variant="h4">
                        {stats.totalSubmissions}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                      <CodeIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Active Today
                      </Typography>
                      <Typography variant="h4">
                        {stats.activeToday}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <TrendingUpIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Average Grade
                      </Typography>
                      <Typography variant="h4">
                        {stats.gradeStats?.avgGrade?.toFixed(1) || 'N/A'}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <GradeIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Recent Submissions */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Submissions
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Language</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.recentSubmissions.map((submission) => (
                    <TableRow key={submission._id}>
                      <TableCell>{submission.user?.username}</TableCell>
                      <TableCell>{submission.title}</TableCell>
                      <TableCell>
                        <Chip label={submission.language.toUpperCase()} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={submission.status}
                          color={getStatusColor(submission.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{format(new Date(submission.createdAt), 'MMM dd, HH:mm')}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => setViewCodeDialog({ open: true, code: submission })}
                        >
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* Students & Grading Tab - IMPROVED */}
      {activeTab === 1 && !gradingMode && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Students & Grading
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select a student to view and grade their code submissions
            </Typography>
          </Box>

          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <TextField
              placeholder="Search students..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              size="small"
              sx={{ width: 300 }}
            />
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setNewStudentDialog(true)}
            >
              Add Student
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Submissions</TableCell>
                  <TableCell>Graded</TableCell>
                  <TableCell>Pending Review</TableCell>
                  <TableCell>Last Active</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                          {student.username.charAt(0).toUpperCase()}
                        </Avatar>
                        {student.username}
                      </Box>
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={student.submissionCount || 0} 
                        color={student.submissionCount > 0 ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={student.gradedCount || 0} 
                        color="success"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={(student.submissionCount || 0) - (student.gradedCount || 0)} 
                        color="warning"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{format(new Date(student.lastActive), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<GradeIcon />}
                        onClick={() => startGradingForStudent(student)}
                        disabled={!student.submissionCount}
                      >
                        Grade Work
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteDialog({ open: true, userId: student._id })}
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalStudents}
            page={studentPage}
            onPageChange={(e, page) => setStudentPage(page)}
            rowsPerPage={studentRowsPerPage}
            onRowsPerPageChange={(e) => {
              setStudentRowsPerPage(parseInt(e.target.value, 10));
              setStudentPage(0);
            }}
          />
        </Paper>
      )}

      {/* GRADING MODE - Student's Submissions */}
      {gradingMode && selectedStudent && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                {selectedStudent.username}'s Code Submissions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {studentCodes.length} submission(s) • Click on any submission to view and grade
              </Typography>
            </Box>
            <Button 
              variant="outlined" 
              startIcon={<ArrowBackIcon />}
              onClick={exitGradingMode}
            >
              Back to Students
            </Button>
          </Box>

          {codesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : studentCodes.length === 0 ? (
            <Alert severity="info">
              This student hasn't submitted any code yet.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {studentCodes.map((code) => (
                <Grid item xs={12} md={6} lg={4} key={code._id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      cursor: 'pointer',
                      '&:hover': { 
                        boxShadow: 3,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s'
                      }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                        <Typography variant="h6" noWrap>
                          {code.title}
                        </Typography>
                        <Chip
                          label={code.status}
                          color={getStatusColor(code.status)}
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Chip 
                          label={code.language.toUpperCase()} 
                          size="small" 
                          sx={{ mr: 1 }} 
                        />
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(code.createdAt), 'MMM dd, yyyy HH:mm')}
                        </Typography>
                      </Box>

                      {code.description && (
                        <Typography variant="body2" color="text.secondary" paragraph noWrap>
                          {code.description}
                        </Typography>
                      )}
                      
                      {code.feedback ? (
                        <Alert severity="success" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            ✓ Graded
                            {code.feedback.grade && ` - ${code.feedback.grade}/100`}
                          </Typography>
                        </Alert>
                      ) : (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            ⏳ Awaiting feedback
                          </Typography>
                        </Alert>
                      )}
                      
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ViewIcon />}
                          onClick={() => setViewCodeDialog({ open: true, code })}
                          fullWidth
                        >
                          View Code
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<GradeIcon />}
                          onClick={() => {
                            setFeedbackDialog({ open: true, code });
                            setFeedbackForm({
                              comment: code.feedback?.comment || '',
                              grade: code.feedback?.grade || null
                            });
                          }}
                          fullWidth
                          color={code.feedback ? 'secondary' : 'primary'}
                        >
                          {code.feedback ? 'Update Grade' : 'Add Grade'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      {/* Analytics Tab */}
      {activeTab === 2 && !gradingMode && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Language Distribution
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.languageStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry._id}: ${entry.count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.languageStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  {/* Legend removed - labels on pie slices are sufficient */}
                </PieChart>
              </ResponsiveContainer>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Grade Statistics
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Average Grade: {stats.gradeStats?.avgGrade?.toFixed(2) || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  Highest Grade: {stats.gradeStats?.maxGrade || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  Lowest Grade: {stats.gradeStats?.minGrade || 'N/A'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* All the existing dialogs remain the same */}
      {/* View Code Dialog */}
      <Dialog
        open={viewCodeDialog.open}
        onClose={() => setViewCodeDialog({ open: false, code: null })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {viewCodeDialog.code?.title} - {viewCodeDialog.code?.user?.username || selectedStudent?.username}
        </DialogTitle>
        <DialogContent>
          {viewCodeDialog.code && (
            <>
              <Box sx={{ mb: 2 }}>
                <Chip label={viewCodeDialog.code.language.toUpperCase()} sx={{ mr: 1 }} />
                <Chip label={viewCodeDialog.code.status} color={getStatusColor(viewCodeDialog.code.status)} />
              </Box>
              <SyntaxHighlighter language={viewCodeDialog.code.language} style={docco}>
                {viewCodeDialog.code.code}
              </SyntaxHighlighter>
              {viewCodeDialog.code.analysis?.result && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    AI Analysis
                  </Typography>
                  <Alert severity="info">
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {viewCodeDialog.code.analysis.result}
                    </Typography>
                  </Alert>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewCodeDialog({ open: false, code: null })}>
            Close
          </Button>
          {viewCodeDialog.code && (
            <Button 
              variant="contained"
              onClick={() => {
                setFeedbackDialog({ open: true, code: viewCodeDialog.code });
                setFeedbackForm({
                  comment: viewCodeDialog.code.feedback?.comment || '',
                  grade: viewCodeDialog.code.feedback?.grade || null
                });
                setViewCodeDialog({ open: false, code: null });
              }}
            >
              Grade This Code
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog
        open={feedbackDialog.open}
        onClose={() => setFeedbackDialog({ open: false, code: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {feedbackDialog.code?.feedback ? 'Update' : 'Add'} Feedback - {feedbackDialog.code?.title}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Feedback Comment"
            value={feedbackForm.comment}
            onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
            placeholder="Provide constructive feedback on the code quality, structure, and improvements..."
          />
          <TextField
            fullWidth
            type="number"
            label="Grade (0-100)"
            value={feedbackForm.grade || ''}
            onChange={(e) => setFeedbackForm({ ...feedbackForm, grade: e.target.value ? parseInt(e.target.value) : null })}
            inputProps={{ min: 0, max: 100 }}
            placeholder="Enter a grade between 0-100"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog({ open: false, code: null })}>
            Cancel
          </Button>
          <Button onClick={handleAddFeedback} variant="contained">
            Save Feedback
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Student Dialog */}
      <Dialog open={newStudentDialog} onClose={() => setNewStudentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Student Account</DialogTitle>
        <DialogContent>
          <NewStudentForm onSubmit={handleCreateStudent} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, userId: null })}>
        <DialogTitle>Delete Student?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this student? This will also delete all their code submissions.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, userId: null })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteStudent} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

// New Student Form Component
function NewStudentForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        fullWidth
        label="Username"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        required
        sx={{ mb: 2, mt: 2 }}
      />
      <TextField
        fullWidth
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Password"
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
        helperText="Minimum 6 characters"
        sx={{ mb: 2 }}
      />
      <DialogActions>
        <Button type="submit" variant="contained" fullWidth>
          Create Student
        </Button>
      </DialogActions>
    </form>
  );
}
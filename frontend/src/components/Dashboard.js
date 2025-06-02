import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { codeAPI } from '../services/api';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  CircularProgress,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Code as CodeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Analytics as AnalyticsIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, codeId: null });
  const [stats, setStats] = useState({
    total: 0,
    analyzed: 0,
    reviewed: 0,
    graded: 0
  });

  useEffect(() => {
    fetchCodes();
  }, [page, filterLanguage, filterStatus]);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 9,
        language: filterLanguage || undefined,
        status: filterStatus || undefined,
        search: searchTerm || undefined
      };

      const response = await codeAPI.getAll(params);
      setCodes(response.data.codes);
      setTotalPages(response.data.totalPages);
      
      // Calculate stats
      const total = response.data.total;
      const analyzed = response.data.codes.filter(c => c.status === 'analyzed').length;
      const reviewed = response.data.codes.filter(c => c.status === 'reviewed').length;
      const graded = response.data.codes.filter(c => c.status === 'graded').length;
      
      setStats({ total, analyzed, reviewed, graded });
    } catch (error) {
      console.error('Error fetching codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await codeAPI.delete(deleteDialog.codeId);
      setDeleteDialog({ open: false, codeId: null });
      fetchCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCodes();
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

  const getLanguageIcon = (language) => {
    const icons = {
      javascript: '🟨',
      python: '🐍',
      java: '☕',
      cpp: '🔷',
      c: '🔵'
    };
    return icons[language] || '📝';
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <Typography variant="h4" gutterBottom>
              Welcome back, {user?.username}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your code submissions and track your progress
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/code')}
              size="large"
            >
              New Code
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              onClick={logout}
              color="secondary"
            >
              Logout
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h3" color="primary">
              {stats.total}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Total Submissions
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h3" color="info.main">
              {stats.analyzed}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Analyzed
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h3" color="secondary.main">
              {stats.reviewed}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Reviewed
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h3" color="success.main">
              {stats.graded}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Graded
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <form onSubmit={handleSearch}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                select
                size="small"
                label="Language"
                value={filterLanguage}
                onChange={(e) => {
                  setFilterLanguage(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="javascript">JavaScript</MenuItem>
                <MenuItem value="python">Python</MenuItem>
                <MenuItem value="java">Java</MenuItem>
                <MenuItem value="cpp">C++</MenuItem>
                <MenuItem value="c">C</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                select
                size="small"
                label="Status"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="analyzed">Analyzed</MenuItem>
                <MenuItem value="reviewed">Reviewed</MenuItem>
                <MenuItem value="graded">Graded</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                type="submit"
                startIcon={<FilterIcon />}
              >
                Apply Filters
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setFilterLanguage('');
                  setFilterStatus('');
                  setPage(1);
                  fetchCodes();
                }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Code Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : codes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No code submissions found
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/code')}
            sx={{ mt: 2 }}
          >
            Create Your First Code
          </Button>
        </Paper>
      ) : (
        <>
          <Grid container spacing={3}>
            {codes.map((code) => (
              <Grid item xs={12} md={4} key={code._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Typography variant="h6" component="h2" gutterBottom>
                        {getLanguageIcon(code.language)} {code.title}
                      </Typography>
                      <Chip
                        label={code.status}
                        color={getStatusColor(code.status)}
                        size="small"
                      />
                    </Box>
                    
                    {code.description && (
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {code.description}
                      </Typography>
                    )}
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Language: {code.language.toUpperCase()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Created: {format(new Date(code.createdAt), 'MMM dd, yyyy')}
                      </Typography>
                      
                      {code.feedback?.grade && (
                        <Typography variant="caption" color="success.main" display="block">
                          Grade: {code.feedback.grade}/100
                        </Typography>
                      )}
                    </Box>
                    
                    {code.tags && code.tags.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        {code.tags.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    )}
                  </CardContent>
                  
                  <CardActions>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/code/${code._id}`)}
                      title="View"
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/code/${code._id}?edit=true`)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    {code.status === 'submitted' && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(`/code/${code._id}?analyze=true`)}
                        title="Analyze"
                      >
                        <AnalyticsIcon />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog({ open: true, codeId: code._id })}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, codeId: null })}>
        <DialogTitle>Delete Code?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this code submission? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, codeId: null })}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { codeAPI } from '../services/api';
import Editor from '@monaco-editor/react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Card,
  CardContent
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Code as CodeIcon,
  Analytics as AnalyzeIcon,
  ContentCopy as CopyIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';

export default function CodeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    language: 'javascript',
    code: '',
    tags: []
  });
  const [analysis, setAnalysis] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');

  const isEditMode = id && searchParams.get('edit') === 'true';
  const shouldAnalyze = searchParams.get('analyze') === 'true';

  useEffect(() => {
    if (id) {
      fetchCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (shouldAnalyze && id) {
      handleAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAnalyze, id]);

  const fetchCode = async () => {
    setLoading(true);
    try {
      const response = await codeAPI.getOne(id);
      const code = response.data.code;
      setFormData({
        title: code.title,
        description: code.description || '',
        language: code.language,
        code: code.code,
        tags: code.tags || []
      });
      setAnalysis(code.analysis?.result || null);
      setFeedback(code.feedback || null);
    } catch (error) {
      toast.error('Failed to load code');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        handleChange('tags', [...formData.tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    handleChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.code.trim()) newErrors.code = 'Code is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (id && isEditMode) {
        await codeAPI.update(id, formData);
        toast.success('Code updated successfully!');
      } else {
        const response = await codeAPI.create(formData);
        toast.success('Code saved successfully!');
        navigate(`/code/${response.data.code._id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save code');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!id) {
      toast.error('Please save your code first');
      return;
    }

    setAnalyzing(true);
    setActiveTab(1);
    try {
      const response = await codeAPI.analyze(id);
      setAnalysis(response.data.analysis);
      toast.success('Code analysis completed!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to analyze code');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(formData.code);
    toast.success('Code copied to clipboard!');
  };

  const getEditorLanguage = (lang) => {
    const languageMap = {
      javascript: 'javascript',
      python: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c'
    };
    return languageMap[lang] || 'plaintext';
  };

  const editorOptions = {
    minimap: { enabled: !fullscreen },
    fontSize: fullscreen ? 16 : 14,
    wordWrap: 'on',
    automaticLayout: true,
    scrollBeyondLastLine: false
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth={fullscreen ? false : 'lg'} sx={{ mt: fullscreen ? 0 : 4, mb: 4 }}>
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/dashboard')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ flexGrow: 1 }}>
            {id && !isEditMode ? 'View Code' : id ? 'Edit Code' : 'New Code'}
          </Typography>
          <IconButton onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Box>

        {/* Form Fields */}
        {!fullscreen && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  error={!!errors.title}
                  helperText={errors.title}
                  disabled={id && !isEditMode}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Language"
                  value={formData.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                  disabled={id && !isEditMode}
                  required
                >
                  <MenuItem value="javascript">JavaScript</MenuItem>
                  <MenuItem value="python">Python</MenuItem>
                  <MenuItem value="java">Java</MenuItem>
                  <MenuItem value="cpp">C++</MenuItem>
                  <MenuItem value="c">C</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description (Optional)"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  multiline
                  rows={2}
                  disabled={id && !isEditMode}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Add Tags (Press Enter)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  disabled={id && !isEditMode}
                  placeholder="e.g., algorithms, data-structures"
                />
                <Box sx={{ mt: 1 }}>
                  {formData.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={id && !isEditMode ? undefined : () => handleRemoveTag(tag)}
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Code Editor and Analysis Tabs */}
        <Paper sx={{ height: fullscreen ? '100vh' : '600px', display: 'flex', flexDirection: 'column' }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Code" icon={<CodeIcon />} iconPosition="start" />
            <Tab label="Analysis" icon={<AnalyzeIcon />} iconPosition="start" disabled={!analysis && !analyzing} />
            {feedback && <Tab label="Feedback" />}
          </Tabs>

          <Box sx={{ flexGrow: 1, position: 'relative' }}>
            {/* Code Tab */}
            {activeTab === 0 && (
              <>
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                  <IconButton onClick={handleCopyCode} size="small">
                    <CopyIcon />
                  </IconButton>
                </Box>
                <Editor
                  height="100%"
                  language={getEditorLanguage(formData.language)}
                  value={formData.code}
                  onChange={(value) => handleChange('code', value || '')}
                  theme="vs-dark"
                  options={{
                    ...editorOptions,
                    readOnly: id && !isEditMode
                  }}
                />
              </>
            )}

            {/* Analysis Tab - FIXED VERSION */}
            {activeTab === 1 && (
              <Box sx={{ p: 3, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {analyzing ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
                    <CircularProgress sx={{ mb: 2 }} />
                    <Typography>Analyzing your code...</Typography>
                  </Box>
                ) : analysis ? (
                  <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" gutterBottom>
                      AI Code Analysis
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      This analysis is generated by AI and should be used as guidance only.
                    </Alert>
                    <Card variant="outlined" sx={{ 
                      flexGrow: 1, 
                      display: 'flex', 
                      flexDirection: 'column',
                      minHeight: 0, // Important for flex child
                      maxHeight: '400px' // Constrain the card height
                    }}>
                      <CardContent sx={{ 
                        flex: '1 1 auto',
                        overflow: 'auto',
                        padding: '16px',
                        height: 0, // Force the content to be scrollable
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: '#f1f1f1',
                          borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: '#888',
                          borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                          background: '#555',
                        },
                      }}>
                        <Typography 
                          variant="body1" 
                          component="div"
                          sx={{ 
                            whiteSpace: 'pre-wrap', 
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            margin: 0,
                            padding: 0
                          }}
                        >
                          {analysis}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No analysis available
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AnalyzeIcon />}
                      onClick={handleAnalyze}
                      sx={{ mt: 2 }}
                    >
                      Analyze Code
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Feedback Tab */}
            {activeTab === 2 && feedback && (
              <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Teacher Feedback
                </Typography>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body1" paragraph>
                      {feedback.comment}
                    </Typography>
                    {feedback.grade && (
                      <Box sx={{ mt: 2 }}>
                        <Chip
                          label={`Grade: ${feedback.grade}/100`}
                          color="success"
                          size="large"
                        />
                      </Box>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                      Reviewed by: {feedback.teacher?.username || 'Teacher'}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Action Buttons */}
        {!fullscreen && (
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            {(!id || isEditMode) && (
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : id ? 'Update' : 'Save'}
              </Button>
            )}
            {id && !isEditMode && (
              <>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/code/${id}?edit=true`)}
                >
                  Edit
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AnalyzeIcon />}
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? <CircularProgress size={24} /> : 'Analyze'}
                </Button>
              </>
            )}
          </Box>
        )}
      </form>
    </Container>
  );
}
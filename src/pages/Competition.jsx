import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetition } from '../context/CompetitionContext';
import { useAuth } from '../context/AuthContext';
import Timer from '../components/Timer';
import Loading from '../components/Loading';
import useProctoring from '../hooks/useProctoring';
import ProctoringOverlay from '../components/ProctoringOverlay';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const CodeRunner = ({ value, onChange, questionId }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const pyodideRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    if (pyodideRef.current || pyodideLoading) return;
    setPyodideLoading(true);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
    script.onload = async () => {
      try {
        pyodideRef.current = await globalThis.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
        });
        setPyodideReady(true);
      } catch (e) {
        setError('Failed to initialize Python runner: ' + e.message);
      } finally {
        setPyodideLoading(false);
      }
    };
    script.onerror = () => {
      setError('Failed to load Python runner. Check your internet connection.');
      setPyodideLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  const handleRun = async () => {
    if (!value || running || !pyodideRef.current) return;
    setRunning(true);
    setOutput(null);
    setError(null);
    try {
      const py = pyodideRef.current;
      py.runPython(`
import sys
from io import StringIO
_stdout_buf = StringIO()
_stderr_buf = StringIO()
sys.stdout = _stdout_buf
sys.stderr = _stderr_buf
`);
      try {
        await py.runPythonAsync(value);
      } catch (e) {
        // traceback already captured in _stderr_buf by Python
      }
      const stdout = py.runPython('_stdout_buf.getvalue()');
      const stderr = py.runPython('_stderr_buf.getvalue()');
      py.runPython(`
_stdout_buf.close()
_stderr_buf.close()
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
`);
      setOutput({ stdout: stdout || '', stderr: stderr || '' });
    } catch (err) {
      setOutput({ stdout: '', stderr: err.message });
    } finally {
      setRunning(false);
    }
  };

  const handleClear = () => {
    setOutput(null);
    setError(null);
  };

  return (
    <div className="code-runner">
      <div className={`code-editor-container card ${isFocused ? 'focused' : ''}`}>
        <div className="code-editor-header">
          <span className="language-badge">python</span>
          <div className="code-editor-actions">
            {output && (
              <button onClick={handleClear} className="btn btn-sm btn-secondary" style={{marginRight: 8}}>
                Clear
              </button>
            )}
            <button
              onClick={handleRun}
              disabled={running || !value || (!pyodideReady && !pyodideLoading)}
              className="btn btn-primary btn-sm"
            >
              {pyodideLoading ? 'Loading...' : running ? 'Running...' : 'Run Code'}
            </button>
          </div>
        </div>
        <textarea
          className="code-editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          spellCheck="false"
          autoComplete="off"
          placeholder="Write your Python code here..."
        />
      </div>
      {!pyodideReady && !pyodideLoading && !error && (
        <div className="code-output">
          <div className="code-output-header">Status</div>
          <pre className="code-output-stdout">Click "Run Code" to load the Python runner</pre>
        </div>
      )}
      {pyodideLoading && (
        <div className="code-output">
          <div className="code-output-header">Status</div>
          <pre className="code-output-stdout">Loading Python runner (~10MB)...</pre>
        </div>
      )}
      {(output || error) && (
        <div className="code-output" ref={outputRef}>
          <div className="code-output-header">Output</div>
          {error ? (
            <pre className="code-output-error">{error}</pre>
          ) : (
            <>
              {output.stdout && <pre className="code-output-stdout">{output.stdout}</pre>}
              {output.stderr && <pre className="code-output-stderr">{output.stderr}</pre>}
              {!output.stdout && !output.stderr && <pre className="code-output-stdout">(no output)</pre>}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const CustomAlert = ({ isOpen, title, message, onConfirm, onCancel, isLoading, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
  if (!isOpen) return null;

  return (
    <div className="loading-overlay">
      <div className="card dialog-content">
        <div className="dialog-header">
          <h3 className="section-title">{title}</h3>
        </div>
        <div className="dialog-body">
          {message.split('\n').map((line, i) => <p key={i}>{line}</p>)}
        </div>
        <div className="dialog-footer">
          {cancelText && (
            <button
              onClick={onCancel}
              className="btn btn-secondary animated-link"
            >
              {cancelText}
            </button>
          )}
          {confirmText && (
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? (
                <>
                  <Loading /> Submitting...
                </>
              ) : (
                confirmText
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Competition = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    currentCompetition, 
    loading, 
    error, 
    questions,
    submitAnswer,
    hasActiveCompetition,
    competitionLength,
    submitAllAndFinish
  } = useCompetition();

  const {
    webcamRef, cameraActive, screenActive, isRecording, error: proctorError,
    startRecording, stopRecording, cleanup: cleanupProctoring
  } = useProctoring();

  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [uploadingRecordings, setUploadingRecordings] = useState(false);

  // Memoize the end time calculation
  const endTime = useMemo(() => {
    if (!currentCompetition?.startTime || !competitionLength) return null;
    const startTime = new Date(currentCompetition.startTime).getTime();
    const duration = competitionLength * 1000; // Convert seconds to milliseconds
    return startTime + duration;
  }, [currentCompetition?.startTime, competitionLength]);

  const uploadRecording = async (blob, type) => {
    if (!blob || blob.size < 100) return;
    try {
      const token = localStorage.getItem('token');
      const presignCtrl = new AbortController();
      const presignTimer = setTimeout(() => presignCtrl.abort(), 10000);
      const presignRes = await fetch(`${API_URL}/competition/upload-url?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: presignCtrl.signal,
      });
      clearTimeout(presignTimer);
      if (!presignRes.ok) throw new Error('Failed to get upload URL');
      const { url } = await presignRes.json();
      const putCtrl = new AbortController();
      const putTimer = setTimeout(() => putCtrl.abort(), 30000);
      await fetch(url, { method: 'PUT', body: blob, signal: putCtrl.signal });
      clearTimeout(putTimer);
      console.log(`${type} recording uploaded directly to Spaces`);
    } catch (e) {
      if (e.name !== 'AbortError') console.error(`Failed to upload ${type} recording:`, e);
    }
  };

  // Handle auto submit function — sends ALL questions, null for unanswered
  const handleAutoSubmit = useCallback(async () => {
    if (isAutoSubmitting) return;
    setIsAutoSubmitting(true);

    try {
      setUploadingRecordings(true);
      const { cameraBlob, screenBlob } = await stopRecording();
      await Promise.race([
        Promise.all([
          uploadRecording(cameraBlob, 'camera'),
          uploadRecording(screenBlob, 'screen'),
        ]),
        new Promise(r => setTimeout(r, 35000)),
      ]);
      setUploadingRecordings(false);

      const allAnswers = questions.map(q => ({
        questionId: q._id,
        answer: answers[q._id] || null
      }));
      await submitAllAndFinish(allAnswers);
    } catch (error) {
      console.error('Error during auto-submission:', error);
    } finally {
      setIsAutoSubmitting(false);
    }
  }, [answers, questions, isAutoSubmitting, submitAllAndFinish, stopRecording]);

  // Handle submit all function
  const handleSubmitAll = useCallback(async () => {
    if (isSubmitting || isAutoSubmitting) return;
    setIsSubmitting(true);

    try {
      await handleAutoSubmit();
      // Add a small delay before navigation to ensure submission is complete
      setTimeout(() => {
        navigate('/results');
      }, 1000);
    } catch (error) {
      console.error('Error submitting answers:', error);
      setSubmitError('Failed to submit answers. Please try again.');
    } finally {
      setIsSubmitting(false);
      setShowSubmitConfirm(false);
    }
  }, [isSubmitting, isAutoSubmitting, handleAutoSubmit, navigate]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (hasActiveCompetition && questions.length > 0 && !isRecording && !proctorError) {
      const timer = setTimeout(() => startRecording(), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasActiveCompetition, questions, isRecording, proctorError, startRecording]);

  useEffect(() => {
    return () => { cleanupProctoring(); };
  }, [cleanupProctoring]);

  useEffect(() => {
    if (!hasActiveCompetition) {
      navigate('/dashboard');
    }
  }, [hasActiveCompetition, navigate]);

  // Handle answer changes
  const handleAnswerChange = useCallback((questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  }, []);

  // Handle flagging questions
  const toggleFlag = useCallback((questionId) => {
    setFlaggedQuestions(prev => {
      const newFlags = new Set(prev);
      if (newFlags.has(questionId)) {
        newFlags.delete(questionId);
      } else {
        newFlags.add(questionId);
      }
      return newFlags;
    });
  }, []);

  // Anti-cheat system
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [lastWarning, setLastWarning] = useState({ type: '', count: 0 });
  const maxWarnings = 3;

  const logActivity = useCallback(async (type, details) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/competition/log-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, timestamp: new Date().toISOString(), details, warningCount })
      });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }, [warningCount]);

  const triggerWarning = useCallback((type, message) => {
    setWarningCount(prev => {
      const newCount = prev + 1;
      setLastWarning({ type, count: newCount });
      if (newCount < maxWarnings) {
        setShowWarning(true);
      }
      logActivity(type, `${message} (warning ${newCount}/${maxWarnings})`);
      return newCount;
    });
  }, [logActivity]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        triggerWarning('tab_switch', 'Tab switched away');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [triggerWarning]);

  useEffect(() => {
    const handleCopy = (e) => {
      e.preventDefault();
      triggerWarning('copy_attempt', 'Copy attempted');
    };
    const handlePaste = (e) => {
      e.preventDefault();
      triggerWarning('paste_attempt', 'Paste attempted');
    };
    const handleCut = (e) => {
      e.preventDefault();
      triggerWarning('cut_attempt', 'Cut attempted');
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
    };
  }, [triggerWarning]);

  useEffect(() => {
    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        triggerWarning('fullscreen_exit', 'Exited fullscreen');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => document.removeEventListener('fullscreenchange', handleFullscreen);
  }, [triggerWarning]);

  useEffect(() => {
    if (warningCount >= maxWarnings) {
      handleSubmitAll();
    }
  }, [warningCount, handleSubmitAll]);

  // Handle page refresh/close
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      handleAutoSubmit();
      return 'Warning: Leaving this page will submit all your current answers. Are you sure you want to proceed?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleAutoSubmit]);

  if (loading) {
    return <Loading fullScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="card">
          <h2 className="section-title text-error">{error}</h2>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary animated-link">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="card">
          <h2 className="section-title">No Questions Available</h2>
          <p className="text-text-secondary">Please try again later.</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary animated-link mt-4">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="competition-container">
      {/* Left Sidebar */}
      <aside className="competition-sidebar">
        <div className="sidebar-header">
          <div className="logo">EOCS</div>
          <Timer endTime={endTime} onTimeUp={handleSubmitAll} />
        </div>

        <div className="sidebar-scroll">
          <div className="sidebar-section">
            <h2 className="section-title">Questions</h2>
            <div className="questions-grid">
              {questions.map((q, index) => (
                <button
                  key={q._id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`question-button ${
                    answers[q._id] ? 'answered' : ''} 
                    ${flaggedQuestions.has(q._id) ? 'flagged' : ''} 
                    ${currentQuestionIndex === index ? 'current' : ''}`}
                  title={`Question ${index + 1}: ${q.subject} - ${q.difficulty}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="status-row">
              <div className="status-item">
                <span className="status-dot answered"></span>
                <span>Answered: {Object.keys(answers).length}</span>
              </div>
              <div className="status-item">
                <span className="status-dot flagged"></span>
                <span>Flagged: {flaggedQuestions.size}</span>
              </div>
              <div className="status-item">
                <span className="status-dot unanswered"></span>
                <span>Left: {questions.length - Object.keys(answers).length}</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h2 className="section-title">Monitoring</h2>
            <div className="progress-stats">
              <div className="stat-item">
                <span className="stat-label">Warnings</span>
                <span className="stat-value">{warningCount} / {maxWarnings}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Leaves Left</span>
                <span className={`stat-value ${maxWarnings - warningCount <= 1 ? 'text-error' : ''}`}>{Math.max(0, maxWarnings - warningCount)}</span>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowSubmitConfirm(true)}
          className="btn btn-primary submit-button"
          disabled={isSubmitting || isAutoSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit All Answers'}
        </button>
      </aside>

      {/* Main Content */}
      <main className="competition-main">
        {currentQuestion && (
          <div className="question-container">
            <div className="question-header">
              <div className="question-info">
                <span className="question-number">Question {currentQuestionIndex + 1}</span>
                <div className="question-meta">
                  <span className="subject-badge">{currentQuestion.subject}</span>
                  <span className="difficulty-badge">{currentQuestion.difficulty}</span>
                  <span className="points-badge">{currentQuestion.points} Points</span>
                </div>
              </div>
              <button
                onClick={() => toggleFlag(currentQuestion._id)}
                className={`flag-button ${flaggedQuestions.has(currentQuestion._id) ? 'flagged' : ''}`}
              >
                {flaggedQuestions.has(currentQuestion._id) ? 'Unflag' : 'Flag'} Question
              </button>
            </div>

            <div className="question-content">
              <div className="question-text" dangerouslySetInnerHTML={{ __html: currentQuestion.text }} />
              
              {currentQuestion.type === 'code' ? (
                <CodeRunner
                  value={answers[currentQuestion._id] || ''}
                  onChange={(value) => handleAnswerChange(currentQuestion._id, value)}
                  questionId={currentQuestion._id}
                />
              ) : (
                <div className="multiple-choice">
                  {currentQuestion.options.map((option, index) => (
                    <label key={index} className="option-label">
                      <input
                        type="radio"
                        name={`question-${currentQuestion._id}`}
                        value={option}
                        checked={answers[currentQuestion._id] === option}
                        onChange={() => handleAnswerChange(currentQuestion._id, option)}
                      />
                      <span className="option-text">{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="question-footer">
              <button
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex === questions.length - 1}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      <ProctoringOverlay
        webcamRef={webcamRef}
        cameraActive={cameraActive}
        screenActive={screenActive}
        isRecording={isRecording}
        error={proctorError}
      />

      {/* Warning Dialog */}
      <CustomAlert
        isOpen={showWarning}
        title="Violation Warning"
        message={`Warning ${lastWarning.count} of ${maxWarnings}: ${lastWarning.type === 'tab_switch' ? 'You left the competition tab.' : lastWarning.type === 'fullscreen_exit' ? 'You exited fullscreen mode.' : 'Copy/paste is not allowed.'}\n\nYou have ${maxWarnings - lastWarning.count} remaining leave(s) before your exam is automatically submitted.`}
        onConfirm={() => setShowWarning(false)}
        onCancel={() => setShowWarning(false)}
        isLoading={false}
        confirmText="I Understand"
        cancelText=""
      />

      {/* Submit Confirmation Dialog */}
      <CustomAlert
        isOpen={showSubmitConfirm}
        title="Submit All Answers"
        message="Are you sure you want to submit all your answers? This action cannot be undone."
        onConfirm={handleSubmitAll}
        onCancel={() => setShowSubmitConfirm(false)}
        isLoading={isSubmitting}
      />

      {/* Error Message */}
      {submitError && (
        <div className="error-message">
          {submitError}
        </div>
      )}
    </div>
  );
};

export default Competition;
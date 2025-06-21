import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetition } from '../context/CompetitionContext';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/_competition.scss';

// Get competition length from environment variable or use default
const COMPETITION_LENGTH = import.meta.env.VITE_COMPETITION_LENGTH || 300; // seconds

// For code editor - we would use a proper library in production
const SimpleCodeEditor = ({ value, onChange, language }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`code-editor-container ${isFocused ? 'focused' : ''}`}>
      <div className="code-editor-header">
        <span className="language-badge">{language || 'javascript'}</span>
      </div>
      <textarea
        className="code-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        spellCheck="false"
        autoComplete="off"
        placeholder="Write your code here..."
      />
    </div>
  );
};

const CustomAlert = ({ isOpen, title, message, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="alert-dialog">
      <div className="dialog-content">
        <div className="dialog-header">
          <h3>{title}</h3>
        </div>
        <div className="dialog-body">
          <p>{message}</p>
        </div>
        <div className="dialog-footer">
          <button
            onClick={onCancel}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="btn btn-primary disabled:opacity-50"
          >
            {isLoading ? 'Submitting...' : 'Confirm'}
          </button>
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
    hasActiveCompetition
  } = useCompetition();

  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Memoize the end time calculation
  const endTime = useMemo(() => {
    if (!currentCompetition?.startTime) return null;
    const startTime = new Date(currentCompetition.startTime).getTime();
    const duration = COMPETITION_LENGTH * 1000; // Convert seconds to milliseconds
    return startTime + duration;
  }, [currentCompetition?.startTime]);

  // Memoize the format time function
  const formatTime = useCallback((milliseconds) => {
    if (milliseconds <= 0) return 'Time Up!';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Timer effect with optimization
  useEffect(() => {
    if (!endTime) return;

    let intervalId = null;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        clearInterval(intervalId);
        setTimeLeft('Time Up!');
        handleSubmitAll();
        return;
      }

      setTimeLeft(formatTime(remaining));

      // Switch to more frequent updates in the last 30 seconds
      if (remaining <= 30000 && intervalId) {
        clearInterval(intervalId);
        intervalId = setInterval(updateTimer, 100);
      }
    };

    // Initial update
    updateTimer();

    // Start with 1-second updates
    intervalId = setInterval(updateTimer, 1000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [endTime, formatTime, handleSubmitAll]);

  // Handle auto submit function
  const handleAutoSubmit = useCallback(async () => {
    if (isAutoSubmitting) return; // Prevent multiple submissions
    setIsAutoSubmitting(true);

    try {
      const submissions = Object.entries(answers).map(async ([questionId, answer]) => {
        if (!answer) return;
        try {
          await submitAnswer(questionId, answer);
        } catch (error) {
          console.error(`Failed to submit answer for question ${questionId}:`, error);
        }
      });

      await Promise.allSettled(submissions); // Use allSettled to handle partial failures
    } catch (error) {
      console.error('Error during auto-submission:', error);
    } finally {
      setIsAutoSubmitting(false);
    }
  }, [answers, submitAnswer, isAutoSubmitting]);

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

  // Handle page refresh/close
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // Cancel the event
      event.preventDefault();
      // Chrome requires returnValue to be set
      event.returnValue = '';

      // Auto-submit answers
      handleAutoSubmit();

      // Show warning message
      const message = 'Warning: Leaving this page will submit all your current answers. Are you sure you want to proceed?';
      event.returnValue = message;
      return message;
    };

    // Add the event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleAutoSubmit]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-2xl font-semibold text-text-primary">Loading competition...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-xl text-text-secondary">No questions available. Please try again.</div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="competition-page">
      {/* Left Sidebar */}
      <div className="sidebar">
        {/* Header and Timer */}
        <div className="header">
          <h1>Competition Platform</h1>
          <div className="timer">
            <div className="label">Time Remaining</div>
            <div className="value">{timeLeft}</div>
          </div>
        </div>

        {/* Questions Grid */}
        <div className="questions-grid">
          <h2>Questions</h2>
          <div className="grid">
            {questions.map((q, index) => (
              <button
                key={q._id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`question-button ${
                  answers[q._id] ? 'answered' : 
                  flaggedQuestions.has(q._id) ? 'flagged' : 
                  'unanswered'
                } ${currentQuestionIndex === index ? 'current' : ''}`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {/* Question Status */}
          <div className="status-legend">
            <div className="status-item">
              <div className="status-dot unanswered"></div>
              <span>Not Answered</span>
            </div>
            <div className="status-item">
              <div className="status-dot answered"></div>
              <span>Answered</span>
            </div>
            <div className="status-item">
              <div className="status-dot flagged"></div>
              <span>Flagged</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="submit-section">
          <button onClick={() => setShowSubmitConfirm(true)}>
            Submit All
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {currentQuestion && (
          <div className="question-container">
            {/* Question Header */}
            <div className="question-header">
              <div className="question-info">
                <h2>Question {currentQuestionIndex + 1} / {questions.length}</h2>
                <div className="question-type">
                  {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 'Programming Question'}
                </div>
              </div>
              <div className="points">
                {currentQuestion.points} points
              </div>
            </div>

            {/* Question Text */}
            <div className="question-text">
              {currentQuestion.text}
            </div>

            {/* Question Content */}
            {currentQuestion.type === 'mcq' ? (
              <div className="mcq-options">
                {currentQuestion.options.map((option, index) => (
                  <label
                    key={index}
                    className={`option ${answers[currentQuestion._id] === option ? 'selected' : ''}`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name={`question-${currentQuestion._id}`}
                        value={option}
                        checked={answers[currentQuestion._id] === option}
                        onChange={() => handleAnswerChange(currentQuestion._id, option)}
                        className="mr-3"
                      />
                      <span>{option}</span>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <SimpleCodeEditor
                value={answers[currentQuestion._id] || ''}
                onChange={(value) => handleAnswerChange(currentQuestion._id, value)}
                language={currentQuestion.language}
              />
            )}

            {/* Navigation */}
            <div className="navigation">
              <button
                onClick={() => toggleFlag(currentQuestion._id)}
                className={`flag-button ${flaggedQuestions.has(currentQuestion._id) ? 'flagged' : ''}`}
              >
                {flaggedQuestions.has(currentQuestion._id) ? 'Unflag' : 'Flag'}
              </button>

              <div className="nav-buttons">
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="prev"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="next"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        <CustomAlert
          isOpen={showSubmitConfirm}
          title="Submit All Answers"
          message="Are you sure you want to submit all your answers? This action cannot be undone."
          onConfirm={handleSubmitAll}
          onCancel={() => setShowSubmitConfirm(false)}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
};

export default Competition;
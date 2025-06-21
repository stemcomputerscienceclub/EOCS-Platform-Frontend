import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetition } from '../context/CompetitionContext';
import { useAuth } from '../context/AuthContext';
import Timer from '../components/Timer';
import Loading from '../components/Loading';

// For code editor - we would use a proper library in production
const SimpleCodeEditor = ({ value, onChange, language }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`code-editor-container card ${isFocused ? 'focused' : ''}`}>
      <div className="code-editor-header">
        <span className="language-badge glowing-text">{language || 'javascript'}</span>
      </div>
      <textarea
        className="code-editor form-input"
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
    <div className="loading-overlay">
      <div className="card dialog-content">
        <div className="dialog-header">
          <h3 className="section-title">{title}</h3>
        </div>
        <div className="dialog-body">
          <p>{message}</p>
        </div>
        <div className="dialog-footer">
          <button
            onClick={onCancel}
            className="btn btn-secondary animated-link"
          >
            Cancel
          </button>
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
              'Confirm'
            )}
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
    hasActiveCompetition,
    competitionLength
  } = useCompetition();

  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Memoize the end time calculation
  const endTime = useMemo(() => {
    if (!currentCompetition?.startTime || !competitionLength) return null;
    const startTime = new Date(currentCompetition.startTime).getTime();
    const duration = competitionLength * 1000; // Convert seconds to milliseconds
    return startTime + duration;
  }, [currentCompetition?.startTime, competitionLength]);

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
    <div className="competition-page">
      {/* Left Sidebar */}
      <div className="sidebar">
        {/* Header and Timer */}
        <div className="header">
          <h1>Competition Platform</h1>
          <Timer endTime={endTime} onTimeUp={handleSubmitAll} />
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
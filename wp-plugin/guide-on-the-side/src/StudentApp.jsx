import { useState, useEffect } from "react";

/**
 * Get student configuration from WordPress
 */
function getConfig() {
  if (typeof window !== "undefined" && window.gotsStudentConfig) {
    return window.gotsStudentConfig;
  }
  return {
    tutorialId: null,
    restUrl: "/wp-json/gots/v1",
    homeUrl: "/",
    siteName: "Site",
  };
}

/**
 * Fetch tutorial data from public endpoint
 */
async function fetchTutorial(tutorialId) {
  const config = getConfig();
  const isPreview = config.isPreview;
  const url = `${config.restUrl}/tutorials/${tutorialId}/public${isPreview ? '?preview=1' : ''}`;
  
  const headers = {};
  if (isPreview && config.nonce) {
    headers['X-WP-Nonce'] = config.nonce;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Tutorial not available");
  }
  
  return response.json();
}

/**
 * Main Student App Component
 */
export default function StudentApp() {
  const [tutorial, setTutorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [completed, setCompleted] = useState(false);

  const config = getConfig();

  // Load tutorial on mount
  useEffect(() => {
    async function loadTutorial() {
      if (!config.tutorialId) {
        setError("No tutorial ID provided");
        setLoading(false);
        return;
      }

      try {
        const data = await fetchTutorial(config.tutorialId);
        // Sort slides by order
        if (data.slides) {
          data.slides.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
        setTutorial(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadTutorial();
  }, [config.tutorialId]);

  // Get current slide
  const slides = tutorial?.slides || [];
  const currentSlide = slides[currentSlideIndex];
  const isFirstSlide = currentSlideIndex === 0;
  const isLastSlide = currentSlideIndex === slides.length - 1;

  // Check if current slide has required question that must be answered correctly
  const hasRequiredQuestion = () => {
    if (!currentSlide) return false;
    
    const leftPane = currentSlide.leftPane;
    if (!leftPane) return false;
    
    //incase the author still refuses to select a correct answer
    if (leftPane.type === "question") {
      // If no correct option is configured, don't block the student
      if (!leftPane.data?.correctOptionId) return false;
      return leftPane.data?.required !== false;
    }
    
    if (leftPane.type === "textQuestion") {
      // If no correct answer is configured, don't block the student
      if (!leftPane.data?.correctAnswer?.trim()) return false;
      return leftPane.data?.required !== false;
    }
    
    return false;
  };

  // Check if current slide's question is answered correctly
  const isQuestionAnsweredCorrectly = () => {
    if (!currentSlide) return true;
    
    const slideId = currentSlide.slideId;
    const leftPane = currentSlide.leftPane;
    
    if (!leftPane) return true;
    
    if (leftPane.type === "question") {
      // MCQ
      const answer = answers[slideId];
      const correctId = leftPane.data?.correctOptionId;
      return answer === correctId;
    }
    
    if (leftPane.type === "textQuestion") {
      // Text question
      const answer = (answers[slideId] || "").toLowerCase().trim();
      const correct = (leftPane.data?.correctAnswer || "").toLowerCase().trim();
      return answer === correct;
    }
    
    return true;
  };

  // Can proceed to next slide?
  const canProceed = () => {
    if (!hasRequiredQuestion()) return true;
    return feedback[currentSlide?.slideId]?.correct === true;
  };

  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (!currentSlide) return;
    
    const slideId = currentSlide.slideId;
    const leftPane = currentSlide.leftPane;
    const isCorrect = isQuestionAnsweredCorrectly();
    
    const feedbackData = leftPane.data?.feedback || {};
    
    setFeedback((prev) => ({
      ...prev,
      [slideId]: {
        correct: isCorrect,
        message: isCorrect 
          ? (feedbackData.correct || "Correct!") 
          : (feedbackData.incorrect || "That's not quite right. Please try again."),
      },
    }));
  };

  // Handle navigation
  const handlePrevious = () => {
    if (!isFirstSlide) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    // If there's a required question that hasn't been answered correctly yet
    if (hasRequiredQuestion() && !feedback[currentSlide?.slideId]?.correct) {
      // Check if an answer has been selected
      if (!answers[currentSlide?.slideId]) {
        return; // Can't proceed without selecting an answer
      }
      // Submit the answer and show feedback
      const slideId = currentSlide.slideId;
      const leftPane = currentSlide.leftPane;
      const isCorrect = isQuestionAnsweredCorrectly();
      
      const feedbackData = leftPane.data?.feedback || {};
      
      setFeedback((prev) => ({
        ...prev,
        [slideId]: {
          correct: isCorrect,
          message: isCorrect 
            ? (feedbackData.correct || "Correct!") 
            : (feedbackData.incorrect || "That's not quite right. Please try again."),
        },
      }));
      
      // If incorrect, don't proceed
      if (!isCorrect) {
        return;
      }
    }
    
    // Proceed to next slide or complete
    if (isLastSlide) {
      setCompleted(true);
    } else {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading tutorial...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h1 style={styles.errorTitle}>Tutorial Unavailable</h1>
        <p style={styles.errorMessage}>{error}</p>
        <a href={config.homeUrl} style={styles.errorLink}>
          ← Return to Home
        </a>
      </div>
    );
  }

  // Render completion screen
  if (completed) {
    return (
      <div style={styles.completionContainer}>
        <div style={styles.completionIcon}>🎉</div>
        <h1 style={styles.completionTitle}>Tutorial Complete!</h1>
        <p style={styles.completionMessage}>
          Congratulations! You've completed "{tutorial.title}".
        </p>
        <div style={styles.completionActions}>
          <button
            onClick={() => {
              setCompleted(false);
              setCurrentSlideIndex(0);
              setAnswers({});
              setFeedback({});
            }}
            style={styles.restartButton}
          >
            Restart Tutorial
          </button>
          <a href={config.homeUrl} style={styles.homeLink}>
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // Render tutorial playback
  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.tutorialTitle}>{tutorial.title}</h1>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.progress}>
            Slide {currentSlideIndex + 1} of {slides.length}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div style={styles.progressBarContainer}>
        <div
          style={{
            ...styles.progressBar,
            width: `${((currentSlideIndex + 1) / slides.length) * 100}%`,
          }}
        />
      </div>

      {/* Main content */}
      <main style={styles.main}>
        {currentSlide && (
          <div style={styles.slideContainer}>
            <h2 style={styles.slideTitle}>{currentSlide.title || `Slide ${currentSlideIndex + 1}`}</h2>
            
            <div style={styles.panesContainer}>
              {/* Left Pane */}
              <div style={styles.pane}>
                {renderPane(currentSlide.leftPane, currentSlide.slideId, "left")}
              </div>
              
              {/* Right Pane */}
              <div style={styles.pane}>
                {renderPane(currentSlide.rightPane, currentSlide.slideId, "right")}
              </div>
            </div>

            {/* Feedback */}
            {feedback[currentSlide.slideId] && (
              <div
                style={{
                  ...styles.feedback,
                  backgroundColor: feedback[currentSlide.slideId].correct ? "#f0fdf4" : "#fef2f2",
                  borderColor: feedback[currentSlide.slideId].correct ? "#bbf7d0" : "#fecaca",
                  color: feedback[currentSlide.slideId].correct ? "#166534" : "#991b1b",
                }}
              >
                {feedback[currentSlide.slideId].correct ? " " : " "}
                {feedback[currentSlide.slideId].message}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Navigation */}
      <footer style={styles.footer}>
        {/* Only show Previous button if not on first slide */}
        {!isFirstSlide ? (
          <button
            onClick={handlePrevious}
            style={styles.navButton}
          >
            Previous
          </button>
        ) : (
          <div style={{ width: "100px" }}></div> /* Spacer to keep layout balanced */
        )}

        <button
          onClick={handleNext}
          disabled={hasRequiredQuestion() && !answers[currentSlide?.slideId]}
          style={{
            ...styles.navButton,
            ...styles.nextButton,
            opacity: (hasRequiredQuestion() && !answers[currentSlide?.slideId]) ? 0.5 : 1,
            cursor: (hasRequiredQuestion() && !answers[currentSlide?.slideId]) ? "not-allowed" : "pointer",
          }}
        >
          {isLastSlide ? "Complete" : "Next"}
        </button>
      </footer>
    </div>
  );

  // Render pane content
  function renderPane(pane, slideId, side) {
    if (!pane) {
      return <div style={styles.emptyPane}>No content</div>;
    }

    switch (pane.type) {
      case "text":
        return (
          <div
            style={styles.textContent}
            dangerouslySetInnerHTML={{ __html: pane.data?.content || "" }}
          />
        );

      case "question":
        return renderMCQ(pane.data, slideId);

      case "textQuestion":
        return renderTextQuestion(pane.data, slideId);

      case "media":
        return renderMedia(pane.data);

      case "embed":
        return renderEmbed(pane.data);

      default:
        return <div style={styles.emptyPane}>Unknown content type</div>;
    }
  }

  // Render MCQ
  function renderMCQ(data, slideId) {
    if (!data) return null;

    return (
      <div style={styles.questionContainer}>
        <h3 style={styles.questionTitle}>{data.questionTitle}</h3>
        {data.description && (
          <div
            style={styles.questionDescription}
            dangerouslySetInnerHTML={{ __html: data.description }}
          />
        )}
        <div style={styles.optionsList}>
          {(data.options || []).map((option) => (
            <label
              key={option.id}
              style={{
                ...styles.optionLabel,
                backgroundColor: answers[slideId] === option.id ? "#f3f4f6" : "transparent",
                borderColor: answers[slideId] === option.id ? "#7B2D26" : "#d1d5db",
              }}
            >
              <input
                type="radio"
                name={`question-${slideId}`}
                value={option.id}
                checked={answers[slideId] === option.id}
                onChange={() => {
                  setAnswers((prev) => ({ ...prev, [slideId]: option.id }));
                  // Clear feedback when answer changes
                  setFeedback((prev) => {
                    const newFeedback = { ...prev };
                    delete newFeedback[slideId];
                    return newFeedback;
                  });
                }}
                style={styles.radioInput}
                disabled={feedback[slideId]?.correct}
              />
              <span>{option.text}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  // Render text question
  function renderTextQuestion(data, slideId) {
    if (!data) return null;

    return (
      <div style={styles.questionContainer}>
        <h3 style={styles.questionTitle}>{data.questionTitle}</h3>
        {data.description && (
          <div
            style={styles.questionDescription}
            dangerouslySetInnerHTML={{ __html: data.description }}
          />
        )}
        <input
          type="text"
          placeholder="Type your answer..."
          value={answers[slideId] || ""}
          onChange={(e) => {
            setAnswers((prev) => ({ ...prev, [slideId]: e.target.value }));
            // Clear feedback when answer changes
            setFeedback((prev) => {
              const newFeedback = { ...prev };
              delete newFeedback[slideId];
              return newFeedback;
            });
          }}
          disabled={feedback[slideId]?.correct}
          style={styles.textInput}
        />
      </div>
    );
  }

  // Render media
  function renderMedia(data) {
    if (!data?.url) {
      return <div style={styles.emptyPane}>No media</div>;
    }

    if (data.mediaType === "image") {
      return (
        <img
          src={data.url}
          alt={data.altText || "Tutorial media"}
          style={styles.mediaImage}
        />
      );
    }

    if (data.mediaType === "video") {
      return (
        <video src={data.url} controls style={styles.mediaVideo}>
          Your browser does not support video playback.
        </video>
      );
    }

    return <div style={styles.emptyPane}>Unsupported media type</div>;
  }

  // Render embed
  function renderEmbed(data) {
    if (!data?.url) {
      return <div style={styles.emptyPane}>No embed URL</div>;
    }

    // convert regular youTube watch URLs to embed URLs
    let embedUrl = data.url;
    
    // youTube watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    const youtubeWatchMatch = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (youtubeWatchMatch) {
      embedUrl = `https://www.youtube.com/embed/${youtubeWatchMatch[1]}`;
    }
    
    // Vimeo URL: https://vimeo.com/VIDEO_ID
    const vimeoMatch = embedUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch && !embedUrl.includes('player.vimeo.com')) {
      embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return (
      <div style={styles.embedContainer}>
        <iframe
          src={embedUrl}
          title="Embedded content"
          style={styles.embedIframe}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
        <div style={styles.embedFallback}>
          <span>Can't see the content above?</span>
          <a 
            href={data.url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={styles.embedFallbackLink}
          >
            Open in new tab
          </a>
        </div>
      </div>
    );
  }
}

// Styles
const styles = {
  // Loading
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    gap: "16px",
    color: "#6b7280",
  },
  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #e5e7eb",
    borderTopColor: "#7B2D26",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  // Error
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "24px",
    textAlign: "center",
  },
  errorIcon: {
    fontSize: "64px",
    marginBottom: "16px",
  },
  errorTitle: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#111827",
    marginBottom: "8px",
  },
  errorMessage: {
    fontSize: "16px",
    color: "#6b7280",
    marginBottom: "24px",
  },
  errorLink: {
    color: "#7B2D26",
    textDecoration: "none",
    fontWeight: "500",
  },

  // Completion
  completionContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "24px",
    textAlign: "center",
    backgroundColor: "#f9fafb",
  },
  completionIcon: {
    fontSize: "80px",
    marginBottom: "24px",
  },
  completionTitle: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#111827",
    marginBottom: "12px",
  },
  completionMessage: {
    fontSize: "18px",
    color: "#4b5563",
    marginBottom: "32px",
  },
  completionActions: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  restartButton: {
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "600",
    backgroundColor: "#7B2D26",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  homeLink: {
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "600",
    backgroundColor: "white",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    textDecoration: "none",
  },

  // Main container
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "#f9fafb",
  },

  // Header
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    backgroundColor: "white",
    borderBottom: "1px solid #e5e7eb",
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
  },
  tutorialTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  progress: {
    fontSize: "14px",
    color: "#6b7280",
    fontWeight: "500",
  },

  // Progress bar
  progressBarContainer: {
    height: "4px",
    backgroundColor: "#e5e7eb",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#7B2D26",
    transition: "width 0.3s ease",
  },

  // Main
  main: {
    flex: 1,
    padding: "32px 24px",
    maxWidth: "1200px",
    width: "100%",
    margin: "0 auto",
  },

  // Slide
  slideContainer: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "32px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  slideTitle: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#111827",
    marginBottom: "24px",
  },

  // Panes - 30/70 ratio for left (quiz) / right (content)
  panesContainer: {
    display: "grid",
    gridTemplateColumns: "30% 70%",
    gap: "32px",
  },
  pane: {
    minHeight: "200px",
  },
  emptyPane: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#9ca3af",
    fontStyle: "italic",
  },

  // Text content
  textContent: {
    lineHeight: "1.7",
    color: "#374151",
  },

  // Question
  questionContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  questionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#111827",
  },
  questionDescription: {
    fontSize: "14px",
    color: "#6b7280",
    lineHeight: "1.6",
  },
  optionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  optionLabel: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  radioInput: {
    width: "18px",
    height: "18px",
    accentColor: "#7B2D26",
  },
  textInput: {
    padding: "12px 16px",
    fontSize: "16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    outline: "none",
    width: "100%",
  },

  // Feedback
  feedback: {
    marginTop: "24px",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid",
    fontSize: "15px",
    fontWeight: "500",
  },

  // Media
  mediaImage: {
    maxWidth: "100%",
    maxHeight: "400px",
    objectFit: "contain",
    borderRadius: "8px",
  },
  mediaVideo: {
    maxWidth: "100%",
    maxHeight: "400px",
    borderRadius: "8px",
  },

  // Embed
  embedContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  embedIframe: {
    width: "100%",
    minHeight: "400px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#f3f4f6",
  },
  embedFallback: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px",
    backgroundColor: "#f9fafb",
    borderRadius: "6px",
    fontSize: "13px",
    color: "#6b7280",
  },
  embedFallbackLink: {
    color: "#7B2D26",
    fontWeight: "500",
    textDecoration: "none",
  },

  // Footer
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    backgroundColor: "white",
    borderTop: "1px solid #e5e7eb",
  },
  navButton: {
    padding: "12px 24px",
    fontSize: "15px",
    fontWeight: "600",
    backgroundColor: "white",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  nextButton: {
    backgroundColor: "#7B2D26",
    color: "white",
    borderColor: "#7B2D26",
  },
  submitButton: {
    padding: "12px 24px",
    fontSize: "15px",
    fontWeight: "600",
    backgroundColor: "#059669",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

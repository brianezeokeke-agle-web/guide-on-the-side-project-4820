import { useState, useEffect, useRef } from "react";
import { recordAnalyticsEvent } from "./services/analyticsApi";
import { issueCertificate, downloadCertificate } from "./services/certificateApi";
import { isTextAnswerCorrect } from "./services/slideValidation";
import {
  buildSlidesById,
  buildRegularSlideOrder,
  buildBranchChildrenMap,
  evaluateBranchMatch,
  getFirstSlideId,
  getNextSlideId,
} from "./services/branchHelpers";

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
    userName: "Guest",
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

  //slideId-aware navigation (replaces index-based currentSlideIndex)
  const [currentSlideId, setCurrentSlideId] = useState(null);

  //history stack of visited slideIds — used by the Previous button
  const [historyStack, setHistoryStack] = useState([]);

  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [completed, setCompleted] = useState(false);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [certificateError, setCertificateError] = useState(null);

  // Certificate state
  const [recipientName, setRecipientName]   = useState("");
  const [certLoading, setCertLoading]       = useState(false);
  const [certError, setCertError]           = useState(null);
  const [certDownloadUrl, setCertDownloadUrl] = useState(null);

  const config = getConfig();

  //analytics tracking refs
  const lastViewedSlideId = useRef(null);
  const hasStarted = useRef(false);

  //derived data (rebuilt when tutorial or currentSlideId changes)
  const allSlides         = tutorial?.slides || [];
  const slidesById        = buildSlidesById(allSlides);
  const regularSlides     = buildRegularSlideOrder(allSlides);
  const branchChildrenMap = buildBranchChildrenMap(allSlides);
  const currentSlide      = currentSlideId ? slidesById[currentSlideId] : null;

  //progress bar indicator 
  //show progress within regular slides only; branch slides share the root's position
  const progressInfo = (() => {
    if (!currentSlide || regularSlides.length === 0) return { current: 0, total: 0 };
    const total = regularSlides.length;

    if (!currentSlide.isBranchSlide) {
      const idx = regularSlides.findIndex((s) => s.slideId === currentSlideId);
      return { current: idx >= 0 ? idx + 1 : 1, total };
    }

    //for branch slides, find the root regular ancestor for the display position
    let s = currentSlide;
    while (s && s.isBranchSlide && s.branchParentSlideId) {
      s = slidesById[s.branchParentSlideId];
    }
    const idx = s ? regularSlides.findIndex((r) => r.slideId === s.slideId) : -1;
    return { current: idx >= 0 ? idx + 1 : 1, total };
  })();

  //analytics: slide_viewed / tutorial_started 
  useEffect(() => {
    if (!tutorial || config.isPreview || !currentSlideId) return;
    if (lastViewedSlideId.current === currentSlideId) return;
    lastViewedSlideId.current = currentSlideId;

    recordAnalyticsEvent(config.tutorialId, 'slide_viewed', currentSlideId);

    // fire tutorial_started the first time we land on any slide this session
    if (!hasStarted.current) {
      hasStarted.current = true;
      recordAnalyticsEvent(config.tutorialId, 'tutorial_started');
    }
  }, [currentSlideId, tutorial, config.tutorialId, config.isPreview]);

  //load tutorial on mount 
  useEffect(() => {
    async function loadTutorial() {
      if (!config.tutorialId) {
        setError("No tutorial ID provided");
        setLoading(false);
        return;
      }

      try {
        const data = await fetchTutorial(config.tutorialId);
        if (data.slides) {
          data.slides.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
        setTutorial(data);
        // Initialize to the first regular slide
        const firstId = getFirstSlideId(data.slides || []);
        setCurrentSlideId(firstId);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadTutorial();
  }, [config.tutorialId]);

  // Prefill recipient name from WP user display name (logged-in users only)
  useEffect(() => {
    if (config.currentUserName && !recipientName) {
      setRecipientName(config.currentUserName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.currentUserName]);

  //navigation state
  const isFirstSlide = historyStack.length === 0;

  // Show "Complete" when the next action would end the tutorial.
  // For regular slides: last in order with no branch children.
  // For branch slides: speculatively run the navigation engine to check.
  const showCompleteButton = (() => {
    if (!currentSlide) return false;
    if (currentSlide.isBranchSlide) {
      const { completed } = getNextSlideId({
        currentSlide,
        allSlides,
        answerState:   answers,
        feedbackState: feedback,
      });
      return completed;
    }
    const idx = regularSlides.findIndex((s) => s.slideId === currentSlideId);
    if (idx !== regularSlides.length - 1) return false;
    return (branchChildrenMap[currentSlideId] || []).length === 0;
  })();

  // question helpers 
  const hasRequiredQuestion = () => {
    if (!currentSlide) return false;
    const leftPane = currentSlide.leftPane;
    if (!leftPane) return false;

    if (leftPane.type === "question") {
      if (!leftPane.data?.correctOptionId) return false;
      return leftPane.data?.required !== false;
    }
    if (leftPane.type === "textQuestion") {
      const ans = leftPane.data?.correctAnswers
        || (leftPane.data?.correctAnswer ? [leftPane.data.correctAnswer] : []);
      if (!ans.some((a) => a?.trim())) return false;
      return leftPane.data?.required !== false;
    }
    return false;
  };

  const isQuestionAnsweredCorrectly = () => {
    if (!currentSlide) return true;
    const slideId  = currentSlide.slideId;
    const leftPane = currentSlide.leftPane;
    if (!leftPane) return true;

    if (leftPane.type === "question") {
      return answers[slideId] === leftPane.data?.correctOptionId;
    }
    if (leftPane.type === "textQuestion") {
      return isTextAnswerCorrect(answers[slideId], leftPane.data);
    }
    return true;
  };

  //answer submission
  const handleSubmitAnswer = () => {
    if (!currentSlide) return;
    const slideId      = currentSlide.slideId;
    const leftPane     = currentSlide.leftPane;
    const isCorrect    = isQuestionAnsweredCorrectly();
    const feedbackData = leftPane?.data?.feedback || {};

    setFeedback((prev) => ({
      ...prev,
      [slideId]: {
        correct: isCorrect,
        message: isCorrect
          ? (feedbackData.correct   || "Correct!")
          : (feedbackData.incorrect || "That's not quite right. Please try again."),
      },
    }));
  };

  // Generate certificate: call REST API, receive PDF blob, trigger download
  const generateCertificate = async () => {
    if (!tutorial?.title) return;
    setCertificateError(null);
    setCertificateLoading(true);
    const userName = config.userName || "Guest";
    const courseName = tutorial.title;
    const completionDate = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const url = `${config.restUrl}/generate-certificate`;
    const headers = {
      "Content-Type": "application/json",
    };
    if (config.nonce) {
      headers["X-WP-Nonce"] = config.nonce;
    }
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userName,
          courseName,
          completionDate,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to generate certificate");
      }
      const blob = await response.blob();
      const slug = courseName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "course";
      const datePart = new Date().toISOString().slice(0, 10);
      const filename = `certificate-${slug}-${datePart}.pdf`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setCertificateError(err.message || "Could not generate certificate.");
    } finally {
      setCertificateLoading(false);
    }
  };

  // previous (history-based) 
  const handlePrevious = () => {
    if (historyStack.length === 0) return;
    const prev  = historyStack[historyStack.length - 1];
    const rest  = historyStack.slice(0, -1);
    setCurrentSlideId(prev);
    setHistoryStack(rest);
  };

  // next/complete 
  const handleNext = () => {
    if (!currentSlide) return;

    const slideId  = currentSlide.slideId;
    const leftPane = currentSlide.leftPane;

    // Required question: must answer correctly before proceeding
    if (hasRequiredQuestion() && !feedback[slideId]?.correct) {
      if (!answers[slideId]) return; // no answer selected yet

      // Auto-submit the answer
      const isCorrect    = isQuestionAnsweredCorrectly();
      const feedbackData = leftPane?.data?.feedback || {};
      const newFeedback  = {
        correct: isCorrect,
        message: isCorrect
          ? (feedbackData.correct   || "Correct!")
          : (feedbackData.incorrect || "That's not quite right. Please try again."),
      };
      setFeedback((prev) => ({ ...prev, [slideId]: newFeedback }));

      if (!isCorrect) {
        // Check whether a branch slide matches this wrong answer
        const childBranches = branchChildrenMap[slideId] || [];
        const matchedBranch = evaluateBranchMatch({
          currentSlide,
          answerState:   answers,
          feedbackState: { ...feedback, [slideId]: newFeedback },
          childBranches,
        });

        if (matchedBranch) {
          // Navigate into the matching branch slide
          if (!config.isPreview) {
            recordAnalyticsEvent(config.tutorialId, 'slide_proceeded', slideId);
          }
          setHistoryStack((prev) => [...prev, slideId]);
          setCurrentSlideId(matchedBranch.slideId);
        }
        // No matching branch — stay on slide so the student can try again
        return;
      }

      // Correct: re-evaluate with updated feedback state inline
      const updatedFeedback = { ...feedback, [slideId]: newFeedback };
      navigateNext(updatedFeedback);
      return;
    }

    navigateNext(feedback);
  };

  // Shared navigation logic — separated so handleNext can pass fresh feedback state
  const navigateNext = (currentFeedback) => {
    if (!currentSlide) return;

    const slideId  = currentSlide.slideId;
    const leftPane = currentSlide.leftPane;

    // For non-required question slides the student may have selected an answer
    // without ever submitting (no feedback entry). Without this, evaluateBranchMatch
    // would see feedback[slideId] === undefined → isCorrect = false and fire an
    // "incorrect" branch even when the student answered correctly.
    let feedbackForEval = currentFeedback;
    if (!feedbackForEval[slideId] &&
        (leftPane?.type === 'question' || leftPane?.type === 'textQuestion')) {
      feedbackForEval = {
        ...currentFeedback,
        [slideId]: { correct: isQuestionAnsweredCorrectly() },
      };
    }

    // Analytics: slide_proceeded
    if (!config.isPreview) {
      recordAnalyticsEvent(config.tutorialId, 'slide_proceeded', slideId);
    }

    // Determine next slide using the branch-aware engine
    const { slideId: nextId, completed: willComplete } = getNextSlideId({
      currentSlide,
      allSlides,
      answerState:   answers,
      feedbackState: feedbackForEval,
    });

    if (willComplete || !nextId) {
      // Tutorial complete
      if (!config.isPreview) {
        recordAnalyticsEvent(config.tutorialId, 'tutorial_completed');
        hasStarted.current          = false;
        lastViewedSlideId.current   = null;
      }
      setCompleted(true);
      return;
    }

    // push the current slide onto history stack and navigate forward
    setHistoryStack((prev) => [...prev, slideId]);
    setCurrentSlideId(nextId);
  };

  // render states
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading tutorial...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h1 style={styles.errorTitle}>Tutorial Unavailable</h1>
        <p style={styles.errorMessage}>{error}</p>
        <a href={config.homeUrl} style={styles.errorLink}>Return to Home</a>
      </div>
    );
  }

  if (completed) {
    const certEnabled = config.certificateEnabled;

    const handleGenerateCert = async () => {
      if (!recipientName.trim()) {
        setCertError("Please enter your name before generating a certificate.");
        return;
      }
      setCertLoading(true);
      setCertError(null);
      try {
        const result = await issueCertificate(config.tutorialId, {
          recipientName: recipientName.trim(),
          idempotencyKey: `${config.tutorialId}-${Date.now()}`,
        });
        setCertDownloadUrl(result.downloadUrl);
      } catch (err) {
        setCertError(err.message || "Could not generate certificate. Please try again.");
      } finally {
        setCertLoading(false);
      }
    };

    return (
      <div style={styles.completionContainer}>
        <h1 style={styles.completionTitle}>Tutorial Complete!</h1>
        <p style={styles.completionMessage}>
          Good Job! You&apos;ve completed {tutorial.title}.
        </p>

        {certEnabled && (
          <div style={styles.certSection}>
            <p style={styles.certHeading}>Download your certificate of completion</p>
            <div style={styles.certNameRow}>
              <label style={styles.certLabel} htmlFor="cert-recipient-name">
                Your name on the certificate:
              </label>
              <input
                id="cert-recipient-name"
                type="text"
                value={recipientName}
                onChange={(e) => {
                  setRecipientName(e.target.value);
                  setCertError(null);
                  setCertDownloadUrl(null);
                }}
                placeholder="Enter your full name"
                style={styles.certInput}
                maxLength={191}
                disabled={certLoading}
              />
            </div>

            {certError && (
              <p style={styles.certError}>{certError}</p>
            )}

            {certDownloadUrl ? (
              <button
                onClick={() => downloadCertificate(certDownloadUrl, `certificate-${config.tutorialId}.pdf`)}
                style={styles.certDownloadButton}
              >
                Download Certificate
              </button>
            ) : (
              <button
                onClick={handleGenerateCert}
                disabled={certLoading}
                style={certLoading ? { ...styles.certButton, opacity: 0.6 } : styles.certButton}
              >
                {certLoading ? "Generating…" : "Generate Certificate"}
              </button>
            )}
          </div>
        )}

        <div style={styles.completionActions}>
          <button
            onClick={() => {
              setCompleted(false);
              setHistoryStack([]);
              setCurrentSlideId(getFirstSlideId(allSlides));
              setAnswers({});
              setFeedback({});
              setCertDownloadUrl(null);
              setCertError(null);
            }}
            style={styles.restartButton}
          >
            Restart Tutorial
          </button>
          <button
            onClick={generateCertificate}
            style={styles.certificateButton}
            disabled={certificateLoading}
          >
            {certificateLoading ? "Generating..." : "Certificate of Completion"}
          </button>
          {certificateError && (
            <p style={styles.certificateError}>{certificateError}</p>
          )}
          <a href={config.homeUrl} style={styles.homeLink}>
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // ── Main playback render ─────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.tutorialTitle}>{tutorial.title}</h1>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.progress}>
            Slide {progressInfo.current} of {progressInfo.total}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div style={styles.progressBarContainer}>
        <div
          style={{
            ...styles.progressBar,
            width: progressInfo.total > 0
              ? `${(progressInfo.current / progressInfo.total) * 100}%`
              : '0%',
          }}
        />
      </div>

      {/* Main content */}
      <main style={styles.main}>
        {currentSlide && (
          <div style={styles.slideContainer}>
            <h2 style={styles.slideTitle}>
              {currentSlide.title || `Slide ${progressInfo.current}`}
            </h2>

            <div style={styles.panesContainer}>
              {/* Left Pane */}
              <div style={styles.pane}>
                {renderPane(currentSlide.leftPane, currentSlide.slideId)}
              </div>
              {/* Right Pane */}
              <div style={styles.pane}>
                {renderPane(currentSlide.rightPane, currentSlide.slideId)}
              </div>
            </div>

            {/* Feedback */}
            {feedback[currentSlide.slideId] && (
              <div
                style={{
                  ...styles.feedback,
                  backgroundColor: feedback[currentSlide.slideId].correct ? "#f0fdf4" : "#fef2f2",
                  borderColor:     feedback[currentSlide.slideId].correct ? "#bbf7d0" : "#fecaca",
                  color:           feedback[currentSlide.slideId].correct ? "#166534" : "#991b1b",
                }}
              >
                {feedback[currentSlide.slideId].message}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Navigation */}
      <footer style={styles.footer}>
        {!isFirstSlide ? (
          <button onClick={handlePrevious} style={styles.navButton}>
            Previous
          </button>
        ) : (
          <div style={{ width: "100px" }} />
        )}

        <button
          onClick={handleNext}
          disabled={hasRequiredQuestion() && !answers[currentSlide?.slideId]}
          style={{
            ...styles.navButton,
            ...styles.nextButton,
            opacity: (hasRequiredQuestion() && !answers[currentSlide?.slideId]) ? 0.5 : 1,
            cursor:  (hasRequiredQuestion() && !answers[currentSlide?.slideId]) ? "not-allowed" : "pointer",
          }}
        >
          {showCompleteButton ? "Complete" : "Next"}
        </button>
      </footer>
    </div>
  );

  //pane renderers
  function renderPane(pane, slideId) {
    if (!pane) return <div style={styles.emptyPane}>No content</div>;

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
                borderColor:     answers[slideId] === option.id ? "#7B2D26"  : "#d1d5db",
              }}
            >
              <input
                type="radio"
                name={`question-${slideId}`}
                value={option.id}
                checked={answers[slideId] === option.id}
                onChange={() => {
                  setAnswers((prev) => ({ ...prev, [slideId]: option.id }));
                  setFeedback((prev) => {
                    const n = { ...prev };
                    delete n[slideId];
                    return n;
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
            setFeedback((prev) => {
              const n = { ...prev };
              delete n[slideId];
              return n;
            });
          }}
          disabled={feedback[slideId]?.correct}
          style={styles.textInput}
        />
      </div>
    );
  }

  function renderMedia(data) {
    if (!data?.url) return <div style={styles.emptyPane}>No media</div>;

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

  function renderEmbed(data) {
    if (!data?.url) return <div style={styles.emptyPane}>No embed URL</div>;

    let embedUrl = data.url;
    const youtubeMatch = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (youtubeMatch) {
      embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
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
          <span>Can&apos;t see the content above?</span>
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

const styles = {
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
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "24px",
    textAlign: "center",
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
  certSection: {
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    width: "100%",
    maxWidth: "480px",
    textAlign: "left",
  },
  certHeading: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
    marginBottom: "16px",
  },
  certNameRow: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "12px",
  },
  certLabel: {
    fontSize: "14px",
    color: "#374151",
    fontWeight: "500",
  },
  certInput: {
    padding: "8px 12px",
    fontSize: "15px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    outline: "none",
    width: "100%",
  },
  certError: {
    fontSize: "14px",
    color: "#dc2626",
    marginBottom: "12px",
  },
  certButton: {
    padding: "10px 20px",
    fontSize: "15px",
    fontWeight: "600",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
  },
  certDownloadButton: {
    padding: "10px 20px",
    fontSize: "15px",
    fontWeight: "600",
    backgroundColor: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
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
  certificateButton: {
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "600",
    backgroundColor: "white",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
  },
  certificateError: {
    width: "100%",
    marginTop: "8px",
    marginBottom: "0",
    fontSize: "14px",
    color: "#b91c1c",
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
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "#f9fafb",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    backgroundColor: "white",
    borderBottom: "1px solid #e5e7eb",
  },
  headerLeft: { flex: 1 },
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
  progressBarContainer: {
    height: "4px",
    backgroundColor: "#e5e7eb",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#7B2D26",
    transition: "width 0.3s ease",
  },
  main: {
    flex: 1,
    padding: "32px 24px",
    maxWidth: "1200px",
    width: "100%",
    margin: "0 auto",
  },
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
  panesContainer: {
    display: "grid",
    gridTemplateColumns: "30% 70%",
    gap: "32px",
  },
  pane: { minHeight: "200px" },
  emptyPane: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#9ca3af",
    fontStyle: "italic",
  },
  textContent: {
    lineHeight: "1.7",
    color: "#374151",
  },
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
  feedback: {
    marginTop: "24px",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid",
    fontSize: "15px",
    fontWeight: "500",
  },
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
  embedContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
    position: "relative",
  },
  embedIframe: {
    width: "100%",
    aspectRatio: "16 / 9",
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
};

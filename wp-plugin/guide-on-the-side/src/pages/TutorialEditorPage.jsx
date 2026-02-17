import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { getTutorial, updateTutorial } from "../services/tutorialApi";
import { selectMedia, isMediaLibraryAvailable } from "../services/mediaLibrary";

// WordPress TinyMCE Editor Component
function WysiwygEditor({ value, onChange, onBlur, editorId }) {
  const containerRef = useRef(null);
  const editorIdRef = useRef(editorId || `gots-editor-${Math.random().toString(36).substr(2, 9)}`);
  const initializedRef = useRef(false);
  const lastValueRef = useRef(value);
  const isInternalChangeRef = useRef(false);

  // Initialize TinyMCE on mount
  useEffect(() => {
    const id = editorIdRef.current;
    
    // Check if wp.editor is available
    if (typeof wp === 'undefined' || !wp.editor) {
      console.warn('WordPress editor not available, falling back to textarea');
      return;
    }

    // Small delay to ensure DOM is ready
    const initTimeout = setTimeout(() => {
      if (initializedRef.current) return;
      
      // Remove any existing editor instance
      wp.editor.remove(id);
      
      // Initialize the WordPress editor
      wp.editor.initialize(id, {
        tinymce: {
          wpautop: true,
          plugins: 'charmap colorpicker hr lists paste tabfocus textcolor fullscreen wordpress wpautoresize wpeditimage wpemoji wpgallery wplink wptextpattern',
          toolbar1: 'formatselect bold italic bullist numlist blockquote alignleft aligncenter alignright link unlink',
          toolbar2: '',
          height: 250,
          menubar: false,
          statusbar: false,
          resize: false,
          setup: (editor) => {
            editor.on('change keyup paste', () => {
              if (!isInternalChangeRef.current) {
                const content = editor.getContent();
                lastValueRef.current = content;
                onChange(content);
              }
            });
            editor.on('blur', () => {
              onBlur && onBlur();
            });
          },
        },
        quicktags: true,
        mediaButtons: true,
      });
      
      initializedRef.current = true;
      
      // Set initial content after a brief delay
      setTimeout(() => {
        if (window.tinymce) {
          const editor = window.tinymce.get(id);
          if (editor && value) {
            isInternalChangeRef.current = true;
            editor.setContent(value);
            isInternalChangeRef.current = false;
          }
        }
      }, 100);
    }, 50);

    // Cleanup on unmount
    return () => {
      clearTimeout(initTimeout);
      if (initializedRef.current && typeof wp !== 'undefined' && wp.editor) {
        wp.editor.remove(id);
        initializedRef.current = false;
      }
    };
  }, []);

  // Update content when value prop changes externally
  useEffect(() => {
    if (!initializedRef.current) return;
    if (value === lastValueRef.current) return;
    
    const id = editorIdRef.current;
    if (window.tinymce) {
      const editor = window.tinymce.get(id);
      if (editor) {
        isInternalChangeRef.current = true;
        editor.setContent(value || '');
        lastValueRef.current = value;
        isInternalChangeRef.current = false;
      }
    }
  }, [value]);

  // Fallback textarea for when TinyMCE isn't available
  const handleTextareaChange = useCallback((e) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div ref={containerRef} style={styles.wysiwygContainer}>
      <textarea
        id={editorIdRef.current}
        defaultValue={value || ''}
        onChange={handleTextareaChange}
        onBlur={onBlur}
        style={{ width: '100%', minHeight: '250px' }}
      />
    </div>
  );
}

//editor component for multiple choice question
function MCQEditor({ data, onChange, onBlur, editorId }) {
  const [errors, setErrors] = useState({});

  const questionData = data || {
    questionType: "multipleChoice",
    questionTitle: "",
    description: "",
    options: [
      { id: "a", text: "" },
      { id: "b", text: "" },
    ],
    correctOptionId: "",
    required: true,
    feedback: {
      correct: "Correct!",
      incorrect: "Review and try again.",
    },
  };

  const validate = (newData) => {
    const newErrors = {};
    if (!newData.questionTitle?.trim()) {
      newErrors.questionTitle = "Question title is required";
    }
    if (!newData.options || newData.options.length < 2) {
      newErrors.options = "At least 2 options are required";
    }
    if (!newData.correctOptionId) {
      newErrors.correctOptionId = "Please select a correct answer";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateField = (field, value) => {
    const newData = { ...questionData, [field]: value };
    validate(newData);
    onChange(newData);
  };

  const updateOption = (optionId, text) => {
    const newOptions = questionData.options.map((opt) =>
      opt.id === optionId ? { ...opt, text } : opt
    );
    const newData = { ...questionData, options: newOptions };
    validate(newData);
    onChange(newData);
  };

  const addOption = () => {
    const nextId = String.fromCharCode(97 + questionData.options.length); // a, b, c, d...
    const newOptions = [...questionData.options, { id: nextId, text: "" }];
    const newData = { ...questionData, options: newOptions };
    onChange(newData);
  };

  const removeOption = (optionId) => {
    if (questionData.options.length <= 2) {
      setErrors({ ...errors, options: "At least 2 options are required" });
      return;
    }
    const newOptions = questionData.options.filter((opt) => opt.id !== optionId);
    const newCorrectId = questionData.correctOptionId === optionId ? "" : questionData.correctOptionId;
    const newData = { ...questionData, options: newOptions, correctOptionId: newCorrectId };
    validate(newData);
    onChange(newData);
  };

  const setCorrectOption = (optionId) => {
    const newData = { ...questionData, correctOptionId: optionId };
    validate(newData);
    onChange(newData);
  };

  const updateFeedback = (type, value) => {
    const newData = {
      ...questionData,
      feedback: { ...questionData.feedback, [type]: value },
    };
    onChange(newData);
  };

  return (
    <div style={styles.mcqContainer}>
      {/* question title textbox */}
      <div style={styles.mcqField}>
        <label style={styles.mcqLabel}>Question Title *</label>
        <input
          type="text"
          style={styles.mcqInput}
          value={questionData.questionTitle || ""}
          onChange={(e) => updateField("questionTitle", e.target.value)}
          onBlur={onBlur}
          placeholder="Enter your question..."
        />
        {errors.questionTitle && (
          <span style={styles.errorText}>{errors.questionTitle}</span>
        )}
      </div>

      {/* description with rich text editor */}
      <div style={styles.mcqField}>
        <label style={styles.mcqLabel}>Description (optional)</label>
        <WysiwygEditor
          editorId={`${editorId}-description`}
          value={questionData.description || ""}
          onChange={(content) => updateField("description", content)}
          onBlur={onBlur}
        />
      </div>

      {/* options for validation */}
      <div style={styles.mcqField}>
        <label style={styles.mcqLabel}>Answer Options *</label>
        {errors.options && (
          <span style={styles.errorText}>{errors.options}</span>
        )}
        {errors.correctOptionId && (
          <span style={styles.errorText}>{errors.correctOptionId}</span>
        )}
        <div style={styles.optionsList}>
          {questionData.options.map((option, index) => (
            <div key={option.id} style={styles.optionRow}>
              <input
                type="radio"
                name="correctOption"
                checked={questionData.correctOptionId === option.id}
                onChange={() => setCorrectOption(option.id)}
                style={styles.radioInput}
                title="Mark as correct answer"
              />
              <span style={styles.optionLabel}>{option.id.toUpperCase()}.</span>
              <input
                type="text"
                style={styles.optionInput}
                value={option.text}
                onChange={(e) => updateOption(option.id, e.target.value)}
                onBlur={onBlur}
                placeholder={`Option ${option.id.toUpperCase()}`}
              />
              {questionData.options.length > 2 && (
                <button
                  type="button"
                  style={styles.removeOptionButton}
                  onClick={() => removeOption(option.id)}
                  title="Remove option"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          style={styles.addOptionButton}
          onClick={addOption}
        >
          + Add Option
        </button>
      </div>

      {/* feedback */}
      <div style={styles.mcqField}>
        <label style={styles.mcqLabel}>Feedback Messages</label>
        <div style={styles.feedbackRow}>
          <span style={styles.feedbackLabel}>Correct:</span>
          <input
            type="text"
            style={styles.feedbackInput}
            value={questionData.feedback?.correct || ""}
            onChange={(e) => updateFeedback("correct", e.target.value)}
            onBlur={onBlur}
            placeholder="Feedback for correct answer"
          />
        </div>
        <div style={styles.feedbackRow}>
          <span style={styles.feedbackLabel}>Incorrect:</span>
          <input
            type="text"
            style={styles.feedbackInput}
            value={questionData.feedback?.incorrect || ""}
            onChange={(e) => updateFeedback("incorrect", e.target.value)}
            onBlur={onBlur}
            placeholder="Feedback for incorrect answer"
          />
        </div>
      </div>
    </div>
  );
}

// editor component for text input question (free text answer)
function TextQuestionEditor({ data, onChange, onBlur, editorId }) {
  const [errors, setErrors] = useState({});

  const questionData = data || {
    questionType: "textInput",
    questionTitle: "",
    description: "",
    correctAnswer: "",
    caseSensitive: false, // always compare as lowercase
    required: true,
    feedback: {
      correct: "Correct!",
      incorrect: "That's not quite right. Please try again.",
    },
  };

  const validate = (newData) => {
    const newErrors = {};
    if (!newData.questionTitle?.trim()) {
      newErrors.questionTitle = "Question title is required";
    }
    if (!newData.correctAnswer?.trim()) {
      newErrors.correctAnswer = "Correct answer is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateField = (field, value) => {
    const newData = { ...questionData, [field]: value };
    validate(newData);
    onChange(newData);
  };

  const updateFeedback = (type, value) => {
    const newData = {
      ...questionData,
      feedback: { ...questionData.feedback, [type]: value },
    };
    onChange(newData);
  };

  return (
    <div style={styles.mcqContainer}>
      {/* question title */}
      <div style={styles.mcqField}>
        <label style={styles.mcqLabel}>Question Title *</label>
        <input
          type="text"
          style={styles.mcqInput}
          value={questionData.questionTitle || ""}
          onChange={(e) => updateField("questionTitle", e.target.value)}
          onBlur={onBlur}
          placeholder="Enter your question..."
        />
        {errors.questionTitle && (
          <span style={styles.errorText}>{errors.questionTitle}</span>
        )}
      </div>

      {/* description with rich text editor */}
      <div style={styles.mcqField}>
        <label style={styles.mcqLabel}>Description (optional)</label>
        <WysiwygEditor
          editorId={`${editorId}-description`}
          value={questionData.description || ""}
          onChange={(content) => updateField("description", content)}
          onBlur={onBlur}
        />
      </div>

      {/* correct answer */}
      <div style={styles.mcqField}>
        <label style={styles.mcqLabel}>Correct Answer *</label>
        <input
          type="text"
          style={styles.mcqInput}
          value={questionData.correctAnswer || ""}
          onChange={(e) => updateField("correctAnswer", e.target.value)}
          onBlur={onBlur}
          placeholder="Enter the correct answer..."
        />
        {errors.correctAnswer && (
          <span style={styles.errorText}>{errors.correctAnswer}</span>
        )}
        <span style={styles.hintText}>
          Note: Answers are compared case-insensitively (e.g., "Hello" matches "hello")
        </span>
      </div>

      {/* feedback */}
      <div style={styles.mcqField}>
        <label style={styles.mcqLabel}>Feedback Messages</label>
        <div style={styles.feedbackRow}>
          <span style={styles.feedbackLabel}>Correct:</span>
          <input
            type="text"
            style={styles.feedbackInput}
            value={questionData.feedback?.correct || ""}
            onChange={(e) => updateFeedback("correct", e.target.value)}
            onBlur={onBlur}
            placeholder="Feedback for correct answer"
          />
        </div>
        <div style={styles.feedbackRow}>
          <span style={styles.feedbackLabel}>Incorrect:</span>
          <input
            type="text"
            style={styles.feedbackInput}
            value={questionData.feedback?.incorrect || ""}
            onChange={(e) => updateFeedback("incorrect", e.target.value)}
            onBlur={onBlur}
            placeholder="Feedback for incorrect answer"
          />
        </div>
      </div>
    </div>
  );
}

// editor component for media upload (images and videos) - uses WordPress Media Library
function MediaUploadEditor({ data, onChange, onBlur }) {
  const [error, setError] = useState(null);

  // Use the data prop directly, with fallback for initial empty state
  const mediaData = data || {
    mediaType: null,
    url: "",
    attachmentId: null,
    altText: "",
  };

  // Check if we have uploaded media
  const hasMedia = Boolean(mediaData.url);

  const handleSelectMedia = async () => {
    setError(null);

    // Check if WP Media Library is available
    if (!isMediaLibraryAvailable()) {
      setError("WordPress media library is not available. Make sure you're running in WordPress admin.");
      return;
    }

    try {
      const selected = await selectMedia();
      
      if (selected) {
        // Update the pane data with the selected media info
        const newData = {
          mediaType: selected.mediaType,
          url: selected.url,
          attachmentId: selected.attachmentId,
          altText: selected.altText || mediaData.altText || "",
        };
        
        onChange(newData);
        onBlur(); // Persist immediately after selection
      }
    } catch (err) {
      setError(err.message || "Failed to select media");
    }
  };

  const handleRemove = () => {
    const confirmed = window.confirm("Are you sure you want to remove this media from the pane?");
    if (!confirmed) return;

    // Clear pane data (does not delete from WP Media Library)
    const newData = {
      mediaType: null,
      url: "",
      attachmentId: null,
      altText: "",
    };
    onChange(newData);
    onBlur();
  };

  const updateAltText = (altText) => {
    const newData = { ...mediaData, altText };
    onChange(newData);
  };

  return (
    <div style={styles.mediaContainer}>
      {error && (
        <div style={styles.mediaError}>{error}</div>
      )}

      {!hasMedia ? (
        // Upload/Select area - only show when no media
        <div style={styles.uploadArea} onClick={handleSelectMedia}>
          <div style={styles.uploadLabel}>
            <span style={styles.uploadIcon}>📁</span>
            <span>Click to select from Media Library</span>
            <span style={styles.uploadHint}>Images: JPEG, PNG, GIF, WebP</span>
            <span style={styles.uploadHint}>Videos: MP4, WebM, MOV</span>
            <span style={styles.uploadHint}>(Limit: 1 file per pane)</span>
          </div>
        </div>
      ) : (
        // Preview area - shows when media exists
        <div style={styles.mediaPreview}>
          {/* Status badge showing media is uploaded */}
          <div style={styles.mediaStatusBadge}>
            <span style={styles.mediaStatusIcon}>✓</span>
            <span>Media Uploaded</span>
          </div>

          {mediaData.mediaType === "image" ? (
            <img
              src={mediaData.url}
              alt={mediaData.altText || "Selected media"}
              style={styles.mediaImage}
            />
          ) : mediaData.mediaType === "video" ? (
            <video
              src={mediaData.url}
              controls
              style={styles.mediaVideo}
            />
          ) : (
            // Fallback for unknown media type with URL
            <div style={styles.mediaFallback}>
              <span>📎 Media file attached</span>
              <a href={mediaData.url} target="_blank" rel="noopener noreferrer" style={styles.mediaLink}>
                View file
              </a>
            </div>
          )}
          
          <div style={styles.mediaInfo}>
            <span style={styles.mediaFilename}>
              {mediaData.attachmentId ? `Attachment #${mediaData.attachmentId}` : 'Media file'}
            </span>
            <button
              type="button"
              onClick={handleRemove}
              style={styles.removeMediaButton}
            >
              Remove
            </button>
          </div>

          {/* Alt text input */}
          <div style={styles.altTextRow}>
            <label style={styles.altTextLabel}>Alt Text (optional):</label>
            <input
              type="text"
              style={styles.altTextInput}
              value={mediaData.altText || ""}
              onChange={(e) => updateAltText(e.target.value)}
              onBlur={onBlur}
              placeholder="Describe the media for accessibility..."
            />
          </div>

          {/* Replace media button */}
          <button
            type="button"
            onClick={handleSelectMedia}
            style={styles.replaceMediaButton}
          >
            Replace Media
          </button>
        </div>
      )}
    </div>
  );
}

export default function TutorialEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tutorial, setTutorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSlideId, setActiveSlideId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [draggedSlideId, setDraggedSlideId] = useState(null);
  const [dragOverSlideId, setDragOverSlideId] = useState(null);

  // fetch tutorial on mount
  useEffect(() => {
    const fetchTutorial = async () => {
      try {
        setLoading(true);
        const data = await getTutorial(id);
        setTutorial(data);
        // set first slide as active by default
        if (data.slides && data.slides.length > 0) {
          setActiveSlideId(data.slides[0].slideId);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTutorial();
  }, [id]);

  // get the active slide object
  const activeSlide = tutorial?.slides?.find((s) => s.slideId === activeSlideId);

  // persist slide changes to backend, it accepts the slide data directly to avoid a stale state
  const persistSlideUpdate = async (slideData) => {
    if (!slideData || !slideData.slideId) return;

    setSaveStatus("Saving...");
    try {
      const updatedTutorial = await updateTutorial(id, {
        slides: [{
          slideId: slideData.slideId,
          title: slideData.title,
          order: slideData.order,
          leftPane: slideData.leftPane,
          rightPane: slideData.rightPane,
        }],
      });
      setTutorial(updatedTutorial);
      setSaveStatus("Saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (err) {
      setSaveStatus("Error saving");
    }
  };

  // helper to get current slide and persist, used by the blur handlers
  const persistCurrentSlide = (slideId) => {
    const currentSlide = tutorial?.slides?.find((s) => s.slideId === slideId);
    if (currentSlide) {
      persistSlideUpdate(currentSlide);
    }
  };

  // handle slide title change, local update only
  const handleTitleChange = (slideId, newTitle) => {
    setTutorial((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.slideId === slideId ? { ...s, title: newTitle } : s
      ),
    }));
  };

  // persist on blur, sends full slide
  const handleTitleBlur = (slideId) => {
    persistCurrentSlide(slideId);
  };

  // handle pane type selection - updates locally then persists with the new pane data
  const handlePaneTypeChange = (slideId, paneKey, newType) => {
    // get the current slide
    const currentSlide = tutorial?.slides?.find((s) => s.slideId === slideId);
    if (!currentSlide) return;

    const currentPane = currentSlide[paneKey];
    
    // important to check if there's existing content that would be lost
    const hasExistingContent = currentPane && (
      (currentPane.type === "text" && currentPane.data?.content) ||
      (currentPane.type === "embed" && currentPane.data?.url) ||
      (currentPane.type === "question" && currentPane.data?.questionTitle) ||
      (currentPane.type === "textQuestion" && currentPane.data?.questionTitle) ||
      (currentPane.type === "media" && currentPane.data?.url)
    );

    if (hasExistingContent && newType !== currentPane.type) {
      const confirmed = window.confirm(
        "Changing content type will clear existing content. Continue?"
      );
      if (!confirmed) return;
    }

    let paneData = null;
    if (newType === "text") {
      paneData = { type: "text", data: { format: "html", content: "" } };
    } else if (newType === "embed") {
      paneData = { type: "embed", data: { url: "", fallbackText: "" } };
    } else if (newType === "question") {
      paneData = {
        type: "question",
        data: {
          questionType: "multipleChoice",
          questionTitle: "",
          description: "",
          options: [
            { id: "a", text: "" },
            { id: "b", text: "" },
          ],
          correctOptionId: "",
          required: true,
          feedback: {
            correct: "Correct!",
            incorrect: "Review and try again.",
          },
        },
      };
    } else if (newType === "textQuestion") {
      paneData = {
        type: "textQuestion",
        data: {
          questionType: "textInput",
          questionTitle: "",
          description: "",
          correctAnswer: "",
          caseSensitive: false,
          required: true,
          feedback: {
            correct: "Correct!",
            incorrect: "That's not quite right. Please try again.",
          },
        },
      };
    } else if (newType === "media") {
      paneData = {
        type: "media",
        data: {
          mediaType: null,
          url: "",
          attachmentId: null,
          altText: "",
        },
      };
    }

    const updatedSlide = { ...currentSlide, [paneKey]: paneData };
    
    // update the local state
    setTutorial((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.slideId === slideId ? updatedSlide : s
      ),
    }));
    
    // persist with the updated slide data directly
    persistSlideUpdate(updatedSlide);
  };

  // handle pane content edit, should be local update only
  const handlePaneContentChange = (slideId, paneKey, pane, updates) => {
    const updatedPane = {
      ...pane,
      data: { ...pane.data, ...updates },
    };
    setTutorial((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.slideId === slideId ? { ...s, [paneKey]: updatedPane } : s
      ),
    }));
  };

  // persist on blur,this sends full slide
  const handlePaneContentBlur = (slideId) => {
    persistCurrentSlide(slideId);
  };

  // drag and drop handlers for slide reordering
  const handleDragStart = (e, slideId) => {
    setDraggedSlideId(slideId);
    e.dataTransfer.effectAllowed = "move";
    // add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      e.target.style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = "1";
    setDraggedSlideId(null);
    setDragOverSlideId(null);
  };

  const handleDragOver = (e, slideId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (slideId !== draggedSlideId) {
      setDragOverSlideId(slideId);
    }
  };

  const handleDragLeave = () => {
    setDragOverSlideId(null);
  };

  const handleDrop = async (e, targetSlideId) => {
    e.preventDefault();
    setDragOverSlideId(null);

    if (!draggedSlideId || draggedSlideId === targetSlideId) {
      setDraggedSlideId(null);
      return;
    }

    // get current sorted slides
    const sortedSlides = [...tutorial.slides].sort((a, b) => a.order - b.order);
    const draggedIndex = sortedSlides.findIndex((s) => s.slideId === draggedSlideId);
    const targetIndex = sortedSlides.findIndex((s) => s.slideId === targetSlideId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSlideId(null);
      return;
    }

    // remove dragged slide and insert at target position
    const [draggedSlide] = sortedSlides.splice(draggedIndex, 1);
    sortedSlides.splice(targetIndex, 0, draggedSlide);

    // reassign order values (1-based)
    const reorderedSlides = sortedSlides.map((slide, index) => ({
      ...slide,
      order: index + 1,
    }));

    // update local state immediately for responsiveness
    setTutorial((prev) => ({
      ...prev,
      slides: reorderedSlides,
    }));
    setDraggedSlideId(null);

    // persist all slides with updated order to backend
    setSaveStatus("Saving...");
    try {
      const updatedTutorial = await updateTutorial(id, {
        slides: reorderedSlides,
      });
      setTutorial(updatedTutorial);
      setSaveStatus("Saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (err) {
      setSaveStatus("Error saving");
    }
  };

  // generate a UUID (with fallback for older browsers)
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // add a new slide
  const handleAddSlide = async () => {
    if (!tutorial) {
      return;
    }

    const maxOrder = tutorial.slides?.reduce((max, s) => Math.max(max, s.order || 0), 0) || 0;
    const newSlide = {
      slideId: generateUUID(),
      title: "Untitled Slide",
      order: maxOrder + 1,
      leftPane: null,
      rightPane: null,
    };

    // add to local state first
    setTutorial((prev) => ({
      ...prev,
      slides: [...(prev.slides || []), newSlide],
    }));

    // set as active
    setActiveSlideId(newSlide.slideId);

    // persist data to the backend
    setSaveStatus("Saving...");
    try {
      const updatedTutorial = await updateTutorial(id, {
        slides: [newSlide],
      });
      setTutorial(updatedTutorial);
      // ensuring that the new slide stays active
      const savedSlide = updatedTutorial.slides?.find((s) => s.slideId === newSlide.slideId);
      if (savedSlide) {
        setActiveSlideId(savedSlide.slideId);
      }
      setSaveStatus("Saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (err) {
      setSaveStatus("Error saving");
    }
  };

  // render a pane editor
  const renderPaneEditor = (slideId, paneKey, pane, allowedTypes) => {
    const currentType = pane?.type || "";

    // the labels for content types
    const typeLabels = {
      text: "Rich Text Editor",
      embed: "Embed",
      question: "Question (MCQ)",
      textQuestion: "Question (Text)",
      media: "Media (Image/Video)",
    };

    return (
      <div style={styles.paneContainer}>
        <label style={styles.paneLabel}>
          {paneKey === "leftPane" ? "Left Pane" : "Right Pane"}
        </label>
        <select
          value={currentType}
          onChange={(e) => handlePaneTypeChange(slideId, paneKey, e.target.value)}
          style={styles.select}
        >
          <option value="">-- Select type --</option>
          {allowedTypes.map((t) => (
            <option key={t} value={t}>
              {typeLabels[t] || t}
            </option>
          ))}
        </select>

        {!pane && (
          <p style={styles.placeholder}>No content yet, choose a content type from the dropdown</p>
        )}

        {pane?.type === "text" && (
          <WysiwygEditor
            key={`${slideId}-${paneKey}`}
            editorId={`gots-wysiwyg-${slideId}-${paneKey}`}
            value={pane.data?.content || ""}
            onChange={(content) =>
              handlePaneContentChange(slideId, paneKey, pane, { content })
            }
            onBlur={() => handlePaneContentBlur(slideId)}
          />
        )}

        {pane?.type === "question" && (
          <MCQEditor
            key={`${slideId}-${paneKey}`}
            editorId={`gots-mcq-${slideId}-${paneKey}`}
            data={pane.data}
            onChange={(questionData) => {
              const updatedPane = { ...pane, data: questionData };
              setTutorial((prev) => ({
                ...prev,
                slides: prev.slides.map((s) =>
                  s.slideId === slideId ? { ...s, [paneKey]: updatedPane } : s
                ),
              }));
            }}
            onBlur={() => handlePaneContentBlur(slideId)}
          />
        )}

        {pane?.type === "textQuestion" && (
          <TextQuestionEditor
            key={`${slideId}-${paneKey}`}
            editorId={`gots-textq-${slideId}-${paneKey}`}
            data={pane.data}
            onChange={(questionData) => {
              const updatedPane = { ...pane, data: questionData };
              setTutorial((prev) => ({
                ...prev,
                slides: prev.slides.map((s) =>
                  s.slideId === slideId ? { ...s, [paneKey]: updatedPane } : s
                ),
              }));
            }}
            onBlur={() => handlePaneContentBlur(slideId)}
          />
        )}

        {pane?.type === "embed" && (
          <div style={styles.embedInputs}>
            <input
              type="text"
              placeholder="Embed URL"
              style={styles.input}
              value={pane.data?.url || ""}
              onChange={(e) =>
                handlePaneContentChange(slideId, paneKey, pane, { url: e.target.value })
              }
              onBlur={() => handlePaneContentBlur(slideId)}
            />
            <input
              type="text"
              placeholder="Fallback text (optional)"
              style={styles.input}
              value={pane.data?.fallbackText || ""}
              onChange={(e) =>
                handlePaneContentChange(slideId, paneKey, pane, { fallbackText: e.target.value })
              }
              onBlur={() => handlePaneContentBlur(slideId)}
            />
          </div>
        )}

        {pane?.type === "media" && (
          <MediaUploadEditor
            key={`${slideId}-${paneKey}`}
            data={pane.data}
            onChange={(mediaData) => {
              const updatedPane = { ...pane, data: mediaData };
              setTutorial((prev) => ({
                ...prev,
                slides: prev.slides.map((s) =>
                  s.slideId === slideId ? { ...s, [paneKey]: updatedPane } : s
                ),
              }));
            }}
            onBlur={() => handlePaneContentBlur(slideId)}
          />
        )}
      </div>
    );
  };

  // loading state
  if (loading) {
    return <div style={{ padding: "32px" }}>Loading tutorial...</div>;
  }

  // error state
  if (error) {
    return <div style={{ padding: "32px", color: "red" }}>Error: {error}</div>;
  }

  // case where no tutorial was found
  if (!tutorial) {
    return <div style={{ padding: "32px" }}>Tutorial not found.</div>;
  }

  return (
    <div style={styles.container}>
      {/* sidebar - slide list */}
      <aside style={styles.sidebar}>
        {/* navigation links */}
        <nav style={styles.sidebarNav}>
          <Link to="/" style={styles.navLink}>
            <span>Home</span>
          </Link>
          <Link to="/tutorials" style={styles.navLink}>
            <span>All Tutorials</span>
          </Link>
        </nav>

        {/* slides section */}
        <div style={styles.slidesSection}>
          <h3 style={styles.sidebarTitle}>Slides</h3>
          <ul style={styles.slideList}>
            {tutorial.slides
              ?.sort((a, b) => a.order - b.order)
              .map((slide) => (
                <li
                  key={slide.slideId}
                  draggable
                  onClick={() => setActiveSlideId(slide.slideId)}
                  onDragStart={(e) => handleDragStart(e, slide.slideId)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, slide.slideId)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, slide.slideId)}
                  style={{
                    ...styles.slideItem,
                    backgroundColor:
                      slide.slideId === activeSlideId ? "#f5e6e4" : "#fff",
                    borderColor:
                      slide.slideId === activeSlideId ? "#7B2D26" : "#e5e7eb",
                    ...(dragOverSlideId === slide.slideId && draggedSlideId !== slide.slideId
                      ? styles.slideItemDragOver
                      : {}),
                    ...(draggedSlideId === slide.slideId
                      ? styles.slideItemDragging
                      : {}),
                  }}
                >
                  <span style={styles.slideDragHandle}>⋮⋮</span>
                  <span style={styles.slideOrder}>{slide.order}</span>
                  <span style={styles.slideTitle}>{slide.title || "Untitled"}</span>
                </li>
              ))}
          </ul>
        </div>
      </aside>

      {/* the main editor area */}
      <main style={styles.main}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.pageTitle}>{tutorial.title || "Untitled Tutorial"}</h1>
            <span style={styles.statusBadge}>
              {tutorial.status || "Draft"}
            </span>
          </div>
          <div style={styles.headerRight}>
            {saveStatus && <span style={styles.saveStatus}>{saveStatus}</span>}
            <button
              onClick={handleAddSlide}
              style={styles.addSlideButton}
              title="Add new slide"
            >
              +
            </button>
          </div>
        </div>

        {activeSlide ? (
          <div style={styles.slideEditor}>
            {/* slide Title */}
            <div style={styles.titleRow}>
              <label style={styles.titleLabel}>Slide Title:</label>
              <input
                type="text"
                value={activeSlide.title || ""}
                onChange={(e) => handleTitleChange(activeSlide.slideId, e.target.value)}
                onBlur={() => handleTitleBlur(activeSlide.slideId)}
                style={styles.titleInput}
              />
            </div>

            {/* main two-pane layout */}
            <div style={styles.panesContainer}>
              {renderPaneEditor(
                activeSlide.slideId,
                "leftPane",
                activeSlide.leftPane,
                ["text", "question", "textQuestion"]
              )}
              {renderPaneEditor(
                activeSlide.slideId,
                "rightPane",
                activeSlide.rightPane,
                ["text", "embed", "media"]
              )}
            </div>

            {/* done Editing Button */}
            <div style={styles.doneButtonContainer}>
              <button
                style={styles.doneButton}
                onClick={() => navigate(`/tutorials?highlight=${id}`)}
              >
                Done Editing
              </button>
            </div>
          </div>
        ) : (
          <p>Select a slide from the sidebar to edit.</p>
        )}
      </main>
    </div>
  );
}

// inline styles for the editor page
const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  sidebar: {
    width: "240px",
    borderRight: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    padding: "16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  sidebarNav: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    paddingBottom: "16px",
    marginBottom: "16px",
    borderBottom: "1px solid #e5e7eb",
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    borderRadius: "6px",
    color: "#374151",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.15s ease",
  },
  navIcon: {
    fontSize: "16px",
  },
  slidesSection: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  sidebarTitle: {
    margin: "0 0 16px 0",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    flexShrink: 0,
  },
  slideList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    flex: 1,
    overflowY: "auto",
  },
  slideItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    marginBottom: "8px",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
    cursor: "grab",
    transition: "all 0.15s ease",
    userSelect: "none",
  },
  slideItemDragging: {
    opacity: 0.5,
    cursor: "grabbing",
  },
  slideItemDragOver: {
    borderColor: "#7B2D26",
    borderStyle: "dashed",
    borderWidth: "2px",
    backgroundColor: "#fef3f2",
  },
  slideDragHandle: {
    color: "#9ca3af",
    fontSize: "12px",
    cursor: "grab",
    letterSpacing: "-2px",
    marginRight: "2px",
    flexShrink: 0,
  },
  slideOrder: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "#7B2D26",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "600",
    flexShrink: 0,
  },
  slideTitle: {
    fontSize: "14px",
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  main: {
    flex: 1,
    padding: "24px 32px",
    backgroundColor: "#fff",
    overflow: "auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  pageTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "600",
    color: "#111827",
  },
  statusBadge: {
    display: "inline-block",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: "500",
    borderRadius: "9999px",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    textTransform: "capitalize",
  },
  addSlideButton: {
    width: "36px",
    height: "36px",
    minWidth: "36px",
    minHeight: "36px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: "#7B2D26",
    color: "#fff",
    fontSize: "20px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: "1",
    padding: "0",
    margin: "0",
    transition: "background-color 0.15s ease",
    boxSizing: "border-box",
  },
  saveStatus: {
    fontSize: "14px",
    color: "#6b7280",
    fontStyle: "italic",
  },
  slideEditor: {
    maxWidth: "1000px",
  },
  titleRow: {
    marginBottom: "24px",
  },
  titleLabel: {
    display: "block",
    marginBottom: "6px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
  },
  titleInput: {
    width: "100%",
    maxWidth: "400px",
    padding: "10px 12px",
    fontSize: "16px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    outline: "none",
  },
  panesContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
  },
  doneButtonContainer: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "32px",
    paddingTop: "24px",
    borderTop: "1px solid #e5e7eb",
  },
  doneButton: {
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    backgroundColor: "#7B2D26",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    transition: "background-color 0.15s ease",
  },
  paneContainer: {
    padding: "16px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    backgroundColor: "#fafafa",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  paneLabel: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    flexShrink: 0,
  },
  select: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    marginBottom: "12px",
    backgroundColor: "#fff",
    flexShrink: 0,
  },
  placeholder: {
    color: "#9ca3af",
    fontSize: "14px",
    fontStyle: "italic",
  },
  textarea: {
    width: "100%",
    minHeight: "200px",
    maxHeight: "400px",
    padding: "12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    resize: "vertical",
    fontFamily: "inherit",
    overflowY: "auto",
    boxSizing: "border-box",
  },
  embedInputs: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    boxSizing: "border-box",
  },
  // WYSIWYG Editor styles
  wysiwygContainer: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  toolbar: {
    display: "flex",
    gap: "4px",
    padding: "8px",
    borderBottom: "1px solid #d1d5db",
    backgroundColor: "#f9fafb",
    borderTopLeftRadius: "6px",
    borderTopRightRadius: "6px",
    border: "1px solid #d1d5db",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  toolbarButton: {
    padding: "4px 10px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    backgroundColor: "#fff",
    cursor: "pointer",
    minWidth: "32px",
  },
  wysiwygEditor: {
    flex: 1,
    minHeight: "180px",
    maxHeight: "350px",
    padding: "12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderTop: "none",
    borderBottomLeftRadius: "6px",
    borderBottomRightRadius: "6px",
    backgroundColor: "#fff",
    overflowY: "auto",
    outline: "none",
    lineHeight: "1.5",
  },
  // MCQ Editor styles
  mcqContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    flex: 1,
    overflowY: "auto",
  },
  mcqField: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  mcqLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
  },
  mcqInput: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    boxSizing: "border-box",
  },
  optionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  optionRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  radioInput: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
    accentColor: "#7B2D26",
  },
  optionLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    minWidth: "20px",
  },
  optionInput: {
    flex: 1,
    padding: "8px 10px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    boxSizing: "border-box",
  },
  removeOptionButton: {
    width: "28px",
    height: "28px",
    padding: 0,
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    backgroundColor: "#fff",
    color: "#dc2626",
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  addOptionButton: {
    alignSelf: "flex-start",
    padding: "6px 12px",
    fontSize: "13px",
    fontWeight: "500",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    backgroundColor: "#fff",
    color: "#374151",
    cursor: "pointer",
    marginTop: "4px",
  },
  feedbackRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
  },
  feedbackLabel: {
    fontSize: "13px",
    color: "#6b7280",
    minWidth: "70px",
  },
  feedbackInput: {
    flex: 1,
    padding: "6px 10px",
    fontSize: "13px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    boxSizing: "border-box",
  },
  errorText: {
    fontSize: "12px",
    color: "#dc2626",
  },
  hintText: {
    fontSize: "12px",
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: "4px",
  },
  // Media Upload Editor styles
  mediaContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    flex: 1,
  },
  mediaError: {
    padding: "10px 12px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    color: "#dc2626",
    fontSize: "13px",
  },
  mediaSuccess: {
    padding: "10px 12px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "6px",
    color: "#16a34a",
    fontSize: "13px",
    fontWeight: "500",
  },
  uploadArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "200px",
    border: "2px dashed #d1d5db",
    borderRadius: "8px",
    backgroundColor: "#f9fafb",
    cursor: "pointer",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
  },
  fileInput: {
    display: "none",
  },
  uploadLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    padding: "20px",
    width: "100%",
    textAlign: "center",
  },
  uploadIcon: {
    fontSize: "32px",
    marginBottom: "4px",
  },
  uploadHint: {
    fontSize: "12px",
    color: "#6b7280",
  },
  mediaPreview: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  mediaImage: {
    maxWidth: "100%",
    maxHeight: "300px",
    objectFit: "contain",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
  },
  mediaVideo: {
    maxWidth: "100%",
    maxHeight: "300px",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
  },
  mediaInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "#f9fafb",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
  },
  mediaFilename: {
    fontSize: "13px",
    color: "#374151",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  removeMediaButton: {
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "500",
    border: "1px solid #fecaca",
    borderRadius: "4px",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    cursor: "pointer",
    marginLeft: "12px",
  },
  replaceMediaButton: {
    padding: "10px 16px",
    fontSize: "13px",
    fontWeight: "500",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    backgroundColor: "#f9fafb",
    color: "#374151",
    cursor: "pointer",
    textAlign: "center",
    transition: "background-color 0.15s ease",
  },
  mediaStatusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "6px",
    color: "#16a34a",
    fontSize: "14px",
    fontWeight: "600",
  },
  mediaStatusIcon: {
    fontSize: "16px",
  },
  mediaFallback: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    padding: "20px",
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
  },
  mediaLink: {
    color: "#7B2D26",
    textDecoration: "underline",
    fontSize: "13px",
  },
  altTextRow: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  altTextLabel: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#374151",
  },
  altTextInput: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    boxSizing: "border-box",
  },
};

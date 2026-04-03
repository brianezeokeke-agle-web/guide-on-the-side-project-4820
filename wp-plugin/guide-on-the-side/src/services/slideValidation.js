// Slide validation helpers used to guard against publishing incomplete tutorials.
// Branch-config validation is provided by branchHelpers.js and re-exported here
// so callers can import from one place.
export { validateBranchConfig } from './branchHelpers';

// Returns true if a pane is null, has no type, or is missing type-specific content.
export function isPaneEmpty(pane) {
  if (!pane || !pane.type) return true;
  switch (pane.type) {
    case 'text':
      return !pane.data?.content || !pane.data.content.replace(/<[^>]*>/g, '').trim();
    case 'question':
    case 'textQuestion':
      return !pane.data?.questionTitle?.trim();
    case 'embed':
      return !pane.data?.url?.trim();
    case 'media':
      return !pane.data?.url;
    default:
      return true;
  }
}

// Returns true when at least one slide has an empty left or right pane.
export function hasEmptySlides(tutorial) {
  const slides = tutorial?.slides || [];
  if (slides.length === 0) return true;
  return slides.some((s) => isPaneEmpty(s.leftPane) || isPaneEmpty(s.rightPane));
}

// this returns true if the student's answer matches any of the accepted correct answers
// for a text question. the comparison is case insensitive and trims white spaces
// it supports both the legacy single `correctAnswer` string and the new `correctAnswers` array.
export function isTextAnswerCorrect(studentAnswer, paneData) {
  const input = (studentAnswer || '').toLowerCase().trim();
  if (!input) return false;
  const accepted = paneData?.correctAnswers
    || (paneData?.correctAnswer ? [paneData.correctAnswer] : []);
  return accepted.some((ca) => (ca || '').toLowerCase().trim() === input);
}

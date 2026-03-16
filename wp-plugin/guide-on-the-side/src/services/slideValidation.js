// Slide validation helpers used to guard against publishing incomplete tutorials.

// Returns true if a pane is null, has no type, or is missing type-specific content.
export function isPaneEmpty(pane) {
  if (!pane || !pane.type) return true;
  switch (pane.type) {
    case 'text':
      return !pane.data?.content || !pane.data.content.replace(/<[^>]*>/g, '').trim();
    case 'question':
      return !pane.data?.questionTitle?.trim();
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

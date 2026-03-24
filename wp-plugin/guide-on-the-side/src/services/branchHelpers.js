/**
 * Branch navigation and authoring helpers
 *
 * Provides pure utility functions for:
 *  - Building derived data structures from the slides array
 *  - Evaluating branch conditions against student answer/feedback state
 *  - Computing the next slide ID in slideId-aware playback
 *  - Deriving dotted display numbers (3.1, 3.1.1, …) for the sidebar
 *  - Validating branch configurations in the editor
 */

/**
 * Returns regular (non-branch) slides sorted by ascending order.
 * @param {Array} slides
 * @returns {Array}
 */
export function buildRegularSlideOrder(slides) {
  return (slides || [])
    .filter((s) => !s.isBranchSlide)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Returns a map of  parentSlideId - array of branch-child slides sorted by order.
 * Only includes slides where isBranchSlide === true and branchParentSlideId is set.
 * @param {Array} slides
 * @returns {Object}
 */
export function buildBranchChildrenMap(slides) {
  const map = {};
  (slides || [])
    .filter((s) => s.isBranchSlide && s.branchParentSlideId)
    .forEach((s) => {
      if (!map[s.branchParentSlideId]) map[s.branchParentSlideId] = [];
      map[s.branchParentSlideId].push(s);
    });
  Object.keys(map).forEach((pid) => {
    map[pid].sort((a, b) => (a.order || 0) - (b.order || 0));
  });
  return map;
}

/**
 * Returns a map of slideId - slide for O(1) lookup.
 * @param {Array} slides
 * @returns {Object}
 */
export function buildSlidesById(slides) {
  const map = {};
  (slides || []).forEach((s) => { map[s.slideId] = s; });
  return map;
}

// Authoring helpers
/**
 * Returns the slides that are valid sources for a conditional branch attached
 * to `currentSlide`.   the only valid source is the immediate parent
 * (branchParentSlideId), and that parent must carry a question pane on the left.
 *
 * Rich-text / embed / media slides are NOT valid sources.
 *
 * @param {Array}  slides
 * @param {Object} currentSlide
 * @returns {Array}  0 or 1 element
 */
export function getEligibleBranchSources(slides, currentSlide) {
  if (!currentSlide?.isBranchSlide || !currentSlide?.branchParentSlideId) return [];
  const slidesById = buildSlidesById(slides);
  const parent = slidesById[currentSlide.branchParentSlideId];
  if (!parent) return [];
  const pane = parent.leftPane;
  if (!pane || (pane.type !== 'question' && pane.type !== 'textQuestion')) return [];
  return [parent];
}

/**
 * Returns slides that could act as parents (source) for a new branch slide.
 * A valid parent must:
 *  - Not be the current slide itself
 *  - Not already be a branch slide (parents are regular slides only)
 *  - Have a question pane (MCQ or text question) on the left
 *
 * @param {Array}  slides
 * @param {string} currentSlideId  – excluded from the list
 * @returns {Array}
 */
export function getEligibleParentSlides(slides, currentSlideId) {
  return (slides || []).filter((s) => {
    if (s.slideId === currentSlideId) return false;
    if (s.isBranchSlide) return false; //parents must be regular slides
    const pane = s.leftPane;
    return pane && (pane.type === 'question' || pane.type === 'textQuestion');
  });
}


// Playback engine
/**
 * Evaluates which branch child (if any) should follow the student's current
 * response on `currentSlide`.
 *
 * Priority (highest first):
 *   1. Exact wrong-option match  (operator="is",    matchType="option")
 *   2. Generic incorrect match   (operator="isNot", matchType="correctness")
 *
 * Returns the matching branch-slide object, or null if no branch should fire.
 *
 * @param {Object} params
 * @param {Object}  params.currentSlide
 * @param {Object}  params.answerState   – { [slideId]: answerValue }
 * @param {Object}  params.feedbackState – { [slideId]: { correct: bool, … } }
 * @param {Array}   params.childBranches – direct branch children of currentSlide
 * @returns {Object|null}
 */
export function evaluateBranchMatch({ currentSlide, answerState, feedbackState, childBranches }) {
  if (!childBranches || childBranches.length === 0) return null;

  const sourceSlideId   = currentSlide.slideId;
  const studentAnswer   = answerState?.[sourceSlideId];
  const studentFeedback = feedbackState?.[sourceSlideId];
  const isCorrect       = studentFeedback?.correct === true;

  //correct answer - no branch taken
  if (isCorrect) return null;

  let optionMatch      = null;
  let correctnessMatch = null;

  for (const branch of childBranches) {
    const cfg = branch.branchConfig;
    if (!cfg) continue;

    if (cfg.operator === 'is' && cfg.matchType === 'option' && cfg.optionId) {
      // "Show if answer IS option X (a wrong option)"
      if (studentAnswer === cfg.optionId && optionMatch === null) {
        optionMatch = branch;
      }
    } else if (
      cfg.operator === 'isNot' &&
      cfg.matchType === 'correctness' &&
      cfg.correctness === 'correct'
    ) {
      // "Show if answer IS NOT correct" (generic incorrect fallback)
      if (!isCorrect && correctnessMatch === null) {
        correctnessMatch = branch;
      }
    }
  }

  return optionMatch || correctnessMatch || null;
}


// Navigation
/** Internal: walk up the branch chain and return the first non-branch ancestor. */
function getRootRegularAncestor(slide, slidesById) {
  const visited = new Set();
  let s = slide;
  while (s && s.isBranchSlide && s.branchParentSlideId) {
    if (visited.has(s.slideId)) return null; // cycle guard
    visited.add(s.slideId);
    s = slidesById[s.branchParentSlideId];
  }
  return s && !s.isBranchSlide ? s : null;
}

/**
 * Determine the ID of the next slide after the student finishes `currentSlide`.
 *
 * Returns  { slideId: string|null, completed: boolean }
 *   completed=true  - tutorial is done
 *   slideId=null    - also treat as done (should not happen under normal flow)
 *
 * Navigation rules
 * ────────────────
 * Regular slide
 *   1. Check branch children - if any condition matches, follow that branch.
 *   2. No match - advance to the next regular slide (or complete).
 *
 * Branch slide
 *   1. Check nested branch children - if any match, follow.
 *   2. No match - resume at the regular slide AFTER the root regular ancestor.
 *      If that ancestor was the last regular slide - complete.
 *
 * @param {Object} params
 * @param {Object} params.currentSlide
 * @param {Array}  params.allSlides
 * @param {Object} params.answerState
 * @param {Object} params.feedbackState
 * @returns {{ slideId: string|null, completed: boolean }}
 */
export function getNextSlideId({ currentSlide, allSlides, answerState, feedbackState }) {
  const slidesById        = buildSlidesById(allSlides);
  const regularSlides     = buildRegularSlideOrder(allSlides);
  const branchChildrenMap = buildBranchChildrenMap(allSlides);

  /** Try to match a branch child of the given slide. */
  function matchBranch(slide) {
    const children = branchChildrenMap[slide.slideId] || [];
    return evaluateBranchMatch({ currentSlide: slide, answerState, feedbackState, childBranches: children });
  }

  if (currentSlide.isBranchSlide) {
    // 1. Nested branch children?
    const nested = matchBranch(currentSlide);
    if (nested) return { slideId: nested.slideId, completed: false };

    // 2. Resume after root regular ancestor
    const root = getRootRegularAncestor(currentSlide, slidesById);
    if (!root) return { slideId: null, completed: true };

    const rootIdx = regularSlides.findIndex((s) => s.slideId === root.slideId);
    if (rootIdx === -1 || rootIdx >= regularSlides.length - 1) {
      return { slideId: null, completed: true };
    }
    return { slideId: regularSlides[rootIdx + 1].slideId, completed: false };
  }

  // Regular slide — check branch children first
  const matched = matchBranch(currentSlide);
  if (matched) return { slideId: matched.slideId, completed: false };

  // No branch match - next regular slide
  const currentIdx = regularSlides.findIndex((s) => s.slideId === currentSlide.slideId);
  if (currentIdx === -1 || currentIdx >= regularSlides.length - 1) {
    return { slideId: null, completed: true };
  }
  return { slideId: regularSlides[currentIdx + 1].slideId, completed: false };
}

/**
 * Returns the ID of the first regular slide (lowest order), or null.
 * Used to initialise playback.
 * @param {Array} slides
 * @returns {string|null}
 */
export function getFirstSlideId(slides) {
  const regular = buildRegularSlideOrder(slides);
  return regular.length > 0 ? regular[0].slideId : null;
}


// Display numbering
/**
 * Compute a dotted display label for a slide based on its position in the tree.
 *
 *   Regular slides     - "1", "2", "3", …
 *   Branch of slide 3  - "3.1", "3.2", …
 *   Nested branch      - "3.1.1", …
 *
 * @param {Object} slide
 * @param {Array}  allSlides
 * @returns {string}
 */
export function getDisplaySlideNumber(slide, allSlides) {
  const regularSlides     = buildRegularSlideOrder(allSlides);
  const branchChildrenMap = buildBranchChildrenMap(allSlides);
  const slidesById        = buildSlidesById(allSlides);

  if (!slide.isBranchSlide) {
    const idx = regularSlides.findIndex((s) => s.slideId === slide.slideId);
    return idx >= 0 ? String(idx + 1) : '?';
  }

  // Walk from current slide up to root, building the ancestry chain
  const chain   = [];
  const visited = new Set();
  let s = slide;
  while (s) {
    if (visited.has(s.slideId)) { chain.unshift(s); break; }
    visited.add(s.slideId);
    chain.unshift(s);
    if (!s.isBranchSlide || !s.branchParentSlideId) break;
    s = slidesById[s.branchParentSlideId];
  }

  const root = chain[0];
  if (root.isBranchSlide) return '?'; // orphaned

  const rootIdx = regularSlides.findIndex((r) => r.slideId === root.slideId);
  if (rootIdx === -1) return '?';

  const parts = [String(rootIdx + 1)];
  for (let i = 1; i < chain.length; i++) {
    const cur    = chain[i];
    const parent = chain[i - 1];
    const sibs   = branchChildrenMap[parent.slideId] || [];
    const sibIdx = sibs.findIndex((sib) => sib.slideId === cur.slideId);
    parts.push(String(sibIdx >= 0 ? sibIdx + 1 : '?'));
  }

  return parts.join('.');
}

// Branch-config validation
/**
 * Validate the branch configuration for a given slide.
 * Returns an array of error strings; empty means valid.
 *
 * Checks:
 *  - branchParentSlideId exists and refers to a real slide
 *  - sourceSlideId === branchParentSlideId
 *  - source slide has a question pane
 *  - operator / matchType / optionId / correctness are consistent
 *  - optionId exists on the source slide and is not the correct option
 *  - no duplicate condition among siblings
 *  - no cycle in the ancestry chain
 *
 * @param {Object} slide
 * @param {Array}  allSlides
 * @returns {string[]}
 */
export function validateBranchConfig(slide, allSlides) {
  if (!slide.isBranchSlide) return [];

  const errors         = [];
  const cfg            = slide.branchConfig;
  const slidesById     = buildSlidesById(allSlides);

  if (!slide.branchParentSlideId) {
    errors.push('Branch slide must have a parent slide.');
    return errors;
  }

  const parent = slidesById[slide.branchParentSlideId];
  if (!parent) {
    errors.push('Parent slide does not exist.');
    return errors;
  }

  if (!cfg) {
    errors.push('Branch condition is required for conditional slides.');
    return errors;
  }

  //source must equal parent
  if (cfg.sourceSlideId !== slide.branchParentSlideId) {
    errors.push('Source slide must equal parent slide.');
  }

  const source = slidesById[cfg.sourceSlideId];
  if (!source) {
    errors.push('Source slide does not exist.');
    return errors;
  }

  const sourcePane = source.leftPane;
  if (!sourcePane || (sourcePane.type !== 'question' && sourcePane.type !== 'textQuestion')) {
    errors.push('Source slide must be a question slide (MCQ or text question). Rich text / embed / media slides cannot be branch sources.');
    return errors;
  }

  if (sourcePane.type === 'textQuestion') {
    // Text questions only support "is not correct"
    if (cfg.operator !== 'isNot' || cfg.matchType !== 'correctness' || cfg.correctness !== 'correct') {
      errors.push('Text question sources only support "is not correct" branching.');
    }
    if (cfg.optionId != null) {
      errors.push('Correctness-based branches must not have an optionId set.');
    }
  } else if (sourcePane.type === 'question') {
    if (cfg.operator === 'is') {
      if (cfg.matchType !== 'option' || !cfg.optionId) {
        errors.push('MCQ "is" operator requires a specific wrong option to be selected.');
      } else {
        const options   = sourcePane.data?.options || [];
        const correctId = sourcePane.data?.correctOptionId;
        const option    = options.find((o) => o.id === cfg.optionId);
        if (!option) {
          errors.push(`Option "${cfg.optionId}" no longer exists on the source slide. Please reconfigure this branch.`);
        } else if (cfg.optionId === correctId) {
          errors.push('Cannot branch on the correct option. Choose a wrong option.');
        }
      }
    } else if (cfg.operator === 'isNot') {
      if (cfg.matchType !== 'correctness' || cfg.correctness !== 'correct') {
        errors.push('MCQ "is not" operator must use correctness = "correct".');
      }
      if (cfg.optionId != null) {
        errors.push('Correctness-based branches must not have an optionId set.');
      }
    } else {
      errors.push('Invalid branch operator. Must be "is" or "isNot".');
    }
  }

  // Duplicate-condition check among siblings
  const branchChildrenMap = buildBranchChildrenMap(allSlides);
  const siblings = (branchChildrenMap[slide.branchParentSlideId] || []).filter(
    (sib) => sib.slideId !== slide.slideId
  );
  for (const sib of siblings) {
    const sibCfg = sib.branchConfig;
    if (!sibCfg) continue;
    if (
      sibCfg.operator    === cfg.operator    &&
      sibCfg.matchType   === cfg.matchType   &&
      sibCfg.optionId    === cfg.optionId    &&
      sibCfg.correctness === cfg.correctness
    ) {
      errors.push('A branch with this exact condition already exists for this parent slide. Duplicate conditions are not allowed.');
      break;
    }
  }

  // Cycle detection: walk the ancestry chain and error if any slideId is visited twice.
  // This catches all cycle shapes
  const visitedIds = new Set();
  let ancestor = slide;
  let hasCycle = false;
  while (ancestor && ancestor.isBranchSlide && ancestor.branchParentSlideId) {
    if (visitedIds.has(ancestor.slideId)) {
      hasCycle = true;
      break;
    }
    visitedIds.add(ancestor.slideId);
    ancestor = slidesById[ancestor.branchParentSlideId];
  }
  if (hasCycle) {
    errors.push('Cycle detected in branch configuration. A slide cannot be its own ancestor.');
  }

  return errors;
}

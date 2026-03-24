// Unit Tests: Branch Navigation & Authoring Helpers

import {
  buildRegularSlideOrder,
  buildBranchChildrenMap,
  buildSlidesById,
  getEligibleParentSlides,
  evaluateBranchMatch,
  getNextSlideId,
  getFirstSlideId,
  getDisplaySlideNumber,
  validateBranchConfig,
} from './branchHelpers';

// Shared fixtures

/** MCQ slide — 3 options, correct = 'b' */
const mcqSlide = {
  slideId: 's1',
  order: 1,
  isBranchSlide: false,
  branchParentSlideId: null,
  branchConfig: null,
  leftPane: {
    type: 'question',
    data: {
      questionTitle: 'What is 2+2?',
      options: [
        { id: 'a', text: '3' },
        { id: 'b', text: '4' },
        { id: 'c', text: '5' },
      ],
      correctOptionId: 'b',
    },
  },
  rightPane: { type: 'text', data: { content: 'Think carefully.' } },
};

/** Text-question slide */
const textSlide = {
  slideId: 's2',
  order: 2,
  isBranchSlide: false,
  branchParentSlideId: null,
  branchConfig: null,
  leftPane: {
    type: 'textQuestion',
    data: {
      questionTitle: 'What is the capital of France?',
      correctAnswers: ['Paris'],
    },
  },
  rightPane: { type: 'text', data: { content: 'Geography time.' } },
};

/** Plain text (non-question) slide */
const plainSlide = {
  slideId: 's3',
  order: 3,
  isBranchSlide: false,
  branchParentSlideId: null,
  branchConfig: null,
  leftPane: { type: 'text', data: { content: 'Final thoughts.' } },
  rightPane: { type: 'text', data: { content: 'Done.' } },
};

/** Branch of mcqSlide — exact wrong option 'a'.
 *  Has a question pane so it can itself be the parent of nestedBranch. */
const branchOptionA = {
  slideId: 'b1',
  order: 4,
  isBranchSlide: true,
  branchParentSlideId: 's1',
  branchConfig: {
    sourceSlideId: 's1',
    operator: 'is',
    matchType: 'option',
    optionId: 'a',
    correctness: null,
  },
  leftPane: {
    type: 'question',
    data: {
      questionTitle: 'Are you sure about that?',
      options: [
        { id: 'y', text: 'Yes' },
        { id: 'n', text: 'No' },
      ],
      correctOptionId: 'y',
    },
  },
  rightPane: { type: 'text', data: { content: 'Hint content.' } },
};

/** Branch of mcqSlide — exact wrong option 'c' */
const branchOptionC = {
  slideId: 'b2',
  order: 5,
  isBranchSlide: true,
  branchParentSlideId: 's1',
  branchConfig: {
    sourceSlideId: 's1',
    operator: 'is',
    matchType: 'option',
    optionId: 'c',
    correctness: null,
  },
  leftPane: { type: 'text', data: { content: 'You chose 5 — too high!' } },
  rightPane: { type: 'text', data: { content: 'Hint content.' } },
};

/** Branch of mcqSlide — generic incorrect fallback */
const branchGeneric = {
  slideId: 'b3',
  order: 6,
  isBranchSlide: true,
  branchParentSlideId: 's1',
  branchConfig: {
    sourceSlideId: 's1',
    operator: 'isNot',
    matchType: 'correctness',
    optionId: null,
    correctness: 'correct',
  },
  leftPane: { type: 'text', data: { content: 'That is incorrect.' } },
  rightPane: { type: 'text', data: { content: 'Review the material.' } },
};

/** Branch of textSlide — "is not correct" */
const branchText = {
  slideId: 'b4',
  order: 7,
  isBranchSlide: true,
  branchParentSlideId: 's2',
  branchConfig: {
    sourceSlideId: 's2',
    operator: 'isNot',
    matchType: 'correctness',
    optionId: null,
    correctness: 'correct',
  },
  leftPane: { type: 'text', data: { content: 'Hint: it\'s in France.' } },
  rightPane: { type: 'text', data: { content: 'Try again.' } },
};

/** Nested branch — child of branchOptionA */
const nestedBranch = {
  slideId: 'n1',
  order: 8,
  isBranchSlide: true,
  branchParentSlideId: 'b1',
  branchConfig: {
    sourceSlideId: 'b1',
    operator: 'isNot',
    matchType: 'correctness',
    optionId: null,
    correctness: 'correct',
  },
  leftPane: { type: 'text', data: { content: 'Even deeper hint.' } },
  rightPane: { type: 'text', data: { content: 'Keep trying.' } },
};

// Convenience: full slide set used in most navigation tests
const allSlides = [mcqSlide, textSlide, plainSlide, branchOptionA, branchOptionC, branchGeneric, branchText];


// buildRegularSlideOrder

describe('buildRegularSlideOrder', () => {
  test('returns empty array for empty input', () => {
    expect(buildRegularSlideOrder([])).toEqual([]);
  });

  test('returns empty array for null/undefined', () => {
    expect(buildRegularSlideOrder(null)).toEqual([]);
    expect(buildRegularSlideOrder(undefined)).toEqual([]);
  });

  test('filters out branch slides', () => {
    const result = buildRegularSlideOrder(allSlides);
    expect(result.every((s) => !s.isBranchSlide)).toBe(true);
  });

  test('returns only regular slides', () => {
    const result = buildRegularSlideOrder(allSlides);
    expect(result.map((s) => s.slideId)).toEqual(['s1', 's2', 's3']);
  });

  test('sorts by ascending order field', () => {
    const shuffled = [plainSlide, mcqSlide, textSlide];
    const result = buildRegularSlideOrder(shuffled);
    expect(result.map((s) => s.slideId)).toEqual(['s1', 's2', 's3']);
  });

  test('returns all regular slides when no branches exist', () => {
    const result = buildRegularSlideOrder([mcqSlide, textSlide, plainSlide]);
    expect(result).toHaveLength(3);
  });

  test('treats missing order as 0', () => {
    const noOrder = { slideId: 'x', isBranchSlide: false };
    const result = buildRegularSlideOrder([mcqSlide, noOrder]);
    expect(result[0].slideId).toBe('x');
  });
});


// buildBranchChildrenMap

describe('buildBranchChildrenMap', () => {
  test('returns empty object for empty input', () => {
    expect(buildBranchChildrenMap([])).toEqual({});
  });

  test('returns empty object for null/undefined', () => {
    expect(buildBranchChildrenMap(null)).toEqual({});
    expect(buildBranchChildrenMap(undefined)).toEqual({});
  });

  test('returns empty object when no branch slides exist', () => {
    expect(buildBranchChildrenMap([mcqSlide, textSlide, plainSlide])).toEqual({});
  });

  test('maps branch children by parent id', () => {
    const map = buildBranchChildrenMap(allSlides);
    expect(map['s1']).toBeDefined();
    expect(map['s1'].map((s) => s.slideId)).toContain('b1');
    expect(map['s1'].map((s) => s.slideId)).toContain('b2');
    expect(map['s1'].map((s) => s.slideId)).toContain('b3');
  });

  test('only includes isBranchSlide=true slides with a parent id', () => {
    const map = buildBranchChildrenMap(allSlides);
    expect(map['s1']).toHaveLength(3);
    expect(map['s2']).toHaveLength(1);
    expect(map['s3']).toBeUndefined();
  });

  test('sorts branch children by ascending order within each parent', () => {
    const map = buildBranchChildrenMap(allSlides);
    const ids = map['s1'].map((s) => s.slideId);
    expect(ids).toEqual(['b1', 'b2', 'b3']); // order 4, 5, 6
  });

  test('ignores branch slides with no branchParentSlideId', () => {
    const orphan = { slideId: 'orphan', isBranchSlide: true, branchParentSlideId: null, order: 99 };
    const map = buildBranchChildrenMap([...allSlides, orphan]);
    expect(Object.values(map).flat().find((s) => s.slideId === 'orphan')).toBeUndefined();
  });

  test('handles nested branches', () => {
    const slides = [...allSlides, nestedBranch];
    const map = buildBranchChildrenMap(slides);
    expect(map['b1']).toHaveLength(1);
    expect(map['b1'][0].slideId).toBe('n1');
  });
});


// buildSlidesById

describe('buildSlidesById', () => {
  test('returns empty object for empty input', () => {
    expect(buildSlidesById([])).toEqual({});
  });

  test('returns empty object for null/undefined', () => {
    expect(buildSlidesById(null)).toEqual({});
    expect(buildSlidesById(undefined)).toEqual({});
  });

  test('keys map by slideId', () => {
    const map = buildSlidesById([mcqSlide, textSlide]);
    expect(map['s1']).toBe(mcqSlide);
    expect(map['s2']).toBe(textSlide);
  });

  test('includes all slides (regular and branch)', () => {
    const map = buildSlidesById(allSlides);
    expect(Object.keys(map)).toHaveLength(allSlides.length);
  });

  test('later duplicate ids overwrite earlier entries', () => {
    const dupe = { ...mcqSlide, order: 99 };
    const map = buildSlidesById([mcqSlide, dupe]);
    expect(map['s1'].order).toBe(99);
  });
});


// getEligibleParentSlides

describe('getEligibleParentSlides', () => {
  test('returns empty array for null slides', () => {
    expect(getEligibleParentSlides(null, 's1')).toEqual([]);
  });

  test('excludes the current slide itself', () => {
    const result = getEligibleParentSlides(allSlides, 's1');
    expect(result.find((s) => s.slideId === 's1')).toBeUndefined();
  });

  test('excludes branch slides as parents', () => {
    const result = getEligibleParentSlides(allSlides, 'some-other-id');
    expect(result.every((s) => !s.isBranchSlide)).toBe(true);
  });

  test('includes MCQ slides as valid parents', () => {
    const result = getEligibleParentSlides(allSlides, 'other');
    expect(result.find((s) => s.slideId === 's1')).toBeDefined();
  });

  test('includes textQuestion slides as valid parents', () => {
    const result = getEligibleParentSlides(allSlides, 'other');
    expect(result.find((s) => s.slideId === 's2')).toBeDefined();
  });

  test('excludes plain text/media/embed slides', () => {
    const result = getEligibleParentSlides(allSlides, 'other');
    expect(result.find((s) => s.slideId === 's3')).toBeUndefined();
  });

  test('returns empty array when no question slides exist', () => {
    const result = getEligibleParentSlides([plainSlide], 'other');
    expect(result).toHaveLength(0);
  });
});


// evaluateBranchMatch

describe('evaluateBranchMatch', () => {
  const childBranches = [branchOptionA, branchOptionC, branchGeneric];

  test('returns null when childBranches is empty', () => {
    expect(evaluateBranchMatch({
      currentSlide: mcqSlide,
      answerState: { s1: 'a' },
      feedbackState: { s1: { correct: false } },
      childBranches: [],
    })).toBeNull();
  });

  test('returns null when childBranches is null', () => {
    expect(evaluateBranchMatch({
      currentSlide: mcqSlide,
      answerState: { s1: 'a' },
      feedbackState: { s1: { correct: false } },
      childBranches: null,
    })).toBeNull();
  });

  test('returns null when student answered correctly', () => {
    expect(evaluateBranchMatch({
      currentSlide: mcqSlide,
      answerState: { s1: 'b' },
      feedbackState: { s1: { correct: true } },
      childBranches,
    })).toBeNull();
  });

  test('matches exact wrong option (operator="is")', () => {
    const result = evaluateBranchMatch({
      currentSlide: mcqSlide,
      answerState: { s1: 'a' },
      feedbackState: { s1: { correct: false } },
      childBranches,
    });
    expect(result?.slideId).toBe('b1');
  });

  test('matches different exact wrong option', () => {
    const result = evaluateBranchMatch({
      currentSlide: mcqSlide,
      answerState: { s1: 'c' },
      feedbackState: { s1: { correct: false } },
      childBranches,
    });
    expect(result?.slideId).toBe('b2');
  });

  test('falls back to generic incorrect when no option match exists', () => {
    // Only branchGeneric (isNot), no specific option branches
    const result = evaluateBranchMatch({
      currentSlide: mcqSlide,
      answerState: { s1: 'a' },
      feedbackState: { s1: { correct: false } },
      childBranches: [branchGeneric],
    });
    expect(result?.slideId).toBe('b3');
  });

  test('exact option match takes priority over generic fallback', () => {
    // Both branchOptionA (is, option a) and branchGeneric (isNot) present
    const result = evaluateBranchMatch({
      currentSlide: mcqSlide,
      answerState: { s1: 'a' },
      feedbackState: { s1: { correct: false } },
      childBranches: [branchGeneric, branchOptionA], // generic listed first
    });
    expect(result?.slideId).toBe('b1'); // still picks the option match
  });

  test('returns generic fallback when option selected has no specific branch', () => {
    // Student picks 'c' but only branches for 'a' and generic exist
    const result = evaluateBranchMatch({
      currentSlide: mcqSlide,
      answerState: { s1: 'c' },
      feedbackState: { s1: { correct: false } },
      childBranches: [branchOptionA, branchGeneric],
    });
    expect(result?.slideId).toBe('b3');
  });

  test('returns null when incorrect but no matching branch exists', () => {
    // Only a branch for option 'c', student picks 'a'
    const result = evaluateBranchMatch({
      currentSlide: mcqSlide,
      answerState: { s1: 'a' },
      feedbackState: { s1: { correct: false } },
      childBranches: [branchOptionC],
    });
    expect(result).toBeNull();
  });

  test('returns null when feedbackState has no entry (undefined correctness)', () => {
    // No feedback yet — treated as not correct, but also option won't match since
    // the condition checks answerState. Generic isNot should still fire.
    const result = evaluateBranchMatch({
      currentSlide: mcqSlide,
      answerState: { s1: 'a' },
      feedbackState: {},
      childBranches: [branchOptionA],
    });
    // isCorrect = undefined === true = false - option match fires
    expect(result?.slideId).toBe('b1');
  });

  test('handles branch config with missing cfg gracefully', () => {
    const noCfgBranch = { ...branchOptionA, branchConfig: null };
    const result = evaluateBranchMatch({
      currentSlide: mcqSlide,
      answerState: { s1: 'a' },
      feedbackState: { s1: { correct: false } },
      childBranches: [noCfgBranch],
    });
    expect(result).toBeNull();
  });

  test('text question: matches isNot-correct branch when incorrect', () => {
    const result = evaluateBranchMatch({
      currentSlide: textSlide,
      answerState: { s2: 'London' },
      feedbackState: { s2: { correct: false } },
      childBranches: [branchText],
    });
    expect(result?.slideId).toBe('b4');
  });

  test('text question: returns null when correct', () => {
    const result = evaluateBranchMatch({
      currentSlide: textSlide,
      answerState: { s2: 'Paris' },
      feedbackState: { s2: { correct: true } },
      childBranches: [branchText],
    });
    expect(result).toBeNull();
  });
});


// getNextSlideId

describe('getNextSlideId', () => {
  // ── Regular slides ──────────────────────────────────────────────────────

  test('advances to next regular slide', () => {
    const result = getNextSlideId({
      currentSlide: mcqSlide,
      allSlides: [mcqSlide, textSlide, plainSlide],
      answerState: { s1: 'b' },
      feedbackState: { s1: { correct: true } },
    });
    expect(result).toEqual({ slideId: 's2', completed: false });
  });

  test('completes when on last regular slide with no branches', () => {
    const result = getNextSlideId({
      currentSlide: plainSlide,
      allSlides: [mcqSlide, textSlide, plainSlide],
      answerState: {},
      feedbackState: {},
    });
    expect(result).toEqual({ slideId: null, completed: true });
  });

  test('completes when only one regular slide and no branches', () => {
    const result = getNextSlideId({
      currentSlide: mcqSlide,
      allSlides: [mcqSlide],
      answerState: { s1: 'b' },
      feedbackState: { s1: { correct: true } },
    });
    expect(result).toEqual({ slideId: null, completed: true });
  });

  test('navigates to branch slide when wrong answer matches', () => {
    const result = getNextSlideId({
      currentSlide: mcqSlide,
      allSlides,
      answerState: { s1: 'a' },
      feedbackState: { s1: { correct: false } },
    });
    expect(result).toEqual({ slideId: 'b1', completed: false });
  });

  test('navigates to generic branch when no exact option match', () => {
    // Student picked 'c' — no specific branch for 'c', falls back to generic
    const slides = [mcqSlide, textSlide, plainSlide, branchOptionA, branchGeneric];
    const result = getNextSlideId({
      currentSlide: mcqSlide,
      allSlides: slides,
      answerState: { s1: 'c' },
      feedbackState: { s1: { correct: false } },
    });
    expect(result).toEqual({ slideId: 'b3', completed: false });
  });

  test('skips branches and advances when answer is correct', () => {
    const result = getNextSlideId({
      currentSlide: mcqSlide,
      allSlides,
      answerState: { s1: 'b' },
      feedbackState: { s1: { correct: true } },
    });
    expect(result).toEqual({ slideId: 's2', completed: false });
  });

  test('advances through regular slides in order', () => {
    const r1 = getNextSlideId({
      currentSlide: mcqSlide,
      allSlides: [mcqSlide, textSlide, plainSlide],
      answerState: { s1: 'b' },
      feedbackState: { s1: { correct: true } },
    });
    expect(r1.slideId).toBe('s2');

    const r2 = getNextSlideId({
      currentSlide: textSlide,
      allSlides: [mcqSlide, textSlide, plainSlide],
      answerState: { s2: 'Paris' },
      feedbackState: { s2: { correct: true } },
    });
    expect(r2.slideId).toBe('s3');
  });

  // ── Branch slides ────────────────────────────────────────────────────────

  test('branch slide: resumes at the regular slide after root ancestor', () => {
    // branchOptionA is child of s1; after it, should go to s2
    const result = getNextSlideId({
      currentSlide: branchOptionA,
      allSlides,
      answerState: {},
      feedbackState: {},
    });
    expect(result).toEqual({ slideId: 's2', completed: false });
  });

  test('branch slide: completes when root ancestor is the last regular slide', () => {
    // Put branchOptionA as child of plainSlide (last regular)
    const lastBranch = {
      ...branchOptionA,
      slideId: 'last_branch',
      branchParentSlideId: 's3',
      branchConfig: { ...branchOptionA.branchConfig, sourceSlideId: 's3' },
    };
    const result = getNextSlideId({
      currentSlide: lastBranch,
      allSlides: [mcqSlide, textSlide, plainSlide, lastBranch],
      answerState: {},
      feedbackState: {},
    });
    expect(result).toEqual({ slideId: null, completed: true });
  });

  test('branch slide: follows nested branch when condition matches', () => {
    const slidesWithNested = [...allSlides, nestedBranch];
    // On branchOptionA, student answers incorrectly - nested branch fires
    const result = getNextSlideId({
      currentSlide: branchOptionA,
      allSlides: slidesWithNested,
      answerState: { b1: 'wrong' },
      feedbackState: { b1: { correct: false } },
    });
    expect(result).toEqual({ slideId: 'n1', completed: false });
  });

  test('branch slide: skips nested branch and resumes when correct', () => {
    const slidesWithNested = [...allSlides, nestedBranch];
    const result = getNextSlideId({
      currentSlide: branchOptionA,
      allSlides: slidesWithNested,
      answerState: { b1: 'right' },
      feedbackState: { b1: { correct: true } },
    });
    expect(result).toEqual({ slideId: 's2', completed: false });
  });

  test('nested branch slide: resumes after root regular ancestor', () => {
    // nestedBranch - branchOptionA - s1; after n1, should go to s2
    const slidesWithNested = [...allSlides, nestedBranch];
    const result = getNextSlideId({
      currentSlide: nestedBranch,
      allSlides: slidesWithNested,
      answerState: {},
      feedbackState: {},
    });
    expect(result).toEqual({ slideId: 's2', completed: false });
  });

  test('orphaned branch slide (parent missing): completes gracefully', () => {
    const orphan = {
      slideId: 'orphan',
      order: 99,
      isBranchSlide: true,
      branchParentSlideId: 'nonexistent',
      branchConfig: { sourceSlideId: 'nonexistent', operator: 'isNot', matchType: 'correctness', correctness: 'correct' },
      leftPane: { type: 'text', data: { content: 'Orphan' } },
      rightPane: { type: 'text', data: { content: '' } },
    };
    const result = getNextSlideId({
      currentSlide: orphan,
      allSlides: [mcqSlide, orphan],
      answerState: {},
      feedbackState: {},
    });
    expect(result).toEqual({ slideId: null, completed: true });
  });
});


// getFirstSlideId

describe('getFirstSlideId', () => {
  test('returns null for empty array', () => {
    expect(getFirstSlideId([])).toBeNull();
  });

  test('returns null for null/undefined', () => {
    expect(getFirstSlideId(null)).toBeNull();
    expect(getFirstSlideId(undefined)).toBeNull();
  });

  test('returns the slideId of the lowest-order regular slide', () => {
    expect(getFirstSlideId(allSlides)).toBe('s1');
  });

  test('ignores branch slides', () => {
    const branches = [branchOptionA, branchOptionC]; // orders 4, 5
    expect(getFirstSlideId(branches)).toBeNull();
  });

  test('works with unsorted input', () => {
    expect(getFirstSlideId([plainSlide, mcqSlide, textSlide])).toBe('s1');
  });

  test('returns null when all slides are branch slides', () => {
    expect(getFirstSlideId([branchOptionA, branchGeneric])).toBeNull();
  });
});


// getDisplaySlideNumber

describe('getDisplaySlideNumber', () => {
  const slides = [mcqSlide, textSlide, plainSlide, branchOptionA, branchOptionC, branchGeneric, branchText];

  test('regular slide: returns 1-based position string', () => {
    expect(getDisplaySlideNumber(mcqSlide, slides)).toBe('1');
    expect(getDisplaySlideNumber(textSlide, slides)).toBe('2');
    expect(getDisplaySlideNumber(plainSlide, slides)).toBe('3');
  });

  test('first branch child: returns dotted number 1.1', () => {
    // branchOptionA is the first branch child of s1 (order 4)
    expect(getDisplaySlideNumber(branchOptionA, slides)).toBe('1.1');
  });

  test('second branch child: returns dotted number 1.2', () => {
    expect(getDisplaySlideNumber(branchOptionC, slides)).toBe('1.2');
  });

  test('third branch child: returns dotted number 1.3', () => {
    expect(getDisplaySlideNumber(branchGeneric, slides)).toBe('1.3');
  });

  test('branch of second regular slide: returns 2.1', () => {
    expect(getDisplaySlideNumber(branchText, slides)).toBe('2.1');
  });

  test('nested branch: returns three-part dotted number', () => {
    const slidesWithNested = [...slides, nestedBranch];
    // nestedBranch is child of branchOptionA (b1), which is 1.1
    expect(getDisplaySlideNumber(nestedBranch, slidesWithNested)).toBe('1.1.1');
  });

  test('orphaned branch (root is branch): returns ?', () => {
    // A branch whose parent is also a branch but has no regular ancestor
    const deepOrphan = {
      slideId: 'deep',
      isBranchSlide: true,
      branchParentSlideId: 'b999', // parent doesn't exist
      order: 50,
    };
    expect(getDisplaySlideNumber(deepOrphan, slides)).toBe('?');
  });

  test('slide not found in regularSlides returns ?', () => {
    const unknown = { slideId: 'zzz', isBranchSlide: false, order: 99 };
    expect(getDisplaySlideNumber(unknown, slides)).toBe('?');
  });
});


// validateBranchConfig

describe('validateBranchConfig', () => {
  //Non-branch slides 

  test('returns empty array for a regular slide', () => {
    expect(validateBranchConfig(mcqSlide, allSlides)).toEqual([]);
  });

  test('returns empty array for a regular non-question slide', () => {
    expect(validateBranchConfig(plainSlide, allSlides)).toEqual([]);
  });

  //Missing parent 
  test('errors when branchParentSlideId is null', () => {
    const slide = { ...branchOptionA, branchParentSlideId: null };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/parent/i);
  });

  test('errors when parent slideId does not exist in allSlides', () => {
    const slide = { ...branchOptionA, branchParentSlideId: 'nonexistent' };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.some((e) => /parent|exist/i.test(e))).toBe(true);
  });

  //Missing branchConfig 

  test('errors when branchConfig is null', () => {
    const slide = { ...branchOptionA, branchConfig: null };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.some((e) => /condition|required/i.test(e))).toBe(true);
  });

  //sourceSlideId mismatch 

  test('errors when sourceSlideId !== branchParentSlideId', () => {
    const slide = {
      ...branchOptionA,
      branchConfig: { ...branchOptionA.branchConfig, sourceSlideId: 's3' }, // wrong
    };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.some((e) => /source|parent/i.test(e))).toBe(true);
  });

  //Source slide type 

  test('errors when source slide is a non-question slide', () => {
    const slide = {
      ...branchOptionA,
      branchParentSlideId: 's3', // plainSlide — text, not question
      branchConfig: { ...branchOptionA.branchConfig, sourceSlideId: 's3' },
    };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.some((e) => /question/i.test(e))).toBe(true);
  });

  // Text question source rules 

  test('valid text question branch passes', () => {
    const errors = validateBranchConfig(branchText, allSlides);
    expect(errors).toEqual([]);
  });

  test('errors when text question branch uses "is" operator', () => {
    const slide = {
      ...branchText,
      branchConfig: {
        sourceSlideId: 's2',
        operator: 'is',
        matchType: 'option',
        optionId: 'x',
        correctness: null,
      },
    };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.some((e) => /text question|not correct/i.test(e))).toBe(true);
  });

  test('errors when text question branch uses wrong matchType', () => {
    const slide = {
      ...branchText,
      branchConfig: { sourceSlideId: 's2', operator: 'isNot', matchType: 'option', optionId: null, correctness: 'correct' },
    };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('errors when text question branch has a non-null optionId', () => {
    const slide = {
      ...branchText,
      branchConfig: { sourceSlideId: 's2', operator: 'isNot', matchType: 'correctness', optionId: 'a', correctness: 'correct' },
    };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.some((e) => /optionId/i.test(e))).toBe(true);
  });

  //MCQ "is" operator 

  test('valid MCQ "is" branch passes', () => {
    const errors = validateBranchConfig(branchOptionA, allSlides);
    expect(errors).toEqual([]);
  });

  test('errors when MCQ "is" branch has no optionId', () => {
    const slide = {
      ...branchOptionA,
      branchConfig: { ...branchOptionA.branchConfig, optionId: null },
    };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.some((e) => /option/i.test(e))).toBe(true);
  });

  test('errors when MCQ "is" branch references a non-existent option', () => {
    const slide = {
      ...branchOptionA,
      branchConfig: { ...branchOptionA.branchConfig, optionId: 'z' }, // 'z' not in options
    };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.some((e) => /no longer exist|option/i.test(e))).toBe(true);
  });

  test('errors when MCQ "is" branch references the correct option', () => {
    const slide = {
      ...branchOptionA,
      branchConfig: { ...branchOptionA.branchConfig, optionId: 'b' }, // 'b' is correct
    };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.some((e) => /correct option/i.test(e))).toBe(true);
  });

  //MCQ "isNot" operator 

  test('valid MCQ "isNot" branch passes', () => {
    const errors = validateBranchConfig(branchGeneric, allSlides);
    expect(errors).toEqual([]);
  });

  test('errors when MCQ "isNot" branch has wrong matchType', () => {
    const slide = {
      ...branchGeneric,
      branchConfig: { ...branchGeneric.branchConfig, matchType: 'option' },
    };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('errors when MCQ "isNot" branch has correctness != "correct"', () => {
    const slide = {
      ...branchGeneric,
      branchConfig: { ...branchGeneric.branchConfig, correctness: 'incorrect' },
    };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('errors when MCQ "isNot" branch has a non-null optionId', () => {
    const slide = {
      ...branchGeneric,
      branchConfig: { ...branchGeneric.branchConfig, optionId: 'a' },
    };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.some((e) => /optionId/i.test(e))).toBe(true);
  });

  //Invalid operator 

  test('errors on invalid operator value', () => {
    const slide = {
      ...branchOptionA,
      branchConfig: { ...branchOptionA.branchConfig, operator: 'maybe' },
    };
    const errors = validateBranchConfig(slide, allSlides);
    expect(errors.some((e) => /operator|invalid/i.test(e))).toBe(true);
  });

  //Duplicate condition check 

  test('errors when two siblings have the same option condition', () => {
    // branchOptionA and a duplicate both target option 'a' on s1
    const dupeBranch = {
      ...branchOptionA,
      slideId: 'dupe',
    };
    const slidesWithDupe = [...allSlides, dupeBranch];
    const errors = validateBranchConfig(dupeBranch, slidesWithDupe);
    expect(errors.some((e) => /duplicate/i.test(e))).toBe(true);
  });

  test('errors when two siblings have the same isNot-correct condition', () => {
    const dupeGeneric = { ...branchGeneric, slideId: 'dupe_generic' };
    const slidesWithDupe = [...allSlides, dupeGeneric];
    const errors = validateBranchConfig(dupeGeneric, slidesWithDupe);
    expect(errors.some((e) => /duplicate/i.test(e))).toBe(true);
  });

  test('does not error when siblings have different conditions', () => {
    // branchOptionA (option a) and branchOptionC (option c) are siblings — different conditions
    const errors = validateBranchConfig(branchOptionA, allSlides);
    expect(errors).toEqual([]);
  });

  // Cycle detection 

  test('errors when a slide is its own ancestor (direct self-reference)', () => {
    const cyclicSlide = {
      slideId: 'cyc',
      order: 10,
      isBranchSlide: true,
      branchParentSlideId: 'cyc', // points to itself
      branchConfig: {
        sourceSlideId: 'cyc',
        operator: 'isNot',
        matchType: 'correctness',
        correctness: 'correct',
        optionId: null,
      },
      leftPane: mcqSlide.leftPane,
      rightPane: mcqSlide.rightPane,
    };
    // Make it a question slide so parent type check passes
    const cyclicParent = { ...mcqSlide, slideId: 'cyc' };
    const errors = validateBranchConfig(cyclicSlide, [cyclicParent, cyclicSlide]);
    expect(errors.some((e) => /cycle/i.test(e))).toBe(true);
  });

  // Valid configurations 

  test('all branch fixture slides pass validation', () => {
    const slidesWithNested = [...allSlides, nestedBranch];
    expect(validateBranchConfig(branchOptionA,  allSlides)).toEqual([]);
    expect(validateBranchConfig(branchOptionC,  allSlides)).toEqual([]);
    expect(validateBranchConfig(branchGeneric,  allSlides)).toEqual([]);
    expect(validateBranchConfig(branchText,     allSlides)).toEqual([]);
    expect(validateBranchConfig(nestedBranch, slidesWithNested)).toEqual([]);
  });
});

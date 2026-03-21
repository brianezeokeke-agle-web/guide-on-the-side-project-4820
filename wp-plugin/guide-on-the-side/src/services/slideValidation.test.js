// Unit Test: Slide Validation Utilities

import { isPaneEmpty, hasEmptySlides, isTextAnswerCorrect } from './slideValidation';

describe('Slide Validation Utilities', () => {
  // --- isPaneEmpty ---

  describe('isPaneEmpty', () => {
    test('should return true for null pane', () => {
      expect(isPaneEmpty(null)).toBe(true);
    });

    test('should return true for undefined pane', () => {
      expect(isPaneEmpty(undefined)).toBe(true);
    });

    test('should return true for pane with no type', () => {
      expect(isPaneEmpty({})).toBe(true);
    });

    test('should return true for pane with empty string type', () => {
      expect(isPaneEmpty({ type: '' })).toBe(true);
    });

    test('should return true for text pane with no data', () => {
      expect(isPaneEmpty({ type: 'text' })).toBe(true);
    });

    test('should return true for text pane with empty content string', () => {
      expect(isPaneEmpty({ type: 'text', data: { content: '' } })).toBe(true);
    });

    test('should return true for text pane with only HTML tags (no visible text)', () => {
      expect(isPaneEmpty({ type: 'text', data: { content: '<p><br></p>' } })).toBe(true);
    });

    test('should return true for text pane with whitespace-only content inside tags', () => {
      expect(isPaneEmpty({ type: 'text', data: { content: '<p>   </p>' } })).toBe(true);
    });

    test('should return false for text pane with actual content', () => {
      expect(isPaneEmpty({ type: 'text', data: { content: '<p>Hello world</p>' } })).toBe(false);
    });

    test('should return false for text pane with plain text content', () => {
      expect(isPaneEmpty({ type: 'text', data: { content: 'Hello' } })).toBe(false);
    });

    test('should return true for question pane with no data', () => {
      expect(isPaneEmpty({ type: 'question' })).toBe(true);
    });

    test('should return true for question pane with empty questionTitle', () => {
      expect(isPaneEmpty({ type: 'question', data: { questionTitle: '' } })).toBe(true);
    });

    test('should return true for question pane with whitespace-only questionTitle', () => {
      expect(isPaneEmpty({ type: 'question', data: { questionTitle: '   ' } })).toBe(true);
    });

    test('should return false for question pane with a questionTitle', () => {
      expect(isPaneEmpty({ type: 'question', data: { questionTitle: 'What is 2+2?' } })).toBe(false);
    });

    test('should return true for textQuestion pane with no data', () => {
      expect(isPaneEmpty({ type: 'textQuestion' })).toBe(true);
    });

    test('should return true for textQuestion pane with empty questionTitle', () => {
      expect(isPaneEmpty({ type: 'textQuestion', data: { questionTitle: '' } })).toBe(true);
    });

    test('should return false for textQuestion pane with a questionTitle', () => {
      expect(isPaneEmpty({ type: 'textQuestion', data: { questionTitle: 'Explain your answer.' } })).toBe(false);
    });

    test('should return true for embed pane with no data', () => {
      expect(isPaneEmpty({ type: 'embed' })).toBe(true);
    });

    test('should return true for embed pane with empty url', () => {
      expect(isPaneEmpty({ type: 'embed', data: { url: '' } })).toBe(true);
    });

    test('should return true for embed pane with whitespace-only url', () => {
      expect(isPaneEmpty({ type: 'embed', data: { url: '   ' } })).toBe(true);
    });

    test('should return false for embed pane with a url', () => {
      expect(isPaneEmpty({ type: 'embed', data: { url: 'https://example.com/embed' } })).toBe(false);
    });

    test('should return true for media pane with no data', () => {
      expect(isPaneEmpty({ type: 'media' })).toBe(true);
    });

    test('should return true for media pane with null url', () => {
      expect(isPaneEmpty({ type: 'media', data: { url: null } })).toBe(true);
    });

    test('should return true for media pane with no url key', () => {
      expect(isPaneEmpty({ type: 'media', data: {} })).toBe(true);
    });

    test('should return false for media pane with a url', () => {
      expect(isPaneEmpty({ type: 'media', data: { url: 'https://example.com/image.jpg' } })).toBe(false);
    });

    test('should return true for an unknown pane type', () => {
      expect(isPaneEmpty({ type: 'unknownWidget', data: { content: 'stuff' } })).toBe(true);
    });
  });

  // --- hasEmptySlides ---

  describe('hasEmptySlides', () => {
    test('should return true for null tutorial', () => {
      expect(hasEmptySlides(null)).toBe(true);
    });

    test('should return true for tutorial with no slides key', () => {
      expect(hasEmptySlides({})).toBe(true);
    });

    test('should return true for tutorial with empty slides array', () => {
      expect(hasEmptySlides({ slides: [] })).toBe(true);
    });

    test('should return true when a slide has null leftPane', () => {
      expect(hasEmptySlides({
        slides: [{
          leftPane: null,
          rightPane: { type: 'text', data: { content: 'Content' } },
        }],
      })).toBe(true);
    });

    test('should return true when a slide has null rightPane', () => {
      expect(hasEmptySlides({
        slides: [{
          leftPane: { type: 'text', data: { content: 'Content' } },
          rightPane: null,
        }],
      })).toBe(true);
    });

    test('should return true when both panes are null', () => {
      expect(hasEmptySlides({
        slides: [{ leftPane: null, rightPane: null }],
      })).toBe(true);
    });

    test('should return true when a pane has type but no content', () => {
      expect(hasEmptySlides({
        slides: [{
          leftPane: { type: 'text', data: { content: '<p>Hello</p>' } },
          rightPane: { type: 'question' }, // no data
        }],
      })).toBe(true);
    });

    test('should return false when all slides have complete panes', () => {
      expect(hasEmptySlides({
        slides: [
          {
            leftPane: { type: 'text', data: { content: '<p>Intro</p>' } },
            rightPane: { type: 'media', data: { url: 'https://example.com/img.png' } },
          },
          {
            leftPane: { type: 'question', data: { questionTitle: 'Q1?' } },
            rightPane: { type: 'embed', data: { url: 'https://youtube.com/watch?v=abc' } },
          },
        ],
      })).toBe(false);
    });

    test('should return true if only one of several slides is incomplete', () => {
      expect(hasEmptySlides({
        slides: [
          {
            leftPane: { type: 'text', data: { content: '<p>Good</p>' } },
            rightPane: { type: 'media', data: { url: 'https://example.com/img.png' } },
          },
          {
            leftPane: { type: 'text', data: { content: '' } }, // empty!
            rightPane: { type: 'media', data: { url: 'https://example.com/img2.png' } },
          },
        ],
      })).toBe(true);
    });

    test('should return false with textQuestion panes that have titles', () => {
      expect(hasEmptySlides({
        slides: [{
          leftPane: { type: 'textQuestion', data: { questionTitle: 'Explain this.' } },
          rightPane: { type: 'text', data: { content: 'Some instructions' } },
        }],
      })).toBe(false);
    });
  });

  // --- isTextAnswerCorrect ---

  describe('isTextAnswerCorrect', () => {
    // basic matching with correctAnswers array
    test('should return true when student answer matches the single correct answer', () => {
      expect(isTextAnswerCorrect('20', { correctAnswers: ['20'] })).toBe(true);
    });

    test('should return true when student answer matches one of multiple correct answers', () => {
      const data = { correctAnswers: ['20', 'twenty', 'Twenty'] };
      expect(isTextAnswerCorrect('twenty', data)).toBe(true);
    });

    test('should return false when student answer matches none of the correct answers', () => {
      const data = { correctAnswers: ['20', 'twenty'] };
      expect(isTextAnswerCorrect('19', data)).toBe(false);
    });

    // case insensitivity
    test('should match case-insensitively', () => {
      expect(isTextAnswerCorrect('TWENTY', { correctAnswers: ['twenty'] })).toBe(true);
    });

    test('should match mixed case against mixed case', () => {
      expect(isTextAnswerCorrect('TwEnTy', { correctAnswers: ['tWeNtY'] })).toBe(true);
    });

    // whitespace trimming
    test('should trim whitespace from student answer', () => {
      expect(isTextAnswerCorrect('  20  ', { correctAnswers: ['20'] })).toBe(true);
    });

    test('should trim whitespace from correct answers', () => {
      expect(isTextAnswerCorrect('20', { correctAnswers: ['  20  '] })).toBe(true);
    });

    // empty / null student input
    test('should return false for empty student answer', () => {
      expect(isTextAnswerCorrect('', { correctAnswers: ['20'] })).toBe(false);
    });

    test('should return false for null student answer', () => {
      expect(isTextAnswerCorrect(null, { correctAnswers: ['20'] })).toBe(false);
    });

    test('should return false for undefined student answer', () => {
      expect(isTextAnswerCorrect(undefined, { correctAnswers: ['20'] })).toBe(false);
    });

    test('should return false for whitespace-only student answer', () => {
      expect(isTextAnswerCorrect('   ', { correctAnswers: ['20'] })).toBe(false);
    });

    // empty / null pane data
    test('should return false when paneData is null', () => {
      expect(isTextAnswerCorrect('20', null)).toBe(false);
    });

    test('should return false when paneData is undefined', () => {
      expect(isTextAnswerCorrect('20', undefined)).toBe(false);
    });

    test('should return false when correctAnswers is an empty array', () => {
      expect(isTextAnswerCorrect('20', { correctAnswers: [] })).toBe(false);
    });

    test('should return false when correctAnswers contains only empty strings', () => {
      expect(isTextAnswerCorrect('20', { correctAnswers: ['', '  '] })).toBe(false);
    });

    // backward compatibility with legacy correctAnswer (single string)
    test('should match against legacy correctAnswer string', () => {
      expect(isTextAnswerCorrect('20', { correctAnswer: '20' })).toBe(true);
    });

    test('should match legacy correctAnswer case-insensitively', () => {
      expect(isTextAnswerCorrect('HELLO', { correctAnswer: 'hello' })).toBe(true);
    });

    test('should return false when legacy correctAnswer does not match', () => {
      expect(isTextAnswerCorrect('19', { correctAnswer: '20' })).toBe(false);
    });

    test('should return false for empty legacy correctAnswer', () => {
      expect(isTextAnswerCorrect('20', { correctAnswer: '' })).toBe(false);
    });

    // correctAnswers takes priority over correctAnswer
    test('should use correctAnswers array when both fields exist', () => {
      const data = { correctAnswers: ['yes', 'yep'], correctAnswer: 'no' };
      expect(isTextAnswerCorrect('yes', data)).toBe(true);
      expect(isTextAnswerCorrect('no', data)).toBe(false);
    });

    // multiple answers with varied cases and whitespace
    test('should match any answer in a list with mixed formatting', () => {
      const data = { correctAnswers: ['  Paris ', 'paris', 'PARIS', 'City of Light'] };
      expect(isTextAnswerCorrect('paris', data)).toBe(true);
      expect(isTextAnswerCorrect('PARIS', data)).toBe(true);
      expect(isTextAnswerCorrect('city of light', data)).toBe(true);
      expect(isTextAnswerCorrect('London', data)).toBe(false);
    });

    // skips null entries in correctAnswers gracefully
    test('should handle null entries in correctAnswers array', () => {
      expect(isTextAnswerCorrect('20', { correctAnswers: [null, '20', undefined] })).toBe(true);
    });
  });
});

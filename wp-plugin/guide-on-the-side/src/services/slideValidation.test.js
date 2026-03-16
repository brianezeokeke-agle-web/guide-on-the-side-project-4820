// Unit Test: Slide Validation Utilities

import { isPaneEmpty, hasEmptySlides } from './slideValidation';

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
});

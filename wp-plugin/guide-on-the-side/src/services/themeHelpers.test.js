// Unit tests: themeHelpers.js (token resolution and style mapping)

import {
  resolveEffectiveTokens,
  tokensToShellStyle,
  tokensToButtonStyle,
  tokensToProgressBarStyle,
} from './themeHelpers';

import { THEME_TOKEN_DEFAULTS } from './themeSchema';

describe('themeHelpers', () => {

  // ── resolveEffectiveTokens ────────────────────────────────────────────────

  describe('resolveEffectiveTokens', () => {
    test('returns built-in defaults when no tutorial theme and no slide override', () => {
      const result = resolveEffectiveTokens(null, null);
      expect(result).toEqual(THEME_TOKEN_DEFAULTS);
    });

    test('merges tutorial theme tokens over defaults', () => {
      const tutorialTokens = { primaryColor: '#123456', fontFamily: 'Georgia' };
      const result = resolveEffectiveTokens(tutorialTokens, null);

      expect(result.primaryColor).toBe('#123456');
      expect(result.fontFamily).toBe('Georgia');
      // defaults still present for unset keys
      expect(result.backgroundColor).toBe(THEME_TOKEN_DEFAULTS.backgroundColor);
    });

    test('ignores slide override when override is null', () => {
      const tutorialTokens = { primaryColor: '#aabbcc' };
      const result = resolveEffectiveTokens(tutorialTokens, null);

      expect(result.primaryColor).toBe('#aabbcc');
    });

    test('ignores slide override when enabled is false', () => {
      const tutorialTokens = { primaryColor: '#aabbcc' };
      const slideOverride  = { enabled: false, tokens: { primaryColor: '#ffffff' } };
      const result = resolveEffectiveTokens(tutorialTokens, slideOverride);

      expect(result.primaryColor).toBe('#aabbcc');
    });

    test('ignores slide override when tokens object is empty', () => {
      const tutorialTokens = { primaryColor: '#aabbcc' };
      const slideOverride  = { enabled: true, tokens: {} };
      const result = resolveEffectiveTokens(tutorialTokens, slideOverride);

      expect(result.primaryColor).toBe('#aabbcc');
    });

    test('applies slide override tokens on top of tutorial theme when enabled', () => {
      const tutorialTokens = { primaryColor: '#aabbcc', fontFamily: 'Arial' };
      const slideOverride  = { enabled: true, tokens: { primaryColor: '#ff0000' } };
      const result = resolveEffectiveTokens(tutorialTokens, slideOverride);

      expect(result.primaryColor).toBe('#ff0000');   // overridden
      expect(result.fontFamily).toBe('Arial');        // inherited from tutorial theme
    });

    test('slide override only replaces the specific tokens it sets', () => {
      const slideOverride = {
        enabled: true,
        tokens: { backgroundColor: '#000000' },
      };
      const result = resolveEffectiveTokens(null, slideOverride);

      expect(result.backgroundColor).toBe('#000000');
      expect(result.primaryColor).toBe(THEME_TOKEN_DEFAULTS.primaryColor);
      expect(result.fontFamily).toBe(THEME_TOKEN_DEFAULTS.fontFamily);
    });

    test('always returns a non-null object', () => {
      expect(resolveEffectiveTokens(null, null)).toBeTruthy();
      expect(typeof resolveEffectiveTokens(null, null)).toBe('object');
    });

    test('ignores non-object tutorialThemeTokens and falls back to defaults', () => {
      const result = resolveEffectiveTokens("not-an-object", null);
      expect(result).toEqual(THEME_TOKEN_DEFAULTS);
    });
  });

  // ── tokensToShellStyle ────────────────────────────────────────────────────

  describe('tokensToShellStyle', () => {
    test('returns backgroundColor from tokens', () => {
      const style = tokensToShellStyle({ backgroundColor: '#f0f0f0', fontFamily: 'Arial' });
      expect(style.backgroundColor).toBe('#f0f0f0');
    });

    test('returns fontFamily from tokens', () => {
      const style = tokensToShellStyle({ fontFamily: 'Georgia' });
      expect(style.fontFamily).toBe('Georgia');
    });

    test('falls back to default backgroundColor when token is missing', () => {
      const style = tokensToShellStyle({});
      expect(style.backgroundColor).toBe('#f3f4f6');
    });

    test('falls back to Arial when fontFamily token is missing', () => {
      const style = tokensToShellStyle({});
      expect(style.fontFamily).toBe('Arial');
    });

    test('does not include a color (textColor) property — shell scope only', () => {
      const style = tokensToShellStyle({ textColor: '#ff0000' });
      expect(style.color).toBeUndefined();
    });
  });

  // ── tokensToButtonStyle ───────────────────────────────────────────────────

  describe('tokensToButtonStyle', () => {
    test('returns filled style by default', () => {
      const style = tokensToButtonStyle({ primaryColor: '#7B2D26', buttonStyle: 'filled' });
      expect(style.backgroundColor).toBe('#7B2D26');
      expect(style.color).toBe('#ffffff');
      expect(style.border).toBe('none');
    });

    test('returns outline style when buttonStyle is outline', () => {
      const style = tokensToButtonStyle({ primaryColor: '#7B2D26', buttonStyle: 'outline' });
      expect(style.backgroundColor).toBe('transparent');
      expect(style.color).toBe('#7B2D26');
      expect(style.border).toContain('#7B2D26');
    });

    test('falls back to default primaryColor when token is missing', () => {
      const style = tokensToButtonStyle({});
      expect(style.backgroundColor).toBe('#7B2D26');
    });

    test('filled is the default when buttonStyle token is absent', () => {
      const style = tokensToButtonStyle({ primaryColor: '#123456' });
      expect(style.backgroundColor).toBe('#123456');
      expect(style.color).toBe('#ffffff');
    });
  });

  // ── tokensToProgressBarStyle ──────────────────────────────────────────────

  describe('tokensToProgressBarStyle', () => {
    test('returns primaryColor as backgroundColor', () => {
      const style = tokensToProgressBarStyle({ primaryColor: '#3b82f6' });
      expect(style.backgroundColor).toBe('#3b82f6');
    });

    test('falls back to default primaryColor when token is missing', () => {
      const style = tokensToProgressBarStyle({});
      expect(style.backgroundColor).toBe('#7B2D26');
    });
  });

});

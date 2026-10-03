import { TextDirection } from '@blocksuite/affine-model';
import { describe, expect, test } from 'vitest';

import {
  detectTextDirection,
  resolveTextDirection,
} from '../../utils/text-direction.js';

describe('resolveTextDirection', () => {
  test('block direction wins over the editor direction', () => {
    expect(resolveTextDirection(TextDirection.RTL, 'ltr')).toBe('rtl');
    expect(resolveTextDirection(TextDirection.LTR, 'none')).toBe('ltr');
    expect(resolveTextDirection(TextDirection.Auto, 'rtl')).toBe('auto');
  });

  test('falls back to the editor direction', () => {
    expect(resolveTextDirection(undefined, 'rtl')).toBe('rtl');
    expect(resolveTextDirection(null, 'auto')).toBe('auto');
    expect(resolveTextDirection(undefined, undefined)).toBeUndefined();
  });

  test('`none` renders no dir attribute', () => {
    expect(resolveTextDirection(undefined, 'none')).toBeUndefined();
  });
});

describe('detectTextDirection', () => {
  test('uses the first strong character', () => {
    expect(detectTextDirection('مرحبا Hello')).toBe('rtl');
    expect(detectTextDirection('Hello مرحبا')).toBe('ltr');
    expect(detectTextDirection('1. 2025 — שלום')).toBe('rtl');
    expect(detectTextDirection('✅ تم اعتماد')).toBe('rtl');
  });

  test('returns null without strong characters', () => {
    expect(detectTextDirection('')).toBeNull();
    expect(detectTextDirection('123 - 456 !')).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { parseDate, dateToFillStrategies } from '../date-parser.js';
import { normalizeQuestion, fuzzyMatchScore, matchProfileField, categorizeQuestion } from '../classifier.js';

describe('date parser', () => {
  it('parses present', () => {
    expect(parseDate('Present').isPresent).toBe(true);
    expect(parseDate('Current').isPresent).toBe(true);
  });

  it('parses ISO dates', () => {
    const d = parseDate('2021-06');
    expect(d.year).toBe(2021);
    expect(d.month).toBe(6);
  });

  it('parses month year', () => {
    const d = parseDate('June 2021');
    expect(d.year).toBe(2021);
    expect(d.month).toBe(6);
  });

  it('parses slash dates', () => {
    const d = parseDate('06/2021');
    expect(d.month).toBe(6);
    expect(d.year).toBe(2021);
  });

  it('generates fill strategies', () => {
    const strategies = dateToFillStrategies(parseDate('June 2021'), 'text-iso');
    expect(strategies[0].text).toBe('2021-06-01');
  });
});

describe('question normalizer', () => {
  it('normalizes punctuation', () => {
    expect(normalizeQuestion('Why do you want this job?')).toBe('why do you want this job');
  });
});

describe('field classifier', () => {
  it('matches profile fields', () => {
    expect(matchProfileField('Email Address')).toBe('email');
    expect(matchProfileField('LinkedIn Profile')).toBe('linkedinUrl');
  });

  it('fuzzy matches options', () => {
    expect(fuzzyMatchScore('United States', 'United States of America')).toBeGreaterThan(0.3);
  });

  it('categorizes questions', () => {
    expect(categorizeQuestion('Tell us about a time you led a team')).toBe('behavioral');
    expect(categorizeQuestion('Gender')).toBe('eeo');
  });
});

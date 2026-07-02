import { normalizeQuestion } from './date-parser.js';
import type { FieldType } from './types.js';

export { normalizeQuestion };

const PROFILE_FIELD_MAP: Record<string, string> = {
  'first name': 'firstName',
  'last name': 'lastName',
  'email': 'email',
  'email address': 'email',
  'phone': 'phone',
  'phone number': 'phone',
  'mobile phone': 'phone',
  'linkedin': 'linkedinUrl',
  'linkedin profile': 'linkedinUrl',
  'linkedin url': 'linkedinUrl',
  'github': 'githubUrl',
  'github url': 'githubUrl',
  'portfolio': 'portfolioUrl',
  'website': 'websiteUrl',
  'address': 'addressLine1',
  'address line 1': 'addressLine1',
  'city': 'city',
  'state': 'state',
  'zip': 'zipCode',
  'zip code': 'zipCode',
  'postal code': 'zipCode',
  'country': 'country',
  'pronouns': 'pronouns',
  'work authorization': 'workAuthorization',
  'authorized to work': 'workAuthorization',
  'legally authorized': 'workAuthorization',
  'require sponsorship': 'requiresSponsorship',
  'visa sponsorship': 'requiresSponsorship',
  'salary': 'salaryMin',
  'desired salary': 'salaryMin',
  'expected salary': 'salaryMin',
  'earliest start date': 'earliestStartDate',
  'start date': 'earliestStartDate',
  'willing to relocate': 'willingToRelocate',
};

export function classifyFieldType(
  tagName: string,
  inputType: string,
  role?: string,
  hasOptions?: boolean
): FieldType {
  const type = inputType.toLowerCase();
  const tag = tagName.toLowerCase();
  const r = role?.toLowerCase();

  if (type === 'file') return 'file';
  if (type === 'checkbox') return 'checkbox';
  if (type === 'radio') return 'radio';
  if (type === 'email') return 'email';
  if (type === 'tel') return 'phone';
  if (type === 'url') return 'url';
  if (type === 'date' || type === 'datetime-local') return 'date';
  if (type === 'number') return 'number';
  if (tag === 'select') return 'select';
  if (tag === 'textarea') return 'textarea';
  if (r === 'combobox') return 'combobox';
  if (hasOptions && tag === 'input') return 'combobox';
  if (type === 'text' || tag === 'input') return 'text';
  return 'unknown';
}

export function matchProfileField(label: string): string | null {
  const normalized = normalizeQuestion(label);
  if (PROFILE_FIELD_MAP[normalized]) return PROFILE_FIELD_MAP[normalized];

  for (const [key, field] of Object.entries(PROFILE_FIELD_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return field;
    }
  }
  return null;
}

export function fuzzyMatchScore(a: string, b: string): number {
  const na = normalizeQuestion(a);
  const nb = normalizeQuestion(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : overlap / union;
}

export function rankOptions(desired: string, options: string[]): { option: string; score: number }[] {
  return options
    .map((option) => ({ option, score: fuzzyMatchScore(desired, option) }))
    .sort((a, b) => b.score - a.score);
}

export function categorizeQuestion(label: string): string {
  const n = normalizeQuestion(label);
  if (/why (this )?(company|organization|wayfair|role|position)/.test(n)) return 'why-company';
  if (/tell us about|describe a time|give an example|behavioral/.test(n)) return 'behavioral';
  if (/cover letter/.test(n)) return 'cover-letter';
  if (/work authorization|sponsorship|visa/.test(n)) return 'work-auth';
  if (/salary|compensation/.test(n)) return 'salary';
  if (/diversity|gender|race|ethnicity|veteran|disability|eeo/.test(n)) return 'eeo';
  return 'misc';
}

export const SENSITIVE_CATEGORIES = new Set(['eeo']);

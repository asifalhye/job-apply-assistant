import type { Profile } from '@jaa/storage';

export function profileToSummary(profile: Profile): string {
  const lines: string[] = [];
  if (profile.firstName || profile.lastName) {
    lines.push(`Name: ${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim());
  }
  if (profile.email) lines.push(`Email: ${profile.email}`);
  if (profile.phone) lines.push(`Phone: ${profile.phone}`);
  if (profile.linkedinUrl) lines.push(`LinkedIn: ${profile.linkedinUrl}`);
  if (profile.githubUrl) lines.push(`GitHub: ${profile.githubUrl}`);
  if (profile.portfolioUrl) lines.push(`Portfolio: ${profile.portfolioUrl}`);
  if (profile.city || profile.state) {
    lines.push(`Location: ${[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}`);
  }
  if (profile.workAuthorization) lines.push(`Work authorization: ${profile.workAuthorization}`);
  if (profile.requiresSponsorship != null) {
    lines.push(`Requires sponsorship: ${profile.requiresSponsorship ? 'Yes' : 'No'}`);
  }
  if (profile.salaryMin || profile.salaryMax) {
    lines.push(`Salary range: ${profile.salaryMin ?? '?'} - ${profile.salaryMax ?? '?'}`);
  }
  if (profile.earliestStartDate) lines.push(`Earliest start: ${profile.earliestStartDate}`);
  return lines.join('\n');
}

export function getProfileFieldValue(profile: Profile, fieldKey: string): string | undefined {
  const val = (profile as Record<string, unknown>)[fieldKey];
  if (val == null) return undefined;
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
}

export const PROFILE_FIELD_LABELS: Record<string, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  linkedinUrl: 'LinkedIn',
  githubUrl: 'GitHub',
  portfolioUrl: 'Portfolio',
  websiteUrl: 'Website',
  addressLine1: 'Address',
  city: 'City',
  state: 'State',
  zipCode: 'Zip Code',
  country: 'Country',
  pronouns: 'Pronouns',
  workAuthorization: 'Work Authorization',
  requiresSponsorship: 'Requires Sponsorship',
  salaryMin: 'Minimum Salary',
  salaryMax: 'Maximum Salary',
  earliestStartDate: 'Earliest Start Date',
  willingToRelocate: 'Willing to Relocate',
};

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MONTH_MAP: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
  spring: 4, summer: 7, fall: 10, autumn: 10, winter: 1,
};

export function parseDate(input: string): import('./types.js').ParsedDate {
  const raw = input.trim();
  const lower = raw.toLowerCase();

  if (/^(present|current|now|ongoing)$/i.test(lower)) {
    return { raw, isPresent: true };
  }

  // YYYY-MM or YYYY-MM-DD
  const isoMatch = lower.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (isoMatch) {
    return {
      raw,
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10),
      day: isoMatch[3] ? parseInt(isoMatch[3], 10) : undefined,
    };
  }

  // MM/YYYY
  const monthYearSlash = lower.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYearSlash) {
    return {
      raw,
      month: parseInt(monthYearSlash[1], 10),
      year: parseInt(monthYearSlash[2], 10),
    };
  }

  // MM/DD/YYYY or MM/DD/YY
  const slashMatch = lower.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slashMatch) {
    const a = parseInt(slashMatch[1], 10);
    const b = parseInt(slashMatch[2], 10);
    if (slashMatch[3]) {
      const year = parseInt(slashMatch[3], 10);
      return { raw, month: a, day: b, year: year < 100 ? 2000 + year : year };
    }
    return { raw, month: a, year: b };
  }

  // Month Year e.g. June 2021
  const monthYearMatch = lower.match(/^([a-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const month = MONTH_MAP[monthYearMatch[1]];
    if (month) return { raw, month, year: parseInt(monthYearMatch[2], 10) };
  }

  // Year only
  const yearMatch = lower.match(/^(\d{4})$/);
  if (yearMatch) {
    return { raw, year: parseInt(yearMatch[1], 10) };
  }

  return { raw };
}

export function dateToFillStrategies(
  parsed: import('./types.js').ParsedDate,
  fieldType: 'month-year-select' | 'text-iso' | 'text-us' | 'workday-month-year' = 'text-iso'
): import('./types.js').DateFillStrategy[] {
  if (parsed.isPresent) {
    return [{ type: fieldType, text: 'Present', month: 'Present', year: 'Present' }];
  }

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const month = parsed.month ? String(parsed.month).padStart(2, '0') : undefined;
  const monthName = parsed.month ? monthNames[parsed.month] : undefined;
  const year = parsed.year ? String(parsed.year) : undefined;
  const day = parsed.day ? String(parsed.day).padStart(2, '0') : '01';

  const strategies: import('./types.js').DateFillStrategy[] = [];

  if (fieldType === 'text-iso' && year && month) {
    strategies.push({ type: 'text-iso', text: `${year}-${month}-${day}` });
  }
  if (fieldType === 'text-us' && year && month) {
    strategies.push({ type: 'text-us', text: `${month}/${day}/${year}` });
  }
  if ((fieldType === 'month-year-select' || fieldType === 'workday-month-year') && year) {
    strategies.push({
      type: fieldType,
      month: monthName ?? month,
      year,
    });
  }

  if (strategies.length === 0 && parsed.raw) {
    strategies.push({ type: fieldType, text: parsed.raw });
  }

  return strategies;
}

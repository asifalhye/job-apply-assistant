export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'url'
  | 'date'
  | 'number'
  | 'select'
  | 'combobox'
  | 'checkbox'
  | 'radio'
  | 'file'
  | 'multiselect'
  | 'unknown';

export interface ApplicationField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  section?: string;
  selector?: string;
  currentValue?: string;
  normalizedQuestion?: string;
}

export interface FillResult {
  success: boolean;
  value?: string;
  method?: string;
  confidence?: number;
  needsUserChoice?: boolean;
  options?: string[];
  error?: string;
}

export interface JobInfo {
  company?: string;
  roleTitle?: string;
  location?: string;
  description?: string;
}

export type AtsType = 'greenhouse' | 'ashby' | 'workday' | 'lever' | 'generic';

export interface ParsedDate {
  year?: number;
  month?: number;
  day?: number;
  isPresent?: boolean;
  raw: string;
}

export interface DateFillStrategy {
  type: 'month-year-select' | 'text-iso' | 'text-us' | 'workday-month-year';
  month?: string;
  year?: string;
  text?: string;
}

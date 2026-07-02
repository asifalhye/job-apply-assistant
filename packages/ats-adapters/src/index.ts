import type { Page } from 'playwright';
import type { ApplicationField, AtsType, FillResult, JobInfo } from '@jaa/form-engine';

export interface AtsAdapter {
  readonly type: AtsType;
  detect(page: Page, url: string): Promise<boolean>;
  extractJobInfo(page: Page): Promise<JobInfo>;
  extractFields(page: Page): Promise<ApplicationField[]>;
  fillField(page: Page, field: ApplicationField, value: string): Promise<FillResult>;
  uploadResume?(page: Page, filePath: string): Promise<FillResult>;
  getSubmitReadiness?(page: Page): Promise<{ ready: boolean; missing: string[] }>;
}

export function detectAtsType(url: string, pageContent?: string): AtsType {
  const u = url.toLowerCase();
  const content = (pageContent ?? '').toLowerCase();

  if (u.includes('greenhouse.io') || u.includes('boards.greenhouse') || content.includes('greenhouse')) {
    return 'greenhouse';
  }
  if (u.includes('ashbyhq.com') || u.includes('jobs.ashby') || content.includes('ashby')) {
    return 'ashby';
  }
  if (u.includes('myworkdayjobs.com') || u.includes('workday') || content.includes('workday')) {
    return 'workday';
  }
  if (u.includes('lever.co') || content.includes('lever')) {
    return 'lever';
  }
  return 'generic';
}

export async function fillTextInput(page: Page, selector: string, value: string): Promise<FillResult> {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout: 5000 });
    await el.fill(value);
    return { success: true, value, method: 'fill', confidence: 0.95 };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function fillCombobox(page: Page, selector: string, value: string): Promise<FillResult> {
  try {
    const el = page.locator(selector).first();
    await el.click();
    await el.fill(value);
    await page.waitForTimeout(300);
    const option = page.locator('[role="option"], .select__option, li').filter({ hasText: value }).first();
    if (await option.count()) {
      await option.click();
      return { success: true, value, method: 'combobox', confidence: 0.85 };
    }
    const partial = page.locator('[role="option"], .select__option, li').filter({ hasText: new RegExp(value, 'i') }).first();
    if (await partial.count()) {
      const text = await partial.textContent();
      await partial.click();
      return { success: true, value: text?.trim() ?? value, method: 'combobox-partial', confidence: 0.7 };
    }
    const options = await page.locator('[role="option"], .select__option, li').allTextContents();
    return { success: false, needsUserChoice: true, options: options.map((o) => o.trim()).filter(Boolean) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function fillNativeSelect(page: Page, selector: string, value: string): Promise<FillResult> {
  try {
    await page.locator(selector).first().selectOption({ label: value });
    return { success: true, value, method: 'select', confidence: 0.9 };
  } catch {
    try {
      await page.locator(selector).first().selectOption({ value });
      return { success: true, value, method: 'select-value', confidence: 0.85 };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }
}

export { GreenhouseAdapter } from './greenhouse.js';
export { AshbyAdapter } from './ashby.js';
export { WorkdayAdapter } from './workday.js';
export { LeverAdapter } from './lever.js';
export { GenericAdapter } from './generic.js';

import type { Page } from 'playwright';
import type { ApplicationField, FillResult, JobInfo } from '@jaa/form-engine';
import { classifyFieldType } from '@jaa/form-engine';
import type { AtsAdapter } from './index.js';
import { fillCombobox, fillTextInput } from './index.js';

export class WorkdayAdapter implements AtsAdapter {
  readonly type = 'workday' as const;

  static extractTenantId(url: string): string | null {
    const match = url.match(/myworkdayjobs\.com\/([^/]+)/i);
    return match?.[1] ?? null;
  }

  async detect(page: Page, url: string): Promise<boolean> {
    return url.includes('workday') || url.includes('myworkdayjobs');
  }

  async extractJobInfo(page: Page): Promise<JobInfo> {
    const roleTitle = await page.locator('[data-automation-id="jobPostingHeader"], h1, h2').first().textContent().catch(() => null);
    const company = await page.locator('[data-automation-id="company"], header').first().textContent().catch(() => null);
    return { roleTitle: roleTitle?.trim(), company: company?.trim()?.slice(0, 100) };
  }

  async extractFields(page: Page): Promise<ApplicationField[]> {
    const fields: ApplicationField[] = [];
    const inputs = page.locator('input, textarea, select, [role="combobox"], [data-automation-id*="formField"]');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      const type = await el.getAttribute('type') ?? 'text';
      if (type === 'hidden') continue;

      const tag = await el.evaluate((n) => (n as Element).tagName.toLowerCase());
      const role = await el.getAttribute('role') ?? undefined;
      const automationId = await el.getAttribute('data-automation-id');
      const ariaLabel = await el.getAttribute('aria-label') ?? automationId ?? `workday-field-${i}`;

      fields.push({
        id: automationId ?? `wd-${i}`,
        label: ariaLabel,
        type: classifyFieldType(tag, type, role),
        required: (await el.getAttribute('aria-required')) === 'true',
        selector: automationId ? `[data-automation-id="${automationId}"]` : undefined,
        section: await this.detectSection(page),
      });
    }
    return fields;
  }

  private async detectSection(page: Page): Promise<string> {
    const heading = await page.locator('h1, h2, [data-automation-id="progressBar"] + *').first().textContent().catch(() => 'Workday');
    return heading?.trim() ?? 'Workday';
  }

  async fillField(page: Page, field: ApplicationField, value: string): Promise<FillResult> {
    const selector = field.selector ?? `[aria-label="${field.label}"]`;
    if (field.type === 'combobox' || field.type === 'select') {
      return fillCombobox(page, selector, value);
    }
    return fillTextInput(page, selector, value);
  }

  async uploadResume(page: Page, filePath: string): Promise<FillResult> {
    const input = page.locator('input[type="file"], [data-automation-id*="file"]').first();
    if (!(await input.count())) return { success: false, error: 'No file input' };
    await input.setInputFiles(filePath);
    return { success: true, value: filePath, method: 'file-upload' };
  }

  async assistAccountFlow(page: Page, email: string, password?: string): Promise<{ step: string; needsManual: boolean; message: string }> {
    const signIn = page.locator('[data-automation-id="signInLink"], a:has-text("Sign In")');
    const createAccount = page.locator('[data-automation-id="createAccountLink"], a:has-text("Create Account")');

    if (await createAccount.count()) {
      await createAccount.first().click();
      return { step: 'create-account', needsManual: false, message: 'Navigated to account creation' };
    }
    if (await signIn.count()) {
      await signIn.first().click();
    }

    const emailField = page.locator('input[type="email"], [data-automation-id="email"]').first();
    if (await emailField.count()) {
      await emailField.fill(email);
    }
    if (password) {
      const pw = page.locator('input[type="password"]').first();
      if (await pw.count()) await pw.fill(password);
    }

    const captcha = page.locator('iframe[src*="captcha"], [class*="captcha"]');
    if (await captcha.count()) {
      return {
        step: 'verification',
        needsManual: true,
        message: 'CAPTCHA or verification detected. Complete manually, then click Resume in the app.',
      };
    }

    return { step: 'credentials-filled', needsManual: false, message: 'Credentials filled. Continue manually if needed.' };
  }
}

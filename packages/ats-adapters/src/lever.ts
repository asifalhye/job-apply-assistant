import type { Page } from 'playwright';
import type { ApplicationField, FillResult, JobInfo } from '@jaa/form-engine';
import { classifyFieldType } from '@jaa/form-engine';
import type { AtsAdapter } from './index.js';
import { fillTextInput } from './index.js';

export class LeverAdapter implements AtsAdapter {
  readonly type = 'lever' as const;

  async detect(page: Page, url: string): Promise<boolean> {
    return url.includes('lever.co') || (await page.locator('.application-form, .posting-header').count()) > 0;
  }

  async extractJobInfo(page: Page): Promise<JobInfo> {
    const roleTitle = await page.locator('.posting-headline h2, h2').first().textContent().catch(() => null);
    const company = await page.locator('.main-header-text, .posting-categories').first().textContent().catch(() => null);
    return { roleTitle: roleTitle?.trim(), company: company?.trim()?.slice(0, 100) };
  }

  async extractFields(page: Page): Promise<ApplicationField[]> {
    const fields: ApplicationField[] = [];
    const inputs = page.locator('.application-form input, .application-form textarea, .application-form select');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      const name = await el.getAttribute('name') ?? `lever-${i}`;
      const tag = await el.evaluate((n) => (n as Element).tagName.toLowerCase());
      const type = await el.getAttribute('type') ?? 'text';
      const label = await page.locator(`label[for="${name}"]`).textContent().catch(() => name) ?? name;

      fields.push({
        id: name,
        label: label.trim(),
        type: classifyFieldType(tag, type),
        required: (await el.getAttribute('required')) !== null,
        selector: `[name="${name}"]`,
        section: 'Lever Application',
      });
    }
    return fields;
  }

  async fillField(page: Page, field: ApplicationField, value: string): Promise<FillResult> {
    return fillTextInput(page, field.selector ?? `[name="${field.id}"]`, value);
  }

  async uploadResume(page: Page, filePath: string): Promise<FillResult> {
    const input = page.locator('input[type="file"][name="resume"], input[type="file"]').first();
    await input.setInputFiles(filePath);
    return { success: true, value: filePath, method: 'file-upload' };
  }
}

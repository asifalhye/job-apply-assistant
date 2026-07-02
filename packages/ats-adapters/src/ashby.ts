import type { Page } from 'playwright';
import type { ApplicationField, FillResult, JobInfo } from '@jaa/form-engine';
import { classifyFieldType } from '@jaa/form-engine';
import type { AtsAdapter } from './index.js';
import { fillCombobox, fillTextInput } from './index.js';

export class AshbyAdapter implements AtsAdapter {
  readonly type = 'ashby' as const;

  async detect(page: Page, url: string): Promise<boolean> {
    return url.includes('ashby') || (await page.locator('[class*="ashby"], form').count()) > 0;
  }

  async extractJobInfo(page: Page): Promise<JobInfo> {
    const roleTitle = await page.locator('h1').first().textContent().catch(() => null);
    const company = await page.locator('[class*="company"], header').first().textContent().catch(() => null);
    const description = await page.locator('[class*="job"], main').first().textContent().catch(() => null);
    return {
      roleTitle: roleTitle?.trim(),
      company: company?.trim()?.slice(0, 100),
      description: description?.trim()?.slice(0, 10000),
    };
  }

  async extractFields(page: Page): Promise<ApplicationField[]> {
    const fields: ApplicationField[] = [];
    const inputs = page.locator('form input, form textarea, form select, [role="combobox"]');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      const id = await el.getAttribute('id') ?? `ashby-${i}`;
      const name = await el.getAttribute('name') ?? id;
      const tag = await el.evaluate((n) => (n as Element).tagName.toLowerCase());
      const type = await el.getAttribute('type') ?? 'text';
      const role = await el.getAttribute('role') ?? undefined;
      const label = await el.getAttribute('aria-label')
        ?? await page.locator(`label[for="${id}"]`).textContent().catch(() => name)
        ?? name;

      fields.push({
        id: name,
        label: label.trim(),
        type: classifyFieldType(tag, type, role),
        required: (await el.getAttribute('required')) !== null,
        selector: `[name="${name}"], #${id}`,
        section: 'Ashby Application',
      });
    }
    return fields;
  }

  async fillField(page: Page, field: ApplicationField, value: string): Promise<FillResult> {
    const selector = field.selector ?? `[name="${field.id}"]`;
    if (field.type === 'combobox') return fillCombobox(page, selector, value);
    return fillTextInput(page, selector, value);
  }

  async uploadResume(page: Page, filePath: string): Promise<FillResult> {
    const input = page.locator('input[type="file"]').first();
    if (!(await input.count())) return { success: false, error: 'No file input' };
    await input.setInputFiles(filePath);
    return { success: true, value: filePath, method: 'file-upload' };
  }
}

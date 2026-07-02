import type { Page } from 'playwright';
import type { ApplicationField, FillResult, JobInfo } from '@jaa/form-engine';
import { classifyFieldType } from '@jaa/form-engine';
import type { AtsAdapter } from './index.js';
import { fillCombobox, fillNativeSelect, fillTextInput } from './index.js';

export class GreenhouseAdapter implements AtsAdapter {
  readonly type = 'greenhouse' as const;

  async detect(page: Page, url: string): Promise<boolean> {
    return url.includes('greenhouse') || (await page.locator('#application_form, .application--container').count()) > 0;
  }

  async extractJobInfo(page: Page): Promise<JobInfo> {
    const roleTitle = await page.locator('h1, .app-title').first().textContent().catch(() => null);
    const company = await page.locator('.company-name, [data-company-name]').first().textContent().catch(() => null);
    const location = await page.locator('.location, .job-location').first().textContent().catch(() => null);
    const description = await page.locator('#content, .content, .job-post').first().textContent().catch(() => null);
    return {
      roleTitle: roleTitle?.trim(),
      company: company?.trim(),
      location: location?.trim(),
      description: description?.trim()?.slice(0, 10000),
    };
  }

  async extractFields(page: Page): Promise<ApplicationField[]> {
    const fields: ApplicationField[] = [];
    const inputs = page.locator('#application_form input, #application_form textarea, #application_form select');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      const id = await el.getAttribute('id') ?? `field-${i}`;
      const name = await el.getAttribute('name') ?? id;
      const tag = await el.evaluate((n) => (n as Element).tagName.toLowerCase());
      const type = await el.getAttribute('type') ?? 'text';
      const required = await el.getAttribute('required') !== null;
      const ariaLabel = await el.getAttribute('aria-label');
      let label = ariaLabel ?? '';

      if (!label && id) {
        label = await page.locator(`label[for="${id}"]`).textContent().catch(() => '') ?? name;
      }

      const fieldType = classifyFieldType(tag, type);
      fields.push({
        id: name,
        label: label.trim() || name,
        type: fieldType,
        required,
        selector: `#${id}, [name="${name}"]`,
        section: 'Application',
      });
    }

    return fields;
  }

  async fillField(page: Page, field: ApplicationField, value: string): Promise<FillResult> {
    const selector = field.selector ?? `[name="${field.id}"]`;
    switch (field.type) {
      case 'select':
        return fillNativeSelect(page, selector, value);
      case 'combobox':
        return fillCombobox(page, selector, value);
      case 'checkbox':
        if (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true') {
          await page.locator(selector).check();
        }
        return { success: true, value, method: 'checkbox' };
      case 'radio':
        await page.locator(`${selector}[value="${value}"], label:has-text("${value}") input`).first().check().catch(async () => {
          await page.getByLabel(value, { exact: false }).first().check();
        });
        return { success: true, value, method: 'radio' };
      default:
        return fillTextInput(page, selector, value);
    }
  }

  async uploadResume(page: Page, filePath: string): Promise<FillResult> {
    const input = page.locator('input[type="file"]').first();
    if (!(await input.count())) return { success: false, error: 'No file input found' };
    await input.setInputFiles(filePath);
    return { success: true, value: filePath, method: 'file-upload', confidence: 0.95 };
  }

  async getSubmitReadiness(page: Page) {
    const required = page.locator('#application_form [required]');
    const missing: string[] = [];
    const count = await required.count();
    for (let i = 0; i < count; i++) {
      const el = required.nth(i);
      const val = await el.inputValue().catch(() => '');
      if (!val) {
        const id = await el.getAttribute('id');
        const label = id ? await page.locator(`label[for="${id}"]`).textContent() : 'Unknown';
        missing.push(label?.trim() ?? 'Unknown field');
      }
    }
    return { ready: missing.length === 0, missing };
  }
}

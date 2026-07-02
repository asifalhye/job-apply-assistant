import type { Page } from 'playwright';
import type { ApplicationField, FillResult, JobInfo } from '@jaa/form-engine';
import { classifyFieldType, SENSITIVE_CATEGORIES, categorizeQuestion } from '@jaa/form-engine';
import type { AtsAdapter } from './index.js';
import { fillCombobox, fillNativeSelect, fillTextInput } from './index.js';

export class GenericAdapter implements AtsAdapter {
  readonly type = 'generic' as const;

  async detect(): Promise<boolean> {
    return true;
  }

  async extractJobInfo(page: Page): Promise<JobInfo> {
    const roleTitle = await page.locator('h1').first().textContent().catch(() => null);
    return { roleTitle: roleTitle?.trim() };
  }

  async extractFields(page: Page): Promise<ApplicationField[]> {
    const fields: ApplicationField[] = [];
    const inputs = page.locator('form input, form textarea, form select, form [role="combobox"]');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      const type = await el.getAttribute('type') ?? 'text';
      if (type === 'hidden' || type === 'submit') continue;

      const tag = await el.evaluate((n) => (n as Element).tagName.toLowerCase());
      const role = await el.getAttribute('role') ?? undefined;
      const id = await el.getAttribute('id') ?? `generic-${i}`;
      const name = await el.getAttribute('name') ?? id;
      const label = await page.locator(`label[for="${id}"]`).textContent().catch(() => name) ?? name;

      fields.push({
        id: name,
        label: label.trim(),
        type: classifyFieldType(tag, type, role),
        required: (await el.getAttribute('required')) !== null,
        selector: `[name="${name}"], #${id}`,
      });
    }
    return fields;
  }

  async fillField(page: Page, field: ApplicationField, value: string): Promise<FillResult> {
    if (SENSITIVE_CATEGORIES.has(categorizeQuestion(field.label))) {
      return { success: false, error: 'Sensitive field requires explicit user answer', confidence: 0 };
    }

    const selector = field.selector ?? `[name="${field.id}"]`;
    switch (field.type) {
      case 'select':
        return fillNativeSelect(page, selector, value);
      case 'combobox':
        return fillCombobox(page, selector, value);
      default:
        return fillTextInput(page, selector, value);
    }
  }
}

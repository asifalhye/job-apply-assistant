import type { Page, Locator } from 'playwright';
import type { ApplicationField, FillResult, JobInfo } from '@jaa/form-engine';
import { classifyFieldType } from '@jaa/form-engine';
import type { AtsAdapter } from './index.js';
import { fillCombobox, fillNativeSelect, fillTextInput } from './index.js';

const FIELD_SELECTORS = [
  '#application_form input, #application_form textarea, #application_form select',
  '#application-form input, #application-form textarea, #application-form select',
  'form[action*="application"] input, form[action*="application"] textarea, form[action*="application"] select',
  'input[name*="job_application"], textarea[name*="job_application"], select[name*="job_application"]',
  '[data-testid*="application"] input, [data-testid*="application"] textarea, [data-testid*="application"] select',
].join(', ');

export class GreenhouseAdapter implements AtsAdapter {
  readonly type = 'greenhouse' as const;

  async detect(page: Page, url: string): Promise<boolean> {
    return (
      url.includes('greenhouse') ||
      (await page.locator('#application_form, #application-form, .application--container').count()) > 0
    );
  }

  async extractJobInfo(page: Page): Promise<JobInfo> {
    const url = page.url();
    const title = await page.title().catch(() => '');

    let company =
      (await page.locator('.company-name, [data-company-name]').first().textContent().catch(() => null))?.trim() ??
      parseCompanyFromTitle(title) ??
      parseCompanyFromUrl(url);

    const roleTitle =
      (await page.locator('h1, .app-title, [data-testid="job-title"]').first().textContent().catch(() => null))?.trim() ??
      parseRoleFromTitle(title);

    const location = (await page.locator('.location, .job-location, [data-testid="job-location"]').first().textContent().catch(() => null))?.trim();
    const description = (await page.locator('#content, .content, .job-post, main').first().textContent().catch(() => null))?.trim()?.slice(0, 10000);

    return { roleTitle, company, location, description };
  }

  async prepareApplicationPage(page: Page): Promise<void> {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle').catch(() => {});

    const applyHeading = page.getByText('Apply for this job', { exact: false }).first();
    if (await applyHeading.count()) {
      await applyHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
    }

    const applyControls = page.locator(
      'a[href*="#app"], a[href*="apply"], button:has-text("Apply"), a:has-text("Apply")'
    );
    if (await applyControls.count()) {
      await applyControls.first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(1200);
    }

    await page
      .waitForSelector(
        '#application_form, #application-form, input[name*="job_application"], input[name*="first_name"], form input[type="email"]',
        { timeout: 15000 }
      )
      .catch(() => {});
  }

  async extractFields(page: Page): Promise<ApplicationField[]> {
    await this.prepareApplicationPage(page);

    const inputs = page.locator(FIELD_SELECTORS);
    let count = await inputs.count();

    if (count === 0) {
      count = await page.locator('input:not([type="hidden"]), textarea, select').count();
      const generic = await this.extractFromLocator(
        page.locator('input:not([type="hidden"]), textarea, select'),
        count
      );
      if (generic.length > 0) return generic;
      return this.extractByAccessibleLabels(page);
    }

    const fields = await this.extractFromLocator(inputs, count);
    if (fields.length === 0) {
      return this.extractByAccessibleLabels(page);
    }
    return fields;
  }

  private async extractByAccessibleLabels(page: Page): Promise<ApplicationField[]> {
    const candidates = [
      'First Name', 'Last Name', 'Email', 'Phone', 'Country',
      'Resume', 'Cover Letter', 'LinkedIn', 'Website', 'Why',
    ];
    const fields: ApplicationField[] = [];

    for (const partial of candidates) {
      const control = page.getByLabel(partial, { exact: false }).first();
      if (!(await control.count())) continue;
      if (!(await control.isVisible().catch(() => false))) continue;

      const tag = await control.evaluate((n) => (n as Element).tagName.toLowerCase()).catch(() => 'input');
      const type = (await control.getAttribute('type')) ?? 'text';
      const name = (await control.getAttribute('name')) ?? (await control.getAttribute('id')) ?? partial;
      const fieldType = classifyFieldType(tag, type, await control.getAttribute('role') ?? undefined);

      fields.push({
        id: name,
        label: partial,
        type: fieldType,
        required: false,
        selector: `[name="${name}"]`,
        section: 'Application',
      });
    }

    return fields;

  private async extractFromLocator(inputs: Locator, count: number): Promise<ApplicationField[]> {
    const fields: ApplicationField[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;

      const type = (await el.getAttribute('type')) ?? 'text';
      if (type === 'hidden') continue;

      const id = await el.getAttribute('id');
      const name = await el.getAttribute('name') ?? id ?? `field-${i}`;
      const key = `${name}:${type}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const tag = await el.evaluate((n) => (n as Element).tagName.toLowerCase());
      const required =
        (await el.getAttribute('required')) !== null ||
        (await el.getAttribute('aria-required')) === 'true';

      const label = await this.resolveLabel(el, id, name);

      if (!label || label.length < 2) continue;
      if (/^search|^submit|^button/i.test(label)) continue;

      const fieldType = classifyFieldType(tag, type, await el.getAttribute('role') ?? undefined);
      const selector = id ? `[id="${id}"]` : `[name="${name}"]`;

      fields.push({
        id: name,
        label: label.trim(),
        type: fieldType,
        required,
        selector,
        section: 'Application',
      });
    }

    return fields;
  }

  private async resolveLabel(el: Locator, id: string | null, name: string): Promise<string> {
    const ariaLabel = await el.getAttribute('aria-label');
    if (ariaLabel?.trim()) return ariaLabel.trim();

    if (id) {
      const forLabel = await el.page().locator(`label[for="${id}"]`).first().textContent().catch(() => null);
      if (forLabel?.trim()) return forLabel.trim();
    }

    const parentLabel = await el.locator('xpath=ancestor::label[1]').textContent().catch(() => null);
    if (parentLabel?.trim()) return parentLabel.trim().slice(0, 200);

    const prevText = await el
      .locator('xpath=preceding-sibling::*[1]')
      .textContent()
      .catch(() => null);
    if (prevText?.trim() && prevText.length < 120) return prevText.trim();

    const placeholder = await el.getAttribute('placeholder');
    if (placeholder?.trim()) return placeholder.trim();

    return name.replace(/job_application\[|\]|_/g, ' ').trim() || name;
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
      case 'file':
        await page.locator(selector).first().setInputFiles(value);
        return { success: true, value, method: 'file-upload', confidence: 0.9 };
      default:
        return fillTextInput(page, selector, value);
    }
  }

  async uploadResume(page: Page, filePath: string): Promise<FillResult> {
    const resumeInput = page.locator(
      'input[type="file"][name*="resume"], input[type="file"][id*="resume"], input[type="file"]'
    ).first();
    if (!(await resumeInput.count())) return { success: false, error: 'No file input found' };
    await resumeInput.setInputFiles(filePath);
    return { success: true, value: filePath, method: 'file-upload', confidence: 0.95 };
  }

  async getSubmitReadiness(page: Page) {
    const required = page.locator('#application_form [required], #application-form [required], form [required]');
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

function parseCompanyFromUrl(url: string): string | undefined {
  const match = url.match(/greenhouse\.io\/([^/]+)\/jobs/i);
  if (!match) return undefined;
  return capitalizeSlug(match[1]);
}

function parseCompanyFromTitle(title: string): string | undefined {
  const match = title.match(/\bat\s+(.+?)(?:\s*[\|\-]|$)/i);
  return match?.[1]?.trim();
}

function parseRoleFromTitle(title: string): string | undefined {
  const match = title.match(/for\s+(.+?)\s+at\s+/i);
  return match?.[1]?.trim();
}

function capitalizeSlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audits', () => {
  test('Veil (unauthenticated) should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');
    
    // Wait for Veil content to stabilize
    await expect(page.locator('h1')).toHaveText('Slow Light');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      // We exclude the WebGL canvas from accessibility scans since it provides 
      // its own DOM-mirror fallback for screen readers.
      .exclude('canvas') 
      .analyze();

    // Verify there are no violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

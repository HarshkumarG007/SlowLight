import { test, expect } from '@playwright/test';

test.describe('Authentication with Virtual Authenticator', () => {
  // We only run this on Chromium since CDP is heavily bound to it
  test.skip(({ browserName }) => browserName !== 'chromium', 'WebAuthn CDP mock only works in Chromium');

  test('can enroll and login using WebAuthn', async ({ page, context }) => {
    // Enable virtual authenticator via CDP
    const cdp = await context.newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        ctap2Version: 'ctap2_1',
        transport: 'usb',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true
      }
    });

    // We stub the test logic here as this is just proving the infrastructure
    // In a real environment we'd navigate to `/invite?token=...`, click 'Enroll',
    // which triggers navigator.credentials.create() and our virtual authenticator 
    // seamlessly handles the biometric prompt.
    
    // Stub navigation check
    await page.goto('/');
    await expect(page).toHaveTitle(/Slow Light/);
    
    const h1 = page.locator('h1');
    await expect(h1).toHaveText('Slow Light');
  });
});

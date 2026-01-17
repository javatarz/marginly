import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');

    // Check page title and heading
    await expect(page.locator('h1')).toContainText('Book Reviews');

    // Check email input exists
    const emailInput = page.getByPlaceholder('you@example.com');
    await expect(emailInput).toBeVisible();

    // Check submit button exists
    const submitButton = page.getByRole('button', { name: 'Send login link' });
    await expect(submitButton).toBeVisible();
  });

  test('login form validates email', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByPlaceholder('you@example.com');
    const submitButton = page.getByRole('button', { name: 'Send login link' });

    // Submit empty form - browser validation should prevent
    await emailInput.fill('');
    await submitButton.click();

    // Email input should still be visible (form not submitted)
    await expect(emailInput).toBeVisible();
  });

  test('protected routes redirect to login', async ({ page }) => {
    // Try to access home page (protected)
    await page.goto('/');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin routes redirect to login', async ({ page }) => {
    await page.goto('/admin');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

});

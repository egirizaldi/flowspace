import { test, expect } from '@playwright/test';

test.describe('Authentication UI Flow (e2e)', () => {
  const uniqueId = Date.now();
  const testUser = {
    name: 'Browser Test User',
    email: `browser-${uniqueId}@flowspace-ui.internal`,
    password: 'UiSecurePassword123!',
  };

  test('should display links to login and register from the homepage', async ({ page }) => {
    await page.goto('/');

    const signInLink = page.getByRole('link', { name: 'Sign In' });
    await expect(signInLink).toBeVisible();

    const getStartedLink = page.getByRole('link', { name: /Get Started/i });
    await expect(getStartedLink).toBeVisible();
  });

  test('should show client validation errors on empty login submission', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid email address')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('should show client validation errors on empty register submission', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Name must be at least 2 characters')).toBeVisible();
    await expect(page.getByText('Invalid email address')).toBeVisible();
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  });

  test('should register a new user successfully and redirect', async ({ page }) => {
    await page.goto('/register');

    await page.locator('#name').fill(testUser.name);
    await page.locator('#email').fill(testUser.email);
    await page.locator('#password').fill(testUser.password);

    await page.getByRole('button', { name: 'Create Account' }).click();

    // After registration and auto-login, redirect to homepage occurs
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('should successfully log in with existing credentials and redirect to home', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email').fill(testUser.email);
    await page.locator('#password').fill(testUser.password);

    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('should render forgot password page and handle email submission', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();

    await page.locator('#email').fill(testUser.email);
    await page.getByRole('button', { name: 'Send Reset Link' }).click();

    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await expect(page.getByText('Return to sign in')).toBeVisible();
  });

  test('should render reset password page and show validation for weak password', async ({ page }) => {
    await page.goto('/reset-password?token=sample-test-token');

    await expect(page.getByRole('heading', { name: 'Set a new password' })).toBeVisible();

    // Fill weak password
    await page.locator('#newPassword').fill('weak');
    await page.getByRole('button', { name: 'Reset Password' }).click();

    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  });
});

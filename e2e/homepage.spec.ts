import { test, expect } from '@playwright/test';

test.describe('FlowSpace Homepage & System Integration', () => {
  test('should load the homepage and display brand title and workflows', async ({ page }) => {
    await page.goto('/');

    // Check brand header
    await expect(page.locator('header')).toContainText('FlowSpace');
    await expect(page.locator('header')).toContainText('v1.0.0-mvp');

    // Check hero headline
    await expect(page.locator('h1')).toContainText('Organize Work. Move Forward.');

    // Check project statuses section
    await expect(page.getByText('Default Project Workflow Statuses')).toBeVisible();
    await expect(page.getByText('Backlog', { exact: true })).toBeVisible();
    await expect(page.getByText('Todo', { exact: true })).toBeVisible();
    await expect(page.getByText('In Progress', { exact: true })).toBeVisible();
    await expect(page.getByText('In Review', { exact: true })).toBeVisible();
    await expect(page.getByText('Done', { exact: true })).toBeVisible();

    // Check backend integration status card
    await expect(page.getByText('Backend & Database Integration')).toBeVisible();
  });
});

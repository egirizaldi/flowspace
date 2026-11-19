import { test, expect } from '@playwright/test';

test.describe('Organization & Workspace UI Flow (e2e)', () => {
  const uniqueId = Date.now();
  const testUser = {
    name: 'Org UI Tester',
    email: `orgui-${uniqueId}@flowspace-e2e.internal`,
    password: 'UiSecurePassword123!',
  };

  const orgName = `Test Org ${uniqueId}`;
  const orgSlug = `test-org-${uniqueId}`;
  const wsName = `Engineering ${uniqueId}`;
  const wsSlug = `engineering-${uniqueId}`;

  test.beforeAll(async ({ browser }) => {
    // Register and authenticate user
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/register');
    await page.locator('#name').fill(testUser.name);
    await page.locator('#email').fill(testUser.email);
    await page.locator('#password').fill(testUser.password);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 10000 });
    await page.close();
  });

  test('should allow user to navigate to /organizations, create an organization, and create a workspace', async ({
    page,
  }) => {
    // Log in
    await page.goto('/login');
    await page.locator('#email').fill(testUser.email);
    await page.locator('#password').fill(testUser.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // 1. Navigate to /organizations
    await page.goto('/organizations');
    await expect(
      page.getByRole('heading', { name: 'Select Organization' }),
    ).toBeVisible();

    // 2. Open Create Organization modal
    await page.getByRole('button', { name: 'Create Organization' }).first().click();
    await expect(page.getByRole('heading', { name: 'Create Organization' })).toBeVisible();

    // 3. Fill and submit organization form
    await page.locator('#org-name').fill(orgName);
    await page.locator('#org-slug').fill(orgSlug);
    await page.locator('#org-desc').fill('E2E testing organization');
    await page.getByRole('button', { name: 'Create Organization' }).last().click();

    // 4. Verify redirected to Organization Overview (/[orgSlug])
    await expect(page).toHaveURL(new RegExp(`/${orgSlug}`), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: orgName })).toBeVisible();
    await expect(page.getByText(`/${orgSlug}`)).toBeVisible();

    // 5. Create a Workspace within the organization
    await page.getByRole('button', { name: 'Create Workspace' }).first().click();
    await expect(page.getByRole('heading', { name: 'Create Workspace' })).toBeVisible();

    await page.locator('#ws-name').fill(wsName);
    await page.locator('#ws-slug').fill(wsSlug);
    await page.locator('#ws-desc').fill('Main development workspace');
    await page.getByRole('button', { name: 'Create Workspace' }).last().click();

    // 6. Verify redirected to Workspace Overview (/[orgSlug]/[wsSlug])
    await expect(page).toHaveURL(new RegExp(`/${orgSlug}/${wsSlug}`), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: wsName })).toBeVisible();
    await expect(page.getByText(`/${orgSlug}/${wsSlug}`)).toBeVisible();

    // 7. Navigate to Workspace Settings
    await page.getByRole('button', { name: 'Workspace Settings' }).click();
    await expect(page).toHaveURL(new RegExp(`/${orgSlug}/${wsSlug}/settings`), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Workspace Settings' })).toBeVisible();

    // 8. Update workspace description
    const descInput = page.locator('#description');
    await descInput.fill('Updated workspace description');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Workspace settings updated successfully.')).toBeVisible();
  });
});

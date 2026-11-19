import { test, expect } from '@playwright/test';

test.describe('Project Management UI Flow (e2e)', () => {
  const uniqueId = Date.now();
  const testUser = {
    name: 'Project UI Tester',
    email: `projectui-${uniqueId}@flowspace-e2e.internal`,
    password: 'UiSecurePassword123!',
  };

  const orgName = `Org Proj ${uniqueId}`;
  const orgSlug = `org-proj-${uniqueId}`;
  const wsName = `Eng WS ${uniqueId}`;
  const wsSlug = `eng-ws-${uniqueId}`;
  const projectName = `Platform Core ${uniqueId}`;
  const projectKey = `PC${(uniqueId % 1000).toString().padStart(3, '0')}`;

  test.beforeAll(async ({ browser }) => {
    // Register test user
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/register');
    await page.locator('#name').fill(testUser.name);
    await page.locator('#email').fill(testUser.email);
    await page.locator('#password').fill(testUser.password);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 10000 });
    await page.close();
  });

  test('should allow user to create project, view overview, inspect default workflow stages, update settings, and archive/restore', async ({
    page,
  }) => {
    // 1. Log in
    await page.goto('/login');
    await page.locator('#email').fill(testUser.email);
    await page.locator('#password').fill(testUser.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // 2. Create organization
    await page.goto('/organizations');
    await page.getByRole('button', { name: 'Create Organization' }).first().click();
    await page.locator('#org-name').fill(orgName);
    await page.locator('#org-slug').fill(orgSlug);
    await page.getByRole('button', { name: 'Create Organization' }).last().click();
    await expect(page).toHaveURL(new RegExp(`/${orgSlug}`), { timeout: 10000 });

    // 3. Create workspace
    await page.getByRole('button', { name: 'Create Workspace' }).first().click();
    await page.locator('#ws-name').fill(wsName);
    await page.locator('#ws-slug').fill(wsSlug);
    await page.getByRole('button', { name: 'Create Workspace' }).last().click();
    await expect(page).toHaveURL(new RegExp(`/${orgSlug}/${wsSlug}`), { timeout: 10000 });

    // 4. Verify workspace overview shows empty projects state
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
    await expect(page.getByText('No projects created yet')).toBeVisible();

    // 5. Open Create Project modal
    await page.getByRole('button', { name: 'Create Project' }).first().click();
    await expect(page.getByRole('heading', { name: 'Create Project' })).toBeVisible();

    // 6. Fill in project details
    await page.locator('#proj-name').fill(projectName);
    await page.locator('#proj-key').fill(projectKey);
    await page.locator('#proj-desc').fill('Next generation core services and engine');
    await page.getByRole('button', { name: 'Create Project' }).last().click();

    // 7. Verify redirected to Project Overview (/[orgSlug]/[wsSlug]/[projectKey])
    await expect(page).toHaveURL(new RegExp(`/${orgSlug}/${wsSlug}/${projectKey}`), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
    await expect(page.getByText(`/${orgSlug}/${wsSlug}/${projectKey}`)).toBeVisible();

    // 8. Verify default workflow stages exist
    await expect(page.getByText('Workflow Stages', { exact: true })).toBeVisible();
    await expect(page.getByText('Backlog', { exact: true })).toBeVisible();
    await expect(page.getByText('In Progress', { exact: true })).toBeVisible();
    await expect(page.getByText('Done', { exact: true })).toBeVisible();

    // 9. Navigate to Project Settings
    await page.getByRole('button', { name: 'Project Settings' }).click();
    await expect(page).toHaveURL(new RegExp(`/${orgSlug}/${wsSlug}/${projectKey}/settings`), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Project Settings' })).toBeVisible();

    // 10. Update project description and lifecycle status
    await page.locator('#description').fill('Updated project description for testing');
    await page.locator('#status').selectOption('ACTIVE');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Project settings updated successfully.')).toBeVisible();

    // 11. Archive the project
    await page.getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByText('Project archived successfully.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible();

    // 12. Restore the project
    await page.getByRole('button', { name: 'Restore' }).click();
    await expect(page.getByText('Project restored successfully.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Archive' })).toBeVisible();

    // 13. Navigate back to Workspace Overview
    await page.goto(`/${orgSlug}/${wsSlug}`);
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
    await expect(page.getByText(projectKey).first()).toBeVisible();
  });
});

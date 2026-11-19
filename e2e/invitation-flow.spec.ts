import { test, expect } from '@playwright/test';

test.describe('Invitation Management UI & Acceptance Flow (e2e)', () => {
  const uniqueId = Date.now();
  const userA = {
    name: 'Inviter Alice',
    email: `alice-${uniqueId}@flowspace-e2e.internal`,
    password: 'Password123!',
  };
  const userB = {
    name: 'Invitee Bob',
    email: `bob-${uniqueId}@flowspace-e2e.internal`,
    password: 'Password123!',
  };

  const orgName = `Invite Test Org ${uniqueId}`;
  const orgSlug = `invite-test-org-${uniqueId}`;

  test('full invitation lifecycle: create invitation, display pending, accept invite as user B, and verify membership', async ({
    browser,
  }) => {
    // 1. Context A: User A registers and creates organization
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    await pageA.goto('http://localhost:3000/register');
    await pageA.locator('#name').fill(userA.name);
    await pageA.locator('#email').fill(userA.email);
    await pageA.locator('#password').fill(userA.password);
    await pageA.getByRole('button', { name: 'Create Account' }).click();
    await expect(pageA).toHaveURL('http://localhost:3000/', { timeout: 10000 });

    // Navigate to /organizations and create org
    await pageA.goto('http://localhost:3000/organizations');
    await pageA.getByRole('button', { name: 'Create Organization' }).first().click();
    await pageA.locator('#org-name').fill(orgName);
    await pageA.locator('#org-slug').fill(orgSlug);
    await pageA.locator('#org-desc').fill('E2E invitation testing org');
    await pageA.getByRole('button', { name: 'Create Organization' }).last().click();

    // Verify on org overview
    await expect(pageA).toHaveURL(new RegExp(`/${orgSlug}`), { timeout: 10000 });
    await expect(pageA.getByRole('heading', { name: orgName })).toBeVisible();

    // 2. Open Invite Member Modal
    await pageA.getByRole('button', { name: 'Invite Member' }).click();
    await expect(pageA.getByRole('heading', { name: `Invite to ${orgName}` })).toBeVisible();

    // Fill invitation form
    await pageA.locator('#invitee-email').fill(userB.email);
    await pageA.locator('#invitee-role').selectOption('MEMBER');
    await pageA.getByRole('button', { name: 'Send Invitation' }).click();

    // Wait for invitation link to be generated
    await expect(pageA.getByText('Invitation created successfully!')).toBeVisible({
      timeout: 10000,
    });

    const inviteLinkInput = pageA.locator('input[readonly]');
    const inviteLink = await inviteLinkInput.inputValue();
    expect(inviteLink).toContain('/invite?token=');

    // Close modal
    await pageA.getByRole('button', { name: 'Done' }).click();

    // Verify pending invitation shows in Pending Invitations section
    await expect(pageA.getByRole('heading', { name: /Pending Invitations/ })).toBeVisible();
    await expect(pageA.getByText(userB.email)).toBeVisible();

    // 3. Context B: User B registers and opens invitation link
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    await pageB.goto('http://localhost:3000/register');
    await pageB.locator('#name').fill(userB.name);
    await pageB.locator('#email').fill(userB.email);
    await pageB.locator('#password').fill(userB.password);
    await pageB.getByRole('button', { name: 'Create Account' }).click();
    await expect(pageB).toHaveURL('http://localhost:3000/', { timeout: 10000 });

    // User B navigates to the invitation link
    await pageB.goto(inviteLink);

    // Verify invitation card details
    await expect(pageB.getByRole('heading', { name: "You've Been Invited!" })).toBeVisible({
      timeout: 10000,
    });
    await expect(pageB.getByText(orgName)).toBeVisible();
    await expect(pageB.getByText(userA.name)).toBeVisible();
    await expect(pageB.getByText(userB.email).first()).toBeVisible();

    // Click Accept Invitation & Join
    await pageB.getByRole('button', { name: 'Accept Invitation & Join' }).click();

    // User B should be redirected to the organization overview
    await expect(pageB).toHaveURL(new RegExp(`/${orgSlug}`), { timeout: 10000 });
    await expect(pageB.getByRole('heading', { name: orgName })).toBeVisible();

    // Verify User B is listed under Organization Members
    await expect(pageB.getByText(userB.name).first()).toBeVisible();
    await expect(pageB.getByText(userB.email).first()).toBeVisible();

    // Cleanup contexts
    await contextA.close();
    await contextB.close();
  });
});

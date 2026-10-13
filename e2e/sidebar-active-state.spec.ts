/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { test, expect, Page } from './fixtures';

const TEST_USER = 'mifos';
const TEST_PASSWORD = 'password';
const TENANT_DEFAULT = 'default';
const API_BASE = '/api/v1';

async function loginWithMockedApi(page: Page) {
  await page.route('**/config.json*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ fineractApiUrl: API_BASE, defaultTenant: TENANT_DEFAULT }),
    });
  });
  await page.route(/\/api\/v1\//, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });
  await page.route('**/api/v1/authentication**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        username: TEST_USER,
        userId: 1,
        base64EncodedAuthenticationKey: 'YmFzZTY0',
        authenticated: true,
        officeId: 1,
        officeName: 'Head Office',
        roles: [{ id: 1, name: 'Super User', description: 'Super user' }],
        permissions: ['ALL_FUNCTIONS'],
      }),
    });
  });
  await page.route('**/api/v1/businessdate**', async (route) => {
    await route.fulfill({ json: [{ type: 'BUSINESS_DATE', date: [2026, 10, 2] }] });
  });

  // Nested client routes load the client and office before rendering. Keep those
  // requests in the mocked API so they cannot reach a real Fineract instance.
  await page.route(/\/api\/v1\/clients\/1(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        accountNo: 'TEST-CLIENT-001',
        externalId: 'TEST-CLIENT-001',
        status: { id: 300, code: 'clientStatusType.active', value: 'Active' },
        active: true,
        activationDate: [2026, 10, 2],
        firstname: 'Test',
        lastname: 'Client',
        displayName: 'Test Client',
        isStaff: false,
        officeId: 1,
        officeName: 'Test Office',
        timeline: { submittedOnDate: [2026, 10, 2], activatedOnDate: [2026, 10, 2] },
        legalForm: { id: 1, code: 'legalFormType.person', value: 'Person' },
        clientCollateralManagements: [],
        groups: [],
      }),
    });
  });

  await page.route(/\/api\/v1\/offices(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Test Office',
          nameDecorated: 'Test Office',
          externalId: 'TEST-OFFICE-001',
          openingDate: [2026, 10, 2],
          hierarchy: '.',
        },
      ]),
    });
  });

  await page.goto('/login');
  if (!page.url().includes('/dashboard')) {
    await page.locator('#tenantId').fill(TENANT_DEFAULT);
    await page.locator('#username').fill(TEST_USER);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/dashboard');
  }
}

/**
 * Routes that share their leading path with a sidebar link. Each is a nested page
 * where partial routerLinkActive matching used to mark the parent link as active too.
 */
const nestedRoutes = [
  { parentHref: '/clients', url: '/clients/create' },
  { parentHref: '/clients', url: '/clients/edit/1' },
  { parentHref: '/clients', url: '/clients/view/1' },
  { parentHref: '/clients', url: '/clients/1/identifiers/create' },
  { parentHref: '/clients', url: '/clients/1/identifiers/edit/1' },
  { parentHref: '/clients', url: '/clients/1/addresses/create' },
  { parentHref: '/clients', url: '/clients/1/addresses/edit/1' },
  { parentHref: '/clients', url: '/clients/1/family-members/create' },
  { parentHref: '/clients', url: '/clients/1/family-members/edit/1' },
  { parentHref: '/clients', url: '/clients/1/notes/create' },
  { parentHref: '/clients', url: '/clients/1/notes/edit/1' },
  { parentHref: '/clients', url: '/clients/1/documents/create' },
  { parentHref: '/clients', url: '/clients/1/documents/edit/1' },
  { parentHref: '/clients', url: '/clients/1/charges' },
  { parentHref: '/clients', url: '/clients/1/charges/create' },
  { parentHref: '/clients', url: '/clients/1/collaterals' },
  { parentHref: '/clients', url: '/clients/1/collaterals/create' },
  { parentHref: '/clients', url: '/clients/1/collaterals/edit/1' },
  { parentHref: '/clients', url: '/clients/1/transactions' },
  { parentHref: '/groups', url: '/groups/create' },
  { parentHref: '/groups', url: '/groups/view/1' },
  { parentHref: '/groups', url: '/groups/1/notes/create' },
  { parentHref: '/centers', url: '/centers/create' },
  { parentHref: '/centers', url: '/centers/view/1' },
  { parentHref: '/centers', url: '/centers/1/notes/create' },
  { parentHref: '/loans', url: '/loans/create' },
  { parentHref: '/loans', url: '/loans/view/1' },
  { parentHref: '/loans', url: '/loans/1/charges' },
  { parentHref: '/loans', url: '/loans/1/charges/add' },
  { parentHref: '/loans', url: '/loans/1/rescheduling' },
  { parentHref: '/loans', url: '/loans/1/rescheduling/create' },
  { parentHref: '/loans', url: '/loans/1/collateral' },
  { parentHref: '/loans', url: '/loans/1/collateral/create' },
  { parentHref: '/loans', url: '/loans/1/collateral/edit/1' },
  { parentHref: '/loans', url: '/loans/1/transactions/chargeRefund' },
  { parentHref: '/loans', url: '/loans/1/transactions/repayment' },
  { parentHref: '/loans', url: '/loans/1/guarantors' },
  { parentHref: '/loans', url: '/loans/1/guarantors/create' },
  { parentHref: '/loans', url: '/loans/1/guarantors/edit/1' },
  { parentHref: '/loans', url: '/loans/1/interest-pauses' },
  { parentHref: '/loans', url: '/loans/1/interest-pauses/create' },
  { parentHref: '/loans', url: '/loans/1/interest-pauses/edit/1' },
  { parentHref: '/loans', url: '/loans/1/post-dated-checks' },
  { parentHref: '/loans', url: '/loans/1/post-dated-checks/edit/1' },
  {
    parentHref: '/transfers/standing-instructions',
    url: '/transfers/standing-instructions/history',
  },
  { parentHref: '/working-capital/loans', url: '/working-capital/loans/account-locks' },
  { parentHref: '/working-capital/loans', url: '/working-capital/loans/cob-catchup' },
  { parentHref: '/accounting/chart-of-accounts', url: '/accounting/chart-of-accounts/create' },
  { parentHref: '/accounting/journal-entries', url: '/accounting/journal-entries/create' },
  { parentHref: '/security/users', url: '/security/users/create' },
  { parentHref: '/security/roles', url: '/security/roles/create' },
  { parentHref: '/settings/holidays', url: '/settings/holidays/create' },
  { parentHref: '/organization/offices', url: '/organization/offices/create' },
  { parentHref: '/organization/funds', url: '/organization/funds/create' },
  { parentHref: '/system/data-tables', url: '/system/data-tables/create' },
];

test.describe('Sidebar active route matching', () => {
  test('does not mark a parent sidebar link active on nested routes', async ({ page }) => {
    await loginWithMockedApi(page);
    test.setTimeout(120_000);

    const sidebar = page.locator('nav.sidebar');
    for (const { parentHref, url } of nestedRoutes) {
      page.on('response', async (response) => {
        if (response.url().includes('/api/v1/') && response.status() >= 400) {
          console.log('API error:', response.status(), response.url());
          console.log('Response body:', await response.text().catch(() => '<unavailable>'));
        }
      });

      await page.goto(url);
      await expect(page).toHaveURL(new RegExp(`${url}$`));

      const parentLink = sidebar.locator(`a[href="${parentHref}"]`);
      await expect(parentLink).toHaveCount(1);
      await expect(parentLink, `${url} should not activate ${parentHref}`).not.toHaveClass(
        /\bactive\b/,
      );
    }
  });
});

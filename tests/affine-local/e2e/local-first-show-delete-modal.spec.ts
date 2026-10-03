import { test } from '@affine-test/kit/playwright';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  clickPageMoreActions,
  getBlockSuiteEditorTitle,
  getPageByTitle,
  getPageOperationButton,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { getCurrentDocIdFromUrl } from '@affine-test/kit/utils/url';
import { expect } from '@playwright/test';

test('New a page ,then open it, delete it and undo', async ({
  page,
  workspace,
}) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  await getBlockSuiteEditorTitle(page).click();
  await getBlockSuiteEditorTitle(page).fill('this is a new page to delete');
  await page.getByTestId('all-pages').click();
  const cell = await getPageByTitle(page, 'this is a new page to delete');
  await expect(cell).toBeVisible();

  await cell.click();
  await clickPageMoreActions(page);
  const deleteBtn = page.getByTestId('editor-option-menu-delete');
  await deleteBtn.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Moved to trash')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByTestId('all-pages').click();
  await expect(
    getPageByTitle(page, 'this is a new page to delete')
  ).toBeVisible();
  const currentWorkspace = await workspace.current();

  expect(currentWorkspace.meta.flavour).toContain('local');
});

test('New a page ,then go to all pages, delete it and undo', async ({
  page,
  workspace,
}) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  await getBlockSuiteEditorTitle(page).click();
  await getBlockSuiteEditorTitle(page).fill('this is a new page to delete');
  const newPageId = getCurrentDocIdFromUrl(page);
  await page.getByTestId('all-pages').click();
  const cell = await getPageByTitle(page, 'this is a new page to delete');
  await expect(cell).toBeVisible();

  await getPageOperationButton(page, newPageId).click();
  const deleteBtn = page.getByTestId('doc-list-operation-trash');
  await deleteBtn.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Moved to trash')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByTestId('all-pages').click();
  await expect(
    getPageByTitle(page, 'this is a new page to delete')
  ).toBeVisible();
  const currentWorkspace = await workspace.current();

  expect(currentWorkspace.meta.flavour).toContain('local');
});

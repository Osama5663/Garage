import { test, expect } from '@playwright/test'

const login = async (page, username, password) => {
  await page.goto('/')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: 'Déconnexion' })).toBeVisible()
}

test('create delivery note from an existing job order', async ({ page }) => {
  await login(page, 'admin', 'admin123')

  await page.goto('/delivery-notes/new')
  await expect(page.getByText("Sélection de l'ordre de réparation")).toBeVisible()
  const optionCount = await page.locator('select option').count()
  expect(optionCount).toBeGreaterThan(1)

  await page.getByRole('button', { name: 'Créer le bon de livraison' }).click()
  await expect(page).toHaveURL(/\/delivery-notes\/.+/)
  await expect(page.getByRole('heading', { name: /#BL-\d{4}-\d{4}/ })).toBeVisible()
})

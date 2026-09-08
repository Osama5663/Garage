import { test, expect } from '@playwright/test'

const login = async (page, username, password) => {
  await page.goto('/')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: 'Déconnexion' })).toBeVisible()
}

test('mechanic cannot access admin-only screens', async ({ page }) => {
  await login(page, 'mechanic1', 'mechanic123')
  await expect(page.getByRole('link', { name: 'Paramètres' })).toHaveCount(0)
  await page.goto('/users')
  await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible()
})

test('admin can access admin-only screens', async ({ page }) => {
  await login(page, 'admin', 'admin123')
  await page.goto('/users')
  await expect(page.getByRole('heading', { name: 'Gestion des utilisateurs' })).toBeVisible()
})

import { test, expect } from '@playwright/test'

const login = async (page, username, password) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Garage Management System' })).toBeVisible()
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: 'Déconnexion' })).toBeVisible()
}

test('rejects invalid credentials', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('wrong')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Login Error')).toBeVisible()
  await expect(page.getByText('Invalid username or password')).toBeVisible()
})

test('login and logout as admin', async ({ page }) => {
  await login(page, 'admin', 'admin123')
  await page.getByRole('button', { name: 'Déconnexion' }).click()
  await expect(page.getByRole('heading', { name: 'Garage Management System' })).toBeVisible()
})

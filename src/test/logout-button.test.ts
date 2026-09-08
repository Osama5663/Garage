import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(__dirname, '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')

{
  const src = read('components/TopNavigation.tsx')
  console.assert(/useAuthStore/.test(src), 'TopNavigation should import useAuthStore')
  console.assert(/onClick=\{logout\}/.test(src), 'Logout button should call logout')
  console.assert(/t\('nav\.logout'\)/.test(src), 'Logout button should use i18n label')
}

{
  const i18n = read('i18n.ts')
  console.assert(/nav:\s*\{[\s\S]*logout:/.test(i18n), 'i18n should define nav.logout')
}

console.log('Logout button tests passed')


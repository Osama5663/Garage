import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type LangState = {
  language: 'fr'
  locale: 'fr-FR'
  currency: 'MAD' | 'EUR' | 'USD' | 'GBP'
  setLanguage: (language: 'fr') => void
  setLocale: (locale: 'fr-FR') => void
  setCurrency: (currency: 'MAD' | 'EUR' | 'USD' | 'GBP') => void
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      language: 'fr',
      locale: 'fr-FR',
      currency: 'MAD',
      setLanguage: (language) => set(() => ({ language })),
      setLocale: (locale) => set(() => ({ locale })),
      setCurrency: (currency) => set(() => ({ currency })),
    }),
    { name: 'garage-lang-settings' }
  )
)

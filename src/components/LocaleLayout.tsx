"use client"

import React, { createContext, useContext, useEffect } from "react"
import { useParams, useNavigate, useLocation, Outlet, Navigate } from "react-router-dom"
import i18n from "../i18n"

export type Locale = "en" | "ar"

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LocaleLayout")
  }
  return context
}

/** Get path with locale prefix, e.g. /en/login */
export function useLocalizedPath(): (path: string) => string {
  const { locale } = useLanguage()
  return (path: string) => {
    const clean = path.replace(/^\/(en|ar)(\/|$)/, "$2") || "/"
    const normalized = clean.startsWith("/") ? clean : `/${clean}`
    return `/${locale}${normalized === "/" ? "" : normalized}`
  }
}

/** Navigate to a path with current locale prefix */
export function useLocalizedNavigate() {
  const navigate = useNavigate()
  const getPath = useLocalizedPath()
  return (path: string, options?: { replace?: boolean; state?: unknown }) => {
    navigate(getPath(path), options)
  }
}

const VALID_LOCALES: Locale[] = ["en", "ar"]
const LOCALE_STORAGE_KEY = "speech-skills-locale"

function getStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    return stored === "en" || stored === "ar" ? stored : null
  } catch {
    return null
  }
}

export function LocaleLayout() {
  const { locale: paramLocale } = useParams<{ locale: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const locale = (VALID_LOCALES.includes(paramLocale as Locale) ? paramLocale : getStoredLocale() || "en") as Locale

  useEffect(() => {
    if (paramLocale && !VALID_LOCALES.includes(paramLocale as Locale)) {
      const preferredLocale = getStoredLocale() || "en"
      const pathWithoutLocale = location.pathname.replace(/^\/(en|ar)/, "") || location.pathname
      const cleanPath = pathWithoutLocale.startsWith("/") ? pathWithoutLocale : `/${pathWithoutLocale}`
      navigate(`/${preferredLocale}${cleanPath === "/" ? "" : cleanPath}`, { replace: true })
    }
  }, [paramLocale, navigate, location.pathname])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
    i18n.changeLanguage(locale)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      /* ignore */
    }
  }, [locale])

  const setLocale = (newLocale: Locale) => {
    const pathWithoutLocale = location.pathname.replace(/^\/(en|ar)/, "") || "/"
    const newPath = `/${newLocale}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}`
    navigate(newPath)
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      <Outlet />
    </LanguageContext.Provider>
  )
}

/** Navigate to a path with current locale - use inside LocaleLayout */
export function LocalizedNavigate({ to, replace = false, state }: { to: string; replace?: boolean; state?: unknown }) {
  const { locale } = useLanguage()
  const path = to.startsWith("/") ? `/${locale}${to === "/" ? "" : to}` : `/${locale}/${to}`
  return <Navigate to={path} replace={replace} state={state} />
}

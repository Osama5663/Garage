import React from 'react'
import { useLocation } from 'react-router-dom'
import { logNavigation } from '../utils/currencyLogger'

export const RouteLogger: React.FC = () => {
  const location = useLocation()
  React.useEffect(() => {
    logNavigation(location.pathname)
  }, [location.pathname])
  return null
}


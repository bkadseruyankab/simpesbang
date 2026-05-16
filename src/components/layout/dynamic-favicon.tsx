'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

export function DynamicFavicon() {
  const { data: settings } = useQuery({
    queryKey: ['app-favicon'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan')
      return res.json()
    },
    staleTime: 60000,
  })

  useEffect(() => {
    if (settings?.app_favicon) {
      // Update favicon dynamically
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = settings.app_favicon
    }

    if (settings?.app_name) {
      document.title = settings.app_name
    }
  }, [settings?.app_favicon, settings?.app_name])

  return null
}

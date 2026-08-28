import { useEffect } from 'react'

export function useDynamicFavicon(url: string | undefined | null) {
  useEffect(() => {
    if (!url) return
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    link.type = ''
    link.href = url
  }, [url])
}

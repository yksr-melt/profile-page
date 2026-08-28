import { useEffect, useState } from 'react'

let counted = false

export function useVisitCounter() {
  const [visits, setVisits] = useState<number | null>(null)

  useEffect(() => {
    const shouldCount = !counted
    counted = true

    fetch('/api/stats/visits', { method: shouldCount ? 'POST' : 'GET' })
      .then((res) => res.json())
      .then((data) => setVisits(data.visits))
      .catch(() => {})
  }, [])

  return visits
}

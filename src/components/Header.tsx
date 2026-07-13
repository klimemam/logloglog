import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/** スクロールすると縮んで固定される大タイトルヘッダー(iOS Large Title風) */
export function Header({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 28)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className={`app-header sticky${compact ? ' compact' : ''}`}>
      <h1>{title}</h1>
      {subtitle && <div className="date">{subtitle}</div>}
    </header>
  )
}

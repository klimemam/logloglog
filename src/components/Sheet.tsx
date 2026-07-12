import { useEffect, useState } from 'react'

/** 下からスライドして出るボトムシート。open の切り替えで開閉アニメーションする */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}) {
  const [render, setRender] = useState(open)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (open) {
      setRender(true)
      // マウント直後にクラスを付けるとtransitionが走らないため2フレーム待つ
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(raf)
    }
    setShown(false)
    const t = setTimeout(() => setRender(false), 300)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!render) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [render])

  if (!render) return null
  return (
    <div className={`sheet-overlay${shown ? ' open' : ''}`} onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">{title}</div>
        {children}
      </div>
    </div>
  )
}

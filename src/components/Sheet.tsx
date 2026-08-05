import { useEffect, useRef, useState } from 'react'

/**
 * 下からスライドして出るボトムシート。
 * ハンドル/タイトル部分を下にスワイプすると閉じられる(モダンなシートの標準操作)。
 */
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
  const sheetRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; dy: number } | null>(null)

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

  // Escapeで閉じる。開いている間はhistoryを1つ積み、Androidの戻るキーでも
  // アプリを離脱せずシートだけ閉じるようにする
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onPop = () => onClose()
    document.addEventListener('keydown', onKey)
    history.pushState({ sheet: true }, '')
    window.addEventListener('popstate', onPop)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('popstate', onPop)
      // 自分が積んだ履歴が残っていれば戻しておく(閉じるボタン経由のとき)
      if (history.state?.sheet) history.back()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onGrabDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, dy: 0 }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onGrabMove = (e: React.PointerEvent) => {
    if (!drag.current || !sheetRef.current) return
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY)
    sheetRef.current.style.transition = 'none'
    sheetRef.current.style.transform = `translateY(${drag.current.dy}px)`
  }
  const onGrabUp = () => {
    if (!drag.current || !sheetRef.current) return
    const { dy } = drag.current
    drag.current = null
    sheetRef.current.style.transition = ''
    sheetRef.current.style.transform = ''
    if (dy > 90) onClose()
  }

  if (!render) return null
  return (
    <div className={`sheet-overlay${shown ? ' open' : ''}`} onClick={onClose}>
      <div ref={sheetRef} className="sheet" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <div
          className="sheet-grab"
          onPointerDown={onGrabDown}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabUp}
          onPointerCancel={onGrabUp}
        >
          <div className="sheet-handle" />
          <div className="sheet-title">{title}</div>
        </div>
        {children}
      </div>
    </div>
  )
}

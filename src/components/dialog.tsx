/**
 * OS標準のconfirm()/alert()の置き換え。
 * appConfirm()/appAlert()はどこからでも呼べるPromiseベースのAPIで、
 * App直下の<DialogHost/>がアプリのデザインで描画する。
 */
import { useEffect, useState } from 'react'
import { t } from '../lib/i18n'

interface DialogRequest {
  message: string
  confirmLabel?: string
  /** 「キャンセル」以外の選択肢を出したいとき(例:「✓した分だけ」) */
  cancelLabel?: string
  danger?: boolean
  alertOnly?: boolean
  resolve: (ok: boolean) => void
}

let current: DialogRequest | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((cb) => cb())

export const appConfirm = (
  message: string,
  opts?: { confirmLabel?: string; cancelLabel?: string; danger?: boolean },
): Promise<boolean> =>
  new Promise((resolve) => {
    current = { message, ...opts, resolve }
    notify()
  })

export const appAlert = (message: string): Promise<boolean> =>
  new Promise((resolve) => {
    current = { message, alertOnly: true, resolve }
    notify()
  })

export function DialogHost() {
  const [, force] = useState(0)
  useEffect(() => {
    const cb = () => force((n) => n + 1)
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  }, [])

  const req = current
  if (!req) return null
  const close = (ok: boolean) => {
    current = null
    force((n) => n + 1)
    req.resolve(ok)
  }
  return (
    <div className="dialog-overlay" onClick={() => close(false)}>
      <div className="dialog" role="alertdialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <p className="dialog-message">{req.message}</p>
        <div className="dialog-actions">
          {!req.alertOnly && (
            <button className="secondary-btn" onClick={() => close(false)}>
              {req.cancelLabel ?? t('キャンセル')}
            </button>
          )}
          <button
            className={`primary-btn${req.danger ? ' dialog-danger' : ''}`}
            onClick={() => close(true)}
          >
            {req.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}

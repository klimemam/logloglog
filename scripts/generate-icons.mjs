// PWAアイコンを依存ライブラリなしで生成する(青い角丸背景 + 右肩上がりの3本バー)
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function writePng(path, size, draw) {
  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 4)
    raw[row] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x + 0.5, y + 0.5, size)
      const i = row + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  writeFileSync(path, png)
  console.log(`wrote ${path} (${size}x${size})`)
}

// 角丸四角の内側かどうか(smoothstepでアンチエイリアス)
const roundedRect = (x, y, x0, y0, x1, y1, r) => {
  const cx = Math.max(x0 + r, Math.min(x, x1 - r))
  const cy = Math.max(y0 + r, Math.min(y, y1 - r))
  const d = Math.hypot(x - cx, y - cy)
  return Math.max(0, Math.min(1, r - d + 0.5))
}

const BG = [42, 120, 214] // #2a78d6
const BAR = [255, 255, 255]

function drawIcon(x, y, size, { fullBleed }) {
  const u = size / 100 // 100単位の座標系で描く
  // 背景: フルブリード(maskable)か、80%の角丸タイル
  let bgA
  if (fullBleed) {
    bgA = 1
  } else {
    bgA = roundedRect(x, y, 2 * u, 2 * u, 98 * u, 98 * u, 22 * u)
  }
  // 3本の右肩上がりバー(セーフゾーン内)
  const bars = [
    { x0: 26, h: 22 },
    { x0: 44, h: 36 },
    { x0: 62, h: 52 },
  ]
  const base = 74
  let fg = 0
  for (const b of bars) {
    fg = Math.max(
      fg,
      roundedRect(x, y, b.x0 * u, (base - b.h) * u, (b.x0 + 12) * u, base * u, 4 * u),
    )
  }
  const r = BAR[0] * fg + BG[0] * (1 - fg)
  const g = BAR[1] * fg + BG[1] * (1 - fg)
  const bl = BAR[2] * fg + BG[2] * (1 - fg)
  return [Math.round(r), Math.round(g), Math.round(bl), Math.round(bgA * 255)]
}

writePng(join(OUT, 'icon-192.png'), 192, (x, y, s) => drawIcon(x, y, s, { fullBleed: false }))
writePng(join(OUT, 'icon-512.png'), 512, (x, y, s) => drawIcon(x, y, s, { fullBleed: false }))
writePng(join(OUT, 'icon-maskable-512.png'), 512, (x, y, s) => drawIcon(x, y, s, { fullBleed: true }))

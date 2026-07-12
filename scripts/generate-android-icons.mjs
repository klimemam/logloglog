// Androidランチャーアイコンを生成する(generate-icons.mjsと同じ描画ロジック)
// - ic_launcher / ic_launcher_round: 青い角丸/丸タイル+白バー
// - ic_launcher_foreground: アダプティブアイコン用(全面キャンバスの中央66%が
//   セーフゾーンなので、バーを中央に小さめに描く。背景色はres/valuesで指定)
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RES = join(dirname(fileURLToPath(import.meta.url)), '..', 'android', 'app', 'src', 'main', 'res')

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
    raw[row] = 0
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
  ihdr[8] = 8
  ihdr[9] = 6
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
  console.log(`wrote ${path}`)
}

const roundedRect = (x, y, x0, y0, x1, y1, r) => {
  const cx = Math.max(x0 + r, Math.min(x, x1 - r))
  const cy = Math.max(y0 + r, Math.min(y, y1 - r))
  const d = Math.hypot(x - cx, y - cy)
  return Math.max(0, Math.min(1, r - d + 0.5))
}

const BG = [42, 120, 214]
const BAR = [255, 255, 255]

// 100単位座標系でバー3本を描く(スケールとオフセットを指定できる)
const barsAlpha = (x, y, u, scale = 1, cx = 50, cy = 50) => {
  const s = (v) => (v - 50) * scale + (v === undefined ? 0 : 0) // unused helper
  const bars = [
    { x0: 26, h: 22 },
    { x0: 44, h: 36 },
    { x0: 62, h: 52 },
  ]
  const base = 74
  let fg = 0
  for (const b of bars) {
    const bx0 = cx + (b.x0 - 50) * scale
    const bx1 = cx + (b.x0 + 12 - 50) * scale
    const by1 = cy + (base - 50) * scale
    const by0 = cy + (base - b.h - 50) * scale
    fg = Math.max(fg, roundedRect(x, y, bx0 * u, by0 * u, bx1 * u, by1 * u, 4 * scale * u))
  }
  return fg
}

const mix = (fg, bgA) => {
  const r = BAR[0] * fg + BG[0] * (1 - fg)
  const g = BAR[1] * fg + BG[1] * (1 - fg)
  const b = BAR[2] * fg + BG[2] * (1 - fg)
  return [Math.round(r), Math.round(g), Math.round(b), Math.round(bgA * 255)]
}

// 通常アイコン: 角丸タイル
const drawSquare = (x, y, size) => {
  const u = size / 100
  const bgA = roundedRect(x, y, 2 * u, 2 * u, 98 * u, 98 * u, 18 * u)
  return mix(barsAlpha(x, y, u), bgA)
}
// 丸アイコン
const drawRound = (x, y, size) => {
  const u = size / 100
  const d = Math.hypot(x - 50 * u, y - 50 * u)
  const bgA = Math.max(0, Math.min(1, 48 * u - d + 0.5))
  return mix(barsAlpha(x, y, u, 0.82), bgA)
}
// アダプティブ前景: 背景は透明、バーだけ中央セーフゾーン(66%)内に
const drawForeground = (x, y, size) => {
  const u = size / 100
  const fg = barsAlpha(x, y, u, 0.5)
  return [255, 255, 255, Math.round(fg * 255)]
}

const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
for (const [dpi, size] of Object.entries(densities)) {
  const dir = join(RES, `mipmap-${dpi}`)
  writePng(join(dir, 'ic_launcher.png'), size, drawSquare)
  writePng(join(dir, 'ic_launcher_round.png'), size, drawRound)
  // 前景はランチャーアイコンの2.25倍キャンバス(108dp基準)
  writePng(join(dir, 'ic_launcher_foreground.png'), Math.round(size * 2.25), drawForeground)
}
console.log('android icons done')

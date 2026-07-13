// Androidスプラッシュ画像を生成する(Capacitorの既定スプラッシュを置き換える)
// 青背景の全面 + 中央に白バーのロゴ。背景は行バッファの複製で高速に埋め、
// ロゴ周辺のバウンディングボックスだけピクセル計算する。
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

const BG = [42, 120, 214]
const BAR = [255, 255, 255]

const roundedRect = (x, y, x0, y0, x1, y1, r) => {
  const cx = Math.max(x0 + r, Math.min(x, x1 - r))
  const cy = Math.max(y0 + r, Math.min(y, y1 - r))
  const d = Math.hypot(x - cx, y - cy)
  return Math.max(0, Math.min(1, r - d + 0.5))
}

// generate-icons.mjsと同じ3本バー(100単位座標系)を、中心(cx,cy)・一辺logoの枠に描く
const barsAlpha = (x, y, cx, cy, logo) => {
  const u = logo / 100
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
      roundedRect(
        x,
        y,
        cx + (b.x0 - 50) * u,
        cy + (base - b.h - 50) * u,
        cx + (b.x0 + 12 - 50) * u,
        cy + (base - 50) * u,
        4 * u,
      ),
    )
  }
  return fg
}

function writeSplash(path, w, h) {
  const stride = 1 + w * 4
  // 背景色だけの行を作り、全行へ複製
  const bgRow = Buffer.alloc(stride)
  for (let x = 0; x < w; x++) {
    const i = 1 + x * 4
    bgRow[i] = BG[0]
    bgRow[i + 1] = BG[1]
    bgRow[i + 2] = BG[2]
    bgRow[i + 3] = 255
  }
  const raw = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) bgRow.copy(raw, y * stride)

  // ロゴは短辺の32%を一辺にして中央へ。ロゴ枠の周辺だけピクセル計算する
  const logo = Math.round(Math.min(w, h) * 0.32)
  const cx = w / 2
  const cy = h / 2
  const x0 = Math.max(0, Math.floor(cx - logo / 2) - 2)
  const x1 = Math.min(w, Math.ceil(cx + logo / 2) + 2)
  const y0 = Math.max(0, Math.floor(cy - logo / 2) - 2)
  const y1 = Math.min(h, Math.ceil(cy + logo / 2) + 2)
  for (let y = y0; y < y1; y++) {
    const row = y * stride
    for (let x = x0; x < x1; x++) {
      const fg = barsAlpha(x + 0.5, y + 0.5, cx, cy, logo)
      if (fg === 0) continue
      const i = row + 1 + x * 4
      raw[i] = Math.round(BAR[0] * fg + BG[0] * (1 - fg))
      raw[i + 1] = Math.round(BAR[1] * fg + BG[1] * (1 - fg))
      raw[i + 2] = Math.round(BAR[2] * fg + BG[2] * (1 - fg))
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
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
  console.log(`wrote ${path} (${w}x${h})`)
}

// densityごとの縦向きサイズ(横向きは幅と高さを入れ替える)
const portSizes = {
  mdpi: [320, 480],
  hdpi: [480, 800],
  xhdpi: [720, 1280],
  xxhdpi: [960, 1600],
  xxxhdpi: [1280, 1920],
}

writeSplash(join(RES, 'drawable', 'splash.png'), 480, 800)
for (const [dpi, [w, h]] of Object.entries(portSizes)) {
  writeSplash(join(RES, `drawable-port-${dpi}`, 'splash.png'), w, h)
  writeSplash(join(RES, `drawable-land-${dpi}`, 'splash.png'), h, w)
}
console.log('android splash done')

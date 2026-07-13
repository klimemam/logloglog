/** アプリ全体で使う小さなSVGアイコン(テキスト記号・絵文字記号の置き換え)。
 *  .dirflip はRTL(アラビア語)でCSSにより左右反転する */
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const IconChevronRight = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)} className="icon dirflip">
    <path d="m9 6 6 6-6 6" />
  </svg>
)

export const IconChevronDown = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const IconX = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

export const IconPlay = ({ size = 13 }: { size?: number }) => (
  <svg {...base(size)} className="icon">
    <path d="M7 4.5v15l12-7.5L7 4.5Z" fill="currentColor" stroke="none" />
  </svg>
)

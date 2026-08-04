/**
 * 3D種目アニメの方式比較プロトタイプ。
 * A: プロシージャル(関節角度カーブをコードで駆動) — アセットゼロ
 * B: モーションキャプチャ(BVH再生) — 素材次第
 * C: テキスト→モーション生成AI — 出力サンプルの品質確認
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader.js'

const deg = (d: number) => (d * Math.PI) / 180

/* ===== ページUI ===== */

document.body.textContent = ''
const style = document.createElement('style')
style.textContent = `
  * { box-sizing: border-box; margin: 0; }
  body { background: #0d0d0d; color: #fff; font-family: system-ui, sans-serif; }
  #bar { position: fixed; top: 0; left: 0; right: 0; padding: 10px 12px; display: flex; gap: 8px;
    flex-wrap: wrap; z-index: 5; background: rgba(20,20,19,0.86); backdrop-filter: blur(16px); }
  #bar button { font: inherit; font-size: 13px; font-weight: 700; color: #c3c2b7; background: #2a2a28;
    border: none; border-radius: 999px; padding: 8px 14px; cursor: pointer; }
  #bar button.active { background: #3987e5; color: #fff; }
  #sub { position: fixed; top: 54px; left: 0; right: 0; padding: 4px 12px; display: flex; gap: 8px;
    flex-wrap: wrap; z-index: 5; }
  #sub button { font: inherit; font-size: 12px; color: #c3c2b7; background: #1e1e1c; border: 1px solid #2c2c2a;
    border-radius: 999px; padding: 6px 12px; cursor: pointer; }
  #sub button.active { border-color: #3987e5; color: #3987e5; }
  #note { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
    font-size: 12px; line-height: 1.6; color: #c3c2b7; background: rgba(20,20,19,0.86); backdrop-filter: blur(16px); z-index: 5; }
  #media { position: fixed; inset: 96px 0 64px; overflow-y: auto; padding: 12px; display: none; }
  #media .item { margin-bottom: 16px; }
  #media video, #media img { width: 100%; max-width: 480px; border-radius: 12px; display: block; }
  #media .cap { font-size: 12px; color: #c3c2b7; margin-top: 6px; }
  canvas.gl { position: fixed; inset: 0; }
`
document.head.appendChild(style)

const canvas = document.createElement('canvas')
canvas.className = 'gl'
const barEl = document.createElement('div')
barEl.id = 'bar'
const subEl = document.createElement('div')
subEl.id = 'sub'
const noteEl = document.createElement('div')
noteEl.id = 'note'
const mediaEl = document.createElement('div')
mediaEl.id = 'media'
document.body.append(canvas, barEl, subEl, noteEl, mediaEl)

/* ===== three.js シーン ===== */

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
const scene = new THREE.Scene()
scene.background = new THREE.Color('#141413')
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
camera.position.set(2.2, 1.5, 2.6)
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0.9, 0)
controls.enableDamping = true

scene.add(new THREE.HemisphereLight('#dfe8ff', '#332f28', 1.1))
const sun = new THREE.DirectionalLight('#fff', 2.2)
sun.position.set(3, 6, 2)
sun.castShadow = true
sun.shadow.mapSize.set(1024, 1024)
scene.add(sun)

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(3.2, 48).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: '#1e1e1c', roughness: 1 }),
)
ground.receiveShadow = true
scene.add(ground)
scene.add(new THREE.GridHelper(6, 12, '#2c2c2a', '#232322'))

const resize = () => {
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize)
resize()

/* ===== A: プロシージャルなマネキン ===== */

const bodyMat = new THREE.MeshStandardMaterial({ color: '#3987e5', roughness: 0.55 })
const gearMat = new THREE.MeshStandardMaterial({ color: '#8a8a85', roughness: 0.35, metalness: 0.6 })
const plateMat = new THREE.MeshStandardMaterial({ color: '#3b3b38', roughness: 0.6 })

const capsule = (r: number, len: number, mat = bodyMat) => {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat)
  m.castShadow = true
  return m
}

interface Rig {
  root: THREE.Group
  pelvis: THREE.Group
  spine: THREE.Group
  head: THREE.Mesh
  hipL: THREE.Group
  hipR: THREE.Group
  kneeL: THREE.Group
  kneeR: THREE.Group
  footL: THREE.Group
  footR: THREE.Group
  shL: THREE.Group
  shR: THREE.Group
  elL: THREE.Group
  elR: THREE.Group
  wristL: THREE.Object3D
  wristR: THREE.Object3D
}

const THIGH = 0.42
const SHIN = 0.42

function buildRig(): Rig {
  const root = new THREE.Group()
  const pelvis = new THREE.Group()
  pelvis.position.y = 0.16 + THIGH + SHIN
  root.add(pelvis)
  const hipBlock = capsule(0.11, 0.1)
  hipBlock.rotation.z = Math.PI / 2
  pelvis.add(hipBlock)

  const spine = new THREE.Group()
  spine.position.y = 0.08
  pelvis.add(spine)
  const torso = capsule(0.13, 0.34)
  torso.position.y = 0.28
  spine.add(torso)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), bodyMat)
  head.castShadow = true
  head.position.y = 0.62
  spine.add(head)

  const mkLeg = (sx: number) => {
    const hip = new THREE.Group()
    hip.position.set(sx * 0.1, -0.02, 0)
    pelvis.add(hip)
    const thigh = capsule(0.075, THIGH - 0.12)
    thigh.position.y = -THIGH / 2
    hip.add(thigh)
    const knee = new THREE.Group()
    knee.position.y = -THIGH
    hip.add(knee)
    const shin = capsule(0.06, SHIN - 0.12)
    shin.position.y = -SHIN / 2
    knee.add(shin)
    const foot = new THREE.Group()
    foot.position.y = -SHIN
    knee.add(foot)
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.26), bodyMat)
    shoe.castShadow = true
    shoe.position.set(0, -0.1, 0.06)
    foot.add(shoe)
    return { hip, knee, foot }
  }
  const legL = mkLeg(-1)
  const legR = mkLeg(1)

  const mkArm = (sx: number) => {
    const sh = new THREE.Group()
    sh.position.set(sx * 0.24, 0.46, 0)
    spine.add(sh)
    const upper = capsule(0.055, 0.18)
    upper.position.y = -0.14
    sh.add(upper)
    const el = new THREE.Group()
    el.position.y = -0.28
    sh.add(el)
    const fore = capsule(0.05, 0.16)
    fore.position.y = -0.13
    el.add(fore)
    const wrist = new THREE.Object3D()
    wrist.position.y = -0.27
    el.add(wrist)
    return { sh, el, wrist }
  }
  const armL = mkArm(-1)
  const armR = mkArm(1)

  scene.add(root)
  return {
    root,
    pelvis,
    spine,
    head,
    hipL: legL.hip,
    hipR: legR.hip,
    kneeL: legL.knee,
    kneeR: legR.knee,
    footL: legL.foot,
    footR: legR.foot,
    shL: armL.sh,
    shR: armR.sh,
    elL: armL.el,
    elR: armR.el,
    wristL: armL.wrist,
    wristR: armR.wrist,
  }
}

/** バーベル(シャフト+プレート) */
function buildBarbell(width = 1.5): THREE.Group {
  const g = new THREE.Group()
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, width, 12), gearMat)
  shaft.rotation.z = Math.PI / 2
  shaft.castShadow = true
  g.add(shaft)
  for (const s of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 24), plateMat)
    plate.rotation.z = Math.PI / 2
    plate.position.x = s * (width / 2 - 0.12)
    plate.castShadow = true
    g.add(plate)
  }
  return g
}

function buildDumbbell(): THREE.Group {
  const g = new THREE.Group()
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 10), gearMat)
  shaft.rotation.z = Math.PI / 2
  g.add(shaft)
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), plateMat)
    w.rotation.z = Math.PI / 2
    w.position.x = s * 0.08
    w.castShadow = true
    g.add(w)
  }
  return g
}

function buildBench(): THREE.Group {
  const g = new THREE.Group()
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 1.25), plateMat)
  top.position.y = 0.42
  top.castShadow = true
  g.add(top)
  for (const z of [-0.5, 0.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.06), gearMat)
    leg.position.set(0, 0.2, z)
    g.add(leg)
  }
  return g
}

const rig = buildRig()
const squatBar = buildBarbell()
rig.spine.add(squatBar)
squatBar.position.y = 0.52
const benchBar = buildBarbell(1.3)
scene.add(benchBar)
const bench = buildBench()
scene.add(bench)
const dbL = buildDumbbell()
const dbR = buildDumbbell()
rig.wristL.add(dbL)
rig.wristR.add(dbR)

/** 全関節をゼロに戻す */
function resetRig() {
  rig.root.rotation.set(0, 0, 0)
  rig.root.position.set(0, 0, 0)
  rig.pelvis.rotation.set(0, 0, 0)
  rig.pelvis.position.set(0, 0.16 + THIGH + SHIN, 0)
  for (const j of [rig.spine, rig.hipL, rig.hipR, rig.kneeL, rig.kneeR, rig.footL, rig.footR, rig.shL, rig.shR, rig.elL, rig.elR]) {
    j.rotation.set(0, 0, 0)
  }
}

/** 0→1→0 のイージング付き往復(u: 0..1) */
const cycle = (u: number) => 0.5 - 0.5 * Math.cos(u * Math.PI * 2)

type Pose = (u: number) => void

/** スクワット: 足首が股関節の真下に残る角度関係(θknee = 2θhip)で沈む */
const poseSquat: Pose = (u) => {
  const d = cycle(u)
  const hip = deg(52) * d
  rig.pelvis.position.y = 0.16 + (THIGH + SHIN) * Math.cos(hip)
  for (const [h, k, f] of [
    [rig.hipL, rig.kneeL, rig.footL],
    [rig.hipR, rig.kneeR, rig.footR],
  ] as const) {
    h.rotation.x = -hip
    k.rotation.x = 2 * hip
    f.rotation.x = -hip
  }
  rig.spine.rotation.x = deg(26) * d
  // 手はバーを担ぐ位置に固定
  for (const sh of [rig.shL, rig.shR]) sh.rotation.x = deg(-70)
  for (const el of [rig.elL, rig.elR]) el.rotation.x = deg(-55)
  squatBar.visible = true
  benchBar.visible = false
  bench.visible = false
  dbL.visible = dbR.visible = false
}

/** ベンチプレス: ベンチに仰向け(骨盤ごと-90°倒す)、肘の屈伸でバーを胸の上へ */
const poseBench: Pose = (u) => {
  const press = 1 - cycle(u) // 1=挙上 0=胸
  rig.pelvis.rotation.x = -Math.PI / 2
  rig.pelvis.position.set(0, 0.58, 0.3) // ベンチ上面に仰向け(頭は-Z側)
  // 脚はベンチ端から床へ
  for (const [h, k] of [
    [rig.hipL, rig.kneeL],
    [rig.hipR, rig.kneeR],
  ] as const) {
    h.rotation.x = deg(80)
    k.rotation.x = deg(-70)
  }
  rig.footL.rotation.x = rig.footR.rotation.x = deg(-10)
  // 腕: 垂直(ワールド上向き=ローカル+Z)を基準に、下ろすほど肘が開く
  const tilt = deg(38) * (1 - press)
  const bend = deg(85) * (1 - press)
  rig.shL.rotation.x = -Math.PI / 2 + tilt
  rig.shR.rotation.x = -Math.PI / 2 + tilt
  rig.elL.rotation.x = -bend
  rig.elR.rotation.x = -bend
  // バーは左右の手首の中点に横向きで置く
  const wl = rig.wristL.getWorldPosition(new THREE.Vector3())
  const wr = rig.wristR.getWorldPosition(new THREE.Vector3())
  benchBar.position.copy(wl).add(wr).multiplyScalar(0.5)
  benchBar.rotation.set(0, 0, 0)
  squatBar.visible = false
  benchBar.visible = true
  bench.visible = true
  dbL.visible = dbR.visible = false
}

/** アームカール: 肘の屈伸+わずかな体幹の反り */
const poseCurl: Pose = (u) => {
  const c = cycle(u)
  rig.spine.rotation.x = deg(-6) * c
  for (const el of [rig.elL, rig.elR]) el.rotation.x = -deg(10) - deg(115) * c
  for (const sh of [rig.shL, rig.shR]) sh.rotation.x = deg(8) * c
  dbL.visible = dbR.visible = true
  dbL.rotation.x = dbR.rotation.x = Math.PI / 2
  squatBar.visible = false
  benchBar.visible = false
  bench.visible = false
}

const poses: Record<string, { pose: Pose; period: number }> = {
  スクワット: { pose: poseSquat, period: 2.6 },
  ベンチプレス: { pose: poseBench, period: 2.2 },
  アームカール: { pose: poseCurl, period: 1.8 },
}

/* ===== B: BVH再生 ===== */

interface ManifestBvh {
  name: string
  path: string
  license?: string
}
interface ManifestMedia {
  name: string
  path: string
  note?: string
}
interface Manifest {
  bvh?: ManifestBvh[]
  t2m?: ManifestBvh[]
  media?: ManifestMedia[]
}

let manifest: Manifest = {}
let bvhGroup: THREE.Group | null = null
let bvhHelper: THREE.SkeletonHelper | null = null
let bvhRoot: THREE.Bone | null = null
let mixer: THREE.AnimationMixer | null = null

async function loadBvh(item: ManifestBvh) {
  if (bvhGroup) {
    scene.remove(bvhGroup)
    bvhGroup = null
    mixer = null
  }
  if (bvhHelper) {
    scene.remove(bvhHelper)
    bvhHelper = null
  }
  const result = await new BVHLoader().loadAsync(item.path)
  const group = new THREE.Group()
  const rootBone = result.skeleton.bones[0]
  group.add(rootBone)
  // このBVHローダーはトラック名が素のボーン名(例: Hips.position)なので、
  // ボーン階層を子に持つグループをミキサーのルートにして名前解決させる
  const helper = new THREE.SkeletonHelper(rootBone)
  ;(helper.material as THREE.LineBasicMaterial).color = new THREE.Color('#5598e7')
  mixer = new THREE.AnimationMixer(group)
  mixer.clipAction(result.clip).play()
  mixer.update(0)
  // デバッグ用(比較検証のスクリプトから状態を確認する)
  ;(window as unknown as Record<string, unknown>).__bvhDebug = {
    mixer,
    bones: result.skeleton.bones,
    tracks: result.clip.tracks.map((t) => t.name).slice(0, 4),
  }
  group.updateMatrixWorld(true)
  // 身長 ~1.7m に自動スケール(単位系がファイルごとに違うため実測する)
  const v = new THREE.Vector3()
  let minY = Infinity
  let maxY = -Infinity
  for (const b of result.skeleton.bones) {
    b.getWorldPosition(v)
    if (v.y < minY) minY = v.y
    if (v.y > maxY) maxY = v.y
  }
  const s = 1.7 / Math.max(maxY - minY, 1e-6)
  // 関節の球はスケール後に~3cmになる半径で付ける(指の関節は省く)
  for (const b of result.skeleton.bones) {
    if (/finger|thumb|index|middle|ring|pinky|end/i.test(b.name)) continue
    const j = new THREE.Mesh(new THREE.SphereGeometry(0.028 / s, 8, 6), bodyMat)
    b.add(j)
  }
  group.scale.setScalar(s)
  group.position.y = -minY * s
  scene.add(group)
  scene.add(helper) // SkeletonHelperはワールド座標で自前描画するのでsceneに直接入れる
  bvhGroup = group
  bvhHelper = helper
  bvhRoot = rootBone
}

/* ===== C: 生成AI(text-to-motion)の22関節出力を再生 ===== */

// HumanML3D標準の22関節キネマティックチェーン
const T2M_CHAINS = [
  [0, 2, 5, 8, 11],
  [0, 1, 4, 7, 10],
  [0, 3, 6, 9, 12, 15],
  [9, 14, 17, 19, 21],
  [9, 13, 16, 18, 20],
]

interface JointsData {
  fps: number
  joints: number[][][]
}

let jointsGroup: THREE.Group | null = null
let jointsData: JointsData | null = null
let jointsSpheres: THREE.Mesh[] = []
let jointsLines: { line: THREE.Line; chain: number[] }[] = []
let jointsT = 0

async function loadJoints(item: ManifestBvh) {
  if (jointsGroup) {
    scene.remove(jointsGroup)
    jointsGroup = null
  }
  const data = (await (await fetch(item.path)).json()) as JointsData
  jointsData = data
  jointsT = 0
  const g = new THREE.Group()
  jointsSpheres = data.joints[0].map(() => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), bodyMat)
    m.castShadow = true
    g.add(m)
    return m
  })
  jointsLines = T2M_CHAINS.map((chain) => {
    const geo = new THREE.BufferGeometry().setFromPoints(chain.map(() => new THREE.Vector3()))
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#5598e7' }))
    g.add(line)
    return { line, chain }
  })
  scene.add(g)
  jointsGroup = g
}

function updateJoints(dt: number) {
  if (!jointsData || !jointsGroup) return
  jointsT += dt
  const frames = jointsData.joints
  const f = frames[Math.floor(jointsT * jointsData.fps) % frames.length]
  // 生成モーションも移動を含むので、腰(関節0)を常に画面中央へ
  const ox = f[0][0]
  const oz = f[0][2]
  f.forEach((p, i) => jointsSpheres[i].position.set(p[0] - ox, p[1], p[2] - oz))
  for (const { line, chain } of jointsLines) {
    const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute
    chain.forEach((j, i) => pos.setXYZ(i, f[j][0] - ox, f[j][1], f[j][2] - oz))
    pos.needsUpdate = true
  }
}

/* ===== モード切り替え ===== */

type ModeId = 'A' | 'B' | 'C'
const notes: Record<ModeId, string> = {
  A: 'A: プロシージャル — アセット0バイト・全種目同一画風・器具や深さをパラメータ化できる。ドラッグで回転。',
  B: 'B: モーションキャプチャ(BVH) — 実測モーションの滑らかさを確認。素材の種目網羅性とライセンスが課題。',
  C: 'C: テキスト→モーション生成AI — 出力(22関節座標)の3D再生と公式サンプル。器具は原理的に生成されない点に注目。',
}
let mode: ModeId = 'A'
let current = poses['スクワット']
let bvhStatus = ''

function setSub(items: { label: string; active: boolean; onTap: () => void }[]) {
  subEl.textContent = ''
  for (const it of items) {
    const b = document.createElement('button')
    b.textContent = it.label
    if (it.active) b.className = 'active'
    b.onclick = it.onTap
    subEl.appendChild(b)
  }
}

let cSub: 'joints' | 'media' = 'joints'

function apply() {
  const showMedia = mode === 'C' && cSub === 'media'
  canvas.style.display = showMedia ? 'none' : 'block'
  mediaEl.style.display = showMedia ? 'block' : 'none'
  const rigVisible = mode === 'A'
  rig.root.visible = rigVisible
  squatBar.visible = rigVisible && squatBar.visible
  bench.visible = rigVisible && bench.visible
  benchBar.visible = rigVisible && benchBar.visible
  if (bvhGroup) bvhGroup.visible = mode === 'B'
  if (bvhHelper) bvhHelper.visible = mode === 'B'
  if (jointsGroup) jointsGroup.visible = mode === 'C' && cSub === 'joints'
  noteEl.textContent = notes[mode] + (mode === 'B' && bvhStatus ? ` ${bvhStatus}` : '')

  barEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.m === mode))

  if (mode === 'A') {
    setSub(
      Object.keys(poses).map((k) => ({
        label: k,
        active: poses[k] === current,
        onTap: () => {
          current = poses[k]
          resetRig()
          apply()
        },
      })),
    )
  } else if (mode === 'B') {
    const list = manifest.bvh ?? []
    if (!list.length) {
      bvhStatus = '(BVH素材が未配置です — proto3d-assets/manifest.json に追加すると表示)'
      noteEl.textContent = notes.B + ' ' + bvhStatus
    }
    setSub(
      list.map((it) => ({
        label: it.name,
        active: false,
        onTap: () => {
          bvhStatus = `読込中: ${it.name}…`
          apply()
          loadBvh(it)
            .then(() => {
              bvhStatus = `${it.name}(${it.license ?? 'ライセンス未確認'})`
              apply()
            })
            .catch((e) => {
              bvhStatus = `読込失敗: ${String(e)}`
              apply()
            })
        },
      })),
    )
  } else {
    const t2m = manifest.t2m ?? []
    setSub([
      ...t2m.map((it) => ({
        label: it.name,
        active: cSub === 'joints',
        onTap: () => {
          cSub = 'joints'
          loadJoints(it).then(apply)
          apply()
        },
      })),
      {
        label: 'サンプルGIF(各モデル公式出力)',
        active: cSub === 'media',
        onTap: () => {
          cSub = 'media'
          apply()
        },
      },
    ])
    mediaEl.textContent = ''
    const media = manifest.media ?? []
    if (!media.length) {
      const p = document.createElement('p')
      p.style.color = '#898781'
      p.style.fontSize = '13px'
      p.textContent = '生成AIの出力サンプルが未配置です(調達中)。'
      mediaEl.appendChild(p)
    }
    for (const m of media) {
      const item = document.createElement('div')
      item.className = 'item'
      const isVideo = /\.(mp4|webm)$/i.test(m.path)
      if (isVideo) {
        const video = document.createElement('video')
        video.src = m.path
        video.autoplay = true
        video.loop = true
        video.muted = true
        video.playsInline = true
        item.appendChild(video)
      } else {
        const img = document.createElement('img')
        img.src = m.path
        img.alt = m.name
        item.appendChild(img)
      }
      const cap = document.createElement('div')
      cap.className = 'cap'
      cap.textContent = `${m.name}${m.note ? ' — ' + m.note : ''}`
      item.appendChild(cap)
      mediaEl.appendChild(item)
    }
  }
}

for (const m of ['A', 'B', 'C'] as ModeId[]) {
  const b = document.createElement('button')
  b.textContent = { A: 'A プロシージャル', B: 'B モーキャプ', C: 'C 生成AI' }[m]
  b.dataset.m = m
  b.onclick = () => {
    mode = m
    resetRig()
    apply()
  }
  barEl.appendChild(b)
}

fetch('./proto3d-assets/manifest.json')
  .then((r) => (r.ok ? r.json() : {}))
  .then((m: Manifest) => {
    manifest = m
    apply()
  })
  .catch(() => apply())

/* ===== ループ ===== */

const clock = new THREE.Clock()
let t = 0
function tick() {
  requestAnimationFrame(tick)
  const dt = clock.getDelta()
  controls.update()
  if (mode === 'A') {
    t += dt
    current.pose((t / current.period) % 1)
  } else if (mode === 'B' && mixer) {
    mixer.update(dt)
    // CMU等はルートが歩き回るので、腰を常に画面中央へ引き戻す
    if (bvhRoot && bvhGroup) {
      const p = bvhRoot.getWorldPosition(new THREE.Vector3())
      bvhGroup.position.x -= p.x
      bvhGroup.position.z -= p.z
    }
  } else if (mode === 'C') {
    updateJoints(dt)
  }
  renderer.render(scene, camera)
}
resetRig()
apply()
tick()

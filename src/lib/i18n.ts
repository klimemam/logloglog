/**
 * 多言語対応。キー = 日本語原文({n}等はプレースホルダ)。
 * 値 = [英語, 中国語(簡体), スペイン語, アラビア語]。
 * 言語変更は保存してリロードする方式(リアクティブな配線を不要にするため)。
 */
export type Locale = 'ja' | 'en' | 'zh' | 'es' | 'ar'

const LOCALE_KEY = 'logloglog:locale'
const IDX: Record<Exclude<Locale, 'ja'>, number> = { en: 0, zh: 1, es: 2, ar: 3 }

export const locales: { code: Locale; label: string }[] = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'العربية' },
]

const detect = (): Locale => {
  const nav = (navigator.language || 'ja').toLowerCase()
  if (nav.startsWith('ja')) return 'ja'
  if (nav.startsWith('zh')) return 'zh'
  if (nav.startsWith('es')) return 'es'
  if (nav.startsWith('ar')) return 'ar'
  return 'en'
}

export const getLocale = (): Locale => {
  const saved = localStorage.getItem(LOCALE_KEY) as Locale | null
  return saved && locales.some((l) => l.code === saved) ? saved : detect()
}

export const setLocale = (l: Locale) => {
  localStorage.setItem(LOCALE_KEY, l)
  location.reload()
}

const locale = typeof localStorage !== 'undefined' ? getLocale() : 'ja'

export const localeTag = (): string =>
  ({ ja: 'ja-JP', en: 'en-US', zh: 'zh-CN', es: 'es-ES', ar: 'ar' })[locale]

/** アラビア語はRTL。起動時にhtmlへ反映する */
export const applyDocumentLocale = () => {
  document.documentElement.lang = locale
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
}

export const t = (key: string, params?: Record<string, string | number>): string => {
  let s = locale === 'ja' ? key : (D[key]?.[IDX[locale]] ?? key)
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v))
  return s
}

/** プリセット/デフォルト習慣の正規名(この集合だけ逆引き翻訳の対象にする) */
const NAME_KEYS = ['筋トレ', 'ランニング', 'ウォーキング', '読書', '100マス計算', '勉強', '瞑想', 'ストレッチ', '睡眠', '仕事', '禁煙', '禁酒']
let nameReverse: Map<string, string> | null = null

/**
 * 習慣名の表示用変換。プリセット由来の名前(どの言語で保存されていても)は
 * 表示言語に翻訳し、ユーザーが自由入力した名前はそのまま返す。
 */
export const tName = (name: string): string => {
  if (NAME_KEYS.includes(name)) return t(name)
  if (!nameReverse) {
    nameReverse = new Map()
    for (const key of NAME_KEYS) for (const v of D[key] ?? []) nameReverse.set(v, key)
  }
  const canonical = nameReverse.get(name)
  return canonical ? t(canonical) : name
}

const D: Record<string, [string, string, string, string]> = {
  /* ===== タブ・共通 ===== */
  '記録': ['Log', '记录', 'Registro', 'تسجيل'],
  '統計': ['Stats', '统计', 'Estadísticas', 'إحصائيات'],
  '習慣': ['Habits', '习惯', 'Hábitos', 'عادات'],
  '設定': ['Settings', '设置', 'Ajustes', 'الإعدادات'],
  '保存': ['Save', '保存', 'Guardar', 'حفظ'],
  'キャンセル': ['Cancel', '取消', 'Cancelar', 'إلغاء'],
  '編集': ['Edit', '编辑', 'Editar', 'تعديل'],
  '削除': ['Delete', '删除', 'Eliminar', 'حذف'],
  '閉じる': ['Close', '关闭', 'Cerrar', 'إغلاق'],
  '取り消す': ['Undo', '撤销', 'Deshacer', 'تراجع'],

  /* ===== オンボーディング ===== */
  'ようこそ 👋': ['Welcome 👋', '欢迎 👋', 'Bienvenido 👋', 'مرحبًا 👋'],
  '開いてすぐ、ワンタップで記録': ['Log in one tap, right away', '打开即可一键记录', 'Registra con un toque', 'سجّل بلمسة واحدة فور الفتح'],
  'ホームの「+」を押すだけ。ランニングや読書など、習慣は自由に追加できます。': ['Just tap “+” on Home. Add any habit — running, reading, anything.', '只需点击首页的“+”。跑步、读书等习惯都能自由添加。', 'Solo toca «+» en inicio. Añade cualquier hábito: correr, leer, etc.', 'اضغط «+» في الرئيسية فقط. أضف أي عادة: الجري، القراءة وغيرها.'],
  '筋トレはワークアウトモード': ['Workout mode for strength training', '力量训练有专属训练模式', 'Modo entrenamiento para fuerza', 'وضع التمرين لتدريب القوة'],
  '種目を選ぶと前回のセットが入った状態でスタート。✓するだけで休憩タイマーも動きます。': ['Pick an exercise and start with last time’s sets pre-filled. Check ✓ and the rest timer starts.', '选择动作后自动填入上次的组数。打✓即启动休息计时。', 'Elige un ejercicio y empieza con las series de la última vez. Marca ✓ y corre el descanso.', 'اختر تمرينًا وابدأ بمجموعات المرة السابقة. علّم ✓ ليبدأ مؤقّت الراحة.'],
  '続けるほど、成長が見える': ['See your growth as you keep going', '坚持越久,成长越清晰', 'Ve tu progreso al ser constante', 'شاهد تقدمك مع الاستمرار'],
  '週の目標達成・連続記録・推定1RMの伸びを統計タブで確認できます。': ['Track weekly goals, streaks and estimated 1RM in the Stats tab.', '在统计页查看周目标、连续天数和预估1RM。', 'Sigue metas semanales, rachas y 1RM estimado en Estadísticas.', 'تابع الأهداف الأسبوعية والسلاسل و1RM المقدّر في الإحصائيات.'],
  'データはあなたの端末の中だけに保存されます(登録不要・無料)。ホーム画面に追加するとアプリとして使えます。': ['Your data stays on your device (free, no sign-up). Add to home screen to use it as an app.', '数据仅保存在你的设备上(免费、无需注册)。添加到主屏幕即可作为App使用。', 'Tus datos quedan en tu dispositivo (gratis, sin registro). Añádelo a la pantalla de inicio.', 'بياناتك تبقى على جهازك (مجاني وبدون تسجيل). أضِفه إلى الشاشة الرئيسية لاستخدامه كتطبيق.'],
  'はじめる': ['Get started', '开始使用', 'Empezar', 'ابدأ'],

  /* ===== アップデート ===== */
  '🆕 新しいバージョン{v}があります': ['🆕 New version{v} available', '🆕 有新版本{v}', '🆕 Nueva versión{v} disponible', '🆕 يتوفر إصدار جديد{v}'],
  'ダウンロード': ['Download', '下载', 'Descargar', 'تنزيل'],
  '更新': ['Update', '更新', 'Actualizar', 'تحديث'],
  'この通知を閉じる': ['Dismiss', '关闭通知', 'Descartar', 'إغلاق التنبيه'],
  'アプリ情報': ['About', '应用信息', 'Información', 'حول التطبيق'],
  '🔄 アップデートを確認中…': ['🔄 Checking for updates…', '🔄 正在检查更新…', '🔄 Buscando actualizaciones…', '🔄 جارٍ التحقق من التحديثات…'],
  '🆕 新しいバージョン {v} があります(現在 {c})': ['🆕 Version {v} available (current {c})', '🆕 有新版本 {v}(当前 {c})', '🆕 Versión {v} disponible (actual {c})', '🆕 يتوفر إصدار {v} (الحالي {c})'],
  '✅ 最新版です({c})': ['✅ Up to date ({c})', '✅ 已是最新版({c})', '✅ Actualizado ({c})', '✅ محدث ({c})'],
  '新しいAPKをダウンロード': ['Download new APK', '下载新APK', 'Descargar nuevo APK', 'تنزيل APK الجديد'],
  '更新して再読み込み': ['Update and reload', '更新并重新加载', 'Actualizar y recargar', 'حدّث وأعد التحميل'],
  'アップデートを確認': ['Check for updates', '检查更新', 'Buscar actualizaciones', 'التحقق من التحديثات'],
  'ダウンロードしたAPKを開くと上書きインストールされます(記録はそのまま残ります)。': ['Open the downloaded APK to install over the current app (your data is kept).', '打开下载的APK即可覆盖安装(记录会保留)。', 'Abre el APK descargado para instalar encima (tus datos se conservan).', 'افتح ملف APK لتثبيته فوق التطبيق الحالي (تبقى بياناتك).'],

  /* ===== ホーム ===== */
  '今日の記録': ["Today's log", '今日记录', 'Registro de hoy', 'سجل اليوم'],
  'ワークアウト中': ['Workout in progress', '训练进行中', 'Entrenamiento en curso', 'التمرين جارٍ'],
  '🔥 {n}日連続': ['🔥 {n}-day streak', '🔥 连续{n}天', '🔥 racha de {n} días', '🔥 سلسلة {n} أيام'],
  '今日 {n}種目 {m}セット': ['Today: {n} exercises, {m} sets', '今日 {n}个动作 {m}组', 'Hoy: {n} ejercicios, {m} series', 'اليوم: {n} تمارين، {m} مجموعات'],
  '今日 {n}回 {v}': ['Today: {n}× {v}', '今日 {n}次 {v}', 'Hoy: {n}× {v}', 'اليوم: {n}× {v}'],
  '▶ 開始': ['▶ Start', '▶ 开始', '▶ Iniciar', '▶ ابدأ'],
  '▶ 再開': ['▶ Resume', '▶ 继续', '▶ Reanudar', '▶ استئناف'],
  '詳しく記録する ▸': ['Log with details ▸', '详细记录 ▸', 'Registrar con detalles ▸', 'تسجيل بالتفاصيل ▸'],
  '{name}を記録': ['Log {name}', '记录{name}', 'Registrar {name}', 'تسجيل {name}'],
  '記録値({unit})': ['Value ({unit})', '数值({unit})', 'Valor ({unit})', 'القيمة ({unit})'],
  'メモ(任意)': ['Note (optional)', '备注(可选)', 'Nota (opcional)', 'ملاحظة (اختياري)'],
  '例: 調子よかった': ['e.g. felt great', '例如:状态很好', 'p. ej., me sentí bien', 'مثال: شعرت بحال جيدة'],
  '記録する': ['Log it', '记录', 'Registrar', 'سجّل'],
  '{name}を記録しました': ['Logged {name}', '已记录{name}', '{name} registrado', 'تم تسجيل {name}'],
  'ワークアウトを記録しました 💪({e}種目 {s}セット)': ['Workout saved 💪 ({e} exercises, {s} sets)', '已记录训练 💪({e}个动作 {s}组)', 'Entrenamiento guardado 💪 ({e} ejercicios, {s} series)', 'تم حفظ التمرين 💪 ({e} تمارين، {s} مجموعات)'],
  'このワークアウトを記録せずに破棄しますか?': ['Discard this workout without saving?', '不保存并放弃本次训练?', '¿Descartar este entrenamiento sin guardar?', 'هل تريد تجاهل هذا التمرين دون حفظ؟'],
  '習慣がありません。「習慣」タブから追加してください。': ['No habits yet. Add one from the Habits tab.', '还没有习惯。请在“习惯”页添加。', 'Sin hábitos aún. Añade uno en la pestaña Hábitos.', 'لا توجد عادات بعد. أضِف واحدة من تبويب العادات.'],
  '今週 {n}/{m}回': ['This week {n}/{m}', '本周 {n}/{m}次', 'Esta semana {n}/{m}', 'هذا الأسبوع {n}/{m}'],

  /* ===== ワークアウト ===== */
  'ワークアウト': ['Workout', '训练', 'Entrenamiento', 'التمرين'],
  '完了': ['Finish', '完成', 'Terminar', 'إنهاء'],
  '休憩中 {t}': ['Resting {t}', '休息中 {t}', 'Descanso {t}', 'استراحة {t}'],
  'スキップ': ['Skip', '跳过', 'Saltar', 'تخطٍّ'],
  '休憩おわり!次のセットへ 💪': ['Rest over! Next set 💪', '休息结束!下一组 💪', '¡Fin del descanso! Siguiente serie 💪', 'انتهت الراحة! المجموعة التالية 💪'],
  'セット': ['sets', '组', 'series', 'مجموعة'],
  '重量(kg)': ['Weight (kg)', '重量(kg)', 'Peso (kg)', 'الوزن (كجم)'],
  '回数': ['Reps', '次数', 'Reps', 'التكرارات'],
  '自重': ['Bodyweight', '自重', 'Corporal', 'وزن الجسم'],
  '+ セットを追加': ['+ Add set', '+ 添加一组', '+ Añadir serie', '+ أضف مجموعة'],
  '+ 種目を追加': ['+ Add exercise', '+ 添加动作', '+ Añadir ejercicio', '+ أضف تمرينًا'],
  '休憩タイマー:': ['Rest timer:', '休息计时:', 'Descanso:', 'مؤقّت الراحة:'],
  '記録せずに破棄': ['Discard without saving', '不保存并放弃', 'Descartar sin guardar', 'تجاهل دون حفظ'],
  'ベスト1RM {n}kg': ['Best 1RM {n}kg', '最佳1RM {n}kg', 'Mejor 1RM {n}kg', 'أفضل 1RM {n} كجم'],
  '種目を選ぶ': ['Choose exercise', '选择动作', 'Elegir ejercicio', 'اختر تمرينًا'],
  '検索 / 新しい種目名を入力': ['Search / type a new exercise', '搜索 / 输入新动作名', 'Buscar / escribe uno nuevo', 'ابحث / اكتب تمرينًا جديدًا'],
  'すべて': ['All', '全部', 'Todos', 'الكل'],
  '最近': ['Recent', '最近', 'Recientes', 'الأخيرة'],
  '「{q}」を追加': ['Add “{q}”', '添加“{q}”', 'Añadir «{q}»', 'إضافة «{q}»'],
  '前回 {s}': ['Last: {s}', '上次 {s}', 'Última: {s}', 'السابقة: {s}'],

  /* 部位と種目 */
  '胸': ['Chest', '胸', 'Pecho', 'صدر'],
  '背中': ['Back', '背', 'Espalda', 'ظهر'],
  '脚': ['Legs', '腿', 'Piernas', 'أرجل'],
  '肩': ['Shoulders', '肩', 'Hombros', 'أكتاف'],
  '腕': ['Arms', '手臂', 'Brazos', 'أذرع'],
  '体幹': ['Core', '核心', 'Core', 'الجذع'],
  'その他': ['Other', '其他', 'Otros', 'أخرى'],
  'ベンチプレス': ['Bench press', '卧推', 'Press banca', 'ضغط البنش'],
  'ダンベルプレス': ['Dumbbell press', '哑铃卧推', 'Press mancuernas', 'ضغط الدمبل'],
  'インクラインベンチプレス': ['Incline bench press', '上斜卧推', 'Press inclinado', 'ضغط بنش مائل'],
  'チェストフライ': ['Chest fly', '飞鸟', 'Aperturas', 'تفتيح الصدر'],
  '腕立て伏せ': ['Push-ups', '俯卧撑', 'Flexiones', 'تمرين الضغط'],
  'デッドリフト': ['Deadlift', '硬拉', 'Peso muerto', 'الرفعة الميتة'],
  '懸垂': ['Pull-ups', '引体向上', 'Dominadas', 'العقلة'],
  'ラットプルダウン': ['Lat pulldown', '高位下拉', 'Jalón al pecho', 'السحب العلوي'],
  'ベントオーバーロー': ['Bent-over row', '俯身划船', 'Remo inclinado', 'التجديف المنحني'],
  'シーテッドロー': ['Seated row', '坐姿划船', 'Remo sentado', 'التجديف جالسًا'],
  'スクワット': ['Squat', '深蹲', 'Sentadilla', 'القرفصاء'],
  'レッグプレス': ['Leg press', '腿举', 'Prensa de piernas', 'ضغط الأرجل'],
  'ブルガリアンスクワット': ['Bulgarian split squat', '保加利亚分腿蹲', 'Sentadilla búlgara', 'القرفصاء البلغارية'],
  'ランジ': ['Lunge', '弓步', 'Zancadas', 'الاندفاع'],
  'レッグカール': ['Leg curl', '腿弯举', 'Curl femoral', 'ثني الأرجل'],
  'カーフレイズ': ['Calf raise', '提踵', 'Elevación de gemelos', 'رفع السمانة'],
  'ショルダープレス': ['Shoulder press', '肩推', 'Press militar', 'ضغط الكتف'],
  'サイドレイズ': ['Lateral raise', '侧平举', 'Elevaciones laterales', 'الرفرفة الجانبية'],
  'リアレイズ': ['Rear delt raise', '俯身飞鸟', 'Pájaro', 'الرفرفة الخلفية'],
  'アップライトロー': ['Upright row', '直立划船', 'Remo al mentón', 'التجديف العمودي'],
  'アームカール': ['Biceps curl', '弯举', 'Curl de bíceps', 'ثني العضلة ذات الرأسين'],
  'ハンマーカール': ['Hammer curl', '锤式弯举', 'Curl martillo', 'ثني المطرقة'],
  'トライセプスエクステンション': ['Triceps extension', '臂屈伸', 'Extensión de tríceps', 'تمديد الترايسبس'],
  'ディップス': ['Dips', '双杠臂屈伸', 'Fondos', 'المتوازي'],
  'プランク': ['Plank', '平板支撑', 'Plancha', 'البلانك'],
  'クランチ': ['Crunch', '卷腹', 'Abdominales', 'الطحن'],
  'レッグレイズ': ['Leg raise', '举腿', 'Elevación de piernas', 'رفع الأرجل'],
  'アブローラー': ['Ab roller', '健腹轮', 'Rueda abdominal', 'عجلة البطن'],

  /* ===== 統計 ===== */
  '目標に対する習慣の維持と、レベルの推移': ['Habit consistency vs goals, and your progress', '相对目标的坚持情况与成长趋势', 'Constancia frente a metas y tu progreso', 'الاستمرارية مقابل الأهداف وتقدمك'],
  '今週の達成': ['This week', '本周达成', 'Esta semana', 'هذا الأسبوع'],
  ' / {n}回': [' / {n}', ' / {n}次', ' / {n}', ' / {n}'],
  '🎉 目標達成!': ['🎉 Goal reached!', '🎉 达成目标!', '🎉 ¡Meta lograda!', '🎉 تحقق الهدف!'],
  'あと{n}回': ['{n} more to go', '还差{n}次', 'Faltan {n}', 'بقي {n}'],
  '連続記録': ['Streak', '连续记录', 'Racha', 'السلسلة'],
  '日': ['days', '天', 'días', 'يوم'],
  '🔥 いい調子!': ['🔥 Great pace!', '🔥 状态不错!', '🔥 ¡Buen ritmo!', '🔥 وتيرة رائعة!'],
  '毎日続けよう': ['Keep it up daily', '坚持每天记录', 'Sigue a diario', 'واصل يوميًا'],
  'レベル': ['Level', '等级', 'Nivel', 'المستوى'],
  'あと{n}XP({m}回)': ['{n} XP to go ({m} logs)', '还差{n}XP({m}次)', 'Faltan {n} XP ({m} registros)', 'بقي {n} XP ({m} تسجيلات)'],
  '負荷トレンド': ['Load trend', '负荷趋势', 'Tendencia de carga', 'اتجاه الحمل'],
  '↑ レベルアップ中': ['↑ Leveling up', '↑ 正在进步', '↑ Progresando', '↑ في تقدم'],
  '→ 維持': ['→ Steady', '→ 保持', '→ Estable', '→ مستقر'],
  '↓ ペースダウン': ['↓ Slowing down', '↓ 有所下降', '↓ Bajando', '↓ في تباطؤ'],
  'まだデータ不足': ['Not enough data yet', '数据还不足', 'Aún faltan datos', 'البيانات غير كافية بعد'],
  '直近4週の負荷が前の4週より増えています': ['Load in the last 4 weeks is higher than the previous 4', '最近4周的负荷高于之前4周', 'La carga de las últimas 4 semanas supera a las 4 previas', 'الحمل في آخر 4 أسابيع أعلى من الأسابيع الأربعة السابقة'],
  '直近4週の負荷は前の4週とほぼ同じです': ['Load is about the same as the previous 4 weeks', '最近4周与之前4周基本持平', 'La carga es similar a las 4 semanas previas', 'الحمل مشابه للأسابيع الأربعة السابقة'],
  '直近4週の負荷が前の4週より減っています': ['Load in the last 4 weeks is lower than the previous 4', '最近4周的负荷低于之前4周', 'La carga de las últimas 4 semanas es menor', 'الحمل في آخر 4 أسابيع أقل من السابقة'],
  '記録を続けると傾向が表示されます': ['Keep logging to see your trend', '继续记录即可显示趋势', 'Sigue registrando para ver la tendencia', 'واصل التسجيل لرؤية الاتجاه'],
  '直近4週のベストタイムが縮んでいます': ['Your best time is getting faster over the last 4 weeks', '最近4周最佳成绩在缩短', 'Tu mejor tiempo mejora en las últimas 4 semanas', 'أفضل وقت لديك يتحسن في آخر 4 أسابيع'],
  '直近4週のタイムは前の4週とほぼ同じです': ['Times are about the same as the previous 4 weeks', '最近4周成绩与之前基本持平', 'Los tiempos son similares a las 4 semanas previas', 'الأوقات مشابهة للأسابيع الأربعة السابقة'],
  '直近4週のタイムが前の4週より伸びています': ['Times are slower than the previous 4 weeks', '最近4周成绩变慢了', 'Los tiempos son más lentos que antes', 'الأوقات أبطأ من الأسابيع السابقة'],
  '週別の回数': ['Sessions per week', '每周次数', 'Sesiones por semana', 'الجلسات أسبوعيًا'],
  '直近12週 × 週{n}回の目標': ['Last 12 weeks × goal {n}/week', '近12周 × 每周{n}次目标', 'Últimas 12 semanas × meta {n}/semana', 'آخر 12 أسبوعًا × هدف {n}/أسبوع'],
  '種目別の成長': ['Progress by exercise', '按动作看成长', 'Progreso por ejercicio', 'التقدم حسب التمرين'],
  '種目を記録すると成長グラフが表示されます': ['Log exercises to see progress charts', '记录动作后显示成长图', 'Registra ejercicios para ver el progreso', 'سجّل التمارين لرؤية مخططات التقدم'],
  '{ex} の週間ベスト推定1RM(重量×回数から換算した最大挙上重量)(直近12週)': ['Weekly best est. 1RM for {ex} (last 12 weeks)', '{ex} 每周最佳预估1RM(近12周)', 'Mejor 1RM estimado semanal de {ex} (12 semanas)', 'أفضل 1RM مقدّر أسبوعيًا لـ {ex} (آخر 12 أسبوعًا)'],
  '{ex} の週間ベスト回数(自重)(直近12週)': ['Weekly best reps for {ex} (bodyweight, last 12 weeks)', '{ex} 每周最佳次数(自重,近12周)', 'Mejores reps semanales de {ex} (corporal, 12 semanas)', 'أفضل تكرارات أسبوعية لـ {ex} (وزن الجسم)'],
  '推定1RMベスト': ['Best est. 1RM', '最佳预估1RM', 'Mejor 1RM est.', 'أفضل 1RM مقدّر'],
  '最大重量': ['Max weight', '最大重量', 'Peso máximo', 'أقصى وزن'],
  '最多回数': ['Max reps', '最多次数', 'Reps máximas', 'أقصى تكرارات'],
  '履歴(セットごとの強度 = 自己ベスト推定1RM比)': ['History (per-set intensity = % of best est. 1RM)', '历史(每组强度=占最佳1RM比)', 'Historial (intensidad por serie = % del mejor 1RM)', 'السجل (شدة كل مجموعة = % من أفضل 1RM)'],
  '週のベストタイム({u})': ['Best time per week ({u})', '每周最佳成绩({u})', 'Mejor tiempo semanal ({u})', 'أفضل وقت أسبوعي ({u})'],
  'レベルが上がっているかは、この線が下がっているかで確認': ['Improving = this line going down', '线越低代表越进步', 'Mejorar = esta línea baja', 'التحسن يعني نزول هذا الخط'],
  '週別ボリューム({u})': ['Weekly volume ({u})', '每周容量({u})', 'Volumen semanal ({u})', 'الحجم الأسبوعي ({u})'],
  '週の総セット数。レベルが上がっているかは種目別の成長も確認': ['Total sets per week. Also check progress by exercise', '每周总组数。也可查看按动作的成长', 'Series totales por semana. Mira también el progreso por ejercicio', 'إجمالي المجموعات أسبوعيًا. راجع أيضًا التقدم حسب التمرين'],
  'レベルが上がっているかは、この線の傾きで確認': ['Improving = this line going up', '线越高代表越进步', 'Mejorar = esta línea sube', 'التحسن يعني صعود هذا الخط'],
  'デイリーサマリー': ['Daily summary', '每日总览', 'Resumen diario', 'الملخص اليومي'],
  '全習慣 × 日(直近4週)。濃さ = その日の量(各習慣の最大値比)。睡眠や仕事と並べると、習慣の維持に何が効いているかが見えてくる': ['All habits × days (last 4 weeks). Darker = more that day. Compare with sleep or work to see what keeps you consistent', '全部习惯 × 日(近4周)。颜色越深当天做得越多。与睡眠、工作对照可发现坚持的关键', 'Hábitos × días (4 semanas). Más oscuro = más ese día. Compara con sueño o trabajo', 'العادات × الأيام (4 أسابيع). الأغمق = أكثر. قارن مع النوم أو العمل'],
  '気づき': ['Insights', '洞察', 'Hallazgos', 'ملاحظات'],
  '直近8週の記録から。相関であって因果ではない点に注意(参考)': ['From the last 8 weeks. Correlation, not causation (for reference)', '基于近8周记录。仅为相关而非因果(供参考)', 'De las últimas 8 semanas. Correlación, no causalidad', 'من آخر 8 أسابيع. ارتباط لا سببية (للاسترشاد)'],
  '{a}をやった日は、{b}が多い:': ['On days you did {a}, {b} was higher:', '做了{a}的日子,{b}更多:', 'Los días con {a}, {b} fue mayor:', 'في أيام {a}، كان {b} أعلى:'],
  '{a}をやった日は、{b}が少ない:': ['On days you did {a}, {b} was lower:', '做了{a}的日子,{b}更少:', 'Los días con {a}, {b} fue menor:', 'في أيام {a}، كان {b} أقل:'],
  '記録カレンダー': ['Activity calendar', '记录日历', 'Calendario', 'تقويم النشاط'],
  '全習慣の記録(直近15週)': ['All habits (last 15 weeks)', '全部习惯(近15周)', 'Todos los hábitos (15 semanas)', 'كل العادات (آخر 15 أسبوعًا)'],
  '少': ['Less', '少', 'Menos', 'أقل'],
  '多': ['More', '多', 'Más', 'أكثر'],
  '記録なし': ['No record', '无记录', 'Sin registro', 'لا سجل'],
  '{d}週: {v}': ['Wk {d}: {v}', '{d}周: {v}', 'Sem {d}: {v}', 'أسبوع {d}: {v}'],
  '回': ['×', '次', '×', '×'],

  /* ===== 習慣管理 ===== */
  '習慣の管理': ['Manage habits', '习惯管理', 'Gestionar hábitos', 'إدارة العادات'],
  '習慣と目標の追加・編集': ['Add and edit habits and goals', '添加和编辑习惯与目标', 'Añade y edita hábitos y metas', 'إضافة وتعديل العادات والأهداف'],
  'プリセットから選ぶか、そのまま下で自由に作成': ['Pick a preset, or create your own below', '选择预设,或在下方自由创建', 'Elige un preset o crea el tuyo abajo', 'اختر قالبًا أو أنشئ عادتك أدناه'],
  '筋トレ': ['Strength', '力量训练', 'Fuerza', 'تدريب القوة'],
  'ランニング': ['Running', '跑步', 'Correr', 'الجري'],
  'ウォーキング': ['Walking', '步行', 'Caminar', 'المشي'],
  '読書': ['Reading', '读书', 'Lectura', 'القراءة'],
  '100マス計算': ['Math drill', '百格计算', 'Cálculo mental', 'تمارين حساب'],
  '勉強': ['Study', '学习', 'Estudio', 'الدراسة'],
  '瞑想': ['Meditation', '冥想', 'Meditación', 'التأمل'],
  'ストレッチ': ['Stretching', '拉伸', 'Estiramientos', 'الإطالة'],
  '睡眠': ['Sleep', '睡眠', 'Sueño', 'النوم'],
  '仕事': ['Work', '工作', 'Trabajo', 'العمل'],
  '名前': ['Name', '名称', 'Nombre', 'الاسم'],
  '例: 筋トレ': ['e.g. Strength', '例如:力量训练', 'p. ej., Fuerza', 'مثال: تدريب القوة'],
  '絵文字': ['Emoji', '表情符号', 'Emoji', 'إيموجي'],
  '記録するもの': ['What to track', '记录内容', 'Qué registrar', 'ما الذي تسجّله'],
  'やった/やらない だけ': ['Done / not done only', '只记录做没做', 'Solo hecho / no hecho', 'فعلت / لم أفعل فقط'],
  '時間(分)': ['Time (min)', '时间(分钟)', 'Tiempo (min)', 'الوقت (دقيقة)'],
  '距離(km)': ['Distance (km)', '距离(km)', 'Distancia (km)', 'المسافة (كم)'],
  '量(回・ページなど自由な単位)': ['Amount (any unit: reps, pages…)', '数量(次数、页数等任意单位)', 'Cantidad (unidad libre)', 'الكمية (أي وحدة)'],
  '筋トレ(種目×セット×回数×重量)': ['Strength (exercise × sets × reps × weight)', '力量(动作×组×次×重量)', 'Fuerza (ejercicio × series × reps × peso)', 'قوة (تمرين × مجموعات × تكرارات × وزن)'],
  '単位(km・分・ページ・問 など)': ['Unit (km, min, pages…)', '单位(km、分钟、页等)', 'Unidad (km, min, páginas…)', 'الوحدة (كم، دقيقة، صفحة…)'],
  'ワンタップ記録の既定値': ['One-tap default value', '一键记录默认值', 'Valor por defecto', 'القيمة الافتراضية'],
  '値が小さいほど良い(100マス計算のタイムなど)': ['Lower is better (e.g. drill time)', '数值越小越好(如计时成绩)', 'Menor es mejor (p. ej., tiempos)', 'الأقل أفضل (مثل الأوقات)'],
  '週の目標回数': ['Weekly goal (times)', '每周目标次数', 'Meta semanal (veces)', 'الهدف الأسبوعي (مرات)'],
  '色': ['Color', '颜色', 'Color', 'اللون'],
  '週{n}回': ['{n}×/week', '每周{n}次', '{n}×/semana', '{n}×/أسبوع'],
  '・ 種目×セット×回数×重量を記録': ['・ tracks exercise × sets × reps × weight', '・ 记录动作×组×次×重量', '・ ejercicio × series × reps × peso', '・ تمرين × مجموعات × تكرارات × وزن'],
  '・ {u}を記録': ['・ tracks {u}', '・ 记录{u}', '・ registra {u}', '・ يسجّل {u}'],
  '(小さいほど良い)': ['(lower is better)', '(越小越好)', '(menor es mejor)', '(الأقل أفضل)'],
  '「{name}」と記録をすべて削除します。よろしいですか?': ['Delete “{name}” and all its records?', '删除“{name}”及其全部记录?', '¿Eliminar «{name}» y todos sus registros?', 'حذف «{name}» وكل سجلاتها؟'],
  '+ 習慣を追加': ['+ Add habit', '+ 添加习惯', '+ Añadir hábito', '+ أضف عادة'],
  '最近の記録': ['Recent logs', '最近记录', 'Registros recientes', 'السجلات الأخيرة'],
  'まだ記録がありません': ['No logs yet', '暂无记录', 'Sin registros aún', 'لا سجلات بعد'],
  '(削除済み)': ['(deleted)', '(已删除)', '(eliminado)', '(محذوف)'],

  /* ===== 設定 ===== */
  '同期・データ管理・共有': ['Sync, data and sharing', '同步、数据与分享', 'Sincronización, datos y compartir', 'المزامنة والبيانات والمشاركة'],
  '言語': ['Language', '语言', 'Idioma', 'اللغة'],
  'マルチデバイス同期': ['Multi-device sync', '多设备同步', 'Sincronización multi-dispositivo', 'مزامنة عدة أجهزة'],
  '🔄 同期中…': ['🔄 Syncing…', '🔄 同步中…', '🔄 Sincronizando…', '🔄 جارٍ المزامنة…'],
  '✅ 同期オン({who})': ['✅ Sync on ({who})', '✅ 已开启同步({who})', '✅ Sinc. activada ({who})', '✅ المزامنة مفعلة ({who})'],
  ' ・ 最終同期 {t}': [' ・ last sync {t}', ' ・ 上次同步 {t}', ' ・ última sinc. {t}', ' ・ آخر مزامنة {t}'],
  '今すぐ同期': ['Sync now', '立即同步', 'Sincronizar ahora', 'زامن الآن'],
  '同期を解除': ['Disconnect sync', '解除同步', 'Desconectar', 'إلغاء المزامنة'],
  '同期を解除しますか?(この端末のデータは残ります)': ['Disconnect sync? (Data on this device is kept)', '解除同步?(本机数据会保留)', '¿Desconectar? (Los datos locales se conservan)', 'إلغاء المزامنة؟ (تبقى بيانات هذا الجهاز)'],
  'スマホ・PCなど複数の端末で同じ記録を使えます。データは自分専用の保存先に入り、他の人からは見えません。': ['Use the same records on phone, PC and more. Data goes to your own private storage.', '手机、电脑等多设备共用同一份记录。数据存于你的私人空间,他人不可见。', 'Usa los mismos registros en varios dispositivos. Tus datos van a tu almacenamiento privado.', 'استخدم سجلاتك على عدة أجهزة. تُحفظ البيانات في مساحتك الخاصة فقط.'],
  '📧 メール / Google': ['📧 Email / Google', '📧 邮箱 / Google', '📧 Correo / Google', '📧 البريد / Google'],
  '🐙 GitHubで同期': ['🐙 GitHub sync', '🐙 GitHub同步', '🐙 Sinc. con GitHub', '🐙 مزامنة GitHub'],
  'Googleでログイン': ['Sign in with Google', '使用Google登录', 'Iniciar con Google', 'تسجيل الدخول بغوغل'],
  'または メールアドレスで': ['or with email', '或使用邮箱', 'o con correo', 'أو بالبريد الإلكتروني'],
  'メールアドレス': ['Email address', '邮箱地址', 'Correo electrónico', 'البريد الإلكتروني'],
  'パスワード(6文字以上)': ['Password (6+ chars)', '密码(至少6位)', 'Contraseña (6+ caracteres)', 'كلمة المرور (6 أحرف فأكثر)'],
  '新規登録': ['Sign up', '注册', 'Registrarse', 'إنشاء حساب'],
  'ログイン': ['Log in', '登录', 'Iniciar sesión', 'تسجيل الدخول'],
  '他の端末でも同じ方法でログインすれば、記録が自動で同期されます。': ['Log in the same way on other devices and your records sync automatically.', '在其他设备用同样方式登录即可自动同步。', 'Inicia sesión igual en otros dispositivos y se sincroniza solo.', 'سجّل الدخول بنفس الطريقة على أجهزتك الأخرى وستتم المزامنة تلقائيًا.'],
  'メールアドレスと6文字以上のパスワードを入力してください': ['Enter an email and a password of 6+ characters', '请输入邮箱和至少6位的密码', 'Introduce correo y contraseña de 6+ caracteres', 'أدخل بريدًا وكلمة مرور من 6 أحرف فأكثر'],
  'ログインに失敗しました': ['Login failed', '登录失败', 'Error al iniciar sesión', 'فشل تسجيل الدخول'],
  '引き継ぎコード(アカウント不要)': ['Transfer code (no account)', '迁移码(无需账号)', 'Código de traspaso (sin cuenta)', 'رمز النقل (بدون حساب)'],
  '今のデータをコードにして別の端末へコピーできます(1回きりの転送。自動同期はされません)。': ['Turn your data into a code and paste it on another device (one-time transfer, no auto-sync).', '把数据变成一段码,粘贴到另一台设备(一次性转移,不自动同步)。', 'Convierte tus datos en un código y pégalo en otro dispositivo (transferencia única).', 'حوّل بياناتك إلى رمز والصقه على جهاز آخر (نقل لمرة واحدة).'],
  '引き継ぎコードを作成': ['Create transfer code', '生成迁移码', 'Crear código', 'إنشاء رمز النقل'],
  'コードをコピーしました。別の端末に貼り付けてください': ['Code copied. Paste it on your other device', '已复制。请粘贴到另一台设备', 'Código copiado. Pégalo en el otro dispositivo', 'تم نسخ الرمز. الصقه على جهازك الآخر'],
  '下のコードを全選択してコピーしてください': ['Select all the code below and copy it', '请全选下方代码并复制', 'Selecciona todo el código y cópialo', 'حدد الرمز أدناه كاملاً وانسخه'],
  '別の端末で作ったコードをここに貼り付け': ['Paste the code from your other device here', '把另一台设备生成的码粘贴到这里', 'Pega aquí el código del otro dispositivo', 'الصق هنا الرمز من جهازك الآخر'],
  'コードを取り込む': ['Import code', '导入迁移码', 'Importar código', 'استيراد الرمز'],
  '取り込みました(既存の記録とマージ済み)': ['Imported (merged with existing records)', '已导入(已与现有记录合并)', 'Importado (fusionado con lo existente)', 'تم الاستيراد (تم الدمج مع السجلات الحالية)'],
  '引き継ぎコードの形式が違います': ['Invalid transfer code format', '迁移码格式不正确', 'Formato de código no válido', 'صيغة رمز النقل غير صحيحة'],
  '引き継ぎコードの内容が壊れています': ['Transfer code data is corrupted', '迁移码内容已损坏', 'El contenido del código está dañado', 'محتوى رمز النقل تالف'],
  '読み込みに失敗しました': ['Failed to import', '导入失败', 'Error al importar', 'فشل الاستيراد'],
  '友達に教える': ['Share with friends', '推荐给朋友', 'Compartir con amigos', 'شارك مع الأصدقاء'],
  'このアプリは登録不要・無料で誰でも使えます。リンクを送るだけでOK。相手の記録は相手の端末だけに保存され、あなたのデータとは完全に別です。': ['Free, no sign-up — just send the link. Their records stay on their device, fully separate from yours.', '免费、无需注册,发个链接即可。对方的记录只存在对方设备上,与你的数据完全独立。', 'Gratis y sin registro: solo envía el enlace. Sus registros quedan en su dispositivo.', 'مجاني وبدون تسجيل — أرسل الرابط فقط. سجلات أصدقائك تبقى على أجهزتهم.'],
  'アプリのリンクを共有': ['Share app link', '分享应用链接', 'Compartir enlace', 'مشاركة رابط التطبيق'],
  'リンクをコピーしました。友達に貼り付けて送ってください!': ['Link copied. Paste and send it to a friend!', '已复制链接,发给朋友吧!', '¡Enlace copiado! Envíaselo a tus amigos', 'تم نسخ الرابط. أرسله لأصدقائك!'],
  'データ': ['Data', '数据', 'Datos', 'البيانات'],
  'エクスポート(JSON)': ['Export (JSON)', '导出(JSON)', 'Exportar (JSON)', 'تصدير (JSON)'],
  'インポート': ['Import', '导入', 'Importar', 'استيراد'],
  '現在のデータをインポート内容で置き換えます。よろしいですか?': ['Replace current data with the imported file?', '用导入内容替换当前数据?', '¿Reemplazar los datos actuales con el archivo?', 'استبدال البيانات الحالية بالملف المستورد؟'],
  'ファイル形式が正しくありません': ['Invalid file format', '文件格式不正确', 'Formato de archivo no válido', 'صيغة الملف غير صحيحة'],
  'ファイルを読み込めませんでした': ['Could not read the file', '无法读取文件', 'No se pudo leer el archivo', 'تعذّرت قراءة الملف'],
  'データはこの端末のブラウザ内(+設定した同期先)に保存されます。': ['Data is stored in this browser (plus your configured sync target).', '数据保存在本机浏览器内(以及所设置的同步端)。', 'Los datos se guardan en este navegador (y tu destino de sinc.).', 'تُحفظ البيانات في هذا المتصفح (وفي وجهة المزامنة).'],
  '確認に失敗しました': ['Check failed', '检查失败', 'Error al comprobar', 'فشل التحقق'],
  'メール同期は現在準備中です。GitHubでの同期か、下の「引き継ぎコード」を使ってください。': ['Email sync is not set up yet. Use GitHub sync or the transfer code below.', '邮箱同步尚未开通。请用GitHub同步或下方迁移码。', 'La sinc. por correo no está lista. Usa GitHub o el código de traspaso.', 'مزامنة البريد غير متاحة بعد. استخدم GitHub أو رمز النقل أدناه.'],
  'GitHub → Settings → Developer settings → Personal access tokens → {b} → Generate new token': ['GitHub → Settings → Developer settings → Personal access tokens → {b} → Generate new token', 'GitHub → Settings → Developer settings → Personal access tokens → {b} → Generate new token', 'GitHub → Settings → Developer settings → Personal access tokens → {b} → Generate new token', 'GitHub → Settings → Developer settings → Personal access tokens → {b} → Generate new token'],
  'スコープは {b} だけにチェックして生成': ['Check only the {b} scope and generate', '只勾选 {b} 权限并生成', 'Marca solo el permiso {b} y genera', 'حدد صلاحية {b} فقط ثم أنشئ'],
  'トークンを下に貼り付け(他の端末でも同じトークンを貼るだけ)': ['Paste the token below (same token on your other devices)', '把令牌粘贴到下方(其他设备粘贴同一令牌即可)', 'Pega el token abajo (el mismo en otros dispositivos)', 'الصق الرمز أدناه (نفس الرمز على أجهزتك الأخرى)'],
  'ghp_… トークンを貼り付け': ['Paste ghp_… token', '粘贴 ghp_… 令牌', 'Pega el token ghp_…', 'الصق رمز ghp_…'],
  '同期を開始': ['Start syncing', '开始同步', 'Iniciar sincronización', 'بدء المزامنة'],
  'データは自分のGitHubアカウントの非公開Gistに保存されます。トークンはこの端末のブラウザ内にのみ保存されます。': ['Data is stored in a secret Gist on your GitHub account. The token stays in this browser only.', '数据保存在你GitHub账号的私密Gist中。令牌只存于本机浏览器。', 'Los datos van a un Gist secreto de tu GitHub. El token queda solo en este navegador.', 'تُحفظ البيانات في Gist سري بحسابك على GitHub. يبقى الرمز في هذا المتصفح فقط.'],
  '{d}週: {n}回': ['Wk {d}: {n}×', '{d}周: {n}次', 'Sem {d}: {n}×', 'أسبوع {d}: {n}×'],
  '{d}週: 記録なし': ['Wk {d}: no record', '{d}周: 无记录', 'Sem {d}: sin registro', 'أسبوع {d}: لا سجل'],
  '{d} {name}: {v}': ['{d} {name}: {v}', '{d} {name}: {v}', '{d} {name}: {v}', '{d} {name}: {v}'],
  '{d} {name}: 記録なし': ['{d} {name}: no record', '{d} {name}: 无记录', '{d} {name}: sin registro', '{d} {name}: لا سجل'],
  'トークンが無効です。作り直して貼り直してください': ['Invalid token. Create a new one and paste it again', '令牌无效。请重新生成并粘贴', 'Token no válido. Crea uno nuevo y pégalo', 'الرمز غير صالح. أنشئ واحدًا جديدًا والصقه'],
  '同期先の確認に失敗しました ({s})': ['Failed to reach sync storage ({s})', '同步目标检查失败({s})', 'No se pudo verificar el destino ({s})', 'فشل التحقق من وجهة المزامنة ({s})'],
  '同期先の作成に失敗しました ({s})。トークンに「gist」権限があるか確認してください': ['Failed to create sync storage ({s}). Check the token has the gist scope', '创建同步目标失败({s})。请确认令牌有gist权限', 'No se pudo crear el destino ({s}). Revisa el permiso gist', 'فشل إنشاء وجهة المزامنة ({s}). تحقق من صلاحية gist'],
  '同期データの取得に失敗しました ({s})': ['Failed to fetch sync data ({s})', '获取同步数据失败({s})', 'Error al obtener datos ({s})', 'فشل جلب بيانات المزامنة ({s})'],
  '同期データの保存に失敗しました ({s})': ['Failed to save sync data ({s})', '保存同步数据失败({s})', 'Error al guardar datos ({s})', 'فشل حفظ بيانات المزامنة ({s})'],
  '同期に失敗しました': ['Sync failed', '同步失败', 'Error de sincronización', 'فشلت المزامنة'],
  'セッションの更新に失敗しました。同期を解除して再ログインしてください': ['Session refresh failed. Disconnect sync and log in again', '会话刷新失败。请解除同步后重新登录', 'Falló la sesión. Desconecta y vuelve a iniciar', 'فشل تحديث الجلسة. ألغِ المزامنة وسجّل الدخول مجددًا'],
  'このメールは登録済みです。「ログイン」を押してください': ['This email is already registered. Tap “Log in”', '该邮箱已注册。请点击“登录”', 'Ese correo ya existe. Pulsa «Iniciar sesión»', 'هذا البريد مسجّل. اضغط «تسجيل الدخول»'],
  'メールアドレスかパスワードが違います': ['Wrong email or password', '邮箱或密码错误', 'Correo o contraseña incorrectos', 'البريد أو كلمة المرور غير صحيحة'],
  'Googleログインに失敗しました: {e}': ['Google sign-in failed: {e}', 'Google登录失败: {e}', 'Error al iniciar con Google: {e}', 'فشل تسجيل الدخول بغوغل: {e}'],
  '最新バージョンの確認に失敗しました ({s})': ['Failed to check latest version ({s})', '检查最新版本失败({s})', 'Error al comprobar la versión ({s})', 'فشل التحقق من أحدث إصدار ({s})'],
  '更新の確認に失敗しました ({s})': ['Failed to check for updates ({s})', '检查更新失败({s})', 'Error al buscar actualizaciones ({s})', 'فشل التحقق من التحديثات ({s})'],
  '不明': ['Unknown', '未知', 'Desconocido', 'غير معروف'],
  '習慣を追加すると統計が表示されます。': ['Add a habit to see stats.', '添加习惯后显示统计。', 'Añade un hábito para ver estadísticas.', 'أضف عادة لرؤية الإحصائيات.'],
  '詳しく ▸': ['Details ▸', '详情 ▸', 'Más ▸', 'التفاصيل ▸'],
  '開始': ['Start', '开始', 'Iniciar', 'ابدأ'],
  '再開': ['Resume', '继续', 'Reanudar', 'استئناف'],
  '詳しく記録する': ['Log with details', '详细记录', 'Registrar con detalles', 'تسجيل بالتفاصيل'],
  '詳しく': ['Details', '详情', 'Más', 'التفاصيل'],
  '破棄': ['Discard', '放弃', 'Descartar', 'تجاهل'],
  '解除': ['Disconnect', '解除', 'Desconectar', 'إلغاء'],
  '置き換える': ['Replace', '替换', 'Reemplazar', 'استبدال'],
  '先週 {n}回': ['Last week: {n}', '上周 {n}次', 'Semana pasada: {n}', 'الأسبوع الماضي: {n}'],
  '4週': ['4wk', '4周', '4sem', '4أ'],
  '12週': ['12wk', '12周', '12sem', '12أ'],
  '半年': ['6mo', '半年', '6m', '6ش'],
  '1年': ['1yr', '1年', '1a', 'سنة'],
  '直近{n}週 × 週{m}回の目標': ['Last {n} weeks × goal {m}/week', '近{n}周 × 每周{m}次目标', 'Últimas {n} semanas × meta {m}/sem', 'آخر {n} أسبوعًا × هدف {m}/أسبوع'],
  'まだ習慣がありません': ['No habits yet', '还没有习惯', 'Aún no hay hábitos', 'لا توجد عادات بعد'],
  '最初の習慣を追加して、今日から記録を始めましょう': ['Add your first habit and start logging today', '添加第一个习惯,今天就开始记录吧', 'Añade tu primer hábito y empieza hoy', 'أضف عادتك الأولى وابدأ التسجيل اليوم'],
  'QRコード(別の端末のカメラで読み取り)': ['QR code (scan with your other device)', '二维码(用另一台设备扫描)', 'Código QR (escanéalo con el otro dispositivo)', 'رمز QR (امسحه بجهازك الآخر)'],
  'データが大きいためQRコードは使えません。コードをコピーしてください': ['Data too large for a QR code — copy the code instead', '数据过大,无法生成二维码,请复制代码', 'Datos demasiado grandes para QR: copia el código', 'البيانات كبيرة جدًا لرمز QR — انسخ الرمز'],
  '同期接続時({at})に自動保存されたバックアップを今のデータに統合します(上書きではなく足し合わせ)。よろしいですか?': ['Merge the backup auto-saved when sync was connected ({at}) into your current data (added, not overwritten). Continue?', '将连接同步时({at})自动保存的备份合并到当前数据(合并而非覆盖)。继续吗?', 'Se combinará la copia guardada al conectar la sincronización ({at}) con tus datos actuales (se añade, no se sobrescribe). ¿Continuar?', 'سيتم دمج النسخة الاحتياطية المحفوظة عند ربط المزامنة ({at}) مع بياناتك الحالية (إضافة وليس استبدالًا). متابعة؟'],
  '復元': ['Restore', '恢复', 'Restaurar', 'استعادة'],
  'ログイン前のデータを復元': ['Restore pre-login data', '恢复登录前的数据', 'Restaurar datos previos al inicio de sesión', 'استعادة بيانات ما قبل تسجيل الدخول'],
  'バックアップを統合しました': ['Backup merged', '已合并备份', 'Copia de seguridad combinada', 'تم دمج النسخة الاحتياطية'],
  '禁煙': ['Quit smoking', '戒烟', 'Dejar de fumar', 'الإقلاع عن التدخين'],
  '禁酒': ['Quit drinking', '戒酒', 'Dejar de beber', 'الإقلاع عن الشرب'],
  'やめる習慣(禁煙・禁酒など。やってしまった日だけ記録)': ['Quitting habit (smoking, drinking… log only slip-ups)', '戒除类习惯(戒烟、戒酒等,只记录破戒的日子)', 'Hábito a dejar (fumar, beber… registra solo las recaídas)', 'عادة للإقلاع (تدخين، شرب… سجّل أيام الزلل فقط)'],
  'やってしまった': ['I slipped', '破戒了', 'Recaí', 'زللت'],
  '「{name}」を今日やってしまった記録をつけますか?継続{n}日はリセットされます': ['Log a slip-up for "{name}" today? Your {n}-day streak will reset', '要记录今天「{name}」破戒吗?连续{n}天将被重置', '¿Registrar una recaída de "{name}" hoy? Tu racha de {n} días se reiniciará', 'هل تسجّل زللًا في "{name}" اليوم؟ سيُعاد ضبط سلسلة {n} يومًا'],
  '🔥 {n}日継続中': ['🔥 {n}-day streak', '🔥 已坚持{n}天', '🔥 racha de {n} días', '🔥 مستمر منذ {n} يومًا'],
  '今日やってしまった: {n}回': ['Slipped today: {n}×', '今天破戒:{n}次', 'Recaídas hoy: {n}', 'زلل اليوم: {n} مرة'],
  'やめる習慣は、何もしなくても継続日数が自動で伸びていきます。やってしまった日だけここで記録してください。': ['With a quitting habit, your streak grows automatically — log only the days you slip up.', '戒除类习惯什么都不用做,坚持天数会自动增长。只在破戒的那天记录即可。', 'En un hábito a dejar, la racha crece sola: registra solo los días de recaída.', 'في عادة الإقلاع تنمو السلسلة تلقائيًا — سجّل فقط أيام الزلل.'],
  'やってしまったを記録': ['Log slip-up', '记录破戒', 'Registrar recaída', 'تسجيل الزلل'],
  '例: 飲み会でつい1本': ['e.g. one at a party', '例:聚会时没忍住', 'p. ej., una en la fiesta', 'مثال: واحدة في حفلة'],
  'やめる習慣 ・ やってしまった日だけ記録': ['Quitting habit — log only slip-ups', '戒除类习惯・只记录破戒日', 'Hábito a dejar: registra solo recaídas', 'عادة إقلاع — سجّل الزلل فقط'],
  '継続日数': ['Current streak', '坚持天数', 'Racha actual', 'أيام الاستمرار'],
  '今日から積み上げよう': ['Build it up from today', '从今天开始积累吧', 'Empieza a sumar desde hoy', 'ابدأ التراكم من اليوم'],
  'ベスト継続': ['Best streak', '最佳纪录', 'Mejor racha', 'أفضل سلسلة'],
  '🎉 記録更新中!': ['🎉 New record!', '🎉 正在刷新纪录!', '🎉 ¡Récord en curso!', '🎉 رقم قياسي جديد!'],
  '記録更新を目指そう': ['Aim for a new record', '向新纪录冲刺吧', 'Ve a por un nuevo récord', 'اسعَ لرقم قياسي جديد'],
  '今週のスリップ': ['Slips this week', '本周破戒', 'Recaídas esta semana', 'زلل هذا الأسبوع'],
  'あと{n}XP({m}日)': ['{n} XP to go ({m} days)', '还差{n}XP({m}天)', 'Faltan {n} XP ({m} días)', 'باقٍ {n} نقطة ({m} يومًا)'],
  '週別のスリップ回数': ['Slips per week', '每周破戒次数', 'Recaídas por semana', 'الزلل أسبوعيًا'],
  'やってしまった回数。少ないほど良い(直近{n}週)': ['Slip-ups per week — fewer is better (last {n} weeks)', '破戒次数,越少越好(近{n}周)', 'Recaídas por semana: menos es mejor (últimas {n} semanas)', 'مرات الزلل — الأقل أفضل (آخر {n} أسبوعًا)'],
  'クリア': ['Clean', '坚持住了', 'Limpio', 'نظيف'],
  '分': ['min', '分钟', 'min', 'د'],
  '時間': ['h', '小时', 'h', 'س'],
  'ページ': ['pg', '页', 'pág', 'صفحة'],
  '秒': ['s', '秒', 's', 'ث'],
}

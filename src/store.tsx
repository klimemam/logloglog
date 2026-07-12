import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { AppData, Entry, Habit } from './types'
import { nowTime, todayKey } from './lib/dates'

const STORAGE_KEY = 'logloglog:v1'

const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const defaultHabits = (): Habit[] => [
  {
    id: uid(),
    name: '筋トレ',
    emoji: '💪',
    colorSlot: 0,
    kind: 'strength',
    metric: 'reps',
    unit: 'セット',
    weeklyTarget: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: uid(),
    name: 'ランニング',
    emoji: '🏃',
    colorSlot: 1,
    metric: 'distance',
    unit: 'km',
    weeklyTarget: 2,
    defaultValue: 5,
    createdAt: new Date().toISOString(),
  },
]

const load = (): AppData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as AppData
      if (data.version === 1 && Array.isArray(data.habits) && Array.isArray(data.entries)) {
        return data
      }
    }
  } catch {
    // 壊れたデータは初期状態で上書きせず、読み込みだけ諦める
  }
  return { version: 1, habits: defaultHabits(), entries: [] }
}

type Action =
  | {
      type: 'addEntry'
      habitId: string
      value?: number
      note?: string
      date?: string
      exercise?: string
      sets?: number
      reps?: number
      weight?: number
      setsDetail?: import('./types').SetRecord[]
    }
  | { type: 'deleteEntry'; entryId: string }
  | { type: 'addHabit'; habit: Omit<Habit, 'id' | 'createdAt'> }
  | { type: 'updateHabit'; habit: Habit }
  | { type: 'deleteHabit'; habitId: string }
  | { type: 'import'; data: AppData }

const reducer = (state: AppData, action: Action): AppData => {
  switch (action.type) {
    case 'addEntry': {
      const entry: Entry = {
        id: uid(),
        habitId: action.habitId,
        date: action.date ?? todayKey(),
        time: nowTime(),
        value: action.value,
        note: action.note,
        exercise: action.exercise,
        sets: action.sets,
        reps: action.reps,
        weight: action.weight,
        setsDetail: action.setsDetail,
        createdAt: new Date().toISOString(),
      }
      return { ...state, entries: [...state.entries, entry] }
    }
    case 'deleteEntry':
      return { ...state, entries: state.entries.filter((e) => e.id !== action.entryId) }
    case 'addHabit': {
      const habit: Habit = { ...action.habit, id: uid(), createdAt: new Date().toISOString() }
      return { ...state, habits: [...state.habits, habit] }
    }
    case 'updateHabit':
      return {
        ...state,
        habits: state.habits.map((h) => (h.id === action.habit.id ? action.habit : h)),
      }
    case 'deleteHabit':
      return {
        ...state,
        habits: state.habits.filter((h) => h.id !== action.habitId),
        entries: state.entries.filter((e) => e.habitId !== action.habitId),
      }
    case 'import':
      return action.data
  }
}

interface Store {
  data: AppData
  dispatch: (action: Action) => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // ストレージ満杯などは無視(次の保存で再挑戦)
    }
  }, [data])

  const store = useMemo(() => ({ data, dispatch }), [data])
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used within StoreProvider')
  return store
}

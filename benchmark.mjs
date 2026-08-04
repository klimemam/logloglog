import { performance } from 'perf_hooks';

// Simulate the data structure
const data = { entries: [] };
const habit = { id: 'test-habit', kind: 'strength', metric: 'reps', unit: 'set', name: 'Test' };

const today = new Date().toISOString().split('T')[0];

for (let i = 0; i < 10000; i++) {
  data.entries.push({
    id: `entry-${i}`,
    habitId: i % 2 === 0 ? 'test-habit' : 'other-habit',
    date: today,
    value: Math.floor(Math.random() * 10),
    exercise: i % 3 === 0 ? 'Pushup' : undefined
  });
}

// Dummy functions to simulate lib/stats
function aggregateByDay(entries) {
  return entries.reduce((acc, e) => {
    acc[e.date] = (acc[e.date] || 0) + (e.value || 0);
    return acc;
  }, {});
}
function currentStreak(agg) {
  return Object.keys(agg).length;
}
function quitStats(habit, entries) {
  return { current: 0 };
}
function thisWeekProgress(entries, habit) {
  return 0;
}

function simulateRenderBeforeUseMemo() {
  const entries = data.entries.filter((e) => e.habitId === habit.id)
  const todayEntries = entries.filter((e) => e.date === today)
  const todayValue = todayEntries.reduce((s, e) => s + (e.value ?? 0), 0)
  const isStrength = habit.kind === 'strength'
  const isQuit = habit.kind === 'quit'
  const streak = isQuit ? quitStats(habit, entries).current : currentStreak(aggregateByDay(entries))
  const week = thisWeekProgress(data.entries, habit)
  const todayExercises = new Set(todayEntries.map((e) => e.exercise).filter(Boolean)).size
  return { entries, todayEntries, todayValue, isStrength, isQuit, streak, week, todayExercises };
}

// simulate 100 re-renders
const startBefore = performance.now();
for (let i = 0; i < 100; i++) {
  simulateRenderBeforeUseMemo();
}
const endBefore = performance.now();
console.log(`Before useMemo (100 renders, 10000 entries): ${(endBefore - startBefore).toFixed(2)} ms`);

// Simulate useMemo by doing it once for the same props/state
const startAfter = performance.now();
const memoizedResult = simulateRenderBeforeUseMemo();
for (let i = 0; i < 99; i++) {
  // reusing memoizedResult
  const x = memoizedResult;
}
const endAfter = performance.now();
console.log(`After useMemo (100 renders, 10000 entries): ${(endAfter - startAfter).toFixed(2)} ms`);

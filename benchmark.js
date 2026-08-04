const iterations = 100000;

function runBaseline(rows) {
  let done, reps, weight;
  for (let i = 0; i < iterations; i++) {
    done = rows
      .filter((r) => r.done)
      .map((r) => ({ weight: Number(r.weight) || undefined, reps: Number(r.reps) || 0 }))
      .filter((s) => s.reps > 0);
    if (!done.length) continue;
    const weights = done.filter((s) => s.weight != null).map((s) => s.weight);
    reps = Math.max(...done.map((s) => s.reps));
    weight = weights.length ? Math.max(...weights) : undefined;
  }
  return { done, reps, weight };
}

function runOptimized(rows) {
  let done, maxReps, weight, hasWeight;
  for (let i = 0; i < iterations; i++) {
    maxReps = 0;
    let maxWeight = -Infinity;
    hasWeight = false;
    done = rows.reduce((acc, r) => {
      if (r.done) {
        const reps = Number(r.reps) || 0;
        if (reps > 0) {
          const w = Number(r.weight) || undefined;
          acc.push({ weight: w, reps });
          if (reps > maxReps) maxReps = reps;
          if (w != null && w > maxWeight) {
            maxWeight = w;
            hasWeight = true;
          }
        }
      }
      return acc;
    }, []);
    if (!done.length) continue;
    weight = hasWeight ? maxWeight : undefined;
  }
  return { done, reps: maxReps, weight };
}

const rows = [
  { done: true, reps: "10", weight: "50" },
  { done: false, reps: "12", weight: "50" },
  { done: true, reps: "8", weight: "55" },
  { done: true, reps: "0", weight: "60" },
  { done: true, reps: "5", weight: "60" },
  { done: true, reps: "10", weight: null },
  { done: false, reps: "10", weight: "65" },
  { done: true, reps: "12", weight: "65" }
];

console.log("Warming up...");
runBaseline(rows);
runOptimized(rows);

console.log("Benchmarking Baseline...");
const startBase = performance.now();
runBaseline(rows);
const endBase = performance.now();
console.log(`Baseline time: ${(endBase - startBase).toFixed(2)} ms`);

console.log("Benchmarking Optimized...");
const startOpt = performance.now();
runOptimized(rows);
const endOpt = performance.now();
console.log(`Optimized time: ${(endOpt - startOpt).toFixed(2)} ms`);

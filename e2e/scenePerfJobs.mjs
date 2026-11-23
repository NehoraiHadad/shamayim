// Observe the real PaintResult.ms values without changing the Worker or either revision's queue.
export function installPaintJobProbe() {
  const original = Worker.prototype.postMessage
  const batches = new WeakMap()
  let step
  window.__paintJobs = {
    begin() { step = { land: 0, sky: 0, paired: 0 } },
    end() { const done = step; step = undefined; return done },
  }
  Worker.prototype.postMessage = function (request, ...rest) {
    if (step && Array.isArray(request?.jobs)) {
      let pending = batches.get(this)
      if (!pending) {
        batches.set(this, pending = new Map())
        this.addEventListener('message', ({ data }) => {
          const batch = pending.get(data?.batch)
          if (!batch) return
          pending.delete(data.batch)
          for (const [i, result] of data.results.entries()) {
            const job = batch.jobs[i]
            batch.step[job.desc.surface === 'land' ? 'land' : 'sky'] += result.ms
            // A paired job is counted once under land. Its total is also reported for diagnosis.
            if (job.shade) batch.step.paired += result.ms
          }
        })
      }
      pending.set(request.batch, { step, jobs: request.jobs })
    }
    return original.call(this, request, ...rest)
  }
}

export async function measurePaintJobs(page) {
  await page.evaluate(installPaintJobProbe)
  return page.evaluate(async () => {
    const samples = []
    for (let hour = 6; hour < 18; hour++) {
      window.__paintJobs.begin()
      window.__scene.scrub(`2026-11-17T${String(hour).padStart(2, '0')}:24`)
      await window.__scene.settled()
      samples.push(window.__paintJobs.end())
    }
    return samples
  })
}

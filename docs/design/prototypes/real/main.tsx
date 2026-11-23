import '@fontsource/assistant/400.css'
import '@fontsource/assistant/600.css'
import '../../../../src/ui/tokens.css'
import { createRoot } from 'react-dom/client'
import { harnessPlace } from '../../../../src/dev/sceneFixture'
import { loadInput, SceneHarness } from '../../../../src/dev/sceneHarness'
import type { LocalTime } from '../../../../src/domain/types'
import { PAINTERS } from '../../../../src/scene/paint/painters'
import { makeWorldBuilder } from '../../../../src/world/world'
import { CONCEPT } from './concept'
import { readFacts } from './facts'
import { watchSky } from './skyGrade'

/*
 * The real style's concept page: the scene harness itself (same world, model, surfaces, overlay), with the concept's
 * painters laid over the real hand's for this page only. `?paint=main` is needed (the worker has its own registry); the
 * runner is `stills.mjs`. `?only=plane,canopy` keeps some painters, for a before/after of one layer.
 */
async function start() {
  const params = new URLSearchParams(location.search)
  const place = harnessPlace(params)
  if (!place) throw new Error(`unknown place ${params.get('place')}`)
  const input = await loadInput(place, (params.get('at') ?? '') as LocalTime, params.get('weather') ?? '')
  readFacts(makeWorldBuilder()(input))
  const only = params.get('only')?.split(',')
  const kept = Object.fromEntries(Object.entries(CONCEPT).filter(([kind]) => !only || only.includes(kind)))
  Object.assign(PAINTERS.real, kept)
  if (!only || only.includes('sky')) watchSky()
  createRoot(document.getElementById('root')!).render(<SceneHarness />)
}

start().catch((err: unknown) => {
  (window as Window & { __sceneError?: string }).__sceneError = String(err)
})

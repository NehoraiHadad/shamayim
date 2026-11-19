import { useMemo, useState } from 'react'
import { makeWorldBuilder } from '../../world/world'
import type { WorldInput, WorldState } from '../../world/types'

/**
 * The world state for the canvas scene (docs/design/CANVAS-SCENE-PLAN.md §1e), built once per change of its inputs and
 * shared by the sky and the land. Each part is kept while its own inputs stay the same object (`makeWorldBuilder`).
 * Null when the input is (the flag is off, or the forecast is not there yet): nothing is built.
 */
export function useWorld(input: WorldInput | null): WorldState | null {
  const [build] = useState(makeWorldBuilder)
  return useMemo(() => (input ? build(input) : null), [build, input])
}

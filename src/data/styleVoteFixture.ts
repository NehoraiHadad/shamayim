import { vi } from 'vitest'
import { createStyleVote, type SendVote } from './styleVote'
import { VOTE_ROUND } from './styleVoteRound'

export const ID = '00000000-0000-4000-8000-000000000001'
export const STYLE_KEY = 'shamayim:scene-style:v1'
export const VOTE_KEY = `shamayim:style-vote:${VOTE_ROUND}`

/** Local storage in memory. */
export function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
}

export const open = (send: SendVote, store: ReturnType<typeof memoryStore> | null = memoryStore(), id = ID) =>
  createStyleVote(send, store, () => id)

/** A send that waits for the answer of the test. */
export function slowSend() {
  const answers: ((ok: boolean) => void)[] = []
  return { answers, send: vi.fn<SendVote>(() => new Promise((resolve) => answers.push(resolve))) }
}

/** Lets the promise chain of a send settle. */
export const settle = () => new Promise((resolve) => setTimeout(resolve))

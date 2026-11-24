/**
 * Temporary: what a vote is about, shared by the app and the Worker, so it imports nothing (the scene's own list of styles
 * comes with every painter).
 */

/**
 * Votes of different rounds never mix. Change it in any release that changes how a style looks after voting began, and
 * deploy the Worker first.
 */
export const VOTE_ROUND = 'v2'

/** The styles voted on and their names; the code knows none by its id (`src/test/architecture.ts`). */
export const VOTE_NAMES = { real: 'מציאותי', drawn: 'מאויר' }
export type VoteStyle = keyof typeof VOTE_NAMES
export const VOTE_STYLES = Object.keys(VOTE_NAMES) as readonly VoteStyle[]

export const isVoteStyle = (value: unknown): value is VoteStyle => VOTE_STYLES.includes(value as VoteStyle)

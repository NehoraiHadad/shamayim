/**
 * Temporary: what a vote is about, shared by the app and the Worker, so it imports nothing (the scene's own list of styles
 * comes with every painter).
 */

/**
 * Votes of different rounds never mix. Change it in any release that changes how a style looks after voting began, and
 * deploy the Worker first.
 */
export const VOTE_ROUND = 'v2'

export const VOTE_STYLES = ['real', 'drawn'] as const
export type VoteStyle = (typeof VOTE_STYLES)[number]

export const isVoteStyle = (value: unknown): value is VoteStyle => VOTE_STYLES.includes(value as VoteStyle)

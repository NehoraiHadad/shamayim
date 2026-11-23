/**
 * Temporary: which drawings a vote is about; votes of different rounds never mix. Change it in any release that changes
 * how a style looks after voting began, and deploy the Worker (which reads it from here) first.
 */
export const VOTE_ROUND = 'v2'

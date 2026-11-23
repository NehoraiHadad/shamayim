//# allFunctionsCalledOnLoad
/** Shared cutoff for painted plants and the tone bytes that invalidate their canvases. */
export const plantVisible = (alpha: number) => alpha > 0.02

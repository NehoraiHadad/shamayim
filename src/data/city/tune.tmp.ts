export const T = { f: .25, end: 1, cap: 'm', decor: 0, ss: 0, rise: 99, enc: 0, pitch: 1, order: 'near', tower: 1, scale: 1,
  ...JSON.parse((import.meta.env?.VITE_TUNE as string | undefined) ?? '{}') } as Record<string, number | string>
export const N = (key: string) => T[key] as number

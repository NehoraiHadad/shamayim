export const T = { least: 2.2, salt: 0, allfront: 0, order: 0, coll: .11,
  ...JSON.parse((import.meta.env?.VITE_TUNE as string | undefined) ?? '{}') } as Record<string, number>
export const N = (key: string) => T[key]

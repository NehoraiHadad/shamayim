/** The last `most` results of a pure function, by key: a hit is the same as making it again. */
export function kept<T>(most: number): (key: string, make: () => T) => T {
  const held = new Map<string, T>()
  return (key, make) => {
    const known = held.get(key)
    if (known !== undefined) {
      held.delete(key)
      held.set(key, known)
      return known
    }
    const made = make()
    if (held.size >= most) held.delete(held.keys().next().value!)
    held.set(key, made)
    return made
  }
}

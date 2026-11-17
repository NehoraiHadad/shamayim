import styles from './marks.module.css'

/**
 * The place's own house types, drawn around the base point (x 0 centre, y 0 ground) with the sun on the LEFT; the
 * caller mirrors them for an east sun. Each has a lit face and a body face (ILLUSTRATION.md R4) and a two-plane roof.
 * References: moshav / Galilee village houses with red-tile gable and hip roofs; flat concrete roofs carrying a
 * solar water heater ("dud shemesh": a horizontal tank behind a tilted panel), seen on almost every Israeli roof.
 */
interface Shape { w: number; h: number }

function Gable({ w, h, turned }: Shape & { turned: boolean }) {
  const left = -w / 2
  const end = w * .42
  const wallH = h * .5
  if (turned) {
    return <>
      <rect className={styles.lit} x={left} y={-wallH} width={w - end} height={wallH} />
      <rect className={styles.wall} x={w / 2 - end} y={-wallH} width={end} height={wallH} />
      <path className={styles.wall} d={`M${w / 2 - end} ${-wallH}h${end}l${-end / 2} ${wallH - h}z`} />
      <path className={styles.roofLit} d={`M${left - .3} ${-wallH}L${left + .6} ${-h}H${w / 2 - end / 2}L${w / 2 - end} ${-wallH}z`} />
      <rect className={styles.shade} x={left} y={-wallH} width={w - end} height={.5} />
    </>
  }
  return <>
    <rect className={styles.lit} x={left} y={-wallH} width={end} height={wallH} />
    <path className={styles.lit} d={`M${left} ${-wallH}h${end}l${-end / 2} ${wallH - h}z`} />
    <rect className={styles.wall} x={left + end} y={-wallH} width={w - end} height={wallH} />
    <path className={styles.roof} d={`M${left + end / 2} ${-h}H${w / 2 - .6}L${w / 2 + .3} ${-wallH}H${left + end}z`} />
    <rect className={styles.roofLit} x={left + end / 2} y={-h} width={w / 2 - .6 - left - end / 2} height={.6} />
    <rect className={styles.shade} x={left + end} y={-wallH} width={w - end} height={.5} />
  </>
}

function Hip({ w, h }: Shape) {
  const left = -w / 2
  const wallH = h * .5
  return <>
    <rect className={styles.wall} x={left + .3} y={-wallH} width={w - .6} height={wallH} />
    <rect className={styles.lit} x={left + .3} y={-wallH} width={w * .38} height={wallH} />
    <path className={styles.roof} d={`M${left} ${-wallH}H${w / 2}L${w / 2 - 1.6} ${-h}H${left + 1.6}z`} />
    <path className={styles.roofLit} d={`M${left} ${-wallH}L${left + 1.6} ${-h}L${left + 2.8} ${-wallH}z`} />
    <rect className={styles.shade} x={left + .3 + w * .38} y={-wallH} width={w * .62 - .6} height={.5} />
  </>
}

/** Flat concrete roof: lit side face, parapet catching the light, often a solar water heater on top. */
export function FlatRoof({ w, h, heater }: Shape & { heater: boolean }) {
  const left = -w / 2
  const side = Math.min(2, w * .28)
  return <>
    <rect className={styles.wall} x={left} y={-h} width={w} height={h} />
    <rect className={styles.side} x={left} y={-h} width={side} height={h} />
    <rect className={styles.top} x={left} y={-h - .6} width={w} height={.6} />
    {heater && <>
      <rect className={styles.lit} x={w / 2 - 2.6} y={-h - 1.5} width={1.4} height={.9} />
      <path className={styles.wall} d={`M${w / 2 - 1} ${-h - .6}h1.1l-.6 -1.3h-1.1z`} />
    </>}
  </>
}

/** A village house by its seed: gable, hip, turned gable, or a flat roof with a heater. */
export function TileHouse({ w, h, seed }: Shape & { seed: number }) {
  const type = seed % 4
  if (type === 1) return <Hip w={w} h={h} />
  if (type === 2) return <FlatRoof w={w} h={h * .75} heater />
  return <Gable w={w} h={h} turned={type === 3} />
}

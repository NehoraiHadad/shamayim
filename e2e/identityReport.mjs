// The identity check's output: the images of what is not the same, `identity.json` (everything) and `identity.md`.
import fs from 'node:fs'
import path from 'node:path'
import { exactDiff } from './exactCompare.mjs'

/** A red result: the run fails on it. */
export const isRed = ({ verdict, firstDiffer }) => verdict === 'DIFF' || verdict === 'ERROR' || (verdict === 'unstable' && firstDiffer)

const pairText = ({ pixels, maxDelta, box, size }) => size ? `size ${size}`
  : pixels ? `${pixels} px, max ${maxDelta}, ${box.w}×${box.h} at ${box.x},${box.y}` : '0'

/** One line of stdout. */
export const lineOf = (result) => `${result.verdict.padEnd(8)} ${result.name}${result.retries ? ` (${result.retries} retried)` : ''}` +
  (result.error ? `  ${result.error}` : result.verdict === 'DIFF' || result.verdict === 'unstable'
    ? `  ${Object.entries(result.pairs).map(([pair, d]) => `${pair} ${pairText(d)}`).join('; ')}` : '')

/**
 * Writes a DIFF's or an unstable unit's first base and head, their diff, and the second loads where they differ from the
 * first (with that difference): over the backdrop that shows it.
 */
export async function writeImages(comparer, out, { verdict, name, pairs, shots }) {
  if (verdict !== 'DIFF' && verdict !== 'unstable') return
  const save = (what, png) => fs.writeFileSync(path.join(out, `${name.replace(/[^\w.+-]/g, '-')}.${what}.png`), png)
  const diff = async (a, b, what) => {
    const { pixels, backdrop } = pairs[`${a}/${b}`]
    if (pixels) save(what, await exactDiff(comparer, shots[a][backdrop], shots[b][backdrop]))
  }
  const shown = Object.values(pairs).find(({ pixels }) => pixels).backdrop
  for (const [tree, second] of [['base', 'base2'], ['head', 'head2']]) {
    save(tree, shots[`${tree}1`][shown])
    if (pairs[`${tree}1/${second}`].pixels) save(second, shots[second][shown])
    await diff(`${tree}1`, second, `${tree}-reload-diff`)
  }
  await diff('base1', 'head1', 'diff')
  if (!pairs['base1/head1'].pixels) await diff('base1', 'head2', 'diff')
}

const tally = (results) => {
  const counts = {}
  for (const { verdict } of results) counts[verdict] = (counts[verdict] ?? 0) + 1
  return Object.entries(counts).map(([verdict, n]) => `${n} ${verdict}`).join(', ') || '–'
}

/** The results in markdown: what is not the same in full, then a row for each moment, style and paint path. */
function markdown(run, results) {
  const loud = results.filter(({ verdict }) => verdict === 'DIFF' || verdict === 'unstable')
  const rows = new Map()
  for (const r of results) rows.set(r.row, [...(rows.get(r.row) ?? []), r])
  const cell = (list, kind) => tally(list.filter((r) => r.kind === kind))
  return ['# Style identity', '', `- base \`${run.base}\`, head \`${run.head}\``,
    `- Chromium ${run.chromium}, dpr ${run.dpr}, ${run.pages} pages at once, shard ${run.shard}, ${run.minutes.toFixed(1)} min`,
    `- decoded RGBA, byte for byte; styles: ${run.styles.join(', ')}; paint paths of the whole clip: ${run.paints.join(', ')}`,
    `- each layer alone (over black and over white), and the clip with its labels: ${run.layers.join(', ') || 'no paint path'}`,
    `- \`same\`: four fresh loads (base, head, base, head) all equal: ${run.controls === 'all' ? 'every unit' : 'the whole clips'}`,
    ...(run.controls === 'all' ? [] : ['- `equal`, `empty` (nothing shown): base and head equal in one fresh load each; four loads only where those differ']), '',
    `**${tally(results)}** (${results.filter(isRed).length} red, ${results.reduce((sum, r) => sum + (r.retries ?? 0), 0)} loads retried)`, '',
    ...results.filter((r) => r.error).map((r) => `- ERROR \`${r.name}\`: ${r.error}`),
    ...(loud.length ? ['## Not the same', '', `| unit | verdict | ${Object.keys(loud[0].pairs).join(' | ')} |`,
      `|---|---|${Object.keys(loud[0].pairs).map(() => '---|').join('')}`,
      ...loud.map((r) => `| ${r.name} | ${r.verdict}${r.verdict === 'unstable' ? (r.firstDiffer ? ', first loads differ' : ', first loads equal') : ''} | ` +
        `${Object.values(r.pairs).map(pairText).join(' | ')} |`), ''] : []),
    '## All', '', '| moment, style, paint | whole clip | with labels | layers alone |', '|---|---|---|---|',
    ...[...rows].map(([row, list]) => `| ${row} | ${cell(list, 'whole')} | ${cell(list, 'labels')} | ${cell(list, 'layer')} |`), ''].join('\n')
}

export function writeReport(out, run, results) {
  // The shots themselves are in the images; the hashes of the PNGs stay.
  fs.writeFileSync(path.join(out, 'identity.json'),
    JSON.stringify({ run, results: results.map((r) => ({ ...r, shots: undefined })) }, null, 1) + '\n')
  fs.writeFileSync(path.join(out, 'identity.md'), markdown(run, results))
  console.log(`\n${tally(results)}; ${results.filter(isRed).length} red; ${run.minutes.toFixed(1)} min`)
}

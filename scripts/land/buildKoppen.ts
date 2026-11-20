/**
 * Generates `src/data/land/koppenTable.json` from Beck et al. (2018) present-day (1980–2016)
 * Köppen–Geiger 0.5° global raster (`Beck_KG_V1_present_0p5.tif`).
 *
 * Provenance & verification:
 * - Paper: Beck, H. E. et al. (2018), *Scientific Data* 5:180214, DOI 10.1038/sdata.2018.214
 * - Dataset: Figshare DOI 10.6084/m9.figshare.6396959
 * - Archive URL: https://ndownloader.figshare.com/files/12407516 (`Beck_KG_V1.zip`, 70,961,149 B)
 *   - Archive MD5:    69594689d3cdd8323a0f74ce658125a1
 *   - Archive SHA256: a33f861200e32e80d5615bba1350ceeb8b0f5e6a6ffdc18b2d1715a3293d7b4b
 * - Source GeoTIFF inside archive: `Beck_KG_V1_present_0p5.tif` (720×360, 0.5° WGS84, uint8)
 *   - GeoTIFF SHA256: 4dcc0f4a6343af2ac354c4a9676262510c3a96acceab2d992a6c2f5e86659756
 *
 * Class mapping (Beck `legend.txt` values 1..30 -> 10 climate regimes; 0 = ocean/nodata):
 *   0           -> 0 (ocean/nodata, preserved explicitly)
 *   1..2        -> 1 ('A': Af, Am — tropical wet / monsoon)
 *   3           -> 2 ('w': Aw — tropical savanna / dry winter)
 *   4..5        -> 3 ('B': BWh, BWk — arid desert)
 *   6..7        -> 4 ('S': BSh, BSk — semi-arid steppe)
 *   8..10       -> 5 ('M': Csa, Csb, Csc — Mediterranean dry-summer)
 *   11..14      -> 6 ('H': Cwa, Cwb, Cwc, Cfa — humid subtropical / wet-summer)
 *   15..16      -> 7 ('C': Cfb, Cfc — oceanic / maritime temperate)
 *   17..20,25..28 -> 8 ('D': Dsa–Dsd, Dfa–Dfd — humid / dry-summer continental)
 *   21..24      -> 9 ('d': Dwa–Dwd — dry-winter continental)
 *   29..30      -> 10 ('E': ET, EF — polar / alpine tundra & frost)
 *
 * Aggregation & nodata rule:
 *   Exact 1:1 mapping on the native 0.5° grid (360 rows from 90°N to 90°S × 720 cols from 180°W
 *   to 180°E, no spatial coarsening). Ocean/nodata cells (0) stay 0 in the RLE table.
 *
 * Usage:
 *   npx tsx scripts/land/buildKoppen.ts [--tif path/to/Beck_KG_V1_present_0p5.tif]
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { fromArrayBuffer } from 'geotiff'
import { encodeLand } from '../../src/data/land/grid'

const ARCHIVE_URL = 'https://ndownloader.figshare.com/files/12407516'
const ARCHIVE_SHA256 = 'a33f861200e32e80d5615bba1350ceeb8b0f5e6a6ffdc18b2d1715a3293d7b4b'
const TIF_NAME = 'Beck_KG_V1_present_0p5.tif'
const TIF_SHA256 = '4dcc0f4a6343af2ac354c4a9676262510c3a96acceab2d992a6c2f5e86659756'
const OUT_PATH = path.resolve('src/data/land/koppenTable.json')

const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex')

/** Maps Beck et al. (2018) numeric class (0..30) to compact regime index (0=nodata, 1..10). */
export function mapBeckClass(v: number): number {
  if (v === 0) return 0
  if (v <= 2) return 1
  if (v === 3) return 2
  if (v <= 5) return 3
  if (v <= 7) return 4
  if (v <= 10) return 5
  if (v <= 14) return 6
  if (v <= 16) return 7
  if (v >= 21 && v <= 24) return 9
  if (v <= 28) return 8
  if (v <= 30) return 10
  return 0
}

async function loadTifBuffer(tifArg?: string): Promise<Buffer> {
  if (tifArg) return fs.readFileSync(path.resolve(tifArg))
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beck-kg-'))
  try {
    const zipPath = path.join(tmpDir, 'Beck_KG_V1.zip')
    const res = await fetch(ARCHIVE_URL)
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)
    const zipBuf = Buffer.from(await res.arrayBuffer())
    const gotZip = sha256(zipBuf)
    if (gotZip !== ARCHIVE_SHA256) throw new Error(`Archive SHA256 mismatch: ${gotZip}`)
    fs.writeFileSync(zipPath, zipBuf)
    execFileSync('tar', ['-xf', zipPath, '-C', tmpDir, TIF_NAME])
    return fs.readFileSync(path.join(tmpDir, TIF_NAME))
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { tif: { type: 'string' } } })
  const tifBuf = await loadTifBuffer(values.tif)
  const gotSha = sha256(tifBuf)
  if (gotSha !== TIF_SHA256) throw new Error(`GeoTIFF SHA256 mismatch: expected ${TIF_SHA256}, got ${gotSha}`)

  const ab = tifBuf.buffer.slice(tifBuf.byteOffset, tifBuf.byteOffset + tifBuf.byteLength)
  const tiff = await fromArrayBuffer(ab)
  const img = await tiff.getImage()
  const cols = img.getWidth(), rows = img.getHeight()
  if (cols !== 720 || rows !== 360) throw new Error(`Unexpected raster shape ${cols}×${rows}`)

  const raw = (await img.readRasters())[0] as Uint8Array
  const mapped = new Uint8Array(rows * cols)
  for (let i = 0; i < raw.length; i++) mapped[i] = mapBeckClass(raw[i])

  const out = {
    v: 1,
    source: 'Beck et al. (2018) Scientific Data 5:180214 — Beck_KG_V1_present_0p5.tif (1980-2016)',
    url: ARCHIVE_URL,
    tifSha256: TIF_SHA256,
    stepDeg: 0.5,
    rows,
    cols,
    codes: ['0', 'A', 'w', 'B', 'S', 'M', 'H', 'C', 'D', 'd', 'E'],
    r: encodeLand(mapped),
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(out))
  console.log(`Wrote ${OUT_PATH} (${rows}×${cols}, ${(fs.statSync(OUT_PATH).size / 1024).toFixed(1)} KB)`)
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('buildKoppen.ts')) {
  void main()
}

import { survey } from './survey'

const input = process.argv[2]
if (!input) throw new Error('Usage: tsx scripts/city/measure.ts city.geojsonseq')
console.table(await survey(input))

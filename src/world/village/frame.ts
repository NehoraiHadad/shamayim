import type { OutsideFrame } from '../../data/city/outsideView'
import { HOUSE_M } from '../../data/village/cellSource'
import { LAT_M } from '../../data/village/houseCode'
import { LAND_STEP } from '../../data/land/grid'
import type { SettlementSource } from '../../data/village/settlement'
import { widthOf } from './room'
import { mixed, villageShare } from './share'

/** The eye stands this many times the settlement's depth (or half its width) back, as for a city (`outsideView`). */
const BACK = 1.4
/** A settlement is taken as at least this wide and deep, km: a single street has a depth. */
const LEAST_KM = .12
/** A house is drawn this many times its real width, and never narrower than this (px). */
const ENLARGE = 2.2, LEGIBLE_PX = 4
/** How far its spots' own ground reaches past their middles, km: half a cell's, half a house's. */
const PAST_KM = { cells: LAND_STEP * LAT_M / 2000, footprints: HOUSE_M / 2000 } as const

export interface VillageFrame {
  frame: OutsideFrame
  /** How much of it is the village's: 1 a village, 0 a town's picture untouched. */
  share: number
  wideKm: number; deepKm: number
  widthPx: number
  /** Px per metre across at the middle depth, and the typical house's width there. */
  ppm: number
  housePx: number
}

/** A side at least `LEAST_KM` long, grown evenly about its middle. */
function side(from: number, to: number, past: number): [number, number] {
  const more = Math.max(past, (LEAST_KM - (to - from)) / 2)
  return [from - more, to + more]
}

function ownFrame({ kind, group }: SettlementSource, sceneW: number, centerX: number) {
  const [w, e] = side(group.w, group.e, PAST_KM[kind]), [s, n] = side(group.s, group.n, PAST_KM[kind])
  const widthPx = widthOf(e - w, Math.max(e, -w), sceneW)
  const backKm = BACK * Math.max(n - s, (e - w) / 2), midDepth = backKm + (n - s) / 2
  return { w, e, s, n, eyeN: n + backKm, backKm, f: widthPx * midDepth / (e - w), centerX, midDepth, k: widthPx / (e - w) / 1000 }
}

/**
 * The frame of a settlement on its own linked group: the village's where it is one, the town's own (`town`, unchanged, the
 * same object) where it is a town's, and between them for what is between.
 */
export function villageFrame(source: SettlementSource, town: OutsideFrame, sceneW: number): VillageFrame {
  const share = villageShare(source.group.extentKm), own = ownFrame(source, sceneW, town.centerX)
  const frame: OutsideFrame = share <= 0 ? town : share >= 1 ? own : {
    w: mixed(town.w, own.w, share), e: mixed(town.e, own.e, share), s: mixed(town.s, own.s, share), n: mixed(town.n, own.n, share),
    eyeN: mixed(town.eyeN, own.eyeN, share), backKm: mixed(town.backKm, own.backKm, share), f: mixed(town.f, own.f, share),
    k: mixed(town.k, own.k, share), midDepth: mixed(town.midDepth, own.midDepth, share), centerX: town.centerX }
  const wideKm = frame.e - frame.w, deepKm = frame.n - frame.s, ppm = frame.f / frame.midDepth / 1000
  return { frame, share, wideKm, deepKm, widthPx: ppm * 1000 * wideKm, ppm, housePx: Math.max(LEGIBLE_PX, ENLARGE * HOUSE_M * ppm) }
}
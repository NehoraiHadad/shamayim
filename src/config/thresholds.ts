/** All tunable weather thresholds in one place, tuned for the Jordan Valley. */
export const THRESHOLDS = {
  /** Daytime max → word. Upper bounds are exclusive. */
  dayTemp: { cool: 18, pleasant: 25, warm: 31, hot: 36, veryHot: 41 },
  /** Night low → word. */
  nightTemp: { cold: 8, cool: 14, warmNight: 24 },
  /**
   * heavyMm / floodMm: the blend spreads rain over a model grid cell, so a point's heavy day arrives as a smaller
   * forecast amount. Against 84 IMS gauges (research/verification/fable3_*), a blended 7 mm best matches a gauge's
   * 10 mm and 14 mm its 20 mm. quoteMm: under 1 mm the gauge stayed dry on most days (80% under 0.5 mm), so no amount is quoted.
   */
  rain: { possible: 30, likely: 55, heavy: 80, heavyMm: 7, floodMm: 14, startHour: 50, quoteMm: 1 },
  wind: { brisk: 20, strong: 35, gusts: 45 },
  dust: { light: 100, heavy: 300 },
  /** Mention feels-like only when it differs by at least this many degrees. */
  feelsLikeDelta: 3,
  /** Trend between consecutive days, degrees. */
  trendDelta: 3,
  /** Heat-hours clause threshold when the max is extreme. */
  heatHours: 38,
  anomaly: { minDelta: 3, sdFactor: 1, strong: 6 },
  heat: { aboveNormal: 8, floor: 35 },
  nowcast: { wetMm: 0.1, dryRun: 2, horizonMin: 120, startRun: 2, startMm: 0.3 },
  /** Rain probability below this is hidden in the week list. */
  showRainProb: 20,
  confidence: { tempMaxMedium: 2, tempMaxLow: 4, precipProbMedium: 20, precipProbLow: 40 },
} as const

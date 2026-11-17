interface Props { glyph: string; moving: boolean; bladeClass?: string; crownClass?: string }

const paths: Record<string, string> = {
  highrise: 'M11 40V6h10v34z',
  chimney: 'M13 40V7l2-3h4l2 36z',
  cooling: 'M8 40q5-8 2-28h12q-3 20 2 28z',
  mast: 'M13 40V7h2V3h2v4h2v2h-4v31z',
  waterTower: 'M14 40v-18h-4v-6q6-6 12 0v6h-4v18z',
  minaret: 'M14 40V14h-3v-3h3V6l2-5 2 5v5h3v3h-3v26z',
  church: 'M7 40V20l7-7 5 5v-8h4v12h3v18zm7-21-4 4h8z',
  silo: 'M6 40V18q3-6 6 0v22zm7 0V18q3-6 6 0v22zm7 0V18q3-6 6 0v22z',
  lighthouse: 'M11 40l2-25h6l2 25zm0-28 2-5h6l2 5z',
  bridge: 'M3 40v-3h10L17 5h3l2 32h7v3zm14-29L5 36h2l11-21zm1 6L10 36h2l7-15zm1 7-4 12h2l3-8z',
  castle: 'M7 40V27h4v3h3v-3h4v3h3v-3h4v13z',
  solar: 'M1 40 4 5h6L7 40zm8 0 3-35h6l-3 35zm8 0 3-35h6l-3 35zm8 0 3-35h6l-3 35z',
  homes: 'M1 40V12L6 3l5 9v28zm10 0V8l5-8 5 8v32zm10 0V12l5-9 5 9v28z',
}

export function GenericGlyph({ glyph, moving, bladeClass, crownClass }: Props) {
  if (glyph === 'turbine') return <>
    <path d="M14 40V12h3v28z" />
    <path className={moving ? bladeClass : undefined} d="M15.5 14 14 2l3-2 1 12 10-6 2 3-11 6 9 8-2 3-9-9-4 12-3-1 4-13L2 12l1-3z" />
  </>
  if (glyph === 'palms') return <>
    <path d="M6 40 8 18h2L9 40zm9 0-1-25h2l1 25zm8 0-4-20h2l4 20z" />
    <path className={crownClass} d="M2 18Q7 2 14 16 7 10 2 18zm4-7q7-10 10 4-5-5-10-4zm5 5Q18 0 23 16q-6-7-12 0zm6-7q7-9 10 5-5-5-10-5zm0 9Q23 4 29 18q-6-6-12 0z" />
  </>
  if (glyph === 'orchard') return <>
    <path d="M3 40V21h2v19zm7 0V18h2v22zm7 0V21h2v19zm7 0V18h2v22z" />
    <path className={crownClass} d="M0 15a5 5 0 1 1 10 0A5 5 0 0 1 0 15zm7-3a5 5 0 1 1 10 0 5 5 0 0 1-10 0zm7 3a5 5 0 1 1 10 0 5 5 0 0 1-10 0zm7-3a5 5 0 1 1 10 0 5 5 0 0 1-10 0z" />
  </>
  return <path d={paths[glyph] ?? paths.homes} />
}

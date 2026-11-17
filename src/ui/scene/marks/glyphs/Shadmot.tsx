interface Props { glyph: string; crownClass?: string }

const paths: Record<string, string> = {
  'shadmot-homes': 'M1 40V14l5-6 5 6v26zm9 0V8l6-8 6 8v32zm11 0V12l5-6 5 6v28z',
  'shadmot-solar': 'M1 40 4 5h6L7 40zm8 0 3-35h6l-3 35zm8 0 3-35h6l-3 35zm8 0 3-35h6l-3 35z',
}

export function ShadmotGlyph({ glyph, crownClass }: Props) {
  if (glyph === 'shadmot-palms') return <>
    <path d="M4 40 7 18h2L7 40zm9 0 1-25h2l1 25zm9 0-3-22h2l4 22z" />
    <path className={crownClass} d="M1 18Q7 1 13 17 7 10 1 18zm4-9q7-9 10 6-5-6-10-6zm6 7Q18 0 23 16q-6-7-12 0zm5-8q7-8 10 6-5-6-10-6zm1 10Q23 3 29 18q-6-7-12 0z" />
  </>
  if (glyph === 'shadmot-orchard') return <>
    <path d="M2 40V20h2v20zm7 0V17h2v23zm7 0V20h2v20zm7 0V17h2v23z" />
    <path className={crownClass} d="M0 13a4 4 0 1 1 8 0 4 4 0 0 1-8 0zm7-4a4 4 0 1 1 8 0 4 4 0 0 1-8 0zm7 4a4 4 0 1 1 8 0 4 4 0 0 1-8 0zm7-4a4 4 0 1 1 8 0 4 4 0 0 1-8 0z" />
  </>
  return <path d={paths[glyph]} />
}

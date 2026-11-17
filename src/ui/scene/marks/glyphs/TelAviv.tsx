interface Props { glyph: string }

const paths: Record<string, string> = {
  'tel-aviv-shalom': 'M9 40V9h14v31zM12 6h8v3h-8z',
  'tel-aviv-reading': 'M3 40V32h16v8zm7-8 2-28h4l2 28z',
  'tel-aviv-sarona': 'M10 40V8l8-5 8 5v32zM15 12l2-1 6 24-2 1z',
  'tel-aviv-azrieli': 'M2 40V15a7 7 0 0 1 14 0v25zm15 0V13l6-8 6 8v27zm13 0V10h8v30z',
}

export function TelAvivGlyph({ glyph }: Props) {
  return <path d={paths[glyph]} fillRule={glyph === 'tel-aviv-sarona' ? 'evenodd' : undefined} />
}

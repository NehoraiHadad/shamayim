interface Props { glyph: string; accentClass?: string }

const paths: Record<string, string> = {
  'jerusalem-bridge': 'M5 40h25v-3H17L12 2H9l4 35H5zM12 8 2 34h2l9-22zm1 7L6 34h2l6-15zm1 7-3 12h2l2-8zm2 5 5 7h2l-7-11zm1 7 7 3h4l-12-7z',
  'jerusalem-ymca': 'M9 40V28h3V14h3V7h2V3h2v4h2v7h3v14h3v12zm7-30h4l-2-4z',
  'jerusalem-david': 'M3 40V28h3v-3h4v3h4v-3h4v3h3v12zm17 0V15h2v-4h4v4h2v25zm1-29 3-7 3 7z',
  'jerusalem-wall': 'M2 40V25h4v-3h5v3h5v-3h5v3h5v15zM9 31h3v2H9zm7 0h3v2h-3z',
}

export function JerusalemGlyph({ glyph, accentClass }: Props) {
  if (glyph === 'jerusalem-wall') return <>
    <path d={paths[glyph]} />
    <path className={accentClass} d="M11 22v-3h2q1-7 5-9 4 2 5 9h2v3zm6-12V6h2v4z" />
  </>
  return <path d={paths[glyph]} />
}

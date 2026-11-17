interface Props { glyph: string }

const paths: Record<string, string> = {
  'haifa-bab': 'M4 40v-3h24v3zm4-3v-5h16v5zm4-5V20h8v12zm-2-12h12q-1-9-6-12-5 3-6 12zm5-12V3h2v5z',
  'haifa-dagon': 'M3 40V20h4v-3h4v3h4v-3h4v3h4v-3h4v23zm4-16h16v3H7z',
  'haifa-sail': 'M8 40V5q15 8 15 35zm4-29v25h7q-1-16-7-25z',
  'haifa-cooling': 'M3 40q5-10 2-27h9q-3 17 2 27zm14 0q5-10 2-27h9q-3 17 2 27z',
}

export function HaifaGlyph({ glyph }: Props) {
  return <path d={paths[glyph]} />
}

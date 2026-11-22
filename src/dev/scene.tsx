import '@fontsource/assistant/400.css'
import '@fontsource/assistant/600.css'
import '../ui/tokens.css'
import { createRoot } from 'react-dom/client'
import { CloudSheet } from './cloudSheet'
import { GlyphSheet } from './glyphSheet'
import { SceneHarness } from './sceneHarness'

const sheet = new URLSearchParams(location.search).get('sheet')
createRoot(document.getElementById('root')!).render(sheet === 'glyphs' ? <GlyphSheet /> : sheet === 'clouds' ? <CloudSheet /> : <SceneHarness />)

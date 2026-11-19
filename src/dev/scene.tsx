import '@fontsource/assistant/400.css'
import '@fontsource/assistant/600.css'
import '../ui/tokens.css'
import { createRoot } from 'react-dom/client'
import { SceneHarness } from './sceneHarness'

createRoot(document.getElementById('root')!).render(<SceneHarness />)

import '@fontsource/karantina/latin-700.css'
import '@fontsource/frank-ruhl-libre/500.css'
import '@fontsource/assistant/400.css'
import '@fontsource/assistant/600.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './ui/tokens.css'
import './index.css'
import './ui/motion/intro.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

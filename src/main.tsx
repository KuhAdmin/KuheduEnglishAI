import '@fontsource-variable/nunito'
import '@fontsource-variable/baloo-da-2'
import '@fontsource-variable/baloo-2'
import './app/styles/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

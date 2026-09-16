import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider } from './store/auth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* ErrorBoundary global por FUERA de AuthProvider y del router (D2): si el
        crash ocurre dentro del árbol del router (p. ej. Jugar), el boundary lo
        captura igual y muestra una pantalla navegable en vez de un blanco. */}
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

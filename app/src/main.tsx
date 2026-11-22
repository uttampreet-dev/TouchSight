import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { Landing } from './routes/landing/Landing'
import { Teacher } from './routes/Teacher'
import { Student } from './routes/Student'
import { Stage } from './routes/Stage'
import { DeviceCheck } from './routes/DeviceCheck'
import { PrintPack } from './routes/PrintPack'
import { warmVoices } from './device/speech'

warmVoices()

// the browser's offer to install is kept until a screen has a button for it
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); (window as unknown as { __install?: Event }).__install = e; window.dispatchEvent(new Event('touchsight-installable')) })

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/teacher/*', element: <Teacher /> },
  { path: '/student/*', element: <Student /> },
  { path: '/stage', element: <Stage /> },
  { path: '/device', element: <DeviceCheck /> },
  { path: '/print/:chapter', element: <PrintPack /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

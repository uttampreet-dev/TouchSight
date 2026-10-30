import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { Home } from './routes/Home'
import { Teacher } from './routes/Teacher'
import { Student } from './routes/Student'
import { Stage } from './routes/Stage'
import { DeviceCheck } from './routes/DeviceCheck'
import { warmVoices } from './device/speech'

warmVoices()

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/teacher/*', element: <Teacher /> },
  { path: '/student/*', element: <Student /> },
  { path: '/stage', element: <Stage /> },
  { path: '/device', element: <DeviceCheck /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { BookingProvider } from './context/BookingContext.jsx'
import { applyBrandTheme } from './brand'
import './index.css'
import App from './App.jsx'
import { captureQrScanFromUrl } from './lib/qrTracking'

// Before the router reads the URL, so the ?b=&p= params are already gone.
captureQrScanFromUrl()

applyBrandTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <BookingProvider>
        <App />
      </BookingProvider>
    </BrowserRouter>
  </StrictMode>,
)

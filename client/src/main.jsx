import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ClerkProvider } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!PUBLISHABLE_KEY) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY")

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: '#C8623D',
          colorBackground: '#FFFFFF',
          colorInputBackground: '#FAF8F5',
          colorInputText: '#1C1F1A',
          colorText: '#1C1F1A',
          colorTextSecondary: '#5F6359',
          borderRadius: '0.625rem'
        }
      }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)
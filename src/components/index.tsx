import React from 'react'
import { createRoot } from 'react-dom/client'
import Main from './main'

function App() {
  return <Main />
}
createRoot(document.getElementById('content')!).render(<App />)

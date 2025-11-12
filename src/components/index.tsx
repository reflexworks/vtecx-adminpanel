import '../styles/main.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import Main from './main'
import Footer from './parts/footer'

function App() {
  return (
    <>
      <Main />
      <Footer />
    </>
  )
}
createRoot(document.getElementById('content')!).render(<App />)

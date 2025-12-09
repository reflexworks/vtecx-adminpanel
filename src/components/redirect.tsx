import '../styles/main.css'
import React from 'react'
import { createRoot } from 'react-dom/client'

function App() {

  const service_name = window.location.search.replace('?', '')
  React.useEffect(() => {
    if (service_name) {
    location.href = `/d/@/admin.html?_login=${service_name.replace('service_name=','')}`
    }
  },[service_name])

  return <></>
}
createRoot(document.getElementById('content')!).render(<App />)

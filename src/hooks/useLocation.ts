import { atomWithStorage } from 'jotai/utils'
import React from 'react'

export const locationStorageAtom = atomWithStorage('location', '')

const useLocation = () => {

  const [service_name] = React.useState(location.host.replace('.vte.cx', ''))

  const moveLogin = React.useCallback(() => {
    if (window.location.pathname.indexOf('admin.html') !== -1) {
      window.location.href = `login.html?service_name=${service_name}`
    } else {
      window.location.href = 'login.html'
    }
  }, [service_name])

  return {
    moveLogin
  }
}

export default useLocation

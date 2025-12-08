import { atomWithStorage } from 'jotai/utils'
import React from 'react'

export const locationStorageAtom = atomWithStorage('location', '')

const useLocation = () => {
  const path: { [key: string]: string } = {
    //admin: '/d/@/admin.html'
    admin: '/admin.html'
  }

  const moveLogin = React.useCallback(() => {
    if (window.location.pathname.indexOf('admin.html') !== -1) {
      window.location.href = 'login.html?admin'
    } else {
      window.location.href = 'login.html'
    }
  }, [])

  return {
    path,
    moveLogin
  }
}

export default useLocation

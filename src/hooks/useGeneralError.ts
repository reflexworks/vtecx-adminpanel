import { atom, useAtom } from 'jotai'
import { HttpError } from '../utils/fetcher'
import React from 'react'
import useLocation from './useLocation'

export const generalErrorAtom = atom<HttpError>()

const useGeneralError = () => {
  const [error, setError] = useAtom(generalErrorAtom)
  const { moveLogin } = useLocation()

  React.useEffect(() => {
    if (error && (error?.response?.status === 403 || error?.response?.status === 401)) {
      moveLogin()
    }
  }, [JSON.stringify(error)])

  return {
    error,
    setError
  }
}

export default useGeneralError

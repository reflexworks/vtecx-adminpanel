import React from 'react'
import { checkGeneralError, fetcher, HttpError } from '../utils/fetcher'
import { atom, useAtom } from 'jotai'
import VtecxApp from '../typings'
import useGeneralError from './useGeneralError'

export const accesstokenAtom = atom<string | undefined>()
export const apikeyAtom = atom<string | undefined>()

const adminErrorAtom = atom<HttpError>()

const useAdmin = () => {
  const { setError: setGeneralError } = useGeneralError()

  const [error, setError] = useAtom(adminErrorAtom)

  const [accesstoken, setAccesstoken] = useAtom(accesstokenAtom)
  const [apikey, setAPIKey] = useAtom(apikeyAtom)

  React.useEffect(() => {
    if (checkGeneralError(error?.response?.status)) setGeneralError(error)
  }, [error])

  const getAccesstoken = React.useCallback(async () => {
    try {
      const res = await fetcher(`/d/?_accesstoken`, 'get')
      setAccesstoken(res?.data?.feed.title)
    } catch (error) {
      setError(error)
    }
  }, [])

  const getAPIKey = React.useCallback(async () => {
    try {
      const res = await fetcher(`/d/?e`, 'get')
      if (res.data?.contributor) {
        res.data.contributor.map((contributor: VtecxApp.Contributor) => {
          if (contributor.uri?.indexOf('urn:vte.cx:apikey:') !== -1) {
            setAPIKey(contributor.uri?.replace('urn:vte.cx:apikey:', '') || undefined)
          }
        })
      }
    } catch (error) {
      setError(error)
    }
  }, [])

  return {
    error,
    getAccesstoken,
    accesstoken,
    getAPIKey,
    apikey
  }
}

export default useAdmin

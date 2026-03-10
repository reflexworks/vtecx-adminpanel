import React from 'react'
import { checkGeneralError, fetcher, HttpError } from '../utils/fetcher'
import { atom, useAtom } from 'jotai'
import VtecxApp from '../typings'
import useGeneralError from './useGeneralError'

export const accesstokenAtom = atom<string | undefined>()
export const apikeyAtom = atom<string | undefined>()
export const accessCountAtom = atom<string | undefined>()
export const storageUsageAtom = atom<string | undefined>()

const adminErrorAtom = atom<HttpError>()
const accessCountErrorAtom = atom<HttpError | undefined>()
const storageUsageErrorAtom = atom<HttpError | undefined>()

const useAdmin = () => {
  const { setError: setGeneralError } = useGeneralError()

  const [error, setError] = useAtom(adminErrorAtom)
  const [accessCountError, setAccessCountError] = useAtom(accessCountErrorAtom)
  const [storageUsageError, setStorageUsageError] = useAtom(storageUsageErrorAtom)

  const [accesstoken, setAccesstoken] = useAtom(accesstokenAtom)
  const [apikey, setAPIKey] = useAtom(apikeyAtom)
  const [accessCount, setAccessCount] = useAtom(accessCountAtom)
  const [storageUsage, setStorageUsage] = useAtom(storageUsageAtom)

  // 402はプラン制限エラーなのでgeneralErrorには流さない
  // 401/403/5xx のみ汎用エラーへ
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

  const updateAccesstoken = React.useCallback(async () => {
    try {
      await fetcher(`/d/?_accesskey`, 'put')
      getAccesstoken()
      return true
    } catch (error) {
      setError(error)
      return false
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

  const updateAPIKey = React.useCallback(async () => {
    try {
      await fetcher(`/d/?_apikey`, 'put')
      getAPIKey()
      return true
    } catch (error) {
      setError(error)
      return false
    }
  }, [])

  const getAccessCount = React.useCallback(async () => {
    setAccessCountError(undefined)
    try {
      const res = await fetcher(`/d/?_accesscount`, 'get')
      setAccessCount(res?.data?.feed?.title)
    } catch (err: any) {
      setAccessCountError(err)
      // 402以外のエラー（5xxなど）は汎用エラーにも流す
      if (err?.response?.status !== 402 && checkGeneralError(err?.response?.status)) {
        setGeneralError(err)
      }
    }
  }, [])

  const getStorageUsage = React.useCallback(async () => {
    setStorageUsageError(undefined)
    try {
      const res = await fetcher(`/d/?_storageusage`, 'get')
      setStorageUsage(res?.data?.feed?.title)
    } catch (err: any) {
      setStorageUsageError(err)
      // 402以外のエラー（5xxなど）は汎用エラーにも流す
      if (err?.response?.status !== 402 && checkGeneralError(err?.response?.status)) {
        setGeneralError(err)
      }
    }
  }, [])

  return {
    error,
    getAccesstoken,
    updateAccesstoken,
    accesstoken,
    getAPIKey,
    updateAPIKey,
    apikey,
    accessCount,
    getAccessCount,
    accessCountError,
    storageUsage,
    getStorageUsage,
    storageUsageError
  }
}

export default useAdmin

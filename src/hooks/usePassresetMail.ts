// useService.ts

import React from 'react'
import { checkGeneralError, fetcher, HttpError } from '../utils/fetcher'
import { atom, useAtom, useSetAtom } from 'jotai'
import useLoader from './useLoader'
import useGeneralError from './useGeneralError'
import VtecxApp from '../typings'

export const passresetMailAtom = atom<VtecxApp.Entry>()

const listLoadingPromiseAtom = atom<Promise<void> | null>(null)

const errorAtom = atom<HttpError>()

const fetchListAtom = atom(null, async (get, set) => {
  let currentPromise = get(listLoadingPromiseAtom)
  if (currentPromise) {
    return currentPromise
  }

  const newPromise = (async () => {
    try {
      const listRes = (await fetcher(`/d/_settings/passreset?e`, 'get')) || {}
      set(passresetMailAtom, listRes?.data || {})
      set(errorAtom, undefined)
    } catch (error) {
      console.error('Service list fetch failed:', error)
      if (error instanceof HttpError) {
        set(errorAtom, error)
      }
    } finally {
      set(listLoadingPromiseAtom, null)
    }
  })()

  set(listLoadingPromiseAtom, newPromise)

  return newPromise
})

const usePassresetMail = () => {
  const { setLoader } = useLoader()

  const { setError: setGeneralError } = useGeneralError()

  const [data] = useAtom(passresetMailAtom)
  const [error, setError] = useAtom(errorAtom)

  const fetchList = useSetAtom(fetchListAtom)

  const get = React.useCallback(async () => {
    setLoader(true)
    setError(undefined)
    const res = await fetchList()
    setLoader(false)
    return res
  }, [fetchList])

  React.useEffect(() => {
    if (!data) {
      get().catch(err => {
        console.error('Initial list fetch failed via get():', err)
      })
    }
  }, [data, get])

  React.useEffect(() => {
    if (checkGeneralError(error?.response?.status)) setGeneralError(error)
  }, [error])

  return {
    data,
    get,
    error
  }
}

export default usePassresetMail

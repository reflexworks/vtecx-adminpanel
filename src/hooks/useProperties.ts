// useService.ts

import React from 'react'
import { checkGeneralError, fetcher, HttpError } from '../utils/fetcher'
import { atom, useAtom, useSetAtom } from 'jotai'
import useLoader from './useLoader'
import useGeneralError from './useGeneralError'
import VtecxApp from '../typings'

export const serviceListAtom = atom<VtecxApp.Entry>()

const listLoadingPromiseAtom = atom<Promise<void> | null>(null)

const serviceErrorAtom = atom<HttpError>()

const fetchListAtom = atom(null, async (get, set) => {
  let currentPromise = get(listLoadingPromiseAtom)
  if (currentPromise) {
    return currentPromise
  }

  const newPromise = (async () => {
    try {
      const listRes = (await fetcher(`/d/_settings/properties?e`, 'get')) || {}
      set(serviceListAtom, listRes?.data || {})
      set(serviceErrorAtom, undefined)
    } catch (error) {
      console.error('Service list fetch failed:', error)
      if (error instanceof HttpError) {
        set(serviceErrorAtom, error)
      }
    } finally {
      set(listLoadingPromiseAtom, null)
    }
  })()

  set(listLoadingPromiseAtom, newPromise)

  return newPromise
})

const useProperties = () => {
  const { setLoader } = useLoader()

  const { setError: setGeneralError } = useGeneralError()

  const [data] = useAtom(serviceListAtom)
  const [error, setError] = useAtom(serviceErrorAtom)

  const fetchList = useSetAtom(fetchListAtom)

  const [list, setList] = React.useState<{ key: string; value: string }[]>()
  const get = React.useCallback(async () => {
    setLoader(true)
    setError(undefined)
    const res = await fetchList()
    setLoader(false)
    return res
  }, [fetchList])

  React.useEffect(() => {
    const list: { key: string; value: string }[] = []
    const getMark = (value: string) => {
      let mark: number = 0
      for (let i = 0, ii = value.length; i < ii; ++i) {
        if (value[i] === '=') {
          mark = i
          break
        }
      }
      return mark
    }
    if (data && data.rights) {
      const rights_list: string[] = data.rights.split('\n')
      rights_list.map((rights: string) => {
        const mark = getMark(rights)
        const key = rights.substring(0, mark).replace(/\./g, '_')
        const value = rights.substring(mark + 1, rights.length)

        if (key && value) {
          list.push({ key, value })
        }
      })
    }
    setList(list)
  }, [data])

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
    list,
    get,
    error
  }
}

export default useProperties

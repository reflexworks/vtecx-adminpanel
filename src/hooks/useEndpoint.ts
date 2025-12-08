// useService.ts

import React from 'react'
import { checkGeneralError, fetcher, HttpError } from '../utils/fetcher'
import { atom, useAtom, useSetAtom } from 'jotai' // useSetAtomをインポート
import useUid from './useUid'
import useLoader from './useLoader'
import useGeneralError from './useGeneralError'

export const serviceListAtom = atom<any[]>([])

const listLoadingPromiseAtom = atom<Promise<void> | null>(null)

const serviceErrorAtom = atom<HttpError>()

const fetchListAtom = atom(null, async (get, set) => {
  let currentPromise = get(listLoadingPromiseAtom)
  if (currentPromise) {
    return currentPromise
  }

  const newPromise = (async () => {
    try {
      const listRes = (await fetcher(`/d/?f&l=*`, 'get')) || {}

      set(serviceListAtom, listRes?.data || [])
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

const useEndpoint = () => {
  const { uid } = useUid()
  const { setLoader } = useLoader()

  const { setError: setGeneralError } = useGeneralError()

  const [list] = useAtom(serviceListAtom)
  const [error, setError] = useAtom(serviceErrorAtom)

  const fetchList = useSetAtom(fetchListAtom)

  const get = React.useCallback(async () => {
    setLoader(true)
    setError(undefined)
    const res = await fetchList()
    setLoader(false)
    return res
  }, [fetchList])

  const post = React.useCallback(
    async ({
      name,
      name_jp,
      summary,
      other
    }: {
      name: string
      name_jp?: string
      summary?: string
      other?: string
    }) => {
      setLoader(true)
      setError(undefined)
      try {
        await fetcher(`/d/`, 'put', [
          {
            content: summary
              ? {
                  ______text: summary
                }
              : undefined,
            link: [
              {
                ___href: `/${name}`,
                ___rel: 'self'
              }
            ],
            summary: other || undefined,
            title: name_jp || undefined
          },
          {
            link: [
              {
                ___href: '/_settings/end_point',
                ___rel: 'self'
              }
            ]
          }
        ])
        setLoader(false)
        return true
      } catch (error) {
        setError(error)
        setLoader(false)
        return false
      }
    },
    []
  )

  const deleteEndpoint = React.useCallback(async (endpoint: string | undefined) => {
    if (endpoint) {
      setLoader(true)
      try {
        await fetcher(`/d${endpoint}?_rf`, 'delete')
        setLoader(false)
        return true
      } catch (error) {
        setError(error)
        setLoader(false)
        return false
      }
    }
  }, [])

  React.useEffect(() => {
    if (uid && list.length === 0) {
      get().catch(err => {
        console.error('Initial list fetch failed via get():', err)
      })
    }
  }, [uid, list.length, get])

  React.useEffect(() => {
    if (checkGeneralError(error?.response?.status)) setGeneralError(error)
  }, [error])

  return {
    list,
    get,
    post,
    deleteEndpoint,
    error
  }
}

export default useEndpoint

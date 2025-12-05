// useService.ts

import React from 'react'
import { checkGeneralError, fetcher, HttpError } from '../utils/fetcher'
import { atom, useAtom, useSetAtom } from 'jotai'
import useLoader from './useLoader'
import useGeneralError from './useGeneralError'

export const loginHistoryListAtom = atom<any[]>([])
export const loginHistoryCountAtom = atom<string | undefined>()

const listLoadingPromiseAtom = atom<Promise<void> | null>(null)

const serviceErrorAtom = atom<HttpError>()

const fetchListAtom = atom(
  null,
  async (get, set, { page, page_count }: { page: number; page_count: number }) => {
    let currentPromise = get(listLoadingPromiseAtom)
    if (currentPromise) {
      return currentPromise
    }

    const newPromise = (async () => {
      try {
        if (page === 1) {
          const count = await fetcher(`/d/_login_history?f&c&l=*`, 'get')
          set(loginHistoryCountAtom, count?.data?.feed?.title)
          await fetcher(`/d/_login_history?f&l=${page_count}&_pagination=1,50`, 'get')
        }
        const listRes =
          (await fetcher(`/d/_login_history?f&n=${page}&l=${page_count}`, 'get')) || {}

        set(loginHistoryListAtom, listRes?.data || [])
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
  }
)

const useLoginHistory = () => {
  const { setLoader } = useLoader()

  const { setError: setGeneralError } = useGeneralError()

  const [list] = useAtom(loginHistoryListAtom)
  const [error, setError] = useAtom(serviceErrorAtom)

  const fetchList = useSetAtom(fetchListAtom)

  const [count] = useAtom(loginHistoryCountAtom)

  const get = React.useCallback(
    async ({ page, page_count }: { page: number; page_count: number }) => {
      setLoader(true)
      setError(undefined)
      const res = await fetchList({ page, page_count })
      setLoader(false)
      return res
    },
    [fetchList]
  )

  React.useEffect(() => {
    if (checkGeneralError(error?.response?.status)) setGeneralError(error)
  }, [error])

  return {
    list,
    get,
    error,
    count
  }
}

export default useLoginHistory

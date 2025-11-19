// useService.ts

import React from 'react'
import { fetcher, HttpError } from '../utils/fetcher'
import { atom, useAtom, useSetAtom } from 'jotai' // useSetAtomをインポート
import useUid from './useUid'
import VtecxApp from '../typings'
import useLoader from './useLoader'

export const serviceListAtom = atom<any[]>([])

const listLoadingPromiseAtom = atom<Promise<void> | null>(null)

const serviceErrorAtom = atom<HttpError>()

const fetchListAtom = atom(null, async (get, set, uid: string) => {
  const currentList = get(serviceListAtom)

  if (currentList.length > 0) {
    return
  }

  let currentPromise = get(listLoadingPromiseAtom)
  if (currentPromise) {
    return currentPromise
  }

  const newPromise = (async () => {
    try {
      const extensionRes = (await fetcher(`/d/_user/${uid}/service_extension?f`, 'get')) || {}

      const listRes = (await fetcher(`/d/_user/${uid}/service?f`, 'get')) || {}

      if (listRes?.data?.feed?.entry && extensionRes?.data?.feed?.entry) {
        listRes.data?.feed?.entry.forEach((listEntry: VtecxApp.Entry) => {
          // extensionResからentry.idが一致する要素を探す
          const matchingExtensionEntry = extensionRes.data?.feed?.entry.find(
            (extEntry: VtecxApp.Entry) => extEntry.id === listEntry.id
          )

          // 一致する要素が見つかった場合
          if (matchingExtensionEntry) {
            // summaryを置換
            listEntry.summary = matchingExtensionEntry.summary
          }
        })
      }

      set(serviceListAtom, listRes?.data?.feed?.entry || [])
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

const useService = () => {
  const { uid } = useUid()
  const { setLoader } = useLoader()

  const [list] = useAtom(serviceListAtom)
  const [error, setError] = useAtom(serviceErrorAtom)

  const fetchList = useSetAtom(fetchListAtom)

  const get = React.useCallback(() => {
    if (uid) {
      setLoader(true)
      setError(undefined)
      const res = fetchList(uid)
      setLoader(false)
      return res
    }
    return Promise.resolve()
  }, [uid, fetchList])

  const post = React.useCallback(
    async (service_name: string | undefined) => {
      if (uid && service_name) {
        setLoader(true)
        setError(undefined)
        try {
          await fetcher(`/d/?_createservice`, 'post', [
            {
              title: service_name.trim()
            }
          ])
          setLoader(false)
          return true
        } catch (error) {
          setError(error)
          setLoader(false)
          return false
        }
      }
    },
    [uid]
  )

  const deleteService = React.useCallback(
    async (service_name: string | undefined) => {
      setLoader(true)
      if (uid && service_name) {
        let is_success: boolean = false
        try {
          await fetcher(`/d?_deleteservice=${service_name}`, 'delete')
          is_success = true
          await fetcher(`/d/_user/${uid}/service_extension/${service_name}?_rf`, 'delete')
          setLoader(false)
          return is_success
        } catch (error) {
          setError(error)
          setLoader(false)
          return is_success
        }
      }
    },
    [uid]
  )

  React.useEffect(() => {
    if (uid && list.length === 0) {
      get().catch(err => {
        console.error('Initial list fetch failed via get():', err)
      })
    }
  }, [uid, list.length, get])

  return {
    list,
    get,
    post,
    deleteService,
    error
  }
}

export default useService

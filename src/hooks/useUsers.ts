// useService.ts

import React from 'react'
import { checkGeneralError, fetcher, HttpError } from '../utils/fetcher'
import { atom, useAtom, useSetAtom } from 'jotai'
import useLoader from './useLoader'
import useGeneralError from './useGeneralError'
import VtecxApp from '../typings'

export const userListAtom = atom<VtecxApp.Entry[]>([])
export const adminUserListAtom = atom<{ [id: string]: VtecxApp.Entry }>({})
export const userCountAtom = atom<string | undefined>()

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
          const count = await fetcher(`/d/_user?f&c&l=*`, 'get')
          set(userCountAtom, count?.data?.feed?.title)
          await fetcher(`/d/_user?f&l=${page_count}&_pagination=1,50`, 'get')
          const adminlistRes = (await fetcher(`/d/_group/$admin?f&l=*`, 'get')) || {}
          if (adminlistRes?.data) {
            const users: { [id: string]: VtecxApp.Entry } = {}
            adminlistRes?.data.map((entry: VtecxApp.Entry) => {
              if (entry.id) users[entry.id.replace('/_group/$admin/', '').split(',')[0]] = entry
            })
            set(adminUserListAtom, users)
          }
        }
        const listRes = (await fetcher(`/d/_user?f&n=${page}&l=${page_count}`, 'get')) || {}

        set(userListAtom, listRes?.data || [])
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

const useUsers = () => {
  const { setLoader } = useLoader()

  const { setError: setGeneralError } = useGeneralError()

  const [list] = useAtom(userListAtom)
  const [error, setError] = useAtom(serviceErrorAtom)

  const [admin_user] = useAtom(adminUserListAtom)
  const fetchList = useSetAtom(fetchListAtom)

  const [count] = useAtom(userCountAtom)

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

  const deleteUser = React.useCallback(async ({ account }: { account: string }) => {
    setLoader(true)
    setError(undefined)
    try {
      await fetcher(`/d/?_deleteuser=${encodeURIComponent(account)}`, 'delete')
      setLoader(false)
      return true
    } catch (error) {
      setError(error)
      setLoader(false)
      return false
    }
  }, [])

  const revokeUser = React.useCallback(async ({ account }: { account: string }) => {
    setLoader(true)
    setError(undefined)
    try {
      await fetcher(`/d/?_revokeuser=${encodeURIComponent(account)}`, 'put')
      setLoader(false)
      return true
    } catch (error) {
      setError(error)
      setLoader(false)
      return false
    }
  }, [])

  const activateUser = React.useCallback(async ({ account }: { account: string }) => {
    setLoader(true)
    setError(undefined)
    try {
      await fetcher(`/d/?_activateuser=${encodeURIComponent(account)}`, 'put')
      setLoader(false)
      return true
    } catch (error) {
      setError(error)
      setLoader(false)
      return false
    }
  }, [])

  React.useEffect(() => {
    if (checkGeneralError(error?.response?.status)) setGeneralError(error)
  }, [error])

  const status_label: { [key: string]: string | undefined } = {
    Activated: '本登録',
    Interim: '仮登録',
    Nothing: '登録なし',
    Revoked: '無効'
  }

  const status_color: { [key: string]: 'success' | undefined } = {
    Activated: 'success',
    Interim: undefined,
    Nothing: undefined,
    Revoked: undefined
  }

  return {
    list,
    get,
    deleteUser,
    revokeUser,
    activateUser,
    error,
    count,
    status_color,
    status_label,
    admin_user
  }
}

export default useUsers

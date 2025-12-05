import React from 'react'
import { fetcher, HttpError } from '../utils/fetcher'
import { atom, useAtom, useSetAtom } from 'jotai'
import VtecxApp from '../typings'
import useUid from './useUid'
import useGeneralError from './useGeneralError'
import useLocation from './useLocation'

export const accountAtom = atom<VtecxApp.Entry>()

const loadingPromiseAtom = atom<Promise<void> | null>(null)

const errorAtom = atom<HttpError>()

const getAtom = atom(null, async (get, set, uid: string) => {
  const currentAccount = get(accountAtom)
  if (currentAccount !== undefined) {
    return
  }

  let currentPromise = get(loadingPromiseAtom)
  if (currentPromise) {
    return currentPromise
  }

  const newPromise = (async () => {
    try {
      const res = await fetcher(`/d/_user/${uid}?e`, 'get')
      set(accountAtom, res?.data)
      set(errorAtom, undefined)
    } catch (error) {
      console.error('Failed to fetch uid:', error)
      if (error instanceof HttpError) {
        set(errorAtom, error)
      }
    } finally {
      set(loadingPromiseAtom, null)
    }
  })()

  set(loadingPromiseAtom, newPromise)

  return newPromise
})

const useAccount = () => {
  const { uid } = useUid()

  const { setError: setGeneralError } = useGeneralError()

  const [account] = useAtom(accountAtom)
  const getAccount = useSetAtom(getAtom)
  const [error, setError] = useAtom(errorAtom)
  const [account_email, setAccountEmail] = React.useState<string>()

  const { moveLogin } = useLocation()

  const logout = React.useCallback(async () => {
    try {
      await fetcher('/d/?_logout', 'get')
      moveLogin()
    } catch (error) {
      setError(error)
    }
  }, [])

  React.useEffect(() => {
    if (uid) {
      getAccount(uid).catch(e => {
        setGeneralError(e)
        setError(e)
      })
    }
  }, [account, getAccount, uid])

  React.useEffect(() => {
    if (account) {
      account.contributor?.map((contributor: VtecxApp.Contributor) => {
        if (contributor.email) setAccountEmail(contributor.email)
      })
    }
  }, [account?.title])

  React.useEffect(() => {
    setGeneralError(error)
  }, [error])

  return {
    account,
    getAccount,
    error,
    logout,
    account_email
  }
}

export default useAccount

import React from 'react'
import { fetcher, HttpError } from '../utils/fetcher'
import { atom, useAtom, useSetAtom } from 'jotai'
import useGeneralError from './useGeneralError'

export const uidAtom = atom<string | undefined>(undefined)

const loadingPromiseAtom = atom<Promise<void> | null>(null)

const errorAtom = atom<HttpError>()

const getAtom = atom(null, async (get, set) => {
  const currentUid = get(uidAtom)
  if (currentUid !== undefined) {
    return
  }

  let currentPromise = get(loadingPromiseAtom)
  if (currentPromise) {
    return currentPromise
  }

  const newPromise = (async () => {
    try {
      const res = await fetcher('/d/?_uid', 'get')
      set(uidAtom, res?.data?.feed?.title)
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

const useUid = () => {
  const { setError: setGeneralError } = useGeneralError()

  const [uid] = useAtom(uidAtom)
  const getUid = useSetAtom(getAtom)
  const [error, setError] = useAtom(errorAtom)

  React.useEffect(() => {
    getUid().catch(e => {
      setGeneralError(e)
      setError(e)
    })
  }, [uid, getUid])

  React.useEffect(() => {
    setGeneralError(error)
  }, [error])

  return {
    uid,
    getUid,
    error
  }
}

export default useUid

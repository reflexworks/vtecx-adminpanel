// useService.ts

import React from 'react'
import { checkGeneralError, fetcher, HttpError } from '../utils/fetcher'
import { atom, useAtom, useSetAtom } from 'jotai'
import useLoader from './useLoader'
import useGeneralError from './useGeneralError'
import VtecxApp from '../typings'
import { SchemaFormData } from '../utils/schema/generateSchemaUpdateRequest'
import { transformRawToSchemaFormDataList } from '../utils/schema/transformRawToSchemaFormDataList'

export const serviceListAtom = atom<VtecxApp.Entry>()

export const serviceWameiListAtom = atom<VtecxApp.Entry[]>([])

const listLoadingPromiseAtom = atom<Promise<void> | null>(null)

const serviceErrorAtom = atom<HttpError>()

const fetchListAtom = atom(null, async (get, set) => {
  let currentPromise = get(listLoadingPromiseAtom)
  if (currentPromise) {
    return currentPromise
  }

  const newPromise = (async () => {
    try {
      const listRes = (await fetcher(`/d/_settings/template?e`, 'get')) || {}
      const wameiListRes = (await fetcher(`/d/_settings/template_property?f`, 'get')) || []
      set(serviceListAtom, listRes?.data || {})
      set(serviceWameiListAtom, wameiListRes?.data || [])
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

const useSchema = () => {
  const { setLoader } = useLoader()

  const { setError: setGeneralError } = useGeneralError()

  const [data] = useAtom(serviceListAtom)
  const [wameis] = useAtom(serviceWameiListAtom)
  const [error, setError] = useAtom(serviceErrorAtom)

  const fetchList = useSetAtom(fetchListAtom)

  const [list, setList] = React.useState<SchemaFormData[]>()
  const get = React.useCallback(async () => {
    setLoader(true)
    setError(undefined)
    const res = await fetchList()
    setLoader(false)
    return res
  }, [fetchList])

  const put = React.useCallback(async (req: VtecxApp.Entry[]) => {
    setLoader(true)
    setError(undefined)
    try {
      await fetcher(`/d/`, 'put', req)
      setLoader(false)
      return true
    } catch (error) {
      setError(error)
      setLoader(false)
      return false
    }
  }, [])

  React.useEffect(() => {
    if (data && data.content) {
      const list: SchemaFormData[] = transformRawToSchemaFormDataList(data, wameis)
      setList(list)
    }
  }, [data, wameis])

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
    error,
    data,
    put
  }
}

export default useSchema

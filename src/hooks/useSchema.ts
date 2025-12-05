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
      const listRes = (await fetcher(`/d/_settings/template?e`, 'get')) || {}
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

export interface schemaProps {
  acl: string
  befor_depth: number
  block: string[]
  comment: string
  depth: number
  key: string
  name: string
  option: string
  path: string
  title: string
  type: string
  validation: null
  value: string[]
}

const useSchema = () => {
  const { setLoader } = useLoader()

  const { setError: setGeneralError } = useGeneralError()

  const [data] = useAtom(serviceListAtom)
  const [error, setError] = useAtom(serviceErrorAtom)

  const fetchList = useSetAtom(fetchListAtom)

  const [list, setList] = React.useState<schemaProps[]>()
  const get = React.useCallback(async () => {
    setLoader(true)
    setError(undefined)
    const res = await fetchList()
    setLoader(false)
    return res
  }, [fetchList])

  const rightsStr: any = {
    '': '',
    ':': 'index',
    '#': '暗号化'
  }

  const getSchemaObj = (
    schema: string,
    index: number,
    value: (string | null)[],
    befor_depth: number
  ) => {
    let obj: any = {}
    const schemaProperty: any = {}
    const cashSchemaRights: any = {}

    const getSchemaType = () => {
      let type = '-'

      if (schema.indexOf('{}') !== -1) {
        type = 'Array'
      } else {
        if (schema.indexOf('(') !== -1) {
          const type_str = schema.split('(')[1].split(')')[0]
          if (type_str === 'string') type = 'String'
          if (type_str === 'int') type = 'Integer'
          if (type_str === 'boolean') type = 'Boolean'
          if (type_str === 'date') type = 'Date'
          if (type_str === 'long') type = 'Long'
          if (type_str === 'float') type = 'Float'
          if (type_str === 'double') type = 'Double'
          if (type_str === 'desc') type = 'Desc'
        } else if (index || index === 0) {
          const next_index = index + 1
          const next_schema = obj[next_index]
          if (next_schema) {
            const depth = schema.split(' ').length
            const next_depth = next_schema.split(' ').length
            if (depth < next_depth) {
              type = 'Parent'
            }
          }
        }
      }
      return type
    }

    const getViewSchemaName = (schema_value: string) => {
      return schema_value.split('(')[0].split('=')[0]
    }

    const getSchemaPathObj = () => {
      let depth = 0

      if (schema.indexOf(' ') !== -1) {
        depth = schema.split(' ').length - 1
        if (befor_depth > depth) {
          value[befor_depth] = null
          let new_value: (string | null)[] = []
          for (let i = 0, ii = value.length; i < ii; ++i) {
            if (i > depth) {
              break
            }
            new_value.push(value[i])
          }
          value = new_value
        }
        value[depth] = getViewSchemaName(schema.replace(/ /g, ''))
        befor_depth = depth
      } else {
        befor_depth = 0
        value = [getViewSchemaName(schema)]
      }
      return {
        value: value,
        befor_depth: befor_depth,
        depth: depth,
        path: value.join('.'),
        key: value.join('.').replace(/{}/g, '')
      }
    }
    const getValidationStr = () => {
      let mark = 0
      for (let i = 0, ii = schema.length; i < ii; ++i) {
        if (schema[i] === '=') {
          mark = i + 1
          break
        }
      }
      return schema.substring(mark, schema.length)
    }

    const pathObj = getSchemaPathObj()
    const pathObj_befor_depth = pathObj.befor_depth
    const pathObj_value = pathObj.value

    obj.name = getViewSchemaName(schema)
    obj.path = pathObj.path
    obj.key = pathObj.key

    const property = schemaProperty[obj.key]
    obj.title = property ? property.title : ''
    const content = property ? property.content : null
    obj.comment = content ? content.______text : ''

    let block = []
    for (let i = 0, ii = pathObj_befor_depth; i < ii; ++i) {
      block.push('')
    }

    obj.block = block
    obj.type = getSchemaType()

    obj.validation = schema.split('=').length > 1 ? getValidationStr() : null

    const cashRight = cashSchemaRights[obj.key]
    let option = cashRight ? cashRight.option : ''
    obj.option = rightsStr[option]
    obj.acl = cashRight ? cashRight.acl : ''

    obj.depth = pathObj.depth
    obj.value = pathObj_value
    obj.befor_depth = pathObj_befor_depth

    return obj
  }

  React.useEffect(() => {
    const list: schemaProps[] = []
    if (data && data.content) {
      const origin_schema = data.content.______text
      if (origin_schema) {
        const schemaList = origin_schema.split('\n')
        let values: string[] = []
        let befor_depth = 0
        schemaList.map((schema_str: string, index: number) => {
          // 末尾の空白を削除
          const value = schema_str.replace(/\s+$/g, '')
          if (value !== '') {
            const obj = getSchemaObj(schema_str, index, values, befor_depth)
            values = obj.value
            befor_depth = obj.befor_depth
            list.push(obj)
          }
        })
      }
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

export default useSchema

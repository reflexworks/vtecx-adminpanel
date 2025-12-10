export const getTypingsFromTemplate = (data: any) => {
  if (!data || !data.content) {
    return ''
  }

  const schemas = data.content.______text.split('\n').filter((value: string) => {
    return value
  })
  const schemaProperty: { [key: string]: any } = {}
  const cashSchemaRights: { [key: string]: any } = {}
  const removeSchema: { [key: string]: any } = {}
  const rightsStr: { [key: string]: string } = {
    '': '',
    ':': 'index',
    '#': '暗号化'
  }

  const getSchemaType = (schema: string, index: number) => {
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
        const next_schema = schemas[next_index]
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

  const getViewSchemaName = (schema: string) => {
    return schema.split('(')[0].split('=')[0]
  }
  const getSchemaPathObj = (schema: string, value: (string | null)[], befor_depth: number) => {
    let depth = 0

    if (schema.indexOf(' ') !== -1) {
      depth = schema.split(' ').length - 1
      if (befor_depth > depth) {
        value[befor_depth] = null
        let new_value = []
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

  const getSchemaTableObj = (
    schema: string,
    index: number,
    value: string[],
    befor_depth: number
  ) => {
    let obj: { [id: string]: any } = {}

    const getValidationStr = () => {
      let mark: number = 0
      for (let i = 0, ii = schema.length; i < ii; ++i) {
        if (schema[i] === '=') {
          mark = i + 1
          break
        }
      }
      return schema.substring(mark, schema.length)
    }

    const pathObj = getSchemaPathObj(schema, value, befor_depth)
    const pathObj_befor_depth = pathObj.befor_depth
    const pathObj_value = pathObj.value

    obj.schema_name = getViewSchemaName(schema)
    obj.schema_path = pathObj.path
    obj.schema_key = pathObj.key

    const property = schemaProperty[obj.schema_key]
    obj.schema_title = property ? property.title : ''
    const content = property ? property.content : null
    obj.schema_comment = content ? content.______text : ''

    let schema_block = []
    for (let i = 0, ii = pathObj_befor_depth; i < ii; ++i) {
      schema_block.push('')
    }

    obj.schema_block = schema_block
    obj.schema_type = getSchemaType(schema, index)

    obj.schema_validation = schema.split('=').length > 1 ? getValidationStr() : null

    const cashRight = cashSchemaRights[obj.schema_key]
    let option = cashRight ? cashRight.option : ''
    obj.schema_option = rightsStr[option]
    obj.schema_acl = cashRight ? cashRight.acl : ''

    obj.depth = pathObj.depth
    obj.value = pathObj_value
    obj.befor_depth = pathObj_befor_depth

    return obj
  }

  const getToUpperCase = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
  let befor_depth = 0
  let value: string[] = []

  let typeData: { [key: string]: string[] } = {
    Request: ['feed: Feed'],
    MessageResponse: ['feed: Feed'],
    Feed: ['entry?: Entry[]', 'title?: string', 'subtitle?: string', 'rights?: string'],
    Entry: [
      'id?: string',
      'title?: string',
      'subtitle?: string',
      'rights?: string',
      'summary?: string',
      'content?: Content',
      'link?: Link[]',
      'contributor?: Contributor[]',
      'published?: string',
      'updated?: string'
    ],
    Content: ['______text: string'],
    Link: ['___href?: string', '___rel?: string', '___title?: string'],
    Contributor: ['uri?: string', 'email?: string']
  }

  schemas.map((schema: string, index: number) => {
    const obj = getSchemaTableObj(schema, index, value, befor_depth)
    value = obj.value
    befor_depth = obj.befor_depth
    const is_delete = removeSchema[obj.schema_key]
    if (!is_delete) {
      let parentKey = 'Entry'
      let name = obj.schema_key

      if (obj.schema_key.indexOf('.') !== -1) {
        let keys = obj.schema_key.split('.')
        keys = keys.map((keys__value: string, keys_index: number) => {
          if (keys_index === obj.depth) {
            name = keys__value
            return null
          }
          return getToUpperCase(keys__value)
        })
        parentKey = keys.join('')
      }

      if (!typeData[parentKey]) typeData[parentKey] = []

      let type = obj.schema_type !== '-' ? obj.schema_type : 'string'

      const addKey = parentKey === 'Entry' ? '' : parentKey
      if (
        type === 'Integer' ||
        type === 'Long' ||
        type === 'Float' ||
        type === 'Double' ||
        type === 'Desc'
      ) {
        type = 'number'
      } else {
        type = type === 'Parent' ? addKey + getToUpperCase(name) : type
        type = type === 'Array' ? addKey + getToUpperCase(name) + '[]' : type
        type = type === 'Date' ? 'any' : type
        type = type === 'String' ? 'string' : type
        type = type === 'Boolean' ? 'boolean' : type
      }

      name = name + '?'

      typeData[parentKey].push(name + ':' + type)
    }
  })

  let typeObj = [
    'export = VtecxApp',
    'export as namespace VtecxApp',
    '\ndeclare namespace VtecxApp {'
  ]
  Object.keys(typeData).forEach(key => {
    typeObj.push('\tinterface ' + key + ' {\n\t\t' + typeData[key].join(',\n\t\t') + '\n\t}')
  })
  typeObj.push('}')

  return typeObj.join('\n')
}

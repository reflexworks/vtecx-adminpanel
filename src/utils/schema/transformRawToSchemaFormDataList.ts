import VtecxApp from '../../typings'
import { SchemaFormData } from './generateSchemaUpdateRequest'

/**
 * SchemaFormDataの配列を生成する
 */
export const transformRawToSchemaFormDataList = (
  rawData: any,
  wameis: VtecxApp.Entry[]
): SchemaFormData[] => {
  // 和名のキーマップ作成
  let wameiObj: { [id: string]: string | undefined } = {}
  wameis.map((entry: VtecxApp.Entry) => {
    if (entry.link) {
      const key = entry.link[0].___href?.replace('/_settings/template_property/', '')
      if (key) {
        const value = entry.title
        wameiObj[key] = value
      }
    }
  })

  const contentText = rawData.content?.______text || ''
  const rightsText = rawData.rights || ''
  const lines = contentText.split('\n')
  const rightsLines = rightsText.split('\n').filter((l: string) => l.trim() !== '')

  const result: SchemaFormData[] = []
  const stack: { indent: number; path: string }[] = []

  lines.forEach((line: string) => {
    const trimmed = line.trim()
    if (!trimmed) return

    // インデントと階層パスの解析
    const indent = line.match(/^ */)?.[0].length || 0

    // 項目名、型、オプションの分離
    // 例: "disaster_status(int)" -> name: "disaster_status", type: "int"
    const nameMatch = trimmed.match(/^([^(!{ \t]+)/)
    if (!nameMatch) return

    const rawName = nameMatch[1]
    const isRequired = rawName.endsWith('!')
    const schema_name = isRequired ? rawName.slice(0, -1) : rawName

    const typeMatch = trimmed.match(/\(([^)]+)\)/)
    const rawType = typeMatch ? typeMatch[1] : '指定なし'

    const optionMatch = trimmed.match(/\{([^}]+)\}/)
    const option = optionMatch ? optionMatch[1] : ''

    const validationMatch = trimmed.match(/=([^!{]+)/)
    const validation = validationMatch ? validationMatch[1] : ''

    // スタックを使用して親パスを決定
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }
    const parentName = stack.length > 0 ? stack[stack.length - 1].path : undefined
    const fullPath = parentName ? `${parentName}.${schema_name}` : schema_name

    // 現在の階層をスタックに追加
    stack.push({ indent, path: fullPath })

    // rights セクションから該当する設定を抽出
    let index = ''
    let acl = ''
    let isIndexAndAcl = false
    let isEncrypted = false

    // fullPath に一致する rights 行を探す
    const targetRights = rightsLines.find(
      (l: string) =>
        l.startsWith(fullPath + '=') ||
        l.startsWith(fullPath + ':') ||
        l.startsWith(fullPath + ';') ||
        l.startsWith(fullPath + '#') ||
        l === fullPath
    )

    if (targetRights) {
      let rawAcl = targetRights.trim()
      if (rawAcl.endsWith('#')) {
        isEncrypted = true
        rawAcl = rawAcl.slice(0, -1)
      }
      const aclParts = rawAcl.split('=')
      const pathAndIndex = aclParts[0]
      acl = aclParts[1] || ''

      if (pathAndIndex.includes(';')) {
        isIndexAndAcl = true
        index = pathAndIndex.split(';')[1]
      } else if (pathAndIndex.includes(':')) {
        index = pathAndIndex.split(':')[1]
      }
    }

    // SchemaFormData オブジェクトの組み立て
    result.push({
      schema_name,
      wamei: wameiObj[parentName ? `${parentName}.` + schema_name : schema_name] || '',
      type: normalizeTypeLabel(rawType),
      validation,
      option,
      acl,
      index,
      isIndexAndAcl,
      isEncrypted,
      parentName,
      isRequired
    })
  })

  return result
}

/**
 * スキーマの型文字列をUI用のラベルに変換
 */
const normalizeTypeLabel = (rawType: string): SchemaFormData['type'] => {
  const t = rawType.toLowerCase()
  if (t === 'int' || t === 'integer') return 'Integer'
  if (t === 'double') return 'Double'
  if (t === 'float') return 'Float'
  if (t === 'boolean') return 'Boolean'
  if (t === 'long') return 'Long'
  if (t === 'date') return 'Date'
  if (t === 'desc') return 'Desc'
  if (t === 'array') return 'Array'
  if (t === 'string') return 'String'
  return '指定なし'
}

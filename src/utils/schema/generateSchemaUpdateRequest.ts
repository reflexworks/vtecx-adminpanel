import VtecxApp from '../../typings'

export interface SchemaFormData {
  schema_name: string
  wamei: string
  type:
    | '指定なし'
    | 'Array'
    | 'String'
    | 'Integer'
    | 'Date'
    | 'Boolean'
    | 'Long'
    | 'Float'
    | 'Double'
    | 'Desc'
  validation?: string
  option?: string
  acl?: string
  index: string // 複数指定時はパイプ "|" 区切りで保持
  isIndexAndAcl: boolean // true の場合は ";" を使用
  isEncrypted: boolean // true の場合は "#" を付与
  parentName?: string
  isRequired: boolean
}
/**
 * 現在のシステム状態（編集前のデータ）
 */
export interface SchemaContext {
  currentContent: string // 現在の ______text の内容
  currentRights: string // 現在の rights の内容
  oldSchemaName?: string | null // 編集時の旧名称。新規追加時は null
}

/**
 * スキーマ(content)、ACL/Index(rights)、および和名(property)を更新・生成する
 * 対応記号: ":" (Index), ";" (Index/ACL), "=" (ACL), "#" (Encryption), "!" (Required)
 */
function generateSchemaUpdateRequest(formData: any, context: any): VtecxApp.Entry[] {
  const {
    schema_name,
    type,
    validation,
    acl,
    option,
    parentName,
    isRequired,
    wamei,
    index,
    isIndexAndAcl,
    isEncrypted
  } = formData

  const { currentContent, currentRights, oldSchemaName } = context

  // 空行を除去して解析（最後に整形するため）
  let lines = currentContent.split('\n').filter((l: string) => l.trim() !== '')
  let newLines: string[] = []
  let processed = false

  // --- スキーマ定義行の作成 ---
  const mappedType = type === 'Integer' ? 'int' : type === '指定なし' ? '' : type.toLowerCase()
  const typeStr = mappedType ? `(${mappedType})` : ''
  const optionStr = option ? `{${option}}` : ''
  const requiredFlag = isRequired ? '!' : ''
  const validationStr = validation ? `=${validation}` : ''
  const lineSuffix = `${schema_name}${typeStr}${optionStr}${requiredFlag}${validationStr}`

  const parentPath = parentName ? parentName.split('.') : []
  let currentPathMatchDepth = 0
  let targetParentIndent = -1
  let parentLineIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const currentIndent = line.match(/^ */)?.[0].length || 0
    const currentName = line.trim().split(/[(!{]/)[0]

    // 親階層の特定
    if (parentPath.length > 0 && !processed) {
      if (
        currentIndent === currentPathMatchDepth &&
        currentName === parentPath[currentPathMatchDepth]
      ) {
        if (currentPathMatchDepth === parentPath.length - 1) {
          targetParentIndent = currentIndent
          parentLineIndex = i
        }
        currentPathMatchDepth++
      } else if (currentIndent < currentPathMatchDepth) {
        currentPathMatchDepth = 0
      }
    }

    // 更新モードの処理
    if (oldSchemaName && !processed) {
      const isAtTargetDepth =
        parentPath.length > 0
          ? targetParentIndent !== -1 && currentIndent === targetParentIndent + 1
          : currentIndent === 0

      if (isAtTargetDepth && currentName === oldSchemaName) {
        newLines.push(' '.repeat(currentIndent) + lineSuffix)
        processed = true
        continue
      }
    }

    newLines.push(line)

    // 新規追加(Add)モード：親の範囲の末尾を判定
    if (!oldSchemaName && !processed && targetParentIndent !== -1) {
      if (i >= parentLineIndex) {
        const nextLine = lines[i + 1]
        const nextIndent = nextLine !== undefined ? nextLine.match(/^ */)?.[0].length || 0 : -1

        // 次の行がない、または次の行のインデントが親以下（＝親の範囲が終了）
        if (nextLine === undefined || nextIndent <= targetParentIndent) {
          newLines.push(' '.repeat(targetParentIndent + 1) + lineSuffix)
          processed = true
        }
      }
    }
  }

  // ルートへの新規追加
  if (!processed && !oldSchemaName) {
    newLines.push(lineSuffix)
  }

  // --- rights ---
  let rightsLines = currentRights.split('\n').filter((l: string) => l.trim() !== '')
  const fullPath = parentName ? `${parentName}.${schema_name}` : schema_name
  const oldFullPath =
    parentName && oldSchemaName ? `${parentName}.${oldSchemaName}` : oldSchemaName || ''
  let newAclLine = fullPath
  const normalizedIndex = index
    ? index
        .split('|')
        .filter((i: string) => i.trim() !== '')
        .join('|')
    : ''
  if (normalizedIndex) newAclLine += (isIndexAndAcl ? ';' : ':') + normalizedIndex
  if (acl) newAclLine += '=' + acl
  if (isEncrypted) newAclLine += '#'
  if (newAclLine === fullPath) newAclLine = ''
  if (oldSchemaName) {
    let found = false
    rightsLines = rightsLines
      .map((line: string) => {
        if (
          line.startsWith(oldFullPath + '=') ||
          line.startsWith(oldFullPath + ':') ||
          line.startsWith(oldFullPath + ';') ||
          line === oldFullPath + '#'
        ) {
          found = true
          return newAclLine
        }
        return line
      })
      .filter((l: string) => l !== '')
    if (!found && newAclLine) rightsLines.push(newAclLine)
  } else if (newAclLine) {
    rightsLines.push(newAclLine)
  }

  return [
    {
      content: {
        // 冒頭に空行を一つ入れ、それ以外は詰めて結合
        ______text: '\n' + newLines.join('\n') + '\n'
      },
      link: [{ ___href: '/_settings/template', ___rel: 'self' }],
      rights: '\n' + rightsLines.join('\n') + '\n'
    },
    { link: [{ ___href: '/_settings/template_property', ___rel: 'self' }] },
    {
      link: [{ ___href: `/_settings/template_property/${fullPath}`, ___rel: 'self' }],
      title: wamei
    }
  ]
}
export default generateSchemaUpdateRequest

export type AxiosLikeResponse<T = any> = {
  data: T
  status: number
  headers: Record<string, string>
  ok: boolean
  url: string
}

interface HttpErrorResponse {
  status: number
  data: any
}

export class HttpError extends Error {
  public response: HttpErrorResponse

  constructor(message: string, response: HttpErrorResponse) {
    super(message)
    this.name = 'HttpError'
    this.response = response
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

/**
 * 共通：通信処理
 */
export function fetcher(
  _url: string,
  _method: string,
  _data?: any,
  _headers?: Record<string, string>,
  _is_file?: boolean
) {
  return new Promise<AxiosLikeResponse>((resolve, reject) => {
    // --- headers組み立て（X-Requested-Withは必ず付与）
    const headers = new Headers(_headers || {})
    headers.set('X-Requested-With', 'XMLHttpRequest')

    const upperMethod = (_method || 'GET').toUpperCase()

    // --- bodyとContent-Typeの扱い
    let body: BodyInit | undefined
    const isForm = _is_file || (typeof FormData !== 'undefined' && _data instanceof FormData)

    if (upperMethod !== 'GET' && upperMethod !== 'HEAD') {
      if (isForm) {
        // FormDataのときはContent-Typeを明示設定しない（ブラウザに任せる）
        body = _data as FormData
      } else if (
        typeof _data === 'string' ||
        (typeof URLSearchParams !== 'undefined' && _data instanceof URLSearchParams)
      ) {
        // 文字列やURLSearchParamsはそのまま送る
        if (
          !_headers?.['Content-Type'] &&
          !_headers?.['content-type'] &&
          !(typeof _data !== 'string' && _data instanceof URLSearchParams)
        ) {
          headers.set('Content-Type', 'text/plain;charset=UTF-8')
        }
        if (_data instanceof URLSearchParams) {
          headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
        body = _data as any
      } else if (typeof _data !== 'undefined') {
        headers.set('Content-Type', 'application/json')
        body = JSON.stringify(_data)
      }
    }

    let retryCount = 0
    const maxRetryCount = 30

    const parseResponse = async (res: Response): Promise<AxiosLikeResponse> => {
      const ct = res.headers.get('content-type') || ''
      let data: any = undefined
      try {
        if (res.status !== 204) {
          if (ct.includes('application/json')) {
            data = await res.json()
          } else if (ct.startsWith('text/')) {
            data = await res.text()
          } else {
            // バイナリ等は必要に応じて blob に
            data = await res.blob()
          }
        }
      } catch {
        // 解析失敗時はdata=undefinedのまま
      }
      return {
        data,
        status: res.status,
        headers: headersToObject(res.headers),
        ok: res.ok,
        url: res.url || _url
      }
    }
    // ヘッダをオブジェクトへ
    const headersToObject = (h: Headers): Record<string, string> => {
      const obj: Record<string, string> = {}
      h.forEach((value, key) => {
        obj[key.toLowerCase()] = value
      })
      return obj
    }

    const requestOnce = async (): Promise<AxiosLikeResponse> => {
      const res = await fetch(_url, {
        method: upperMethod,
        headers,
        body,
        // same-originのCookieは送信（axiosのデフォルト相当）
        credentials: 'same-origin'
      })
      const axRes = await parseResponse(res)

      if (!res.ok) {
        // axios風のエラーオブジェクトを投げる
        const err: any = new HttpError(`HTTP ${res.status}`, {
          status: axRes.status,
          data: axRes.data
        })
        throw err
      }
      return axRes
    }

    const get = () => {
      requestOnce().then(
        response => {
          resolve(response)
        },
        error => {
          console.error(error)

          const status = error?.response?.status
          if (status === 401 || status === 403) {
            console.log('認証エラー')
            reject(error)
            return
          }
          if (status > 499) {
            reject(error)
            return
          }

          const title = error?.response?.data?.feed?.title
          if (title === 'Please make a pagination index in advance.') {
            if (retryCount < maxRetryCount) {
              retryCount++
              setTimeout(() => get(), 1000)
              return
            } else {
              reject(error)
              return
            }
          }
          reject(error)
        }
      )
    }

    get()
  })
}

export const fileUpload = async (_name: string, _url: string) => {
  const unique_key = 'common-file-'
  const froms: any = document.getElementById(unique_key + 'form-' + _name)
  if (froms && froms.children && froms.children[0] && froms.children[0].value) {
    let file_name: string = ''
    froms.children[0].value.split('\\').map((value: string) => {
      file_name = value
    })
    const form_data = new FormData(froms)
    try {
      const res = await fetcher(
        '/s/post-file?url=' +
          _url +
          '/' +
          encodeURIComponent(file_name) +
          '&name=' +
          unique_key +
          _name,
        'post',
        form_data,
        undefined,
        true
      )
      return res
    } catch (_e) {
      throw _e
    }
  }
}
export const checkGeneralError = (status?: number) => {
  return status && (status === 401 || status === 403 || status > 499)
}

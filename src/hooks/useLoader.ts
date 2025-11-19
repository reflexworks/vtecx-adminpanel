import { atom, useAtom } from 'jotai'
import React from 'react'

export const loaderAtom = atom<boolean>(false)

const useLoader = (is_init_hidden?: boolean) => {
  const [loader, setLoader] = useAtom<boolean>(loaderAtom)

  React.useEffect(() => {
    if (is_init_hidden === undefined || is_init_hidden === true) {
      setLoader(false)
    }
  }, [])

  return {
    loader,
    setLoader,
    loadingStr: '読み込み中'
  }
}

export default useLoader

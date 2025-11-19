import { atom, useAtom } from 'jotai'
import { HttpError } from '../utils/fetcher'

export const generalErrorAtom = atom<HttpError>()

const useGeneralError = () => {
  const [error, setError] = useAtom(generalErrorAtom)

  return {
    error,
    setError
  }
}

export default useGeneralError

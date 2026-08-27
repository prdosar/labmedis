import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import type { PagedResult } from '../api/types'

interface Options<T> {
  fetcher: (page: number, size: number) => Promise<PagedResult<T>>
  pageSize?: number
}

interface State<T> {
  data: PagedResult<T> | null
  loading: boolean
  error: string | null
  page: number
}

export function usePagedData<T>({ fetcher, pageSize = 10 }: Options<T>) {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    error: null,
    page: 1,
  })

  const load = useCallback(
    async (page: number) => {
      setState(s => ({ ...s, loading: true, error: null }))
      try {
        const data = await fetcher(page, pageSize)
        setState(s => ({ ...s, data, loading: false, page }))
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Erreur de chargement'
        setState(s => ({ ...s, loading: false, error: msg }))
      }
    },
    [fetcher, pageSize],
  )

  useEffect(() => {
    load(1)
  }, [load])

  const setPage = useCallback(
    (p: number) => {
      load(p)
    },
    [load],
  )

  const refresh = useCallback(() => load(state.page), [load, state.page])

  return { ...state, setPage, refresh }
}

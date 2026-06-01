import { useState, useCallback } from 'react'

export function useAsync(asyncFn, immediate = false) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  const execute = useCallback(
    async (...args) => {
      setLoading(true)
      setError(null)
      try {
        const result = await asyncFn(...args)
        setData(result)
        return result
      } catch (err) {
        const message = err?.message || 'Erro inesperado'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [asyncFn],
  )

  const reset = useCallback(() => {
    setData(null)
    setLoading(false)
    setError(null)
  }, [])

  return { data, loading, error, execute, reset }
}

export default useAsync

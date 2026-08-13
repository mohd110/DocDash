import * as React from 'react'

/** Debounced so each keystroke does not fire a query. */
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

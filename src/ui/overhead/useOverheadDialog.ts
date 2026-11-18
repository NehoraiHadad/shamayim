import { useEffect, useId, useRef, useState } from 'react'

export function useOverheadDialog() {
  const id = useId()
  const [open, setOpen] = useState(false)
  const closing = useRef(false)

  useEffect(() => {
    const pop = () => {
      closing.current = false
      setOpen(history.state?.shamayimOverhead === id)
    }
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  }, [id])

  return {
    open,
    show() {
      if (history.state?.shamayimOverhead !== id) {
        history.pushState({ ...history.state, shamayimOverhead: id }, '')
      }
      setOpen(true)
    },
    close() {
      if (closing.current) return
      if (history.state?.shamayimOverhead !== id) {
        setOpen(false)
        return
      }
      closing.current = true
      history.back()
    },
  }
}

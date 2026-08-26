import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'trustlabs_booking_cart'
const BookingContext = createContext(null)

function readStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function BookingProvider({ children }) {
  const [selectedPackages, setSelectedPackages] = useState(readStoredCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedPackages))
  }, [selectedPackages])

  const togglePackage = (pkg) => {
    setSelectedPackages((prev) =>
      prev.some((p) => p.id === pkg.id) ? prev.filter((p) => p.id !== pkg.id) : [...prev, pkg]
    )
  }

  const removePackage = (id) => {
    setSelectedPackages((prev) => prev.filter((p) => p.id !== id))
  }

  const clearCart = () => setSelectedPackages([])

  return (
    <BookingContext.Provider value={{ selectedPackages, togglePackage, removePackage, clearCart }}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used within a BookingProvider')
  return ctx
}

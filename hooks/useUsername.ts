"use client"

import { useState, useEffect, useCallback } from "react"

/**
 * Global username management hook
 *
 * Manages player username stored in localStorage with automatic syncing
 * when wallet address changes. Provides a consistent interface for
 * getting and setting username across all pages.
 *
 * @param address - Connected wallet address
 * @returns Object with username, loading state, and setter function
 */
export function useUsername(address?: string) {
  const [username, setUsernameState] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  // Load username from localStorage when address changes
  useEffect(() => {
    if (!address) {
      setUsernameState("")
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // Get username from localStorage
    const savedUsername = localStorage.getItem(`username_${address}`)

    if (savedUsername) {
      setUsernameState(savedUsername)
    } else {
      // Fallback to truncated address
      setUsernameState(`${address.slice(0, 6)}...${address.slice(-4)}`)
    }

    setIsLoading(false)
  }, [address])

  // Update username in localStorage and state
  const setUsername = useCallback((newUsername: string) => {
    if (!address) return

    const trimmed = newUsername.trim()

    // Save to localStorage
    localStorage.setItem(`username_${address}`, trimmed)

    // Update state
    setUsernameState(trimmed)
  }, [address])

  // Check if username is custom (not just truncated address)
  const isCustomUsername = useCallback(() => {
    if (!address) return false
    const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
    return username !== truncatedAddress
  }, [address, username])

  return {
    username,
    isLoading,
    setUsername,
    isCustomUsername: isCustomUsername(),
  }
}

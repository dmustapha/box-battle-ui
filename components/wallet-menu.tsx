"use client"

import { useState, useRef, useEffect } from "react"
import { useAccount, useDisconnect } from "wagmi"
import { CheckCircle2, ChevronDown, User, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUsername } from "@/hooks/useUsername"

interface WalletMenuProps {
  /**
   * Visual variant of the button
   * - "default": Standard styling for landing page
   * - "compact": Smaller styling for game header
   */
  variant?: "default" | "compact"
}

export function WalletMenu({ variant = "default" }: WalletMenuProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { username } = useUsername(address)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Close menu on ESC key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect()
    setIsOpen(false)
  }

  // Handle profile click
  const handleProfileClick = () => {
    setIsOpen(false)
  }

  if (!isConnected) {
    return null
  }

  const isCompact = variant === "compact"

  return (
    <div className="relative" ref={menuRef}>
      {/* Wallet Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 rounded-lg font-semibold transition-all
          bg-bg-elevated border border-state-success hover:bg-bg-panel
          ${isCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}
        `}
      >
        <CheckCircle2 className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        <span className={`${isCompact ? "font-mono" : ""} text-state-success`}>
          {username}
        </span>
        <ChevronDown
          className={`
            transition-transform duration-200
            ${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"}
            ${isOpen ? "rotate-180" : "rotate-0"}
          `}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-56 bg-bg-panel border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ backgroundColor: "rgba(20, 24, 35, 0.98)" }}
        >
          {/* View Profile */}
          <Link
            href="/profile"
            onClick={handleProfileClick}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-elevated transition-colors group"
          >
            <div className="w-8 h-8 bg-accent-blue/10 border border-accent-blue/20 rounded-lg flex items-center justify-center group-hover:bg-accent-blue/20 transition-colors">
              <User className="w-4 h-4 text-accent-blue" />
            </div>
            <p className="text-sm font-semibold text-white">View Profile</p>
          </Link>

          {/* Divider */}
          <div className="h-px bg-[var(--color-border)]" />

          {/* Disconnect */}
          <button
            onClick={handleDisconnect}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-elevated transition-colors group"
          >
            <div className="w-8 h-8 bg-state-error/10 border border-state-error/20 rounded-lg flex items-center justify-center group-hover:bg-state-error/20 transition-colors">
              <LogOut className="w-4 h-4 text-state-error" />
            </div>
            <p className="text-sm font-semibold text-white">Disconnect</p>
          </button>
        </div>
      )}
    </div>
  )
}

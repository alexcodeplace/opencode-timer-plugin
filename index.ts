import type { Plugin } from "@opencode-ai/plugin"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import { z } from "zod"

interface TimerConfig {
  updateInterval?: number
  titlePrefix?: string
  notifyOnCompletion?: boolean
}

// Security: Constants for safe operation
const MIN_UPDATE_INTERVAL = 500 // Minimum 500ms to prevent excessive CPU usage
const MAX_MESSAGE_SIZE = 10240 // 10KB max to prevent memory exhaustion
const MAX_NOTIFICATION_LENGTH = 200 // Max length for notification text

// Security: Validate config schema
const TimerConfigSchema = z.object({
  updateInterval: z.number().int().min(MIN_UPDATE_INTERVAL).max(60000).optional(),
  titlePrefix: z.string().max(100).optional(),
  notifyOnCompletion: z.boolean().optional(),
})

export const TimerPlugin: Plugin = async ({ client, directory, $ }) => {
  // Security: Sanitize strings for terminal output (prevent ANSI injection)
  const sanitizeForTerminal = (str: string): string => {
    // Remove all control characters except printable ASCII
    return str.replace(/[\x00-\x1F\x7F-\x9F]/g, '')
  }

  // Security: Sanitize strings for shell commands (comprehensive)
  const sanitizeForShell = (str: string): string => {
    // Remove all potentially dangerous shell metacharacters
    // Only allow alphanumeric, spaces, and safe punctuation
    return str.replace(/[^a-zA-Z0-9 .,!?@#%^*()_+=\-\[\]{}:]/g, '')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 500) // Hard limit on length
  }

  // Load configuration with validation
  const loadConfig = (): TimerConfig => {
    const configPaths = [
      join(directory, ".opencode/plugins/timer-plugin/config.json"),
      join(homedir(), ".config/opencode/plugins/timer-plugin/config.json"),
    ]

    for (const configPath of configPaths) {
      if (existsSync(configPath)) {
        try {
          const configData = readFileSync(configPath, "utf-8")
          const rawConfig = JSON.parse(configData)

          // Security: Validate config against schema
          const validated = TimerConfigSchema.parse(rawConfig)
          return validated
        } catch (err) {
          console.warn(`[timer-plugin] Invalid config at ${configPath}:`, err)
        }
      }
    }
    return {}
  }

  const config = loadConfig()
  const updateInterval = config.updateInterval ?? 1000

  // Security: Enforce minimum update interval
  const safeUpdateInterval = Math.max(updateInterval, MIN_UPDATE_INTERVAL)

  // Security: Sanitize and validate titlePrefix from config and environment
  const envPrefix = process.env.TERM_PROGRAM
  const rawPrefix = config.titlePrefix ?? (typeof envPrefix === 'string' ? envPrefix : 'OpenCode')
  const titlePrefix = sanitizeForTerminal(rawPrefix)

  const notifyOnCompletion = config.notifyOnCompletion ?? true

  const sessions = new Map<string, {
    startTime: number
    interval: NodeJS.Timeout
    lastMessage: string
  }>()

  // Security: Cleanup function to clear all intervals
  const cleanupAllSessions = () => {
    for (const [sessionID, session] of sessions.entries()) {
      clearInterval(session.interval)
    }
    sessions.clear()
    resetTitle()
  }

  // Security: Register cleanup handlers for graceful shutdown
  const cleanupHandlers = ['SIGINT', 'SIGTERM', 'SIGQUIT'] as const
  for (const signal of cleanupHandlers) {
    process.once(signal, () => {
      cleanupAllSessions()
      process.exit(0)
    })
  }
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const seconds = totalSeconds % 60
    const minutes = Math.floor(totalSeconds / 60) % 60
    const hours = Math.floor(totalSeconds / 3600) % 24
    const days = Math.floor(totalSeconds / 86400)

    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  const updateTitle = (elapsed: string) => {
    // Security: Sanitize all output to prevent ANSI injection
    const safeElapsed = sanitizeForTerminal(elapsed)
    const safePrefix = sanitizeForTerminal(titlePrefix)
    process.stdout.write(`\x1b]0;(${safeElapsed}) ${safePrefix}\x07`)
  }

  const resetTitle = () => {
    const safePrefix = sanitizeForTerminal(titlePrefix)
    process.stdout.write(`\x1b]0;${safePrefix}\x07`)
  }

  const sendDesktopNotification = async (runtime: string, agentOutput: string) => {
    try {
      // Security: Truncate and sanitize output
      const truncatedOutput = agentOutput.length > MAX_NOTIFICATION_LENGTH
        ? agentOutput.substring(0, MAX_NOTIFICATION_LENGTH - 3) + "..."
        : agentOutput

      // Security: Comprehensive sanitization for shell command
      const safeRuntime = sanitizeForShell(runtime)
      const safeOutput = sanitizeForShell(truncatedOutput)
      
      // Security: Use double sanitization for extra safety
      const message = `Runtime: ${safeRuntime}. ${safeOutput}`

      await $`notify-send "OpenCode Session Complete" ${message} -i dialog-information -u normal`
    } catch (err) {
      console.warn(`[timer-plugin] Notification failed:`, err)
      // Non-critical failure, continue execution
    }
  }

  return {
    event: async ({ event }) => {
      if (event.type === "session.created") {
        const sessionID = event.properties.info.id
        const startTime = Date.now()

        const interval = setInterval(() => {
          const elapsed = formatTime(Date.now() - startTime)
          updateTitle(elapsed)
        }, safeUpdateInterval)

        sessions.set(sessionID, {
          startTime,
          interval,
          lastMessage: ""
        })
      }

      if (event.type === "message.part.updated") {
        const part = event.properties.part
        const session = sessions.get(part.sessionID)

        if (session && part.type === "text") {
          // Security: Accumulate text with size limit to prevent memory exhaustion
          if (session.lastMessage.length < MAX_MESSAGE_SIZE) {
            const remainingSpace = MAX_MESSAGE_SIZE - session.lastMessage.length
            session.lastMessage += part.text.substring(0, remainingSpace)
          }
        }
      }

      if (event.type === "session.idle") {
        const sessionID = event.properties.sessionID
        const session = sessions.get(sessionID)

        if (session) {
          clearInterval(session.interval)
          const finalTime = formatTime(Date.now() - session.startTime)

          // Immediately reset title to original
          resetTitle()

          // Send desktop notification with runtime and agent output
          if (notifyOnCompletion) {
            try {
              await sendDesktopNotification(finalTime, session.lastMessage || "No output")
            } catch (err) {
              console.warn('[timer-plugin] Notification error:', err)
            }
          }

          sessions.delete(sessionID)
        }
      }

      if (event.type === "session.deleted") {
        const sessionID = event.properties.info.id
        const session = sessions.get(sessionID)

        if (session) {
          clearInterval(session.interval)
          resetTitle()
          sessions.delete(sessionID)
        }
      }
    }
  }
}

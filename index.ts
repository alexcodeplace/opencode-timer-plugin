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

// Security: Validate config schema
const TimerConfigSchema = z.object({
  updateInterval: z.number().int().min(100).max(60000).optional(),
  titlePrefix: z.string().max(100).optional(),
  notifyOnCompletion: z.boolean().optional(),
})

export const TimerPlugin: Plugin = async ({ client, directory, $ }) => {
  // Security: Sanitize strings for terminal output (prevent ANSI injection)
  const sanitizeForTerminal = (str: string): string => {
    // Remove all control characters except printable ASCII
    return str.replace(/[\x00-\x1F\x7F-\x9F]/g, '')
  }

  // Security: Sanitize strings for shell commands
  const sanitizeForShell = (str: string): string => {
    // Escape shell metacharacters
    return str.replace(/[`$\\!"]/g, '\\$&')
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

  // Security: Sanitize titlePrefix from config and environment
  const rawPrefix = config.titlePrefix ?? process.env.TERM_PROGRAM ?? "OpenCode"
  const titlePrefix = sanitizeForTerminal(rawPrefix)

  const notifyOnCompletion = config.notifyOnCompletion ?? true

  const sessions = new Map<string, {
    startTime: number
    interval: NodeJS.Timeout
    lastMessage: string
  }>()

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
      const truncatedOutput = agentOutput.length > 200
        ? agentOutput.substring(0, 197) + "..."
        : agentOutput

      // Security: Sanitize for shell command
      const safeRuntime = sanitizeForShell(runtime)
      const safeOutput = sanitizeForShell(truncatedOutput)
      const message = `Runtime: ${safeRuntime}\\n\\n${safeOutput}`

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
        }, updateInterval)

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
          // Accumulate text from assistant messages
          session.lastMessage += part.text
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

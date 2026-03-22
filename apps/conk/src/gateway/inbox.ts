/**
 * CONK Agent Inbox
 * Structured event queue for the daemon.
 * Only gateway-approved messages reach here.
 * 
 * The daemon reads from the inbox. It never reads raw network content.
 */

import type { InboxEvent, MessageType, TrustLevel } from './types'

const MAX_INBOX_SIZE = 1000

class AgentInbox {
  private events: InboxEvent[] = []
  private listeners: Map<MessageType, ((event: InboxEvent) => void)[]> = new Map()

  // Add a gateway-approved event to the inbox
  push(event: Omit<InboxEvent, 'id' | 'timestamp' | 'processed'>): InboxEvent {
    const full: InboxEvent = {
      ...event,
      id:        `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      timestamp: Date.now(),
      processed: false,
    }

    this.events.unshift(full)

    // Keep inbox bounded
    if (this.events.length > MAX_INBOX_SIZE) {
      this.events = this.events.slice(0, MAX_INBOX_SIZE)
    }

    // Notify listeners
    const handlers = this.listeners.get(event.type) ?? []
    handlers.forEach(h => h(full))

    return full
  }

  // Get unprocessed events
  pending(types?: MessageType[]): InboxEvent[] {
    return this.events.filter(e =>
      !e.processed && (!types || types.includes(e.type))
    )
  }

  // Get events by trust level
  byTrust(trust: TrustLevel): InboxEvent[] {
    return this.events.filter(e => e.trust === trust && !e.processed)
  }

  // Mark event as processed
  process(id: string, action?: string): void {
    const evt = this.events.find(e => e.id === id)
    if (evt) { evt.processed = true; evt.action = action }
  }

  // Get all events (for UI display)
  all(limit = 50): InboxEvent[] {
    return this.events.slice(0, limit)
  }

  // Get unread count by type
  counts(): Record<MessageType, number> {
    const counts: Partial<Record<MessageType, number>> = {}
    this.events.filter(e => !e.processed).forEach(e => {
      counts[e.type] = (counts[e.type] ?? 0) + 1
    })
    return counts as Record<MessageType, number>
  }

  // Subscribe to event type
  on(type: MessageType, handler: (event: InboxEvent) => void): () => void {
    const handlers = this.listeners.get(type) ?? []
    handlers.push(handler)
    this.listeners.set(type, handlers)
    // Return unsubscribe function
    return () => {
      const h = this.listeners.get(type) ?? []
      this.listeners.set(type, h.filter(fn => fn !== handler))
    }
  }

  // Clear processed events older than X ms
  gc(olderThanMs = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - olderThanMs
    this.events = this.events.filter(e => !e.processed || e.timestamp > cutoff)
  }

  // Clear all
  clear(): void {
    this.events = []
  }
}

// Singleton inbox — one per daemon session
export const inbox = new AgentInbox()

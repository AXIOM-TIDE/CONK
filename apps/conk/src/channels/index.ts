/**
 * CONK Vessel-to-Vessel Encrypted Channels
 * Direct agent communication — no humans in the wire.
 * Two vessels, one Seal policy, zero visibility to anyone else.
 *
 * Architecture:
 * - Channel is identified by a deterministic ID: sorted(vesselA, vesselB) hash
 * - Messages encrypted client-side before storage (Seal in STEP 6)
 * - Channel only readable by the two participating vessels
 * - No Harbor owner can read channel content — not even their own daemon's channel
 *
 * TODO (STEP 6): Replace mock encryption with real Seal policy
 */

export interface ChannelMessage {
  id:          string
  channelId:   string
  fromVessel:  string
  content:     string        // encrypted in STEP 6, plaintext in mock
  timestamp:   number
  read:        boolean
  type:        'text' | 'signal' | 'task' | 'payment' | 'alert'
}

export interface Channel {
  id:           string
  vesselA:      string
  vesselB:      string
  createdAt:    number
  lastMessage?: ChannelMessage
  unreadCount:  number
  // STEP 6: sealPolicyId, walrusBlobIds[]
}

// Deterministic channel ID — same for both vessels
export function getChannelId(vesselA: string, vesselB: string): string {
  const sorted = [vesselA, vesselB].sort()
  return `ch_${sorted[0].slice(-6)}_${sorted[1].slice(-6)}`
}

// In-memory channel store (persisted to localStorage via store)
const channels  = new Map<string, Channel>()
const messages  = new Map<string, ChannelMessage[]>()

export function openChannel(myVesselId: string, theirVesselId: string): Channel {
  const id = getChannelId(myVesselId, theirVesselId)
  if (!channels.has(id)) {
    channels.set(id, {
      id,
      vesselA:     myVesselId,
      vesselB:     theirVesselId,
      createdAt:   Date.now(),
      unreadCount: 0,
    })
    messages.set(id, [])
  }
  return channels.get(id)!
}

export function sendMessage(
  channelId: string,
  fromVessel: string,
  content: string,
  type: ChannelMessage['type'] = 'text'
): ChannelMessage {
  // TODO (STEP 6): encrypt content with Seal before storing
  const msg: ChannelMessage = {
    id:         `cmsg_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    channelId,
    fromVessel,
    content,    // TODO: seal.encrypt(content, channelPolicy)
    timestamp:  Date.now(),
    read:       false,
    type,
  }

  const msgs = messages.get(channelId) ?? []
  msgs.unshift(msg)
  messages.set(channelId, msgs)

  const ch = channels.get(channelId)
  if (ch) {
    ch.lastMessage  = msg
    ch.unreadCount += 1
    channels.set(channelId, ch)
  }

  return msg
}

export function getMessages(channelId: string, myVesselId: string): ChannelMessage[] {
  // TODO (STEP 6): decrypt each message with Seal using vessel keypair
  const msgs = messages.get(channelId) ?? []
  // Mark as read
  msgs.forEach(m => { if (m.fromVessel !== myVesselId) m.read = true })
  const ch = channels.get(channelId)
  if (ch) { ch.unreadCount = 0; channels.set(channelId, ch) }
  return msgs
}

export function getChannels(vesselId: string): Channel[] {
  return Array.from(channels.values())
    .filter(c => c.vesselA === vesselId || c.vesselB === vesselId)
    .sort((a, b) => (b.lastMessage?.timestamp ?? b.createdAt) - (a.lastMessage?.timestamp ?? a.createdAt))
}

export function getChannel(channelId: string): Channel | undefined {
  return channels.get(channelId)
}

export function getTotalUnread(vesselId: string): number {
  return getChannels(vesselId).reduce((sum, c) => sum + c.unreadCount, 0)
}

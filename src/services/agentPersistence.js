/**
 * Agent Persistence Service
 *
 * Saves and loads the AI agent state to/from Firestore so returning users
 * get the same agent with its accumulated memory instead of a blank slate.
 *
 * Firestore path: users/{uid}/agent/state
 *
 * Memory items are capped per plan (75/200/500). Each item is one of:
 *   - insight   — observation about the user's profile
 *   - summary   — compressed summary of a past conversation
 *   - goal      — user-stated career/learning goal
 *   - action    — tracked recommendation + status
 *
 * Only paid plans (Student+) persist memory. Free users always get a fresh agent.
 * Custom agent identity (name, personality, icon) requires Pro+.
 */

import { db, auth } from '@/config/firebase'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { hasAgentMemory, hasCustomAgent, getMemoryLimit } from '@/config/plans'

// ─── Constants ──────────────────────────────────────────────────────────────

/** Absolute ceiling for memory items (safety net — effective cap comes from plan) */
export const MEMORY_MAX_ITEMS = 500

/** Maximum length (chars) of a single memory item's content field */
export const MEMORY_ITEM_MAX_LENGTH = 500

/** Maximum byte size for a base64-encoded agent icon (256 KB) */
export const AGENT_ICON_MAX_BYTES = 256 * 1024

/** Memory item types */
export const MEMORY_TYPES = {
  INSIGHT: 'insight',
  SUMMARY: 'summary',
  GOAL: 'goal',
  ACTION: 'action',
}

// ─── Firestore helpers ──────────────────────────────────────────────────────

/**
 * Get the Firestore document reference for a user's agent state.
 * @param {string} uid
 */
function agentRef(uid) {
  return doc(db, 'users', uid, 'agent', 'state')
}

// ─── Read ───────────────────────────────────────────────────────────────────

/**
 * Load the persisted agent state from Firestore.
 * Returns null when no agent has been saved yet or the user is on free tier.
 *
 * @param {string} uid    - Firebase Auth UID
 * @param {string} planId - Current plan (used to gate access)
 * @returns {Promise<Object|null>} Saved agent state or null
 */
export async function loadAgentState(uid, planId = 'free') {
  if (!hasAgentMemory(planId) || !uid) return null

  // Guard: if the client isn't signed in or the UID doesn't match, skip the read.
  // Firestore rules will reject it anyway, and this prevents noisy permission errors.
  if (!auth?.currentUser || auth.currentUser.uid !== uid) {
    return null
  }

  try {
    const snap = await getDoc(agentRef(uid))
    return snap.exists() ? snap.data() : null
  } catch (err) {
    // Permission-denied is expected during auth state transitions (e.g., hot reload).
    // Silently return null to avoid noisy console warnings.
    if (err?.code !== 'permission-denied') {
      console.warn('Failed to load agent state:', err.message)
    }
    return null
  }
}

// ─── Write ──────────────────────────────────────────────────────────────────

/**
 * Persist agent state to Firestore.
 * Enforces the memory cap before writing.
 *
 * @param {string} uid      - Firebase Auth UID
 * @param {string} planId   - Current plan
 * @param {Object} state    - Agent state object to persist
 * @param {Array}  state.memory         - Long-term memory items
 * @param {Object} [state.identity]     - Custom name/personality/icon (Pro+ only)
 * @param {boolean} [state.memoryEnabled] - Whether memory is active
 * @returns {Promise<void>}
 */
export async function saveAgentState(uid, planId = 'free', state = {}) {
  if (!hasAgentMemory(planId) || !uid) return

  // Guard: if the UID doesn't match the signed-in user, skip the write.
  if (!auth?.currentUser || auth.currentUser.uid !== uid) {
    return
  }

  const toSave = {
    ...state,
    memory: enforceMemoryCap(state.memory || [], planId),
    updatedAt: new Date().toISOString(),
  }

  // Strip custom identity fields if the plan doesn't support it
  if (!hasCustomAgent(planId)) {
    delete toSave.identity
  }

  try {
    await setDoc(agentRef(uid), toSave, { merge: true })
  } catch (err) {
    // Permission-denied is expected during auth state transitions; silently skip.
    if (err?.code !== 'permission-denied') {
      console.warn('Failed to save agent state:', err.message)
    }
  }
}

/**
 * Save only the identity portion (name, personality, icon).
 * Pro+ only.
 *
 * @param {string} uid
 * @param {string} planId
 * @param {Object} identity
 * @param {string} [identity.name]
 * @param {string} [identity.personality]
 * @param {string} [identity.customPersonality]
 * @param {string} [identity.icon] - base64 data URI
 * @returns {Promise<void>}
 */
export async function saveAgentIdentity(uid, planId, identity) {
  if (!hasCustomAgent(planId) || !uid) return

  // Guard: if the UID doesn't match the signed-in user, skip the write.
  if (!auth?.currentUser || auth.currentUser.uid !== uid) {
    return
  }

  try {
    await setDoc(agentRef(uid), { identity, updatedAt: new Date().toISOString() }, { merge: true })
  } catch (err) {
    if (err?.code !== 'permission-denied') {
      console.warn('Failed to save agent identity:', err.message)
    }
  }
}

// ─── Memory management ──────────────────────────────────────────────────────

/**
 * Add a memory item and persist immediately.
 *
 * @param {string} uid
 * @param {string} planId
 * @param {{ type: string, content: string, meta?: Object }} item
 * @returns {Promise<Array>} Updated memory array
 */
export async function addMemoryItem(uid, planId, item) {
  if (!hasAgentMemory(planId)) return []

  const current = await loadAgentState(uid, planId)
  const memory = current?.memory || []

  const sanitized = {
    type: item.type,
    content: String(item.content).trim().slice(0, MEMORY_ITEM_MAX_LENGTH),
    meta: item.meta || {},
    createdAt: new Date().toISOString(),
  }

  memory.push(sanitized)
  const capped = enforceMemoryCap(memory, planId)

  await saveAgentState(uid, planId, { ...(current || {}), memory: capped })
  return capped
}

/**
 * Clear all memory items (but keep identity).
 *
 * @param {string} uid
 * @param {string} planId
 * @returns {Promise<void>}
 */
export async function clearAgentMemory(uid, planId) {
  if (!hasAgentMemory(planId)) return
  const current = await loadAgentState(uid, planId)
  await saveAgentState(uid, planId, { ...(current || {}), memory: [] })
}

/**
 * Toggle memory on/off.
 *
 * @param {string} uid
 * @param {string} planId
 * @param {boolean} enabled
 * @returns {Promise<void>}
 */
export async function toggleAgentMemory(uid, planId, enabled) {
  if (!hasAgentMemory(planId) || !uid) return
  // Guard: if UID doesn't match, the load/save will already skip.
  const current = await loadAgentState(uid, planId)
  await saveAgentState(uid, planId, { ...(current || {}), memoryEnabled: enabled })
}

/**
 * Delete a single memory item by index.
 * @param {string} uid
 * @param {string} planId
 * @param {number} index - Index of the memory item to remove
 * @returns {Promise<Array>} Updated memory array
 */
export async function deleteMemoryItem(uid, planId, index) {
  if (!hasAgentMemory(planId)) return []
  const current = await loadAgentState(uid, planId)
  const memory = [...(current?.memory || [])]
  if (index >= 0 && index < memory.length) {
    memory.splice(index, 1)
  }
  await saveAgentState(uid, planId, { ...(current || {}), memory })
  return memory
}

/**
 * Delete the entire agent document (used by account deletion).
 *
 * @param {string} uid
 * @returns {Promise<void>}
 */
export async function deleteAgentState(uid) {
  if (!uid) return

  // Guard: only allow deletion if the UID matches the current auth user.
  if (!auth?.currentUser || auth.currentUser.uid !== uid) {
    return
  }

  try {
    await deleteDoc(agentRef(uid))
  } catch (err) {
    if (err?.code !== 'permission-denied') {
      console.warn('Failed to delete agent state:', err.message)
    }
  }
}

// ─── Internal ───────────────────────────────────────────────────────────────

/**
 * Trim memory to the plan's limit, keeping the most recent entries.
 * Falls back to MEMORY_MAX_ITEMS as an absolute ceiling.
 * @param {Array} memory
 * @param {string} planId
 * @returns {Array}
 */
function enforceMemoryCap(memory, planId = 'free') {
  if (!Array.isArray(memory)) return []
  const cap = Math.min(getMemoryLimit(planId) || 0, MEMORY_MAX_ITEMS)
  if (cap <= 0) return []
  if (memory.length <= cap) return memory
  return memory.slice(-cap)
}

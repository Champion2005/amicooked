import { db } from '@/config/firebase';
import { addMemoryItem, MEMORY_TYPES } from './agentPersistence';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

/**
 * Save a project (bookmark). Creates a doc keyed by a stable slug of the project name.
 */
export async function saveProject(userId, project) {
  try {
    const id = slugify(project.name);
    const ref = doc(db, 'users', userId, 'savedProjects', id);
    await setDoc(ref, {
      ...project,
      messages: [],
      savedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
}

/**
 * Remove a saved project and its chat permanently.
 */
export async function unsaveProject(userId, projectId) {
  try {
    const ref = doc(db, 'users', userId, 'savedProjects', projectId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error unsaving project:', error);
    throw error;
  }
}

/**
 * Check whether a project (by name) is already saved.
 */
export async function isProjectSaved(userId, projectName) {
  try {
    const id = slugify(projectName);
    const ref = doc(db, 'users', userId, 'savedProjects', id);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (error) {
    console.warn('Could not check saved status:', error.message);
    return false;
  }
}

/**
 * Get all saved projects ordered by most recent.
 */
export async function getSavedProjects(userId) {
  try {
    const colRef = collection(db, 'users', userId, 'savedProjects');
    const q = query(colRef, orderBy('savedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      savedAt:
        d.data().savedAt instanceof Timestamp
          ? d.data().savedAt.toDate().toISOString()
          : d.data().savedAt,
    }));
  } catch (error) {
    console.error('Error getting saved projects:', error);
    return [];
  }
}

/**
 * Append a message to a saved project's chat.
 */
export async function addProjectMessage(userId, projectId, role, content) {
  try {
    const ref = doc(db, 'users', userId, 'savedProjects', projectId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Saved project not found');

    const existing = snap.data().messages || [];
    existing.push({ role, content, timestamp: new Date().toISOString() });

    await updateDoc(ref, {
      messages: existing,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding project message:', error);
    throw error;
  }
}

/**
 * Get a single saved project by ID.
 */
export async function getSavedProject(userId, projectId) {
  try {
    const ref = doc(db, 'users', userId, 'savedProjects', projectId);
    const snap = await getDoc(ref);
    if (snap.exists()) return { id: snap.id, ...snap.data() };
    return null;
  } catch (error) {
    console.error('Error getting saved project:', error);
    return null;
  }
}

/**
 * Record a bookmarked project in agent memory (fire-and-forget).
 * Called from the UI layer after a successful save.
 *
 * @param {string} userId
 * @param {string} planId
 * @param {Object} project - The project object with at least { name, description }
 */
export function recordProjectBookmark(userId, planId, project) {
  if (!userId || !project?.name) return;
  const content = `Bookmarked project: "${project.name}"${project.description ? ` — ${project.description}` : ''}`;
  addMemoryItem(userId, planId, {
    type: MEMORY_TYPES.ACTION,
    content: content.slice(0, 500),
    meta: { source: 'project-bookmark', projectName: project.name },
  }).catch(() => {});
}

// ── helpers ──────────────────────────────────────────────
export function slugify(name) {
  return (name || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 60);
}

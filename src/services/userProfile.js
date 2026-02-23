import { db } from '@/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Fetch user profile from Firestore
 * @param {string} userId - The user's Firebase Auth UID
 * @returns {Promise<Object|null>} User profile data or null if not found
 */
export async function getUserProfile(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Save or update user profile in Firestore
 * @param {string} userId - The user's Firebase Auth UID
 * @param {Object} profileData - The profile data to save
 * @returns {Promise<void>}
 */
export async function saveUserProfile(userId, profileData) {
  try {
    const userRef = doc(db, 'users', userId);
    
    const dataToSave = {
      ...profileData,
      updatedAt: new Date().toISOString(),
      createdAt: profileData.createdAt || new Date().toISOString()
    };
    
    await setDoc(userRef, dataToSave, { merge: true });
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}

/**
 * Save analysis results to Firestore
 * @param {string} userId - The user's Firebase Auth UID
 * @param {Object} data - { githubData, analysis, recommendedProjects }
 * @returns {Promise<void>}
 */
export async function saveAnalysisResults(userId, { githubData, analysis, recommendedProjects }) {
  try {
    const ref = doc(db, 'users', userId, 'results', 'latest');
    await setDoc(ref, {
      githubData,
      analysis,
      recommendedProjects,
      analyzedAt: new Date().toISOString()
    });
  } catch (error) {
    // Non-critical: results are already in memory, so just log and continue
    console.warn('Could not save analysis results (ad blocker may be active):', error.message);
  }
}

/**
 * Get user preferences from Firestore.
 * Returns an empty object if no preferences have been saved yet.
 *
 * @param {string} userId - The user's Firebase Auth UID
 * @returns {Promise<Object>} Preferences object
 */
export async function getUserPreferences(userId) {
  try {
    const ref = doc(db, 'users', userId);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data().preferences ?? {}) : {};
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    throw error;
  }
}

/**
 * Save (merge) user preferences into Firestore.
 * Only the keys provided in `preferences` are updated; all others are left intact.
 *
 * @param {string} userId - The user's Firebase Auth UID
 * @param {Object} preferences - Partial preferences to persist
 * @returns {Promise<void>}
 */
export async function saveUserPreferences(userId, preferences) {
  try {
    const ref = doc(db, 'users', userId);
    await setDoc(ref, { preferences }, { merge: true });
  } catch (error) {
    console.error('Error saving user preferences:', error);
    throw error;
  }
}

/**
 * Get saved analysis results from Firestore
 * @param {string} userId - The user's Firebase Auth UID
 * @returns {Promise<Object|null>} Saved results or null
 */
export async function getAnalysisResults(userId) {
  try {
    const ref = doc(db, 'users', userId, 'results', 'latest');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    // Non-critical: if cache fetch fails, fall through to fresh analysis
    console.warn('Could not fetch cached results (ad blocker may be active):', error.message);
    return null;
  }
}

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

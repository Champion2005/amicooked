/**
 * Account Deletion Service
 *
 * Permanently deletes all of a user's data from Firestore, then removes
 * the Firebase Auth record, and clears all client-side storage.
 *
 * Firestore structure wiped:
 *   users/{uid}                   — main user document
 *   users/{uid}/chats/*           — AI chat history
 *   users/{uid}/savedProjects/*   — saved project cards
 *   users/{uid}/results/*         — cached analysis results
 *   users/{uid}/agent/*           — persistent agent state & memory
 *
 * ─── STRIPE HOOK (future) ──────────────────────────────────────────────────
 * Before wiping Firestore, call a Firebase Cloud Function to cancel any
 * active Stripe subscription. Insert the following block at the top of
 * deleteAccount(), before the subcollection deletions:
 *
 *   import { getFunctions, httpsCallable } from 'firebase/functions';
 *   const cancelSub = httpsCallable(getFunctions(), 'cancelStripeSubscription');
 *   await cancelSub({ uid });
 *
 * The Cloud Function should call stripe.subscriptions.cancel() for the
 * subscription linked to this uid, then return { success: true }.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Security note:
 *   Firebase Auth may require recent authentication before deleteUser()
 *   succeeds. If the call throws auth/requires-recent-login, surface a
 *   friendly message asking the user to sign out and sign back in first.
 */

import { collection, getDocs, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db, auth } from '@/config/firebase';

/** Subcollections nested under users/{uid} that must be wiped before the parent doc */
const SUBCOLLECTIONS = ['chats', 'savedProjects', 'results', 'agent'];

/**
 * Delete every document in one subcollection of a user doc.
 * @param {string} uid
 * @param {string} subcollection
 * @returns {Promise<void>}
 */
async function deleteSubcollection(uid, subcollection) {
  const colRef = collection(db, 'users', uid, subcollection);
  const snap = await getDocs(colRef);
  if (snap.empty) return;
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * Permanently delete the current user's account:
 *   1. Deletes all Firestore subcollections.
 *   2. Deletes the main user Firestore document.
 *   3. Deletes the Firebase Auth record.
 *   4. Clears localStorage.
 *
 * Throws on failure — the caller is responsible for catching and showing an error.
 *
 * @returns {Promise<void>}
 */
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user found.');

  const uid = user.uid;

  // Wipe all subcollections in parallel
  await Promise.all(SUBCOLLECTIONS.map((col) => deleteSubcollection(uid, col)));

  // Wipe the main user document
  await deleteDoc(doc(db, 'users', uid));

  // Delete the Firebase Auth record
  // Note: if this throws auth/requires-recent-login, surface a friendly message
  // asking the user to sign out and sign back in, then try again.
  await deleteUser(user);

  // Clear all client-side state
  localStorage.clear();
  sessionStorage.clear();
}

/**
 * Reset all user data while preserving the authenticated account and subscription plan.
 *
 * Wipes:
 *   - All subcollections (chats, savedProjects, results, agent)
 *   - Profile data, preferences, usage counters
 *
 * Preserves:
 *   - Firebase Auth account (user stays signed in)
 *   - Subscription plan tier
 *
 * Throws on failure — the caller is responsible for catching and showing an error.
 *
 * @returns {Promise<void>}
 */
export async function resetAllData() {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user found.');

  const uid = user.uid;
  const ref = doc(db, 'users', uid);

  // Read the current plan before wiping so we can preserve it
  const snap = await getDoc(ref);
  const currentPlan = snap.exists() ? (snap.data().plan || 'free') : 'free';

  // Wipe all subcollections in parallel
  await Promise.all(SUBCOLLECTIONS.map((col) => deleteSubcollection(uid, col)));

  // Reset the user document — keep only plan + fresh timestamps
  await setDoc(ref, {
    plan: currentPlan,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // No need to clear sessionStorage for a data reset — the github_token
  // must remain intact for API calls, and Firebase Auth state is managed
  // via IndexedDB. Only Firestore data was wiped above.
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, githubProvider, db } from '@/config/firebase';

/**
 * Shared hook for GitHub OAuth sign-in.
 * Used by Landing and Pricing pages.
 *
 * @param {Object} [options]
 * @param {string} [options.redirectTo='/dashboard'] - Where to navigate after sign-in
 * @param {Function} [options.onError] - Optional error callback (receives error object)
 * @returns {{ handleGitHubSignIn: Function, loading: boolean }}
 */
export function useGitHubSignIn({ redirectTo = '/dashboard', onError } = {}) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGitHubSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const credential = result._tokenResponse.oauthAccessToken;
      sessionStorage.setItem('github_token', credential);

      // ── Initialize user doc ────────────────────────────────────────────────
      // Always upsert metadata (displayName, photoURL, etc.).
      // Only set plan: 'free' when the plan field doesn't already exist —
      // this prevents accidentally demoting a paid user to free.
      const user = result.user;
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      const existing = snap.exists() ? snap.data() : {};

      const docData = {
        uid: user.uid,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        email: user.email ?? null,
        updatedAt: new Date().toISOString(),
      };

      // Only set plan on first creation (or if somehow missing)
      if (!existing.plan) {
        docData.plan = 'free';
        docData.createdAt = new Date().toISOString();
      }

      await setDoc(ref, docData, { merge: true });
      // ──────────────────────────────────────────────────────────────────────

      navigate(redirectTo);
    } catch (error) {
      console.error('Authentication error:', error);
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return { handleGitHubSignIn, loading };
}

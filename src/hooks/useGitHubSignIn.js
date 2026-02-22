import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, githubProvider } from '@/config/firebase';

/**
 * Shared hook for GitHub OAuth sign-in.
 * Used by Landing and Payment pages.
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
      localStorage.setItem('github_token', credential);
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

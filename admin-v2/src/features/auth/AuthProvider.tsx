/**
 * Backward-compatible public entry.
 *
 * Existing imports can keep using:
 *   import { AuthProvider, useAuth } from ".../features/auth/AuthProvider";
 *
 * The implementation now lives in smaller feature files.
 */
export { AuthProvider } from "./components/AuthProvider";
export { useAuth } from "./hooks/useAuth";

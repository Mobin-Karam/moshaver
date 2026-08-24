---
description: Rules for the Tauri v2 Android mobile application.
applyTo: "mobile/**/*.{ts,tsx,js,jsx,rs,json,toml,xml,gradle,kts,css}"
---

# Mobile Engineering Rules

The mobile application uses technologies such as:

- Tauri v2
- Rust
- Android System WebView
- React
- TypeScript
- Vite
- TanStack React Query
- React Hook Form
- Zod
- Tailwind CSS

Verify the current implementation before changing it.

## Mobile responsibility

The mobile app must:

- Use existing backend APIs.
- Preserve login state safely.
- Handle expired sessions.
- Handle offline and unstable network states.
- Respect Android safe areas.
- Handle the keyboard correctly.
- Support Android back navigation.
- Avoid opening normal app routes in an external browser.
- Use external opening only for explicitly external URLs.

## Authentication

Audit all of:

- Cookie persistence
- Access-token persistence
- Refresh-token handling
- WebView storage behavior
- Logout cleanup
- App restart behavior
- Session expiration
- Tenant switching

Do not store sensitive tokens in insecure plaintext storage when secure alternatives exist.

## UI

Mobile screens must be:

- Touch friendly
- Responsive
- Safe-area aware
- Keyboard aware
- Accessible
- Suitable for small screens
- Consistent with the Barez design system

Password fields must use predictable English-compatible behavior and must not silently transform the submitted password.

## Android validation

After meaningful changes, validate:

- Web build
- Rust compilation
- Tauri configuration
- Android build configuration
- Package name
- Permissions
- APK or AAB generation when required
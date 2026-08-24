---
name: mobile-development
description: Implement, repair, refactor, and validate the Tauri v2 Android mobile application. Use for WebView integration, authentication persistence, navigation, Android lifecycle, safe areas, keyboard handling, offline states, API integration, APK builds, and mobile UI.
---

# Mobile Development Skill

## Workflow

1. Inspect the Tauri configuration and mobile application entry points.
2. Determine whether the task belongs to React, Tauri Rust, or Android configuration.
3. Inspect the real backend API used by the screen.
4. Inspect authentication and session persistence behavior.
5. Implement the smallest complete change.
6. Validate navigation and Android back-button behavior.
7. Validate keyboard, safe areas, and viewport behavior.
8. Validate app restart and resume behavior.
9. Run frontend and Tauri checks.
10. Report build or device-validation requirements.

## Authentication checklist

Verify:

- Login request
- Cookie or token persistence
- Refresh flow
- App restart
- App background/resume
- Session expiration
- Logout
- Secure cleanup
- Tenant switching

## Mobile screen checklist

Every screen should consider:

- Safe-area top
- Safe-area bottom
- Software keyboard
- Small-screen layout
- Loading state
- Offline state
- Error state
- Retry action
- Back navigation
- Touch target size

## Completion criteria

A mobile task is complete only when:

- The app uses the real backend contract.
- Authentication persists correctly where intended.
- Logout clears session state.
- Navigation stays inside the app for internal routes.
- Mobile layout is validated.
- Relevant build checks pass.
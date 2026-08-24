---
name: mobile-development
description: Implement, repair, refactor, optimize, and validate mobile application features across native, cross-platform, hybrid, and WebView-based projects. Use for Android/iOS screens, navigation, authentication persistence, lifecycle handling, safe areas, keyboard behavior, offline states, API integration, deep links, permissions, builds, and mobile performance. Adapt to the project's actual mobile stack instead of assuming Tauri or any specific framework.
---

# Mobile Development Skill

## Core Principle

Determine the mobile architecture before editing.

The application may use:

- native Android,
- native iOS,
- Kotlin Multiplatform,
- SwiftUI,
- React Native,
- Expo,
- Flutter,
- Tauri,
- Capacitor,
- Ionic,
- a WebView shell,
- a PWA,
- or another architecture.

Do not migrate stacks or introduce a mobile framework unless explicitly required.

Follow existing project conventions first.

## Architecture Discovery

Before implementation, determine where applicable:

- Target platform: Android, iOS, or both
- Framework/runtime
- Application entry points
- Native vs WebView ownership
- Navigation system
- State management
- API client
- Authentication/session storage
- Secure credential storage
- Lifecycle handling
- Offline strategy
- Persistence/database
- Push notifications
- Deep links
- Native permissions
- Build configuration
- Environment configuration
- Supported OS versions
- Testing setup

## Workflow

1. Read the requested feature, bug, or refactor.

2. Inspect mobile configuration and application entry points.

3. Determine which layer owns the behavior:
   - shared UI/application code,
   - native Android,
   - native iOS,
   - bridge/plugin layer,
   - backend,
   - WebView content.

4. Inspect the real backend/API contract.

5. Inspect authentication and persistence behavior.

6. Inspect navigation and lifecycle expectations.

7. Create a focused implementation plan.

8. Implement the smallest complete change.

9. Validate applicable:
   - navigation,
   - system back behavior,
   - gestures,
   - keyboard,
   - safe areas,
   - lifecycle,
   - offline/reconnect,
   - small-screen layout.

10. Validate restart, background, and resume behavior when state or authentication is affected.

11. Run available frontend/native/mobile checks and builds.

12. Report:

- changed files,
- platform-specific behavior,
- validations performed,
- device/emulator checks still required.

## Authentication Checklist

Where applicable, verify:

- Login request
- Session/token/cookie persistence
- Secure credential handling
- Refresh or reauthentication behavior
- App restart
- App background/resume
- Session expiration
- Logout
- Secure cleanup
- Account/profile switching
- Tenant/workspace switching if the product supports it

Do not assume token authentication.

The application may legitimately use:

- cookies,
- server sessions,
- access/refresh tokens,
- platform credentials,
- or another mechanism.

Follow the backend's real security model.

## Mobile Screen Checklist

Every significant screen should consider where relevant:

- safe-area top
- safe-area bottom
- system bars
- software keyboard
- small-screen layout
- orientation
- dynamic text size
- loading state
- empty state
- offline state
- error state
- retry action
- back navigation
- touch target size
- scrolling
- focus behavior
- slow network behavior

## Navigation

Internal navigation should remain inside the intended application navigation system.

Verify:

- hardware/system back button,
- navigation stack behavior,
- modal dismissal,
- deep-link entry,
- authenticated route guards,
- restoring navigation after app resume,
- external links opening with intended behavior.

Avoid rebuilding navigation infrastructure for isolated screen changes.

## Lifecycle

For stateful features, consider:

- cold launch
- warm launch
- foreground
- background
- resume
- process recreation
- network loss/recovery
- app update

Do not assume in-memory state survives lifecycle transitions.

## Keyboard and Forms

Validate:

- focused fields remain visible,
- keyboard does not cover primary actions,
- scroll containers resize correctly,
- submit action is accessible,
- duplicate submissions are prevented,
- validation and server errors remain visible.

## Offline and Network Behavior

Where applicable:

- detect failed requests,
- expose retry behavior,
- distinguish offline failures from server errors,
- preserve unsent user input,
- avoid duplicate mutations after reconnection.

Do not implement complex offline synchronization unless required by product behavior.

## API Integration

Verify:

- backend base URL/environment
- HTTP method
- endpoint
- authentication
- request schema
- response schema
- error behavior
- timeout/retry expectations

Do not silently diverge from web/backend API contracts.

## Native Permissions

When the feature uses device capabilities, verify:

- permission declaration,
- runtime request,
- denial behavior,
- permanently denied state,
- platform differences,
- privacy-sensitive handling.

Request only permissions required for the feature.

## Performance

For lower-end devices:

- minimize startup JavaScript/work,
- avoid unnecessary large libraries,
- avoid rendering huge lists,
- paginate or virtualize large collections,
- compress/resize images appropriately,
- avoid excessive animations,
- avoid unnecessary bridge calls,
- prevent repeated network requests.

Measure before making major architecture changes.

## WebView/Hybrid Applications

If the app embeds web content, determine clearly which layer owns:

- routing,
- authentication,
- cookies,
- storage,
- file access,
- deep links,
- native back behavior,
- external URLs,
- API requests.

Avoid duplicating the same responsibility in native and web layers.

## Build Validation

Use the project's actual tooling.

Possible validations include:

- lint
- type checking
- unit tests
- UI tests
- Android build
- iOS build
- framework-specific diagnostics
- emulator/device launch

Do not require a Tauri, Gradle, Xcode, Flutter, React Native, or other command unless that project actually uses it.

## Completion Criteria

A mobile task is complete when, where applicable:

- the real backend contract is used,
- implementation follows the existing mobile architecture,
- authentication persists correctly where intended,
- logout clears required state,
- navigation behaves correctly,
- lifecycle-sensitive state is handled,
- keyboard and safe areas are considered,
- loading/offline/error states exist,
- mobile layout is validated,
- relevant automated/build checks pass.

If physical-device validation cannot be performed, state that limitation rather than claiming it was tested.

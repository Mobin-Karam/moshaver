# Graph Report - moshaver  (2026-09-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 5666 nodes · 15345 edges · 320 communities (208 shown, 73 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 657 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `876e340b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 193
- Community 194
- Community 195
- Community 196
- Community 197
- Community 198
- Community 199
- Community 200
- Community 201
- Community 202
- Community 203
- Community 204
- Community 205
- Community 206
- Community 207
- Community 208
- Community 209
- Community 210
- Community 211
- Community 212
- Community 213
- Community 214
- Community 215
- Community 216
- Community 217
- Community 218
- Community 219
- Community 220
- Community 221
- Community 222
- Community 223
- Community 224
- Community 225
- Community 226
- Community 227
- Community 228
- Community 229
- Community 230
- Community 231
- Community 232
- Community 233
- Community 234
- Community 235
- Community 236
- Community 237
- Community 238
- Community 239
- Community 240
- Community 241
- Community 242
- Community 243
- Community 244
- Community 245
- Community 246
- Community 247
- Community 248
- Community 249
- Community 250
- Community 251
- Community 252
- Community 253
- Community 254
- Community 255
- Community 256
- Community 257
- Community 258
- Community 259
- Community 260
- Community 261
- Community 262
- Community 263
- Community 264
- Community 265
- Community 266
- Community 267
- Community 268
- Community 269
- Community 270
- Community 271
- Community 272
- Community 273
- Community 274
- Community 275
- Community 276
- Community 277
- Community 279
- Community 293
- Community 308

## God Nodes (most connected - your core abstractions)
1. `AuthenticatedUser` - 387 edges
2. `ok()` - 287 edges
3. `CurrentUser` - 255 edges
4. `ApiException` - 220 edges
5. `RequireCapabilities()` - 162 edges
6. `typeorm` - 141 edges
7. `Student` - 125 edges
8. `User` - 108 edges
9. `@nestjs/common` - 108 edges
10. `Button` - 75 edges

## Surprising Connections (you probably didn't know these)
- `confirmCommit()` --indirect_call--> `json()`  [INFERRED]
  admin-v2/src/shared/ui/data-transfer.tsx → backend-v2/scripts/migrate-v1-to-v2.mjs
- `confirmRemove()` --calls--> `notify()`  [EXTRACTED]
  admin-v2/src/features/exams/pages/ExamsPage.tsx → admin-v2/src/shared/ui/notifications.tsx
- `handleToggle()` --calls--> `notify()`  [EXTRACTED]
  admin-v2/src/features/exams/pages/ExamsPage.tsx → admin-v2/src/shared/ui/notifications.tsx
- `Meter()` --calls--> `fa()`  [EXTRACTED]
  admin-v2/src/features/reports/components/ReportCard.tsx → admin-v2/src/shared/lib/utils.ts
- `CatalogRow()` --calls--> `fa()`  [EXTRACTED]
  admin-v2/src/features/subjects/pages/SubjectsPage.tsx → admin-v2/src/shared/lib/utils.ts

## Import Cycles
- None detected.

## Communities (320 total, 73 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (121): Conversation, ConversationType, DIRECT, GROUP, Column, CreateDateColumn, Entity, Index (+113 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (96): ExamAssignment, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, ExamAttempt, Column (+88 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (101): ahead_behind(), app_header(), branch_commit_suggestion(), branches_menu(), choose_base_branch(), choose_branch_type(), choose_commit_hash(), choose_issue() (+93 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (101): ahead_behind(), app_header(), branch_commit_suggestion(), branches_menu(), choose_base_branch(), choose_branch_type(), choose_commit_hash(), choose_issue() (+93 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (78): deletePushSubscription(), getAdvisorInbox(), getNotificationsPage(), getPushConfig(), getPushStatusRemote(), markAllNotificationsRead(), markNotificationRead(), registerPushSubscription() (+70 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (53): CAPABILITIES_KEY, ROLES_KEY, mutating, RolesGuard, Injectable, UserRole, ADMIN, ADVISOR (+45 more)

### Community 6 - "Community 6"
Cohesion: 0.03
Nodes (83): ActivityEvent, Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, ImportHistory (+75 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (74): createPlan(), deletePlan(), deletePlannerTask(), duplicatePlan(), getPlanForDate(), getPlannerExams(), getPlans(), movePlannerTask() (+66 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (69): AlarmPanel(), DAYS, ClockOverview(), HeaderClock(), SessionStats(), StopwatchPanel(), PRESETS, TimerPanel() (+61 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (67): HttpExceptionFilter, LoggingInterceptor, Injectable, Column, CreateDateColumn, Entity, Index, ManyToOne (+59 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (64): allRoles, errorText(), nameOf(), OrganizationsPage(), organizationTypes, statusLabels, UsersPage(), acceptRelationship() (+56 more)

### Community 11 - "Community 11"
Cohesion: 0.04
Nodes (63): dataSourceOptions, dir, ChatConfiguration, Column, Entity, PrimaryColumn, UpdateDateColumn, ChatMessage (+55 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (50): addExamSyllabus(), createExam(), deleteExam(), deleteExamSyllabus(), getExamAttemptDetail(), getExamAttemptHistory(), getExams(), getRetryRequests() (+42 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (54): AttentionInbox(), Filter, reasonIcons, severityTone(), DashboardFollowUpCard(), icons, toneClass, DashboardMetricCards() (+46 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (28): ConversationList(), ConversationSkeleton(), CompactSkeleton(), LiveControls(), LiveHeader(), StudentDetailPanel(), StudentQueue(), TimelinePanel() (+20 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (14): AuthenticatedUser, RelationshipsController, Body, Controller, Delete, Get, Param, Patch (+6 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (36): createLearningItem(), deleteLearningItem(), getLearningReviewHistory(), getStudentLearning(), updateLearningItem(), LearningFilters(), LearningForm(), LearningList() (+28 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (15): Roles(), ok(), ExamsController, Body, Controller, Delete, Get, Param (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (18): RequireCapabilities(), ChatController, Body, Controller, Delete, Get, Param, Patch (+10 more)

### Community 19 - "Community 19"
Cohesion: 0.04
Nodes (44): activityIcon(), ActivityIsland(), ActivityKind, CompactActivity, formatTime(), plannedSeconds(), ExamPage(), formatDate() (+36 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (43): message(), queryClient, AppVersion, createRelaxationTrack(), downloadDatabaseBackup(), getAppVersions(), getAudit(), getDatabaseMeta() (+35 more)

### Community 21 - "Community 21"
Cohesion: 0.05
Nodes (48): autoprefixer, axe-core, jsdom, lucide-react, postcss, react, react-dom, react-router-dom (+40 more)

### Community 22 - "Community 22"
Cohesion: 0.04
Nodes (44): AppRelease, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, AppVersion, Column (+36 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (5): ChatService, emptyStudentProfile(), Injectable, repo(), service()

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (32): formatAudioTime(), NightReportForm(), invalid(), submit(), RecoveryRequestForm(), RelaxationLibrary(), SaveState, ChatProfile (+24 more)

### Community 25 - "Community 25"
Cohesion: 0.05
Nodes (22): zustand, AudioBackendState, AudioTrack, getAudioBackend(), initial, PlaybackState, FakeAudio, ProfilePage() (+14 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (33): adminBreadcrumbs(), adminDestination(), adminNavigation, flatAdminNavigation, mainAdminNavigation, mainNavigationForCapabilities(), navigationForCapabilities(), normalizeAdminPath() (+25 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (35): usePlannerNavigation(), usePlannerState(), isValidIsoDate(), safeIsoDate(), openDuplicate(), getReports(), ReportRow, Meter() (+27 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (32): createExamQuestion(), deleteExamQuestion(), getExamQuestions(), getStudentExams(), updateQuestion(), QuestionEditor(), QuestionsList(), QuestionsSelector() (+24 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (22): CreateUserDto, SetRolesDto, ArrayUnique, IsArray, IsOptional, IsString, IsUUID, Length (+14 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (17): CurrentUser, Get, Get, Headers, Get, Query, StudentAdministrationController, Body (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (30): LivePage, freshness(), getLiveStudentsSnapshot(), liveState(), normalizeLiveSnapshot(), WireLiveStudent, LiveSummaryGrid(), MiniMetric() (+22 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (3): ExamsService, nullableDate(), Injectable

### Community 33 - "Community 33"
Cohesion: 0.09
Nodes (28): @moshaver/student-core, @tauri-apps/plugin-sql, StudentAppShell(), Theme, DateMarker(), ExamCard(), minutes(), NotificationCard() (+20 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (5): ApiException, Delete, Param, StudentsService, Injectable

### Community 35 - "Community 35"
Cohesion: 0.07
Nodes (35): LearningItem, LearningStatus, ARCHIVED, DONE, PENDING, Column, CreateDateColumn, Entity (+27 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (25): checkBackendHealth(), getAccountContext(), getCurrentUser(), loginRequest(), logoutRequest(), Probe(), AuthContext, AuthProvider() (+17 more)

### Community 37 - "Community 37"
Cohesion: 0.06
Nodes (29): auditOnly, backendCrossModuleEdges, backendDeepImports, backendFileGraph, backendModule(), baselineCycles, baselineDeep, baselinePath (+21 more)

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (21): SubjectsPage, assignSubjectTeacher(), createSubject(), getStudentSubjects(), getSubjects(), getSubjectTeachers(), TeacherAssignment, unassignSubjectTeacher() (+13 more)

### Community 39 - "Community 39"
Cohesion: 0.11
Nodes (15): ImportExportService, Injectable, AssignTeacherSubjectDto, CreateSubjectDto, IsBoolean, IsInt, IsOptional, IsString (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.08
Nodes (22): OnboardingController, Body, Controller, Get, Param, Post, Req, AssignStudentOnboardingDto (+14 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (11): StudentController, StudentParityController, StudentsController, Body, Controller, Delete, Get, Param (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.11
Nodes (22): DevBackendSwitcher(), labelFor(), options, api, ApiEnvelope, AuthFailureListener, authFailureListeners, BackendTarget (+14 more)

### Community 43 - "Community 43"
Cohesion: 0.08
Nodes (13): RecommendationStatus, ACCEPTED, DISMISSED, PROPOSED, REJECTED, RecoveryRequestStatus, DISMISSED, PENDING (+5 more)

### Community 44 - "Community 44"
Cohesion: 0.08
Nodes (19): can, CapabilityRoute(), ChatPage, DashboardPage, ExamsPage, FollowUpPage, LearningPage, NotificationsPage (+11 more)

### Community 45 - "Community 45"
Cohesion: 0.10
Nodes (20): auth, notifications, SettingsPage, ExamCard(), Metric(), statusLabel(), changePassword(), getSessions() (+12 more)

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (11): ensureOrganizationChat(), OrganizationsController, Body, Controller, Delete, Get, Param, Patch (+3 more)

### Community 47 - "Community 47"
Cohesion: 0.07
Nodes (29): @types/node, description, engines, node, zod, main, name, private (+21 more)

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (21): chatApi, fetchConversationPage(), fetchMessages(), normalizeMessagePage(), WireChatMessage, chatKeys, ConversationSearch(), filters (+13 more)

### Community 49 - "Community 49"
Cohesion: 0.13
Nodes (17): CreateGroupButton(), CreateGroupForm(), GroupInfoButton(), GroupManager(), GroupMeta(), MemberRow(), PermissionEditor(), useDebouncedValue() (+9 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (30): RetryRequestStatus, APPROVED, PENDING, REJECTED, SyllabusProgressStatus, MASTERED, READ, REVIEW (+22 more)

### Community 51 - "Community 51"
Cohesion: 0.11
Nodes (12): ImportPlanDto, IsArray, IsBoolean, IsDateString, Type, ValidateNested, durationMinutes(), normalizeImportPayload() (+4 more)

### Community 52 - "Community 52"
Cohesion: 0.10
Nodes (17): RelaxationAdminController, Body, Controller, Get, Param, Patch, Post, SaveRelaxationTrackDto (+9 more)

### Community 53 - "Community 53"
Cohesion: 0.11
Nodes (14): ArrayMaxSize, SaveLearningResourceDto, ArrayUnique, IsArray, IsIn, IsOptional, IsString, IsUrl (+6 more)

### Community 54 - "Community 54"
Cohesion: 0.12
Nodes (11): AttemptDraft, attemptDraftKey(), AttemptStorage, browserAttemptStorage, createAnswer(), ExamAutosaveController, Listener, readableError() (+3 more)

### Community 55 - "Community 55"
Cohesion: 0.13
Nodes (23): normalizeChatMessage(), ConversationSidebar(), MessageSearchBar(), useChatSelectionParams(), useConversation(), useMessageActions(), toFa(), draftKey() (+15 more)

### Community 56 - "Community 56"
Cohesion: 0.12
Nodes (19): exam, ExamPreflight(), formatCountdown(), testStorage(), ExamRunner(), formatSeconds(), Props, QuestionSheet() (+11 more)

### Community 57 - "Community 57"
Cohesion: 0.12
Nodes (25): errors, ids, packages, paths, declaredDependencies(), dependencyClosure(), graphPath, here (+17 more)

### Community 58 - "Community 58"
Cohesion: 0.19
Nodes (9): AssessmentsController, Body, Controller, Delete, Get, Param, Patch, Post (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.11
Nodes (24): Bubble(), ChatMessage, ChatPage(), closeConversation(), jumpToBottom(), loadConversations(), loadOlder(), markChatRead() (+16 more)

### Community 60 - "Community 60"
Cohesion: 0.12
Nodes (20): addDays(), calendarGrid(), filterLabel(), filterOptions, FilterValue, formatElapsed(), matches(), parts() (+12 more)

### Community 61 - "Community 61"
Cohesion: 0.20
Nodes (20): formatStudentLastSeen(), getMissingStudentProfileFields(), getStudentProfileCompleteness(), getStudentStatus(), getStudentUsername(), StudentDetailTab, StudentProfileFilter, StudentSort (+12 more)

### Community 62 - "Community 62"
Cohesion: 0.10
Nodes (20): RelaxationTrack, Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, StudentDailyRelaxation (+12 more)

### Community 64 - "Community 64"
Cohesion: 0.09
Nodes (6): formatDate(), MorePage(), App(), LoginPage(), syncStatusLabel(), StudentState

### Community 65 - "Community 65"
Cohesion: 0.18
Nodes (3): AssessmentsService, Injectable, UserContext

### Community 66 - "Community 66"
Cohesion: 0.09
Nodes (17): QuestionState, AnswerSaveState, AttemptAnswer, ExamDelivery, ExamMode, ExamNavigationMode, ExamResultPolicy, ExamSection (+9 more)

### Community 67 - "Community 67"
Cohesion: 0.13
Nodes (14): DateSeparator(), EmojiReactionPicker(), fallback, MessageContextMenu(), MessageAction, MessageBody(), MessageBubble(), MessageList() (+6 more)

### Community 68 - "Community 68"
Cohesion: 0.16
Nodes (12): ApiError, AppErrorBoundary, AppErrorDetails, AppErrorKind, classifyAppError(), errorMessage(), errorStatus(), ErrorFallback() (+4 more)

### Community 69 - "Community 69"
Cohesion: 0.08
Nodes (24): devDependencies, autoprefixer, axe-core, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, jsdom (+16 more)

### Community 70 - "Community 70"
Cohesion: 0.10
Nodes (17): Notification, NotificationType, EXAM_REMINDER, MESSAGE, MOTIVATION, PLAN_UPDATE, WARNING, Column (+9 more)

### Community 71 - "Community 71"
Cohesion: 0.11
Nodes (21): admins, argv, checks, counts, deterministicId(), hasTable(), insert(), migrate (+13 more)

### Community 72 - "Community 72"
Cohesion: 0.13
Nodes (11): PushController, Body, Controller, Delete, Get, Headers, Post, Put (+3 more)

### Community 73 - "Community 73"
Cohesion: 0.11
Nodes (4): initializeSync(), TauriSQLiteProvider, SQLiteSyncProvider, WebSyncProvider

### Community 74 - "Community 74"
Cohesion: 0.14
Nodes (15): LearningHeader(), StudentPickerProps, PlannerMoreMenu(), TriggerProps, ViewportPopover(), ViewportPopoverProps, Filter, hasAttention() (+7 more)

### Community 75 - "Community 75"
Cohesion: 0.13
Nodes (15): StudentStatusFilter, formCompleteness(), StudentEditor(), StudentEditorFeedback, StudentEditorMode, icons, InsightValue, StudentInsights() (+7 more)

### Community 76 - "Community 76"
Cohesion: 0.21
Nodes (9): StaffPlansController, Body, Controller, Delete, Get, Param, Patch, Post (+1 more)

### Community 77 - "Community 77"
Cohesion: 0.09
Nodes (21): description, engines, node, moshaver, installModel, workspaceGraph, name, private (+13 more)

### Community 78 - "Community 78"
Cohesion: 0.12
Nodes (20): archiveStudent(), createStudent(), createStudentRecommendation(), getStudentAnalytics(), getStudentAttempts(), getStudentLearning(), getStudentMistakes(), getStudentOverview() (+12 more)

### Community 79 - "Community 79"
Cohesion: 0.13
Nodes (13): emptyStudentForm(), studentToForm(), dateValue(), normalizedUsername(), numberParam(), readableError(), sameForm(), StudentsPage() (+5 more)

### Community 80 - "Community 80"
Cohesion: 0.10
Nodes (21): dependencies, bcryptjs, better-sqlite3, class-transformer, class-validator, @fastify/cookie, @fastify/cors, @fastify/helmet (+13 more)

### Community 81 - "Community 81"
Cohesion: 0.14
Nodes (6): PortalAccess, PortalMode, request, MoreRouterPage(), ApiClient, access

### Community 82 - "Community 82"
Cohesion: 0.14
Nodes (12): NetworkProvider, SyncProvider, conflictPolicyForPath(), createQueueId(), enqueueMutation(), pullChanges(), pushChanges(), syncMutationType() (+4 more)

### Community 83 - "Community 83"
Cohesion: 0.14
Nodes (14): LoginThrottle, Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, SignupThrottle, Column (+6 more)

### Community 84 - "Community 84"
Cohesion: 0.10
Nodes (19): minSdkVersion, app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+11 more)

### Community 85 - "Community 85"
Cohesion: 0.13
Nodes (16): LearningResourceAssignment, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, LearningResource (+8 more)

### Community 86 - "Community 86"
Cohesion: 0.16
Nodes (18): OrganizationType, ACADEMY, COUNSELING_CENTER, OTHER, PRIVATE_PRACTICE, SCHOOL, AddMemberDto, CreateOrganizationDto (+10 more)

### Community 87 - "Community 87"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 88 - "Community 88"
Cohesion: 0.18
Nodes (15): AppProviders(), router, API_WORK_CONTEXT_EVENT, applyTheme(), initializeTheme(), isThemePreference(), resolveTheme(), storedPreference() (+7 more)

### Community 89 - "Community 89"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+9 more)

### Community 91 - "Community 91"
Cohesion: 0.14
Nodes (9): CreateTaskCommentDto, IsString, Length, CreateTaskIssueDto, IsOptional, IsString, Length, TasksService (+1 more)

### Community 92 - "Community 92"
Cohesion: 0.11
Nodes (6): ClockProvider, NetworkRequestOptions, NotificationProvider, RealtimeHandlers, RealtimeProvider, SyncQueueItem

### Community 93 - "Community 93"
Cohesion: 0.12
Nodes (17): scripts, build, dev, lint, migrate:v1, migration:revert, migration:run, seed (+9 more)

### Community 94 - "Community 94"
Cohesion: 0.12
Nodes (16): NotificationPreference, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn, PushSubscription (+8 more)

### Community 95 - "Community 95"
Cohesion: 0.15
Nodes (16): AssignExamDto, CreateExamDto, CreateQuestionDto, IsArray, IsBoolean, IsDateString, IsIn, IsNumber (+8 more)

### Community 96 - "Community 96"
Cohesion: 0.21
Nodes (9): SubjectsController, Body, Controller, Delete, Get, Param, Patch, Post (+1 more)

### Community 97 - "Community 97"
Cohesion: 0.12
Nodes (14): SyncChangeDto, IsArray, IsIn, IsOptional, IsString, MaxLength, Type, ValidateNested (+6 more)

### Community 98 - "Community 98"
Cohesion: 0.12
Nodes (16): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+8 more)

### Community 99 - "Community 99"
Cohesion: 0.12
Nodes (15): @moshaver/api-contract, typescript, dependencies, @moshaver/api-contract, devDependencies, typescript, main, name (+7 more)

### Community 100 - "Community 100"
Cohesion: 0.14
Nodes (13): CreateRecoveryRequestDto, IsDateString, IsOptional, IsString, MaxLength, FinishStudySessionDto, IsInt, IsOptional (+5 more)

### Community 102 - "Community 102"
Cohesion: 0.13
Nodes (15): dependencies, clsx, @hookform/resolvers, lucide-react, @moshaver/api-contract, @persian-tools/persian-tools, react, react-dom (+7 more)

### Community 103 - "Community 103"
Cohesion: 0.25
Nodes (12): AdminCommandPalette(), choose(), onKeyDown(), trapFocus(), focusableElements(), pathToken(), tokenPath(), readBoolean() (+4 more)

### Community 104 - "Community 104"
Cohesion: 0.26
Nodes (10): ResourcesPage, createResource(), deleteResource(), LearningResource, listResources(), listResourceStudents(), ResourceInput, updateResource() (+2 more)

### Community 105 - "Community 105"
Cohesion: 0.19
Nodes (8): EditPreview(), MessageComposer(), keyDown(), submit(), ReplyPreview(), normalize(), useMessageSearch(), ChatMessage

### Community 106 - "Community 106"
Cohesion: 0.27
Nodes (12): defaultQuickReplies, QuickReplies(), add(), remove(), useConversationFavorites(), fallbackQuickReplies, readFavoriteConversationIds(), readJson() (+4 more)

### Community 107 - "Community 107"
Cohesion: 0.22
Nodes (8): MistakesController, StaffMistakesController, Body, Controller, Get, Param, Patch, Query

### Community 109 - "Community 109"
Cohesion: 0.14
Nodes (12): CompleteTaskDto, TaskCompletionStatus, DONE, PARTIAL, SKIPPED, IsEnum, IsInt, IsOptional (+4 more)

### Community 110 - "Community 110"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, axe-core, jsdom, playwright, postcss, tailwindcss, @tauri-apps/cli (+7 more)

### Community 111 - "Community 111"
Cohesion: 0.13
Nodes (14): anyOf, anyOf, description, definitions, Application, Target, Value, description (+6 more)

### Community 112 - "Community 112"
Cohesion: 0.13
Nodes (14): anyOf, anyOf, description, definitions, Application, Target, Value, description (+6 more)

### Community 113 - "Community 113"
Cohesion: 0.13
Nodes (14): anyOf, anyOf, description, definitions, Application, Target, Value, description (+6 more)

### Community 114 - "Community 114"
Cohesion: 0.13
Nodes (14): anyOf, anyOf, description, definitions, Application, Target, Value, description (+6 more)

### Community 115 - "Community 115"
Cohesion: 0.14
Nodes (14): scripts, audit:parity, audit:release, build, dev, format, format:check, lint (+6 more)

### Community 116 - "Community 116"
Cohesion: 0.24
Nodes (11): adminUrl(), handleAssetRequest(), handleNavigationRequest(), handleNotificationClick(), handlePushEvent(), isCacheableResponse(), normalizePath(), putRuntimeCache() (+3 more)

### Community 117 - "Community 117"
Cohesion: 0.21
Nodes (8): ActivityController, Body, Controller, Get, Param, Post, Put, Query

### Community 118 - "Community 118"
Cohesion: 0.25
Nodes (7): AnalyticsController, Body, Controller, Get, Param, Patch, Post

### Community 119 - "Community 119"
Cohesion: 0.25
Nodes (6): AuthController, Body, Controller, Post, Req, Res

### Community 120 - "Community 120"
Cohesion: 0.16
Nodes (13): ExamAnswerDto, ExamHeartbeatDto, SubmitExamDto, IsArray, IsBoolean, IsDateString, IsIn, IsInt (+5 more)

### Community 121 - "Community 121"
Cohesion: 0.18
Nodes (9): LearningResourcesController, Body, Controller, Delete, Get, Param, Patch, Post (+1 more)

### Community 122 - "Community 122"
Cohesion: 0.14
Nodes (14): dependencies, lucide-react, @moshaver/student-core, react, react-dom, react-router-dom, @tauri-apps/api, @tauri-apps/plugin-notification (+6 more)

### Community 123 - "Community 123"
Cohesion: 0.22
Nodes (12): ExamResult(), ExamResultData, formatDate(), Metric(), MistakeReason(), optionLabel(), reasons, Review() (+4 more)

### Community 124 - "Community 124"
Cohesion: 0.15
Nodes (9): assets, blockers, generatedAt, reportPath, repository, requiredDocs, results, root (+1 more)

### Community 125 - "Community 125"
Cohesion: 0.27
Nodes (8): AttentionSignal, getAdminAttention(), getAdminDashboard(), normalizeAttentionStudent(), signalLabels, V2AttentionStudent, useDashboardData(), DashboardPage()

### Community 126 - "Community 126"
Cohesion: 0.15
Nodes (13): devDependencies, jest, @nestjs/cli, @nestjs/testing, ts-jest, ts-node, tsx, typeorm-ts-node-commonjs (+5 more)

### Community 127 - "Community 127"
Cohesion: 0.21
Nodes (4): CsrfGuard, Injectable, AuthService, Injectable

### Community 128 - "Community 128"
Cohesion: 0.19
Nodes (11): Permission, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn, RolePermission, Entity (+3 more)

### Community 129 - "Community 129"
Cohesion: 0.28
Nodes (6): GuardianController, Body, Controller, Get, Param, Post

### Community 130 - "Community 130"
Cohesion: 0.28
Nodes (6): ImportExportController, Body, Controller, Get, Post, Query

### Community 131 - "Community 131"
Cohesion: 0.26
Nodes (6): StudySessionsController, Body, Controller, Get, Param, Post

### Community 133 - "Community 133"
Cohesion: 0.22
Nodes (8): parseTime(), planMetrics(), plannedMinutes(), createTaskCompletionPayload(), ActiveStudySession, StudentTask, TaskCompletionStatus, TaskRuntimeStatus

### Community 134 - "Community 134"
Cohesion: 0.15
Nodes (12): compilerOptions, declaration, exactOptionalPropertyTypes, module, moduleResolution, noUncheckedIndexedAccess, outDir, rootDir (+4 more)

### Community 135 - "Community 135"
Cohesion: 0.26
Nodes (3): LoginThrottleService, Injectable, InjectRepository

### Community 136 - "Community 136"
Cohesion: 0.18
Nodes (6): NotificationsController, Controller, Get, Param, Put, Query

### Community 137 - "Community 137"
Cohesion: 0.17
Nodes (11): AccountContextContract, ApiEnvelope, ApiErrorContract, ApiSuccess, CAPABILITIES, Capability, CursorPage, NotificationContract (+3 more)

### Community 138 - "Community 138"
Cohesion: 0.17
Nodes (11): compilerOptions, allowSyntheticDefaultImports, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 139 - "Community 139"
Cohesion: 0.27
Nodes (10): formatSeconds(), Props, SoftConfirmButton(), cancel(), complete(), startHolding(), stopTimer(), State (+2 more)

### Community 140 - "Community 140"
Cohesion: 0.20
Nodes (10): TaskType, CUSTOM, EXAM, REST, REVIEW, STUDY, TEST, ImportTaskDto (+2 more)

### Community 142 - "Community 142"
Cohesion: 0.29
Nodes (6): ReportsController, Controller, Get, Param, Patch, Query

### Community 143 - "Community 143"
Cohesion: 0.25
Nodes (4): SyncController, Controller, SyncService, Injectable

### Community 144 - "Community 144"
Cohesion: 0.29
Nodes (6): DefaultTask, Plugin, Project, BuildTask, Config, RustPlugin

### Community 145 - "Community 145"
Cohesion: 0.18
Nodes (11): scripts, android:build, android:init, build, dev, preview, tauri, tauri:build (+3 more)

### Community 146 - "Community 146"
Cohesion: 0.20
Nodes (5): assertStudentUser(), restoreStudentSession(), StudentUser, AuthProvider, ApiError

### Community 148 - "Community 148"
Cohesion: 0.27
Nodes (7): DemoAccountPicker(), demoAccounts, demoPassword, LoginForm(), LoginFormValues, loginSchema, react-hook-form

### Community 149 - "Community 149"
Cohesion: 0.29
Nodes (9): advisorA, advisorB, assert(), base, login(), orgA, raw(), request() (+1 more)

### Community 150 - "Community 150"
Cohesion: 0.22
Nodes (8): advisorRelationship, assert(), base, login(), orgA, orgB, studentA, studentB

### Community 151 - "Community 151"
Cohesion: 0.20
Nodes (4): base, guardianMock, session, today

### Community 152 - "Community 152"
Cohesion: 0.27
Nodes (4): DashboardController, Controller, DashboardService, Injectable

### Community 153 - "Community 153"
Cohesion: 0.20
Nodes (9): StaffTaskIssueStatus, DISMISSED, OPEN, RESOLVED, IsEnum, IsOptional, IsString, MaxLength (+1 more)

### Community 154 - "Community 154"
Cohesion: 0.36
Nodes (6): TasksController, Body, Controller, Get, Param, Post

### Community 155 - "Community 155"
Cohesion: 0.44
Nodes (9): deps_available(), files(), have(), ignored(), main(), nearest_pm(), node_validate(), run() (+1 more)

### Community 156 - "Community 156"
Cohesion: 0.20
Nodes (10): $ref, description, items, type, uniqueItems, description, items, type (+2 more)

### Community 157 - "Community 157"
Cohesion: 0.20
Nodes (10): type, webviews, windows, items, description, items, type, description (+2 more)

### Community 158 - "Community 158"
Cohesion: 0.20
Nodes (10): $ref, description, items, type, uniqueItems, description, items, type (+2 more)

### Community 159 - "Community 159"
Cohesion: 0.20
Nodes (10): type, webviews, windows, items, description, items, type, description (+2 more)

### Community 160 - "Community 160"
Cohesion: 0.20
Nodes (10): $ref, description, items, type, uniqueItems, description, items, type (+2 more)

### Community 161 - "Community 161"
Cohesion: 0.20
Nodes (10): type, webviews, windows, items, description, items, type, description (+2 more)

### Community 162 - "Community 162"
Cohesion: 0.20
Nodes (10): $ref, description, items, type, uniqueItems, description, items, type (+2 more)

### Community 163 - "Community 163"
Cohesion: 0.20
Nodes (10): type, webviews, windows, items, description, items, type, description (+2 more)

### Community 164 - "Community 164"
Cohesion: 0.53
Nodes (6): chatSearchMatch(), conversationActivity(), mergeMessagePages(), sortConversations(), MessagePage, canUseMessageAction()

### Community 165 - "Community 165"
Cohesion: 0.31
Nodes (4): PlannerContent(), PlannerHeader(), PlannerOverview(), PlannerToolbar()

### Community 166 - "Community 166"
Cohesion: 0.31
Nodes (5): getApiWorkContextKey(), loadAllStudents(), STUDENT_SELECTION_EVENT, StudentsPage, useStudents()

### Community 167 - "Community 167"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 170 - "Community 170"
Cohesion: 0.22
Nodes (8): CreateDailyReportDto, IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min

### Community 171 - "Community 171"
Cohesion: 0.44
Nodes (8): classify(), load_config(), main(), package_info(), rel(), run(), text_detect(), Path

### Community 172 - "Community 172"
Cohesion: 0.36
Nodes (8): ExamCenter(), ExamRow(), Filter, formatDate(), Props, ResultTrend(), Stat(), toPersian()

### Community 173 - "Community 173"
Cohesion: 0.22
Nodes (9): properties, Identifier, description, oneOf, type, identifier, remote, anyOf (+1 more)

### Community 174 - "Community 174"
Cohesion: 0.22
Nodes (9): properties, Identifier, description, oneOf, type, identifier, remote, anyOf (+1 more)

### Community 175 - "Community 175"
Cohesion: 0.22
Nodes (9): properties, Identifier, description, oneOf, type, identifier, remote, anyOf (+1 more)

### Community 176 - "Community 176"
Cohesion: 0.22
Nodes (9): properties, Identifier, description, oneOf, type, identifier, remote, anyOf (+1 more)

### Community 178 - "Community 178"
Cohesion: 0.25
Nodes (8): calculate(), checkArg, CODE_EXTS, current, EXCLUDED_SEGMENTS, root, trackedFiles(), writeArg

### Community 179 - "Community 179"
Cohesion: 0.25
Nodes (7): errors, file, integrations, manifest, required, seen, statuses

### Community 180 - "Community 180"
Cohesion: 0.25
Nodes (8): description, properties, required, type, CapabilityRemote, urls, description, type

### Community 181 - "Community 181"
Cohesion: 0.25
Nodes (8): description, properties, required, type, CapabilityRemote, urls, description, type

### Community 182 - "Community 182"
Cohesion: 0.25
Nodes (8): description, properties, required, type, CapabilityRemote, urls, description, type

### Community 183 - "Community 183"
Cohesion: 0.25
Nodes (8): description, properties, required, type, CapabilityRemote, urls, description, type

### Community 184 - "Community 184"
Cohesion: 0.29
Nodes (7): ChatMessageType, EXAM, MOTIVATION, PLAN, TASK, TEXT, WARNING

### Community 185 - "Community 185"
Cohesion: 0.29
Nodes (6): exports, name, private, type, types, version

### Community 187 - "Community 187"
Cohesion: 0.33
Nodes (4): contracts, failures, source, src

### Community 189 - "Community 189"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, plugins, sourceRoot

### Community 190 - "Community 190"
Cohesion: 0.33
Nodes (3): IdentityAuthorization1724140700000, roleCapabilities, roles

### Community 191 - "Community 191"
Cohesion: 0.40
Nodes (3): HealthController, Controller, Get

### Community 192 - "Community 192"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 193 - "Community 193"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 197 - "Community 197"
Cohesion: 0.40
Nodes (4): ChangePasswordDto, IsString, MaxLength, MinLength

### Community 198 - "Community 198"
Cohesion: 0.40
Nodes (4): LoginDto, IsString, MaxLength, MinLength

### Community 199 - "Community 199"
Cohesion: 0.40
Nodes (5): EncouragementDto, IsIn, IsOptional, IsString, MaxLength

### Community 200 - "Community 200"
Cohesion: 0.50
Nodes (3): Bundle, MainActivity, TauriActivity

### Community 201 - "Community 201"
Cohesion: 0.70
Nodes (4): gradlew script, die(), save(), warn()

### Community 249 - "Community 249"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 250 - "Community 250"
Cohesion: 0.50
Nodes (4): description, required, type, Capability

### Community 251 - "Community 251"
Cohesion: 0.50
Nodes (4): default, description, type, description

### Community 252 - "Community 252"
Cohesion: 0.50
Nodes (4): default, description, type, local

### Community 253 - "Community 253"
Cohesion: 0.50
Nodes (4): description, required, type, Capability

### Community 254 - "Community 254"
Cohesion: 0.50
Nodes (4): default, description, type, description

### Community 255 - "Community 255"
Cohesion: 0.50
Nodes (4): default, description, type, local

### Community 256 - "Community 256"
Cohesion: 0.50
Nodes (4): description, required, type, Capability

### Community 257 - "Community 257"
Cohesion: 0.50
Nodes (4): default, description, type, description

### Community 258 - "Community 258"
Cohesion: 0.50
Nodes (4): default, description, type, local

### Community 259 - "Community 259"
Cohesion: 0.50
Nodes (4): description, required, type, Capability

### Community 260 - "Community 260"
Cohesion: 0.50
Nodes (4): default, description, type, description

### Community 261 - "Community 261"
Cohesion: 0.50
Nodes (4): default, description, type, local

### Community 270 - "Community 270"
Cohesion: 0.67
Nodes (3): Number, anyOf, description

### Community 271 - "Community 271"
Cohesion: 0.67
Nodes (3): PermissionEntry, anyOf, description

### Community 272 - "Community 272"
Cohesion: 0.67
Nodes (3): Number, anyOf, description

### Community 273 - "Community 273"
Cohesion: 0.67
Nodes (3): PermissionEntry, anyOf, description

### Community 274 - "Community 274"
Cohesion: 0.67
Nodes (3): Number, anyOf, description

### Community 275 - "Community 275"
Cohesion: 0.67
Nodes (3): PermissionEntry, anyOf, description

### Community 276 - "Community 276"
Cohesion: 0.67
Nodes (3): Number, anyOf, description

### Community 277 - "Community 277"
Cohesion: 0.67
Nodes (3): PermissionEntry, anyOf, description

## Knowledge Gaps
- **920 isolated node(s):** `StudentChatProfile`, `Row`, `SelectedAnswer`, `AttemptAnswer`, `QuestionInput` (+915 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2069 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **73 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@tanstack/react-query` connect `Community 20` to `Community 4`, `Community 7`, `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 16`, `Community 21`, `Community 27`, `Community 28`, `Community 31`, `Community 164`, `Community 38`, `Community 166`, `Community 45`, `Community 48`, `Community 49`, `Community 55`, `Community 67`, `Community 75`, `Community 104`, `Community 125`?**
  _High betweenness centrality (0.244) - this node is a cross-community bridge._
- **Why does `typescript` connect `Community 99` to `Community 21`, `Community 47`?**
  _High betweenness centrality (0.174) - this node is a cross-community bridge._
- **Why does `@types/node` connect `Community 47` to `Community 21`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Are the 224 inferred relationships involving `ok()` (e.g. with `.attention()` and `.heartbeat()`) actually correct?**
  _`ok()` has 224 INFERRED edges - model-reasoned connections that need verification._
- **What connects `StudentChatProfile`, `Row`, `SelectedAnswer` to the rest of the system?**
  _920 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.031936127744510975 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.031126968503937008 - nodes in this community are weakly interconnected._
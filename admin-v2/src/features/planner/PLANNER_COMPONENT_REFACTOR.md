# Planner Page component split

PlannerPage should only keep:
- data fetching
- mutations
- orchestration

UI moved into:
- PlannerHeader
- PlannerOverview
- PlannerContent
- PlannerDialogs
- PlannerOverlays

The original page had toolbar, summary, content, dialogs and keyboard handling mixed together.

#!/usr/bin/env bash
set -uo pipefail

# =============================================================================
# gitbr - Interactive Git + GitHub repository control center
#
# Goal:
#   Let people manage a Git repository without memorizing commands.
#
# Requirements:
#   - bash 4+
#   - git
#
# Optional:
#   - GitHub CLI (gh) for GitHub features
#
# Safety:
#   Destructive operations always require an explicit confirmation.
# =============================================================================

VERSION="4.0.0"
APP_NAME="gitbr"

# -----------------------------------------------------------------------------
# Terminal appearance - ASCII only so it also works in limited terminals.
# -----------------------------------------------------------------------------

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  BOLD=$'\033[1m'
  DIM=$'\033[2m'
  RED=$'\033[31m'
  GREEN=$'\033[32m'
  YELLOW=$'\033[33m'
  CYAN=$'\033[36m'
  MAGENTA=$'\033[35m'
  RESET=$'\033[0m'
else
  BOLD=""
  DIM=""
  RED=""
  GREEN=""
  YELLOW=""
  CYAN=""
  MAGENTA=""
  RESET=""
fi

SCREEN_WIDTH="${COLUMNS:-78}"

hr() {
  printf '%*s\n' "$SCREEN_WIDTH" '' | tr ' ' '-'
}

clear_screen() {
  clear 2>/dev/null || printf '\n'
}

app_header() {
  clear_screen
  printf "%s%s%s%s  %sv%s%s\n" "$BOLD" "$CYAN" "$APP_NAME" "$RESET" "$DIM" "$VERSION" "$RESET"
  printf "%sGit + GitHub repository control center. Select what you want; commands are handled for you.%s\n" "$DIM" "$RESET"
  hr
}

section() {
  printf "\n%s%s%s\n" "$BOLD" "$1" "$RESET"
}

ok() {
  printf "  %s[OK]%s %s\n" "$GREEN" "$RESET" "$1"
}

info() {
  printf "  %s->%s %s\n" "$CYAN" "$RESET" "$1"
}

warn() {
  printf "  %s[!]%s %s\n" "$YELLOW" "$RESET" "$1"
}

fail() {
  printf "  %s[X]%s %s\n" "$RED" "$RESET" "$1" >&2
}

die() {
  printf "\n"
  fail "$1"
  exit 1
}

pause() {
  printf "\n"
  read -r -p "  Press Enter to return..." _
}

run_cmd() {
  printf "\n"
  "$@"
}

# MENU_RESULT receives the selected value.
menu() {
  local prompt="$1"
  shift
  local -a labels=()
  local -a values=()
  local choice i

  while (( "$#" >= 2 )); do
    labels+=("$1")
    values+=("$2")
    shift 2
  done

  while true; do
    printf "\n  %s%s%s\n\n" "$BOLD" "$prompt" "$RESET"
    for i in "${!labels[@]}"; do
      printf "    %s%2d)%s %s\n" "$CYAN" "$((i + 1))" "$RESET" "${labels[$i]}"
    done
    printf "\n"
    read -r -p "  Select [1-${#labels[@]}]: " choice

    if [[ "$choice" =~ ^[0-9]+$ ]] &&
       (( choice >= 1 && choice <= ${#labels[@]} )); then
      MENU_RESULT="${values[$((choice - 1))]}"
      return 0
    fi

    warn "Select one of the numbers shown above."
  done
}

yes_no() {
  local prompt="$1"
  local yes_label="${2:-Yes}"
  local no_label="${3:-No}"
  local default="${4:-no}"

  if [[ "$default" == "yes" ]]; then
    menu "$prompt" \
      "$yes_label  [recommended]" "yes" \
      "$no_label" "no"
  else
    menu "$prompt" \
      "$yes_label" "yes" \
      "$no_label  [recommended]" "no"
  fi
}

danger_confirm() {
  local prompt="$1"
  menu "$prompt" \
    "No, go back  [recommended]" "no" \
    "Yes, I understand and want to continue" "yes"
  [[ "$MENU_RESULT" == "yes" ]]
}

# Select one item from an array without requiring the user to type its name.
# SELECTED_ITEM receives the selected item.
select_item() {
  local prompt="$1"
  shift
  local -a items=("$@")
  local -a args=()
  local item

  if (( ${#items[@]} == 0 )); then
    SELECTED_ITEM=""
    return 1
  fi

  for item in "${items[@]}"; do
    args+=("$item" "$item")
  done
  args+=("Back" "__BACK__")

  menu "$prompt" "${args[@]}"
  if [[ "$MENU_RESULT" == "__BACK__" ]]; then
    SELECTED_ITEM=""
    return 1
  fi

  SELECTED_ITEM="$MENU_RESULT"
  return 0
}

# -----------------------------------------------------------------------------
# Repository discovery
# -----------------------------------------------------------------------------

require_git() {
  command -v git >/dev/null 2>&1 ||
    die "Git is not installed. Install Git and run gitbr again."
}

require_repo() {
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 ||
    die "Run gitbr from anywhere inside a Git repository."

  REPO_ROOT="$(git rev-parse --show-toplevel)"
  GIT_DIR="$(git rev-parse --git-dir)"
  cd "$REPO_ROOT"
  REPO_NAME="$(basename "$REPO_ROOT")"
}

current_branch() {
  git branch --show-current
}

current_branch_display() {
  local b
  b="$(current_branch)"
  if [[ -n "$b" ]]; then
    printf '%s' "$b"
  else
    printf '%s' "detached HEAD"
  fi
}

default_remote() {
  if git remote get-url origin >/dev/null 2>&1; then
    printf '%s' origin
    return
  fi

  local first
  first="$(git remote | head -n1 || true)"
  printf '%s' "$first"
}

default_branch() {
  local r="${1:-$(default_remote)}"

  if [[ -n "$r" ]]; then
    local ref
    ref="$(git symbolic-ref --quiet --short "refs/remotes/$r/HEAD" 2>/dev/null || true)"
    if [[ -n "$ref" ]]; then
      printf '%s' "${ref#"$r/"}"
      return
    fi
  fi

  for b in develop main master; do
    if git show-ref --verify --quiet "refs/heads/$b"; then
      printf '%s' "$b"
      return
    fi
  done

  current_branch
}

working_tree_dirty() {
  [[ -n "$(git status --porcelain)" ]]
}

has_staged() {
  ! git diff --cached --quiet
}

has_unstaged() {
  ! git diff --quiet
}

has_untracked() {
  [[ -n "$(git ls-files --others --exclude-standard)" ]]
}

has_conflicts() {
  [[ -n "$(git diff --name-only --diff-filter=U)" ]]
}

ahead_behind() {
  local branch upstream
  branch="$(current_branch)"
  [[ -n "$branch" ]] || { printf '0 0'; return; }

  upstream="$(git rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || true)"
  [[ -n "$upstream" ]] || { printf '0 0'; return; }

  git rev-list --left-right --count "$upstream...HEAD" 2>/dev/null || printf '0 0'
}

repo_operation() {
  if [[ -f "$GIT_DIR/MERGE_HEAD" ]]; then
    printf '%s' "merge"
  elif [[ -d "$GIT_DIR/rebase-merge" || -d "$GIT_DIR/rebase-apply" ]]; then
    printf '%s' "rebase"
  elif [[ -f "$GIT_DIR/CHERRY_PICK_HEAD" ]]; then
    printf '%s' "cherry-pick"
  elif [[ -f "$GIT_DIR/REVERT_HEAD" ]]; then
    printf '%s' "revert"
  elif [[ -f "$GIT_DIR/BISECT_LOG" ]]; then
    printf '%s' "bisect"
  else
    printf '%s' ""
  fi
}

remote_url() {
  local r="${1:-$(default_remote)}"
  [[ -n "$r" ]] && git remote get-url "$r" 2>/dev/null || true
}

github_available() {
  command -v gh >/dev/null 2>&1
}

github_authenticated() {
  github_available && gh auth status >/dev/null 2>&1
}

is_github_repo() {
  local url
  url="$(remote_url)"
  [[ "$url" == *"github.com"* ]]
}

github_ready() {
  github_authenticated && is_github_repo
}

# -----------------------------------------------------------------------------
# Dashboard
# -----------------------------------------------------------------------------

count_lines() {
  awk 'NF {n++} END {print n+0}'
}

dashboard() {
  local branch remote upstream staged modified untracked conflicts operation
  local behind ahead

  branch="$(current_branch_display)"
  remote="$(default_remote)"
  upstream="$(git rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || true)"
  staged="$(git diff --cached --name-only | count_lines)"
  modified="$(git diff --name-only | count_lines)"
  untracked="$(git ls-files --others --exclude-standard | count_lines)"
  conflicts="$(git diff --name-only --diff-filter=U | count_lines)"
  operation="$(repo_operation)"
  read -r behind ahead < <(ahead_behind)

  printf "\n"
  printf "  %-15s %s%s%s\n" "Repository" "$BOLD" "$REPO_NAME" "$RESET"
  printf "  %-15s %s\n" "Branch" "$branch"

  if [[ -n "$upstream" ]]; then
    printf "  %-15s %s  (ahead %s, behind %s)\n" "Upstream" "$upstream" "$ahead" "$behind"
  else
    printf "  %-15s %s\n" "Upstream" "not configured"
  fi

  if [[ -n "$remote" ]]; then
    printf "  %-15s %s\n" "Remote" "$remote"
  else
    printf "  %-15s %s\n" "Remote" "none"
  fi

  printf "  %-15s staged:%s  modified:%s  untracked:%s  conflicts:%s\n" \
    "Changes" "$staged" "$modified" "$untracked" "$conflicts"

  if [[ -n "$operation" ]]; then
    printf "  %-15s %s%s in progress%s\n" "Recovery" "$YELLOW" "$operation" "$RESET"
  fi

  if github_ready; then
    local gh_repo
    gh_repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || true)"
    [[ -n "$gh_repo" ]] && printf "  %-15s %s\n" "GitHub" "$gh_repo"
  elif is_github_repo; then
    printf "  %-15s %s\n" "GitHub" "remote detected; CLI not ready"
  fi

  printf "\n"
}

# -----------------------------------------------------------------------------
# File lists / staging helpers
# -----------------------------------------------------------------------------

get_unstaged_files() {
  {
    git diff --name-only
    git ls-files --others --exclude-standard
  } | awk 'NF && !seen[$0]++'
}

get_staged_files() {
  git diff --cached --name-only
}

get_conflicted_files() {
  git diff --name-only --diff-filter=U
}

stage_selected_file() {
  mapfile -t files < <(get_unstaged_files)
  if (( ${#files[@]} == 0 )); then
    info "There are no unstaged or untracked files."
    pause
    return
  fi

  if select_item "Choose a file to stage" "${files[@]}"; then
    git add -- "$SELECTED_ITEM"
    ok "Staged: $SELECTED_ITEM"
    pause
  fi
}

unstage_selected_file() {
  mapfile -t files < <(get_staged_files)
  if (( ${#files[@]} == 0 )); then
    info "There are no staged files."
    pause
    return
  fi

  if select_item "Choose a staged file to move back to unstaged" "${files[@]}"; then
    git restore --staged -- "$SELECTED_ITEM"
    ok "Unstaged: $SELECTED_ITEM"
    pause
  fi
}

discard_selected_file() {
  mapfile -t files < <(git diff --name-only)
  if (( ${#files[@]} == 0 )); then
    info "There are no tracked unstaged changes to discard."
    pause
    return
  fi

  if select_item "Choose a tracked file to restore" "${files[@]}"; then
    printf "\n"
    warn "This removes the unstaged edits in '$SELECTED_ITEM'."
    if danger_confirm "Discard those edits permanently?"; then
      git restore -- "$SELECTED_ITEM"
      ok "Restored: $SELECTED_ITEM"
    fi
    pause
  fi
}

clean_untracked() {
  local preview
  preview="$(git clean -nd || true)"

  if [[ -z "$preview" ]]; then
    info "There are no untracked files/directories to clean."
    pause
    return
  fi

  section "Preview - Git would remove"
  printf '%s\n' "$preview"
  printf "\n"
  warn "This cannot be undone by Git."

  if danger_confirm "Delete all listed untracked files and directories?"; then
    git clean -fd
    ok "Untracked files/directories removed."
  fi
  pause
}

working_tree_menu() {
  while true; do
    app_header
    section "Working tree and staging"
    printf "\n"
    git status --short --branch

    menu "What do you want to do?" \
      "Stage ALL changes (tracked + untracked)" "stage_all" \
      "Stage ONE file" "stage_one" \
      "Stage selected HUNKS interactively" "stage_patch" \
      "Unstage ALL staged files" "unstage_all" \
      "Unstage selected HUNKS interactively" "unstage_patch" \
      "Unstage ONE file" "unstage_one" \
      "Show unstaged diff" "diff" \
      "Show staged diff" "diff_staged" \
      "Restore ONE tracked file (discard unstaged edits)" "discard_one" \
      "Clean untracked files/directories (preview first)" "clean" \
      "Resolve merge conflicts" "conflicts" \
      "Refresh status" "refresh" \
      "Back" "back"

    case "$MENU_RESULT" in
      stage_all)
        git add -A
        ok "All current changes are staged."
        pause
        ;;
      stage_one)
        stage_selected_file
        ;;
      stage_patch)
        if has_unstaged; then
          git add -p
        else
          info "There are no tracked unstaged changes to stage by hunk."
        fi
        pause
        ;;
      unstage_all)
        if has_staged; then
          git restore --staged .
          ok "All staged files moved back to unstaged."
        else
          info "Nothing is staged."
        fi
        pause
        ;;
      unstage_one)
        unstage_selected_file
        ;;
      unstage_patch)
        if has_staged; then
          git restore --staged -p
        else
          info "There are no staged changes to unstage by hunk."
        fi
        pause
        ;;
      diff)
        run_cmd git diff
        pause
        ;;
      diff_staged)
        run_cmd git diff --cached
        pause
        ;;
      discard_one)
        discard_selected_file
        ;;
      clean)
        clean_untracked
        ;;
      conflicts)
        conflicts_menu
        ;;
      refresh)
        ;;
      back)
        return
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# Conflict and recovery handling
# -----------------------------------------------------------------------------

conflicts_menu() {
  while true; do
    app_header
    section "Conflict resolver"

    mapfile -t conflicts < <(get_conflicted_files)

    if (( ${#conflicts[@]} == 0 )); then
      ok "Git reports no unresolved conflict files."
    else
      printf "\n  Unresolved files:\n"
      local f
      for f in "${conflicts[@]}"; do
        printf "    - %s\n" "$f"
      done
    fi

    local op
    op="$(repo_operation)"
    printf "\n  Current operation: %s\n" "${op:-none}"

    menu "Choose an action" \
      "Stage a resolved conflict file" "stage" \
      "Stage ALL currently resolved files" "stage_all" \
      "Show conflict status" "status" \
      "Continue current Git operation" "continue" \
      "Skip current rebase/cherry-pick item (when supported)" "skip" \
      "Abort current Git operation" "abort" \
      "Back" "back"

    case "$MENU_RESULT" in
      stage)
        mapfile -t conflicts < <(get_conflicted_files)
        if (( ${#conflicts[@]} == 0 )); then
          info "No unresolved files remain."
          pause
        elif select_item "Choose a resolved file to stage after editing it" "${conflicts[@]}"; then
          git add -- "$SELECTED_ITEM"
          ok "Staged: $SELECTED_ITEM"
          pause
        fi
        ;;
      stage_all)
        git add -A
        ok "Current changes staged. Git will still tell you if conflicts remain."
        pause
        ;;
      status)
        git status
        pause
        ;;
      continue)
        op="$(repo_operation)"
        case "$op" in
          merge) git merge --continue ;;
          rebase) GIT_EDITOR=true git rebase --continue ;;
          cherry-pick) GIT_EDITOR=true git cherry-pick --continue ;;
          revert) GIT_EDITOR=true git revert --continue ;;
          *) info "There is no merge/rebase/cherry-pick/revert to continue." ;;
        esac
        pause
        ;;
      skip)
        op="$(repo_operation)"
        case "$op" in
          rebase) git rebase --skip ;;
          cherry-pick) git cherry-pick --skip ;;
          *) info "Skip is available for an active rebase or cherry-pick." ;;
        esac
        pause
        ;;
      abort)
        op="$(repo_operation)"
        if [[ -z "$op" ]]; then
          info "There is no operation to abort."
        elif danger_confirm "Abort the active '$op' operation?"; then
          case "$op" in
            merge) git merge --abort ;;
            rebase) git rebase --abort ;;
            cherry-pick) git cherry-pick --abort ;;
            revert) git revert --abort ;;
            bisect) git bisect reset ;;
          esac
          ok "Operation aborted."
        fi
        pause
        ;;
      back)
        return
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# Commit workflow
# -----------------------------------------------------------------------------

ensure_git_identity() {
  local name email
  name="$(git config user.name || true)"
  email="$(git config user.email || true)"

  if [[ -n "$name" && -n "$email" ]]; then
    return 0
  fi

  app_header
  section "One-time Git identity setup"
  printf "\n"
  warn "Git needs a name and email before it can create commits."

  if [[ -z "$name" ]] && github_authenticated; then
    name="$(gh api user --jq '.name // .login' 2>/dev/null || true)"
  fi

  if [[ -z "$name" ]]; then
    read -r -p "  Your commit name: " name
  else
    printf "  Suggested name: %s\n" "$name"
    yes_no "Use this name?" "Use '$name'" "Enter another name" "yes"
    if [[ "$MENU_RESULT" == "no" ]]; then
      read -r -p "  Your commit name: " name
    fi
  fi

  while [[ -z "${name//[[:space:]]/}" ]]; do
    warn "Name cannot be empty."
    read -r -p "  Your commit name: " name
  done

  if [[ -z "$email" ]]; then
    if github_authenticated; then
      email="$(gh api user --jq '.email // empty' 2>/dev/null || true)"
    fi

    if [[ -z "$email" ]]; then
      read -r -p "  Your commit email: " email
    fi
  fi

  while [[ -z "${email//[[:space:]]/}" ]]; do
    warn "Email cannot be empty."
    read -r -p "  Your commit email: " email
  done

  menu "Where should this identity be saved?" \
    "Only this repository  [recommended]" "local" \
    "All Git repositories for this user" "global"

  if [[ "$MENU_RESULT" == "global" ]]; then
    git config --global user.name "$name"
    git config --global user.email "$email"
  else
    git config user.name "$name"
    git config user.email "$email"
  fi

  ok "Git identity configured."
}

branch_commit_suggestion() {
  local branch prefix subject
  branch="$(current_branch)"
  prefix=""
  subject="$branch"

  if [[ "$branch" == */* ]]; then
    prefix="${branch%%/*}"
    subject="${branch#*/}"
  fi

  subject="${subject//-/ }"
  subject="${subject//_/ }"

  case "$prefix" in
    feature|feat) printf 'feat: %s' "$subject" ;;
    fix|bugfix|hotfix) printf 'fix: %s' "$subject" ;;
    refactor) printf 'refactor: %s' "$subject" ;;
    docs) printf 'docs: %s' "$subject" ;;
    test|tests) printf 'test: %s' "$subject" ;;
    chore) printf 'chore: %s' "$subject" ;;
    perf) printf 'perf: %s' "$subject" ;;
    ci) printf 'ci: %s' "$subject" ;;
    build) printf 'build: %s' "$subject" ;;
    *) printf 'chore: update %s' "${subject:-repository}" ;;
  esac
}

guided_commit_message() {
  local suggested
  suggested="$(branch_commit_suggestion)"

  menu "Choose the commit message style" \
    "Use suggested message: $suggested  [recommended]" "suggested" \
    "Choose a conventional commit type; keep generated description" "type" \
    "Write a custom commit message" "custom" \
    "Back" "back"

  case "$MENU_RESULT" in
    suggested)
      COMMIT_MESSAGE="$suggested"
      ;;
    type)
      menu "What kind of commit is this?" \
        "feat     - new feature" "feat" \
        "fix      - bug fix" "fix" \
        "refactor - code restructuring" "refactor" \
        "docs     - documentation" "docs" \
        "test     - tests" "test" \
        "chore    - maintenance" "chore" \
        "perf     - performance" "perf" \
        "build    - build/dependencies" "build" \
        "ci       - CI/CD" "ci"

      local subject branch
      branch="$(current_branch)"
      subject="${branch#*/}"
      subject="${subject//-/ }"
      subject="${subject//_/ }"
      COMMIT_MESSAGE="$MENU_RESULT: ${subject:-repository update}"
      ;;
    custom)
      read -r -p "  Commit message: " COMMIT_MESSAGE
      while [[ -z "${COMMIT_MESSAGE//[[:space:]]/}" ]]; do
        warn "Commit message cannot be empty."
        read -r -p "  Commit message: " COMMIT_MESSAGE
      done
      ;;
    back)
      COMMIT_MESSAGE=""
      return 1
      ;;
  esac
}

commit_staged() {
  if ! has_staged; then
    info "No staged changes are ready to commit."
    pause
    return
  fi

  ensure_git_identity

  app_header
  section "Ready to commit"
  git diff --cached --stat
  printf "\n"

  if guided_commit_message; then
    printf "\n  Commit message: %s%s%s\n" "$BOLD" "$COMMIT_MESSAGE" "$RESET"
    yes_no "Create this commit?" "Commit now" "Go back" "yes"
    if [[ "$MENU_RESULT" == "yes" ]]; then
      git commit -m "$COMMIT_MESSAGE"
      ok "Commit created."
    fi
  fi
  pause
}

commit_menu() {
  while true; do
    app_header
    section "Commits"
    git status --short
    printf "\n"

    menu "What do you want to do?" \
      "Commit what is already staged" "commit_staged" \
      "Stage ALL changes, then commit" "all_commit" \
      "Stage selected files first" "stage" \
      "Show latest commits" "log" \
      "Amend the latest commit with staged changes (keep message)" "amend" \
      "Undo latest commit but KEEP all changes staged" "undo_soft" \
      "Back" "back"

    case "$MENU_RESULT" in
      commit_staged)
        commit_staged
        ;;
      all_commit)
        if working_tree_dirty; then
          git add -A
          commit_staged
        else
          info "There are no changes to commit."
          pause
        fi
        ;;
      stage)
        working_tree_menu
        ;;
      log)
        git --no-pager log --graph --decorate --oneline -20
        pause
        ;;
      amend)
        if ! git rev-parse HEAD >/dev/null 2>&1; then
          info "There is no commit to amend."
        else
          printf "\n"
          warn "Amending rewrites the latest commit."
          if danger_confirm "Amend the latest commit using currently staged changes?"; then
            git commit --amend --no-edit
            ok "Latest commit amended."
          fi
        fi
        pause
        ;;
      undo_soft)
        if git rev-parse HEAD~1 >/dev/null 2>&1; then
          printf "\n"
          warn "The latest commit will disappear, but all its changes stay staged."
          if danger_confirm "Undo the latest commit?"; then
            git reset --soft HEAD~1
            ok "Latest commit undone; changes are staged."
          fi
        else
          info "There is no earlier commit to reset to."
        fi
        pause
        ;;
      back)
        return
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# Branches
# -----------------------------------------------------------------------------

all_branch_names() {
  {
    git for-each-ref --format='%(refname:short)' refs/heads/
    local r
    while read -r r; do
      git for-each-ref --format='%(refname:short)' "refs/remotes/$r/" |
        sed "s#^$r/##" |
        grep -v '^HEAD$'
    done < <(git remote)
  } | awk 'NF && !seen[$0]++'
}

local_branch_names() {
  git for-each-ref --format='%(refname:short)' refs/heads/
}

remote_branch_names() {
  local r
  r="$(default_remote)"
  [[ -n "$r" ]] || return
  git for-each-ref --format='%(refname:short)' "refs/remotes/$r/" |
    sed "s#^$r/##" |
    grep -v '^HEAD$'
}

normalize_slug() {
  local value="$1"
  value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
  value="$(printf '%s' "$value" | sed -E \
    -e 's/[[:space:]_]+/-/g' \
    -e 's/[^a-z0-9.-]+/-/g' \
    -e 's/-+/-/g' \
    -e 's/^[.-]+//' \
    -e 's/[.-]+$//')"
  printf '%s' "$value"
}

choose_branch_type() {
  menu "What kind of work is this?" \
    "Refactor - restructure or improve existing code" "refactor" \
    "Feature  - add new behavior" "feature" \
    "Fix      - fix a bug" "fix" \
    "Hotfix   - urgent fix" "hotfix" \
    "Docs     - documentation" "docs" \
    "Chore    - maintenance / cleanup" "chore" \
    "Test     - tests" "test" \
    "Perf     - performance" "perf" \
    "Build    - build / dependencies" "build" \
    "CI       - automation / pipeline" "ci" \
    "Release  - release preparation" "release" \
    "No prefix" "__NONE__"

  if [[ "$MENU_RESULT" == "__NONE__" ]]; then
    NEW_BRANCH_PREFIX=""
  else
    NEW_BRANCH_PREFIX="$MENU_RESULT"
  fi
}

choose_base_branch() {
  mapfile -t branches < <(all_branch_names)
  local default
  default="$(default_branch)"

  local -a ordered=()
  local b

  for b in "$default" develop main master "$(current_branch)"; do
    [[ -n "$b" ]] || continue
    if printf '%s\n' "${branches[@]}" | grep -Fxq "$b" &&
       ! printf '%s\n' "${ordered[@]:-}" | grep -Fxq "$b"; then
      ordered+=("$b")
    fi
  done

  for b in "${branches[@]}"; do
    if ! printf '%s\n' "${ordered[@]:-}" | grep -Fxq "$b"; then
      ordered+=("$b")
    fi
  done

  local -a args=()
  local label
  for b in "${ordered[@]}"; do
    label="$b"
    [[ "$b" == "$default" ]] && label="$b  [repository default]"
    [[ "$b" == "$(current_branch)" ]] && label="$label  [current]"
    args+=("$label" "$b")
  done
  args+=("Back" "__BACK__")

  menu "Which branch should the new work start from?" "${args[@]}"
  [[ "$MENU_RESULT" == "__BACK__" ]] && return 1
  NEW_BRANCH_BASE="$MENU_RESULT"
  return 0
}

TEMP_STASH_MESSAGE=""
TEMP_STASH_ACTIVE=false
TEMP_STASH_RESTORE=false
ORIGINAL_BRANCH=""

temporary_save_changes() {
  TEMP_STASH_MESSAGE="gitbr-temp-$(date '+%Y%m%d-%H%M%S')"
  git stash push -u -m "$TEMP_STASH_MESSAGE" >/dev/null
  TEMP_STASH_ACTIVE=true
}

temporary_stash_ref() {
  git stash list --format='%gd%x09%s' |
    awk -F '\t' -v needle="$TEMP_STASH_MESSAGE" 'index($2, needle) {print $1; exit}'
}

temporary_restore_changes() {
  local ref
  ref="$(temporary_stash_ref)"
  if [[ -n "$ref" ]]; then
    if git stash pop "$ref"; then
      TEMP_STASH_ACTIVE=false
      ok "Your previous working changes were restored."
    else
      warn "Git found conflicts while restoring your changes."
      warn "The saved copy remains protected in Git stash."
      warn "Open 'Conflicts / recovery' from the main menu to finish safely."
    fi
  fi
}

prepare_dirty_for_branch_change() {
  ORIGINAL_BRANCH="$(current_branch)"
  TEMP_STASH_RESTORE=false

  if ! working_tree_dirty; then
    return 0
  fi

  app_header
  section "Your current work"
  git status --short
  printf "\n"
  printf "  You have uncommitted work. gitbr can protect it automatically.\n"

  menu "What should happen to these current changes?" \
    "Move them into the new branch  [recommended]" "move" \
    "Save them here for later; new branch starts clean" "save" \
    "Cancel" "cancel"

  case "$MENU_RESULT" in
    move)
      TEMP_STASH_RESTORE=true
      temporary_save_changes
      ;;
    save)
      TEMP_STASH_RESTORE=false
      temporary_save_changes
      ;;
    cancel)
      return 1
      ;;
  esac
}

create_branch_wizard() {
  app_header
  section "Create a branch"

  choose_base_branch || return
  choose_branch_type

  local raw slug
  while true; do
    printf "\n"
    printf "  %sGive the work a short name.%s\n" "$BOLD" "$RESET"
    printf "  %sExample: Chat UI Navigation becomes chat-ui-navigation.%s\n" "$DIM" "$RESET"
    read -r -p "  Work name: " raw

    slug="$(normalize_slug "$raw")"
    if [[ -z "$slug" ]]; then
      warn "Enter at least one word or number."
      continue
    fi

    if [[ -n "$NEW_BRANCH_PREFIX" ]]; then
      NEW_BRANCH_NAME="$NEW_BRANCH_PREFIX/$slug"
    else
      NEW_BRANCH_NAME="$slug"
    fi

    if ! git check-ref-format --branch "$NEW_BRANCH_NAME" >/dev/null 2>&1; then
      warn "Git cannot use '$NEW_BRANCH_NAME'. Try another name."
      continue
    fi

    if git show-ref --verify --quiet "refs/heads/$NEW_BRANCH_NAME" ||
       git show-ref --verify --quiet "refs/remotes/$(default_remote)/$NEW_BRANCH_NAME"; then
      warn "That branch already exists."
      continue
    fi
    break
  done

  app_header
  section "Review new branch"
  printf "\n"
  printf "  %-16s %s\n" "Start from:" "$NEW_BRANCH_BASE"
  printf "  %-16s %s%s%s\n" "New branch:" "$BOLD" "$NEW_BRANCH_NAME" "$RESET"
  printf "  %-16s %s\n" "Remote:" "$(default_remote)"
  printf "\n"

  yes_no "Create and push this branch?" "Create + push" "Go back" "yes"
  [[ "$MENU_RESULT" == "yes" ]] || return

  prepare_dirty_for_branch_change || return

  local remote
  remote="$(default_remote)"

  if [[ -n "$remote" ]]; then
    info "Refreshing '$remote'..."
    git fetch --prune "$remote"
  fi

  if ! git show-ref --verify --quiet "refs/heads/$NEW_BRANCH_BASE"; then
    if [[ -n "$remote" ]] &&
       git show-ref --verify --quiet "refs/remotes/$remote/$NEW_BRANCH_BASE"; then
      git branch --track "$NEW_BRANCH_BASE" "$remote/$NEW_BRANCH_BASE"
    else
      fail "Base branch '$NEW_BRANCH_BASE' is not available."
      [[ "$TEMP_STASH_ACTIVE" == true && "$TEMP_STASH_RESTORE" == true ]] && temporary_restore_changes
      pause
      return
    fi
  fi

  git switch "$NEW_BRANCH_BASE"

  if [[ -n "$remote" ]] &&
     git show-ref --verify --quiet "refs/remotes/$remote/$NEW_BRANCH_BASE"; then
    git pull --ff-only "$remote" "$NEW_BRANCH_BASE"
  fi

  git switch -c "$NEW_BRANCH_NAME"
  ok "Created '$NEW_BRANCH_NAME'."

  if [[ -n "$remote" ]]; then
    git push -u "$remote" "$NEW_BRANCH_NAME"
    ok "Pushed to '$remote/$NEW_BRANCH_NAME'."
  else
    warn "No remote exists, so the branch is local only."
  fi

  if [[ "$TEMP_STASH_ACTIVE" == true && "$TEMP_STASH_RESTORE" == true ]]; then
    temporary_restore_changes
  fi

  pause
}

switch_branch() {
  mapfile -t branches < <(all_branch_names)
  if ! select_item "Choose a branch to switch to" "${branches[@]}"; then
    return
  fi

  local target="$SELECTED_ITEM"
  local current
  current="$(current_branch)"
  [[ "$target" == "$current" ]] && { info "You are already on '$target'."; pause; return; }

  if working_tree_dirty; then
    menu "You have uncommitted changes. What should gitbr do?" \
      "Try switching while keeping the changes" "keep" \
      "Save changes temporarily, switch, then restore them" "stash" \
      "Cancel" "cancel"

    case "$MENU_RESULT" in
      stash)
        TEMP_STASH_RESTORE=true
        temporary_save_changes
        ;;
      cancel)
        return
        ;;
    esac
  fi

  local switched=false
  if git show-ref --verify --quiet "refs/heads/$target"; then
    if git switch "$target"; then switched=true; fi
  else
    local remote
    remote="$(default_remote)"
    if git switch --track -c "$target" "$remote/$target"; then switched=true; fi
  fi

  if [[ "$switched" == true ]]; then
    [[ "$TEMP_STASH_ACTIVE" == true && "$TEMP_STASH_RESTORE" == true ]] && temporary_restore_changes
    ok "Now on '$target'."
  else
    warn "Git could not switch branches while preserving the current working changes."
    warn "Nothing was discarded. Save/stash the changes and try again."
  fi
  pause
}

delete_local_branch() {
  local current
  current="$(current_branch)"
  mapfile -t branches < <(local_branch_names | grep -Fxv "$current" || true)

  if (( ${#branches[@]} == 0 )); then
    info "There are no other local branches to delete."
    pause
    return
  fi

  if select_item "Choose a LOCAL branch to delete" "${branches[@]}"; then
    warn "Git will refuse a normal delete if the branch is not fully merged."
    if danger_confirm "Delete local branch '$SELECTED_ITEM'?"; then
      if ! git branch -d "$SELECTED_ITEM"; then
        warn "The branch is not fully merged."
        if danger_confirm "Force-delete '$SELECTED_ITEM' anyway?"; then
          git branch -D "$SELECTED_ITEM"
        fi
      fi
    fi
    pause
  fi
}

delete_remote_branch() {
  local remote
  remote="$(default_remote)"
  [[ -n "$remote" ]] || { info "No remote is configured."; pause; return; }

  git fetch --prune "$remote" >/dev/null
  mapfile -t branches < <(remote_branch_names)

  if select_item "Choose a REMOTE branch to delete from '$remote'" "${branches[@]}"; then
    warn "This deletes '$remote/$SELECTED_ITEM' for everyone using that remote."
    if danger_confirm "Delete this remote branch?"; then
      git push "$remote" --delete "$SELECTED_ITEM"
      ok "Remote branch deleted."
    fi
    pause
  fi
}

rename_current_branch() {
  local current raw new
  current="$(current_branch)"
  [[ -n "$current" ]] || { info "Cannot rename while HEAD is detached."; pause; return; }

  printf "\n  Current branch: %s\n" "$current"
  read -r -p "  New branch name: " raw
  new="$(normalize_slug "$raw")"

  [[ -n "$new" ]] || { warn "Name cannot be empty."; pause; return; }
  git check-ref-format --branch "$new" >/dev/null 2>&1 ||
    { warn "Invalid branch name."; pause; return; }

  yes_no "Rename '$current' to '$new'?" "Rename" "Cancel" "yes"
  [[ "$MENU_RESULT" == "yes" ]] || return

  git branch -m "$new"
  ok "Local branch renamed."

  local remote
  remote="$(default_remote)"
  if [[ -n "$remote" ]] &&
     git ls-remote --exit-code --heads "$remote" "$current" >/dev/null 2>&1; then
    menu "The old branch also exists on '$remote'. What should happen?" \
      "Push new name and delete old remote branch  [recommended]" "replace" \
      "Push new name but keep old remote branch" "keep" \
      "Do not change remote yet" "none"

    case "$MENU_RESULT" in
      replace)
        git push -u "$remote" "$new"
        git push "$remote" --delete "$current"
        ;;
      keep)
        git push -u "$remote" "$new"
        ;;
    esac
  fi
  pause
}

merge_branch() {
  local current
  current="$(current_branch)"
  mapfile -t branches < <(local_branch_names | grep -Fxv "$current" || true)

  if select_item "Choose a branch to MERGE into '$current'" "${branches[@]}"; then
    printf "\n"
    warn "Target: '$SELECTED_ITEM' -> current branch '$current'."
    yes_no "Start this merge?" "Merge" "Cancel" "no"
    if [[ "$MENU_RESULT" == "yes" ]]; then
      if git merge "$SELECTED_ITEM"; then
        ok "Merge completed."
      else
        warn "The merge did not finish automatically, usually because of conflicts."
        warn "gitbr will open the recovery helper."
        pause
        conflicts_menu
      fi
    fi
    pause
  fi
}

rebase_branch() {
  local current
  current="$(current_branch)"
  mapfile -t branches < <(local_branch_names | grep -Fxv "$current" || true)

  if select_item "Choose a branch to REBASE '$current' onto" "${branches[@]}"; then
    printf "\n"
    warn "Rebase rewrites commits on '$current'. Avoid rebasing shared commits unless you know the impact."
    if danger_confirm "Rebase '$current' onto '$SELECTED_ITEM'?"; then
      if git rebase "$SELECTED_ITEM"; then
        ok "Rebase completed."
      else
        warn "The rebase paused, usually because of conflicts."
        warn "gitbr will open the recovery helper."
        pause
        conflicts_menu
      fi
    fi
    pause
  fi
}

compare_branches() {
  mapfile -t branches < <(all_branch_names)
  select_item "Choose the FIRST branch" "${branches[@]}" || return
  local a="$SELECTED_ITEM"
  select_item "Choose the SECOND branch" "${branches[@]}" || return
  local b="$SELECTED_ITEM"

  app_header
  section "Compare: $a ... $b"
  git --no-pager log --left-right --graph --cherry-pick --oneline "$a...$b"
  printf "\n"
  git diff --stat "$a...$b" || true
  pause
}

branches_menu() {
  while true; do
    app_header
    section "Branches"
    git branch -vv
    printf "\n"

    menu "What do you want to do?" \
      "Create a new branch (guided)" "create" \
      "Switch branch" "switch" \
      "Refresh remote branches" "fetch" \
      "Rename current branch" "rename" \
      "Merge another branch into current" "merge" \
      "Rebase current branch onto another" "rebase" \
      "Compare two branches" "compare" \
      "Delete local branch" "delete_local" \
      "Delete remote branch" "delete_remote" \
      "Back" "back"

    case "$MENU_RESULT" in
      create) create_branch_wizard ;;
      switch) switch_branch ;;
      fetch)
        local r
        r="$(default_remote)"
        if [[ -n "$r" ]]; then git fetch --prune "$r"; else info "No remote configured."; fi
        pause
        ;;
      rename) rename_current_branch ;;
      merge) merge_branch ;;
      rebase) rebase_branch ;;
      compare) compare_branches ;;
      delete_local) delete_local_branch ;;
      delete_remote) delete_remote_branch ;;
      back) return ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# Sync / remote operations
# -----------------------------------------------------------------------------

set_upstream_current() {
  local branch remote
  branch="$(current_branch)"
  remote="$(default_remote)"
  [[ -n "$branch" ]] || { info "Detached HEAD has no branch to publish."; pause; return; }
  [[ -n "$remote" ]] || { info "No remote is configured."; pause; return; }

  git push -u "$remote" "$branch"
  ok "Upstream configured as '$remote/$branch'."
  pause
}

sync_current_safely() {
  local branch remote upstream behind ahead
  branch="$(current_branch)"
  remote="$(default_remote)"

  [[ -n "$branch" ]] || { info "Switch to a normal branch first."; pause; return; }
  [[ -n "$remote" ]] || { info "No remote is configured."; pause; return; }

  if working_tree_dirty; then
    warn "Safe sync requires a clean working tree."
    menu "What should gitbr do?" \
      "Save changes temporarily, sync, then restore them  [recommended]" "stash" \
      "Cancel" "cancel"
    [[ "$MENU_RESULT" == "stash" ]] || return
    TEMP_STASH_RESTORE=true
    temporary_save_changes
  fi

  git fetch --prune "$remote"

  upstream="$(git rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || true)"
  if [[ -z "$upstream" ]]; then
    info "This branch has no upstream yet. Publishing it now..."
    git push -u "$remote" "$branch"
  else
    read -r behind ahead < <(ahead_behind)

    if (( behind > 0 )); then
      info "Remote has $behind commit(s) you do not have."
      if ! git pull --ff-only; then
        warn "Fast-forward is not possible. Nothing was merged automatically."
        warn "Use Branches -> Merge/Rebase after reviewing the divergence."
        [[ "$TEMP_STASH_ACTIVE" == true && "$TEMP_STASH_RESTORE" == true ]] && temporary_restore_changes
        pause
        return
      fi
    fi

    read -r behind ahead < <(ahead_behind)
    if (( ahead > 0 )); then
      info "Pushing $ahead local commit(s)..."
      git push
    fi

    read -r behind ahead < <(ahead_behind)
    if (( ahead == 0 && behind == 0 )); then
      ok "Local and remote branch are synchronized."
    fi
  fi

  [[ "$TEMP_STASH_ACTIVE" == true && "$TEMP_STASH_RESTORE" == true ]] && temporary_restore_changes
  pause
}

sync_menu() {
  while true; do
    app_header
    section "Remote sync"

    local branch upstream remote behind ahead
    branch="$(current_branch_display)"
    remote="$(default_remote)"
    upstream="$(git rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || true)"
    read -r behind ahead < <(ahead_behind)

    printf "\n  Branch:   %s\n" "$branch"
    printf "  Upstream: %s\n" "${upstream:-not configured}"
    printf "  Ahead: %s   Behind: %s\n" "$ahead" "$behind"

    menu "Choose a sync action" \
      "Safe sync current branch (fetch -> fast-forward -> push)  [recommended]" "safe" \
      "Fetch + prune remote information" "fetch" \
      "Pull current branch using fast-forward only" "pull_ff" \
      "Pull current branch using rebase" "pull_rebase" \
      "Push current branch" "push" \
      "Publish current branch / set upstream" "upstream" \
      "Force push with lease (advanced)" "force" \
      "Back" "back"

    case "$MENU_RESULT" in
      safe) sync_current_safely ;;
      fetch)
        [[ -n "$remote" ]] && git fetch --prune "$remote" || info "No remote configured."
        pause
        ;;
      pull_ff)
        git pull --ff-only
        pause
        ;;
      pull_rebase)
        if ! git pull --rebase; then
          warn "The rebase pull paused or failed. Check recovery before continuing."
          pause
          conflicts_menu
        fi
        pause
        ;;
      push)
        if git rev-parse --abbrev-ref '@{upstream}' >/dev/null 2>&1; then
          git push
        else
          set_upstream_current
          continue
        fi
        pause
        ;;
      upstream) set_upstream_current ;;
      force)
        warn "Force-with-lease can rewrite the remote branch, but protects against overwriting unseen remote work."
        if danger_confirm "Force push the current branch with --force-with-lease?"; then
          git push --force-with-lease
        fi
        pause
        ;;
      back) return ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# Stash
# -----------------------------------------------------------------------------

stash_entries() {
  git stash list --format='%gd  %s'
}

stash_refs() {
  git stash list --format='%gd'
}

choose_stash_ref() {
  mapfile -t stashes < <(stash_refs)
  if (( ${#stashes[@]} == 0 )); then
    info "There are no saved stash entries."
    pause
    return 1
  fi
  select_item "Choose saved changes" "${stashes[@]}"
}

stash_menu() {
  while true; do
    app_header
    section "Saved changes (Git stash)"
    local entries
    entries="$(stash_entries)"
    if [[ -n "$entries" ]]; then
      printf "\n%s\n" "$entries"
    else
      printf "\n  No saved changes.\n"
    fi

    menu "What do you want to do?" \
      "Save current changes for later (includes untracked files)" "save" \
      "Restore saved changes and REMOVE them from saved list" "pop" \
      "Apply saved changes but KEEP a saved copy" "apply" \
      "Preview saved changes" "show" \
      "Create a new branch from saved changes" "branch" \
      "Delete one saved entry" "drop" \
      "Delete ALL saved entries" "clear" \
      "Back" "back"

    case "$MENU_RESULT" in
      save)
        if working_tree_dirty; then
          local generated custom message
          generated="WIP $(current_branch_display) $(date '+%Y-%m-%d %H:%M')"
          menu "Choose a label for the saved work" \
            "Use automatic label: $generated  [recommended]" "auto" \
            "Write a custom label" "custom"
          if [[ "$MENU_RESULT" == "custom" ]]; then
            read -r -p "  Label: " custom
            message="${custom:-$generated}"
          else
            message="$generated"
          fi
          git stash push -u -m "$message"
          ok "Changes saved."
        else
          info "There are no working changes to save."
        fi
        pause
        ;;
      pop)
        if choose_stash_ref; then
          git stash pop "$SELECTED_ITEM"
          pause
        fi
        ;;
      apply)
        if choose_stash_ref; then
          git stash apply "$SELECTED_ITEM"
          pause
        fi
        ;;
      show)
        if choose_stash_ref; then
          git --no-pager stash show -p "$SELECTED_ITEM"
          pause
        fi
        ;;
      branch)
        if choose_stash_ref; then
          local ref="$SELECTED_ITEM"
          read -r -p "  New branch name: " name
          name="$(normalize_slug "$name")"
          if [[ -n "$name" ]]; then
            git stash branch "$name" "$ref"
          else
            warn "Branch name cannot be empty."
          fi
          pause
        fi
        ;;
      drop)
        if choose_stash_ref; then
          if danger_confirm "Delete saved entry '$SELECTED_ITEM'?"; then
            git stash drop "$SELECTED_ITEM"
          fi
          pause
        fi
        ;;
      clear)
        if [[ -n "$(git stash list)" ]]; then
          warn "This permanently deletes every stash entry."
          if danger_confirm "Delete ALL saved stash entries?"; then
            git stash clear
            ok "All stash entries deleted."
          fi
        else
          info "There are no stash entries."
        fi
        pause
        ;;
      back)
        return
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# History and recovery
# -----------------------------------------------------------------------------

recent_commits() {
  git log --format='%h  %s' -30
}

choose_commit_hash() {
  mapfile -t rows < <(recent_commits)
  if (( ${#rows[@]} == 0 )); then
    info "There are no commits."
    pause
    return 1
  fi

  select_item "Choose a commit" "${rows[@]}" || return 1
  SELECTED_COMMIT="${SELECTED_ITEM%% *}"
  return 0
}

history_menu() {
  while true; do
    app_header
    section "History and recovery"

    menu "What do you want to do?" \
      "Show visual commit history" "log" \
      "Inspect a recent commit" "show" \
      "Revert a commit safely (creates a new commit)" "revert" \
      "Cherry-pick a commit onto current branch" "cherry" \
      "Show reflog (recovery history)" "reflog" \
      "Undo latest commit, keep changes staged" "soft" \
      "Undo latest commit, keep changes unstaged" "mixed" \
      "Hard reset to a recent commit (DANGEROUS)" "hard" \
      "Continue/abort merge, rebase, cherry-pick, revert" "recovery" \
      "Back" "back"

    case "$MENU_RESULT" in
      log)
        git --no-pager log --graph --decorate --all --oneline -40
        pause
        ;;
      show)
        if choose_commit_hash; then
          git --no-pager show --stat --decorate "$SELECTED_COMMIT"
          pause
        fi
        ;;
      revert)
        if choose_commit_hash; then
          warn "Revert is the safe way to undo a published commit because it adds a new inverse commit."
          yes_no "Revert commit '$SELECTED_COMMIT'?" "Create revert commit" "Cancel" "no"
          if [[ "$MENU_RESULT" == "yes" ]]; then
            if ! GIT_EDITOR=true git revert "$SELECTED_COMMIT"; then
              warn "The revert paused because Git needs conflict resolution."
              pause
              conflicts_menu
            fi
          fi
          pause
        fi
        ;;
      cherry)
        if choose_commit_hash; then
          yes_no "Apply commit '$SELECTED_COMMIT' onto the current branch?" "Cherry-pick" "Cancel" "no"
          if [[ "$MENU_RESULT" == "yes" ]]; then
            if ! git cherry-pick "$SELECTED_COMMIT"; then
              warn "The cherry-pick paused because Git needs conflict resolution."
              pause
              conflicts_menu
            fi
          fi
          pause
        fi
        ;;
      reflog)
        git --no-pager reflog -30
        pause
        ;;
      soft)
        if git rev-parse HEAD~1 >/dev/null 2>&1; then
          warn "The latest commit will be removed; its changes stay staged."
          if danger_confirm "Soft-reset HEAD to HEAD~1?"; then git reset --soft HEAD~1; fi
        else
          info "No previous commit is available."
        fi
        pause
        ;;
      mixed)
        if git rev-parse HEAD~1 >/dev/null 2>&1; then
          warn "The latest commit will be removed; its changes stay in your working tree."
          if danger_confirm "Reset HEAD to HEAD~1 and keep changes unstaged?"; then git reset HEAD~1; fi
        else
          info "No previous commit is available."
        fi
        pause
        ;;
      hard)
        if choose_commit_hash; then
          warn "HARD RESET deletes tracked working changes and moves the branch pointer."
          warn "Use this only when you intentionally want to throw work away."
          if danger_confirm "Hard reset current branch to '$SELECTED_COMMIT'?"; then
            git reset --hard "$SELECTED_COMMIT"
          fi
          pause
        fi
        ;;
      recovery)
        conflicts_menu
        ;;
      back)
        return
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------

tag_names() {
  git tag --sort=-creatordate
}

tags_menu() {
  while true; do
    app_header
    section "Tags and versions"
    git tag --sort=-creatordate | head -30 || true

    menu "What do you want to do?" \
      "Create an annotated tag on current commit" "create" \
      "List tags with commit information" "list" \
      "Push one tag to remote" "push_one" \
      "Push all local tags" "push_all" \
      "Delete a local tag" "delete_local" \
      "Delete a tag from remote" "delete_remote" \
      "Back" "back"

    case "$MENU_RESULT" in
      create)
        read -r -p "  Tag name (example: v1.4.0): " tag
        if [[ -n "$tag" ]]; then
          read -r -p "  Tag message [Release $tag]: " message
          message="${message:-Release $tag}"
          git tag -a "$tag" -m "$message"
          ok "Created tag '$tag'."
        else
          warn "Tag name cannot be empty."
        fi
        pause
        ;;
      list)
        git --no-pager for-each-ref \
          --sort=-creatordate \
          --format='%(refname:short)  %(objectname:short)  %(creatordate:short)  %(subject)' refs/tags
        pause
        ;;
      push_one)
        mapfile -t tags < <(tag_names)
        if select_item "Choose a tag to push" "${tags[@]}"; then
          git push "$(default_remote)" "$SELECTED_ITEM"
          pause
        fi
        ;;
      push_all)
        git push "$(default_remote)" --tags
        pause
        ;;
      delete_local)
        mapfile -t tags < <(tag_names)
        if select_item "Choose a local tag to delete" "${tags[@]}"; then
          if danger_confirm "Delete local tag '$SELECTED_ITEM'?"; then
            git tag -d "$SELECTED_ITEM"
          fi
          pause
        fi
        ;;
      delete_remote)
        local r
        r="$(default_remote)"
        mapfile -t tags < <(tag_names)
        if select_item "Choose a tag to delete from '$r'" "${tags[@]}"; then
          if danger_confirm "Delete remote tag '$SELECTED_ITEM'?"; then
            git push "$r" ":refs/tags/$SELECTED_ITEM"
          fi
          pause
        fi
        ;;
      back)
        return
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# Remotes
# -----------------------------------------------------------------------------

remotes_menu() {
  while true; do
    app_header
    section "Remotes"
    git remote -v || true

    menu "What do you want to do?" \
      "Fetch ALL remotes and prune deleted branches" "fetch_all" \
      "Add a remote" "add" \
      "Change a remote URL" "set_url" \
      "Rename a remote" "rename" \
      "Remove a remote" "remove" \
      "Prune one remote" "prune" \
      "Publish current branch and set upstream" "upstream" \
      "Back" "back"

    case "$MENU_RESULT" in
      fetch_all)
        git fetch --all --prune
        pause
        ;;
      add)
        read -r -p "  Remote name [origin]: " name
        name="${name:-origin}"
        read -r -p "  Remote Git URL: " url
        if [[ -n "$url" ]]; then
          git remote add "$name" "$url"
          ok "Remote '$name' added."
        else
          warn "URL cannot be empty."
        fi
        pause
        ;;
      set_url)
        mapfile -t remotes < <(git remote)
        if select_item "Choose a remote" "${remotes[@]}"; then
          read -r -p "  New URL: " url
          [[ -n "$url" ]] && git remote set-url "$SELECTED_ITEM" "$url"
          pause
        fi
        ;;
      rename)
        mapfile -t remotes < <(git remote)
        if select_item "Choose a remote to rename" "${remotes[@]}"; then
          read -r -p "  New remote name: " name
          [[ -n "$name" ]] && git remote rename "$SELECTED_ITEM" "$name"
          pause
        fi
        ;;
      remove)
        mapfile -t remotes < <(git remote)
        if select_item "Choose a remote to REMOVE" "${remotes[@]}"; then
          warn "Removing a remote does not delete the online repository."
          if danger_confirm "Remove remote '$SELECTED_ITEM' from this local repo?"; then
            git remote remove "$SELECTED_ITEM"
          fi
          pause
        fi
        ;;
      prune)
        mapfile -t remotes < <(git remote)
        if select_item "Choose a remote to prune" "${remotes[@]}"; then
          git remote prune "$SELECTED_ITEM"
          pause
        fi
        ;;
      upstream)
        set_upstream_current
        ;;
      back)
        return
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# GitHub CLI setup
# -----------------------------------------------------------------------------

install_gh() {
  if github_available; then
    ok "GitHub CLI is already installed."
    pause
    return 0
  fi

  app_header
  section "Install GitHub CLI"
  printf "\n"
  warn "This changes system packages and may ask for your sudo password."

  menu "Install GitHub CLI using the detected package manager?" \
    "Yes, install gh" "yes" \
    "No, go back" "no"

  [[ "$MENU_RESULT" == "yes" ]] || return 1

  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y gh
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y gh
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y gh
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -S --needed github-cli
  elif command -v zypper >/dev/null 2>&1; then
    sudo zypper install -y gh
  elif command -v brew >/dev/null 2>&1; then
    brew install gh
  else
    fail "gitbr could not find a supported package manager."
    printf "  Install GitHub CLI from https://cli.github.com/ and run gitbr again.\n"
    pause
    return 1
  fi

  github_available && ok "GitHub CLI installed."
  pause
}

ensure_github_ready() {
  if ! is_github_repo; then
    app_header
    section "GitHub"
    warn "The selected Git remote does not look like a github.com repository."
    printf "  Git features still work, but GitHub-specific features need a GitHub remote.\n"
    pause
    return 1
  fi

  if ! github_available; then
    app_header
    section "GitHub CLI required"
    printf "\n"
    printf "  GitHub features use the official 'gh' command-line tool.\n"
    menu "What should gitbr do?" \
      "Install GitHub CLI" "install" \
      "Back" "back"
    [[ "$MENU_RESULT" == "install" ]] || return 1
    install_gh || return 1
  fi

  if ! github_authenticated; then
    app_header
    section "Connect GitHub"
    printf "\n"
    printf "  GitHub CLI is installed but not signed in.\n"
    menu "Connect this computer to GitHub now?" \
      "Sign in with GitHub CLI  [recommended]" "login" \
      "Back" "back"
    [[ "$MENU_RESULT" == "login" ]] || return 1

    gh auth login
    github_authenticated || {
      warn "GitHub authentication is not ready yet."
      pause
      return 1
    }
  fi

  return 0
}

# -----------------------------------------------------------------------------
# GitHub PR helpers
# -----------------------------------------------------------------------------

gh_pr_rows() {
  gh pr list --limit 50 \
    --json number,title,headRefName,isDraft,state \
    --template '{{range .}}{{printf "#%-5v %-8v %-30v %s\n" .number (if .isDraft "DRAFT" else .state end) .headRefName .title}}{{end}}'
}

gh_pr_numbers() {
  gh pr list --limit 50 --json number --jq '.[].number'
}

choose_pr() {
  mapfile -t prs < <(gh_pr_numbers)
  if (( ${#prs[@]} == 0 )); then
    info "There are no open pull requests."
    pause
    return 1
  fi

  local -a labels=()
  local n title
  for n in "${prs[@]}"; do
    title="$(gh pr view "$n" --json title --jq .title 2>/dev/null || true)"
    labels+=("#$n  $title")
  done

  local -a args=()
  local i
  for i in "${!prs[@]}"; do
    args+=("${labels[$i]}" "${prs[$i]}")
  done
  args+=("Back" "__BACK__")

  menu "Choose a pull request" "${args[@]}"
  [[ "$MENU_RESULT" == "__BACK__" ]] && return 1
  SELECTED_PR="$MENU_RESULT"
  return 0
}

create_pr_guided() {
  local branch base remote
  branch="$(current_branch)"
  [[ -n "$branch" ]] || { info "Switch to a branch before creating a PR."; pause; return; }

  remote="$(default_remote)"
  if ! git rev-parse --abbrev-ref '@{upstream}' >/dev/null 2>&1; then
    info "Publishing current branch first..."
    git push -u "$remote" "$branch"
  else
    git push
  fi

  base="$(default_branch "$remote")"

  menu "How should the Pull Request be created?" \
    "Auto-fill title/body from commits  [recommended]" "fill" \
    "Auto-fill and create as DRAFT" "draft" \
    "Let GitHub CLI guide the details interactively" "interactive" \
    "Back" "back"

  case "$MENU_RESULT" in
    fill)
      gh pr create --base "$base" --head "$branch" --fill
      ;;
    draft)
      gh pr create --base "$base" --head "$branch" --fill --draft
      ;;
    interactive)
      gh pr create --base "$base" --head "$branch"
      ;;
    back)
      return
      ;;
  esac
  pause
}

merge_pr_guided() {
  choose_pr || return
  local n="$SELECTED_PR"

  gh pr view "$n"
  printf "\n"

  menu "How should PR #$n be merged?" \
    "Squash commits into one commit" "squash" \
    "Create a merge commit" "merge" \
    "Rebase commits onto the base branch" "rebase" \
    "Enable auto-merge when requirements pass" "auto" \
    "Back" "back"

  case "$MENU_RESULT" in
    squash)
      yes_no "Merge PR #$n using squash?" "Merge" "Cancel" "no"
      [[ "$MENU_RESULT" == "yes" ]] && gh pr merge "$n" --squash --delete-branch
      ;;
    merge)
      yes_no "Merge PR #$n using a merge commit?" "Merge" "Cancel" "no"
      [[ "$MENU_RESULT" == "yes" ]] && gh pr merge "$n" --merge --delete-branch
      ;;
    rebase)
      yes_no "Merge PR #$n using rebase?" "Merge" "Cancel" "no"
      [[ "$MENU_RESULT" == "yes" ]] && gh pr merge "$n" --rebase --delete-branch
      ;;
    auto)
      gh pr merge "$n" --auto
      ;;
  esac
  pause
}

github_pr_menu() {
  while true; do
    app_header
    section "GitHub Pull Requests"
    gh pr list --limit 20 || true

    menu "What do you want to do?" \
      "Create PR from current branch" "create" \
      "View a PR" "view" \
      "Open a PR in browser" "web" \
      "Checkout a PR locally" "checkout" \
      "Show PR checks" "checks" \
      "Update PR branch from its base" "update" \
      "Mark a draft PR ready for review" "ready" \
      "Merge a PR" "merge" \
      "Close a PR without merging" "close" \
      "Reopen a PR" "reopen" \
      "Add a comment" "comment" \
      "Back" "back"

    case "$MENU_RESULT" in
      create) create_pr_guided ;;
      view)
        choose_pr && { gh pr view "$SELECTED_PR" --comments; pause; }
        ;;
      web)
        choose_pr && { gh pr view "$SELECTED_PR" --web; pause; }
        ;;
      checkout)
        choose_pr && { gh pr checkout "$SELECTED_PR"; pause; }
        ;;
      checks)
        choose_pr && { gh pr checks "$SELECTED_PR"; pause; }
        ;;
      update)
        choose_pr && { gh pr update-branch "$SELECTED_PR"; pause; }
        ;;
      ready)
        choose_pr && { gh pr ready "$SELECTED_PR"; pause; }
        ;;
      merge)
        merge_pr_guided
        ;;
      close)
        choose_pr || continue
        if danger_confirm "Close PR #$SELECTED_PR without merging it?"; then
          gh pr close "$SELECTED_PR"
        fi
        pause
        ;;
      reopen)
        choose_pr && { gh pr reopen "$SELECTED_PR"; pause; }
        ;;
      comment)
        choose_pr || continue
        read -r -p "  Comment: " comment
        [[ -n "$comment" ]] && gh pr comment "$SELECTED_PR" --body "$comment"
        pause
        ;;
      back)
        return
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# GitHub Issues
# -----------------------------------------------------------------------------

gh_issue_numbers() {
  gh issue list --limit 50 --json number --jq '.[].number'
}

choose_issue() {
  mapfile -t issues < <(gh_issue_numbers)
  if (( ${#issues[@]} == 0 )); then
    info "There are no open issues."
    pause
    return 1
  fi

  local -a args=()
  local n title
  for n in "${issues[@]}"; do
    title="$(gh issue view "$n" --json title --jq .title 2>/dev/null || true)"
    args+=("#$n  $title" "$n")
  done
  args+=("Back" "__BACK__")

  menu "Choose an issue" "${args[@]}"
  [[ "$MENU_RESULT" == "__BACK__" ]] && return 1
  SELECTED_ISSUE="$MENU_RESULT"
  return 0
}

create_issue_guided() {
  menu "How do you want to create the issue?" \
    "GitHub guided form (uses repository templates when available)  [recommended]" "interactive" \
    "Quick issue with title only" "quick" \
    "Back" "back"

  case "$MENU_RESULT" in
    interactive)
      gh issue create
      ;;
    quick)
      read -r -p "  Issue title: " title
      if [[ -n "$title" ]]; then
        menu "Assignment" \
          "Leave unassigned" "none" \
          "Assign to me" "me"
        if [[ "$MENU_RESULT" == "me" ]]; then
          gh issue create --title "$title" --body "" --assignee "@me"
        else
          gh issue create --title "$title" --body ""
        fi
      else
        warn "Title cannot be empty."
      fi
      ;;
  esac
  pause
}

github_issue_menu() {
  while true; do
    app_header
    section "GitHub Issues"
    gh issue list --limit 20 || true

    menu "What do you want to do?" \
      "Create a new issue" "create" \
      "View issue + comments" "view" \
      "Open issue in browser" "web" \
      "Close an issue" "close" \
      "Reopen an issue" "reopen" \
      "Add a comment" "comment" \
      "Create branch for an issue" "branch" \
      "Back" "back"

    case "$MENU_RESULT" in
      create) create_issue_guided ;;
      view)
        choose_issue && { gh issue view "$SELECTED_ISSUE" --comments; pause; }
        ;;
      web)
        choose_issue && { gh issue view "$SELECTED_ISSUE" --web; pause; }
        ;;
      close)
        choose_issue || continue
        yes_no "Close issue #$SELECTED_ISSUE?" "Close issue" "Cancel" "no"
        [[ "$MENU_RESULT" == "yes" ]] && gh issue close "$SELECTED_ISSUE"
        pause
        ;;
      reopen)
        choose_issue && { gh issue reopen "$SELECTED_ISSUE"; pause; }
        ;;
      comment)
        choose_issue || continue
        read -r -p "  Comment: " comment
        [[ -n "$comment" ]] && gh issue comment "$SELECTED_ISSUE" --body "$comment"
        pause
        ;;
      branch)
        choose_issue || continue
        if gh issue develop --help >/dev/null 2>&1; then
          gh issue develop "$SELECTED_ISSUE" --checkout
        else
          warn "This installed GitHub CLI does not provide 'gh issue develop'."
        fi
        pause
        ;;
      back)
        return
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# GitHub Actions
# -----------------------------------------------------------------------------

workflow_names() {
  gh workflow list --all --json name --jq '.[].name'
}

run_ids() {
  gh run list --limit 30 --json databaseId --jq '.[].databaseId'
}

choose_run() {
  mapfile -t ids < <(run_ids)
  if (( ${#ids[@]} == 0 )); then
    info "No workflow runs found."
    pause
    return 1
  fi

  local -a args=()
  local id label
  for id in "${ids[@]}"; do
    label="$(gh run view "$id" --json name,status,conclusion,headBranch \
      --template '{{.status}}/{{.conclusion}}  {{.headBranch}}  {{.name}}' 2>/dev/null || true)"
    args+=("$id  ${label:-workflow run}" "$id")
  done
  args+=("Back" "__BACK__")

  menu "Choose an Actions run" "${args[@]}"
  [[ "$MENU_RESULT" == "__BACK__" ]] && return 1
  SELECTED_RUN="$MENU_RESULT"
  return 0
}

github_actions_menu() {
  while true; do
    app_header
    section "GitHub Actions"
    gh run list --limit 15 || true

    menu "What do you want to do?" \
      "List workflows" "workflows" \
      "Run a workflow manually" "run_workflow" \
      "View a workflow run" "view" \
      "Watch a running workflow" "watch" \
      "View failed logs" "failed_logs" \
      "Re-run failed jobs" "rerun_failed" \
      "Re-run an entire workflow" "rerun" \
      "Cancel a running workflow" "cancel" \
      "Open Actions in browser" "web" \
      "Back" "back"

    case "$MENU_RESULT" in
      workflows)
        gh workflow list --all
        pause
        ;;
      run_workflow)
        mapfile -t workflows < <(workflow_names)
        if select_item "Choose a workflow to run" "${workflows[@]}"; then
          info "GitHub CLI will ask only for inputs required by this workflow."
          gh workflow run "$SELECTED_ITEM"
          pause
        fi
        ;;
      view)
        choose_run && { gh run view "$SELECTED_RUN"; pause; }
        ;;
      watch)
        choose_run && { gh run watch "$SELECTED_RUN"; pause; }
        ;;
      failed_logs)
        choose_run && { gh run view "$SELECTED_RUN" --log-failed; pause; }
        ;;
      rerun_failed)
        choose_run || continue
        yes_no "Re-run failed jobs for run $SELECTED_RUN?" "Re-run failed jobs" "Cancel" "no"
        [[ "$MENU_RESULT" == "yes" ]] && gh run rerun "$SELECTED_RUN" --failed
        pause
        ;;
      rerun)
        choose_run || continue
        yes_no "Re-run all jobs for run $SELECTED_RUN?" "Re-run workflow" "Cancel" "no"
        [[ "$MENU_RESULT" == "yes" ]] && gh run rerun "$SELECTED_RUN"
        pause
        ;;
      cancel)
        choose_run || continue
        if danger_confirm "Cancel workflow run $SELECTED_RUN?"; then
          gh run cancel "$SELECTED_RUN"
        fi
        pause
        ;;
      web)
        gh browse actions
        pause
        ;;
      back)
        return
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# GitHub releases
# -----------------------------------------------------------------------------

release_tags() {
  gh release list --limit 50 --json tagName --jq '.[].tagName'
}

choose_release() {
  mapfile -t releases < <(release_tags)
  if (( ${#releases[@]} == 0 )); then
    info "No GitHub releases found."
    pause
    return 1
  fi
  select_item "Choose a release" "${releases[@]}"
  [[ -n "$SELECTED_ITEM" ]] || return 1
  SELECTED_RELEASE="$SELECTED_ITEM"
}

create_release_guided() {
  mapfile -t tags < <(tag_names)

  menu "What should the release use?" \
    "Choose an existing Git tag  [recommended]" "existing" \
    "Create a new tag/release from the current commit" "new" \
    "Back" "back"

  case "$MENU_RESULT" in
    existing)
      if ! select_item "Choose a tag" "${tags[@]}"; then return; fi
      release_tag="$SELECTED_ITEM"
      ;;
    new)
      read -r -p "  New tag (example v1.4.0): " release_tag
      [[ -n "$release_tag" ]] || { warn "Tag cannot be empty."; pause; return; }
      ;;
    back)
      return
      ;;
  esac

  menu "Release type" \
    "Normal release with automatically generated notes  [recommended]" "normal" \
    "Pre-release with automatically generated notes" "pre" \
    "Draft release with automatically generated notes" "draft"

  case "$MENU_RESULT" in
    normal)
      gh release create "$release_tag" --generate-notes
      ;;
    pre)
      gh release create "$release_tag" --generate-notes --prerelease
      ;;
    draft)
      gh release create "$release_tag" --generate-notes --draft
      ;;
  esac
  pause
}

github_release_menu() {
  while true; do
    app_header
    section "GitHub Releases"
    gh release list --limit 20 || true

    menu "What do you want to do?" \
      "Create a release" "create" \
      "View release details" "view" \
      "Open release in browser" "web" \
      "Delete a release" "delete" \
      "Back" "back"

    case "$MENU_RESULT" in
      create) create_release_guided ;;
      view)
        choose_release && { gh release view "$SELECTED_RELEASE"; pause; }
        ;;
      web)
        choose_release && { gh release view "$SELECTED_RELEASE" --web; pause; }
        ;;
      delete)
        choose_release || continue
        warn "Deleting a release does not automatically delete its Git tag unless requested."
        if danger_confirm "Delete release '$SELECTED_RELEASE'?"; then
          menu "Also delete the Git tag?" \
            "Keep tag  [recommended]" "keep" \
            "Delete tag too" "tag"
          if [[ "$MENU_RESULT" == "tag" ]]; then
            gh release delete "$SELECTED_RELEASE" --cleanup-tag --yes
          else
            gh release delete "$SELECTED_RELEASE" --yes
          fi
        fi
        pause
        ;;
      back)
        return
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# GitHub Actions secrets / variables / projects
# -----------------------------------------------------------------------------

github_secrets_variables_menu() {
  while true; do
    app_header
    section "GitHub Actions configuration"

    menu "Choose what to manage" \
      "List repository Actions secrets" "secret_list" \
      "Set / update a repository Actions secret" "secret_set" \
      "Delete a repository Actions secret" "secret_delete" \
      "List repository Actions variables" "var_list" \
      "Set / update a repository Actions variable" "var_set" \
      "Delete a repository Actions variable" "var_delete" \
      "Back" "back"

    case "$MENU_RESULT" in
      secret_list)
        gh secret list --app actions
        pause
        ;;
      secret_set)
        read -r -p "  Secret name (example: API_TOKEN): " name
        if [[ -z "$name" ]]; then
          warn "Secret name cannot be empty."
          pause
          continue
        fi
        printf "  Secret value will not be shown while you type.\n"
        read -r -s -p "  Secret value: " value
        printf "\n"
        if printf '%s' "$value" | gh secret set "$name" --app actions; then
          ok "Secret '$name' saved."
        else
          warn "GitHub CLI could not save the secret."
        fi
        unset value
        pause
        ;;
      secret_delete)
        mapfile -t names < <(gh secret list --app actions --json name --jq '.[].name')
        if select_item "Choose a secret to delete" "${names[@]}"; then
          if danger_confirm "Delete secret '$SELECTED_ITEM'?"; then
            gh secret delete "$SELECTED_ITEM" --app actions
          fi
          pause
        fi
        ;;
      var_list)
        gh variable list
        pause
        ;;
      var_set)
        read -r -p "  Variable name: " name
        [[ -n "$name" ]] || { warn "Variable name cannot be empty."; pause; continue; }
        read -r -p "  Variable value: " value
        gh variable set "$name" --body "$value"
        ok "Variable '$name' saved."
        pause
        ;;
      var_delete)
        mapfile -t names < <(gh variable list --json name --jq '.[].name')
        if select_item "Choose a variable to delete" "${names[@]}"; then
          if danger_confirm "Delete variable '$SELECTED_ITEM'?"; then
            gh variable delete "$SELECTED_ITEM"
          fi
          pause
        fi
        ;;
      back)
        return
        ;;
    esac
  done
}

github_projects_menu() {
  while true; do
    app_header
    section "GitHub Projects"

    local owner
    owner="$(gh repo view --json owner --jq .owner.login 2>/dev/null || true)"
    printf "\n  Repository owner: %s\n" "${owner:-unknown}"

    menu "What do you want to do?" \
      "Open repository Projects in browser  [recommended]" "web" \
      "List Projects owned by repository owner" "list" \
      "View items in a Project" "items" \
      "Back" "back"

    case "$MENU_RESULT" in
      web)
        gh browse --projects
        pause
        ;;
      list)
        if [[ -n "$owner" ]]; then
          if ! gh project list --owner "$owner"; then
            warn "Projects may require extra GitHub authorization."
            warn "Run 'gh auth refresh -s project' if GitHub asks for the project scope."
          fi
        fi
        pause
        ;;
      items)
        if [[ -z "$owner" ]]; then
          warn "Could not determine repository owner."
          pause
          continue
        fi

        mapfile -t project_numbers < <(
          gh project list --owner "$owner" --format json --jq '.projects[].number' 2>/dev/null || true
        )

        if (( ${#project_numbers[@]} == 0 )); then
          warn "No accessible Projects were found, or project scope is missing."
          pause
          continue
        fi

        if select_item "Choose a Project number" "${project_numbers[@]}"; then
          gh project item-list "$SELECTED_ITEM" --owner "$owner"
          pause
        fi
        ;;
      back)
        return
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# GitHub labels and repository
# -----------------------------------------------------------------------------

github_labels_menu() {
  while true; do
    app_header
    section "GitHub Labels"
    gh label list --limit 100 || true

    menu "What do you want to do?" \
      "Create a label" "create" \
      "Delete a label" "delete" \
      "Clone default labels from another repository" "clone" \
      "Back" "back"

    case "$MENU_RESULT" in
      create)
        read -r -p "  Label name: " name
        [[ -n "$name" ]] || { warn "Name cannot be empty."; pause; continue; }
        read -r -p "  Description [optional]: " description
        gh label create "$name" --description "$description"
        pause
        ;;
      delete)
        mapfile -t labels < <(gh label list --limit 100 --json name --jq '.[].name')
        if select_item "Choose a label to delete" "${labels[@]}"; then
          if danger_confirm "Delete label '$SELECTED_ITEM'?"; then
            gh label delete "$SELECTED_ITEM" --yes
          fi
          pause
        fi
        ;;
      clone)
        read -r -p "  Source repo (OWNER/REPO): " source
        [[ -n "$source" ]] && gh label clone "$source" --force
        pause
        ;;
      back)
        return
        ;;
    esac
  done
}

github_repo_menu() {
  while true; do
    app_header
    section "GitHub repository"
    gh repo view || true

    menu "What do you want to do?" \
      "Show repository overview" "view" \
      "Open repository in browser" "web" \
      "Open repository settings in browser" "settings" \
      "Choose GitHub CLI default repository" "set_default" \
      "Open repository security page" "security" \
      "Open repository Actions page" "actions" \
      "Open repository Issues page" "issues" \
      "Open repository Pull Requests page" "pulls" \
      "Show GitHub authentication status" "auth" \
      "Back" "back"

    case "$MENU_RESULT" in
      view) gh repo view; pause ;;
      web) gh repo view --web; pause ;;
      settings) gh browse --settings; pause ;;
      set_default) gh repo set-default; pause ;;
      security) gh browse security; pause ;;
      actions) gh browse --actions; pause ;;
      issues) gh browse issues; pause ;;
      pulls) gh browse pulls; pause ;;
      auth) gh auth status; pause ;;
      back) return ;;
    esac
  done
}

github_menu() {
  ensure_github_ready || return

  while true; do
    app_header
    section "GitHub"
    local owner
    owner="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || true)"
    printf "\n  Connected repository: %s\n" "${owner:-unknown}"

    menu "Choose a GitHub area" \
      "Pull Requests" "pr" \
      "Issues" "issues" \
      "Actions / Workflows" "actions" \
      "Releases" "releases" \
      "Actions secrets / variables" "secrets" \
      "Projects" "projects" \
      "Labels" "labels" \
      "Repository info / open pages" "repo" \
      "GitHub authentication" "auth" \
      "Back" "back"

    case "$MENU_RESULT" in
      pr) github_pr_menu ;;
      issues) github_issue_menu ;;
      actions) github_actions_menu ;;
      releases) github_release_menu ;;
      secrets) github_secrets_variables_menu ;;
      projects) github_projects_menu ;;
      labels) github_labels_menu ;;
      repo) github_repo_menu ;;
      auth) gh auth status; pause ;;
      back) return ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# Repository tools / diagnostics
# -----------------------------------------------------------------------------

install_gitbr_command() {
  local source_path target_dir target

  source_path="$(realpath "$0" 2>/dev/null || printf '%s' "$0")"
  target_dir="$HOME/.local/bin"
  target="$target_dir/gitbr"

  printf "\n"
  printf "  This installs gitbr for your user as:\n"
  printf "    %s\n" "$target"
  printf "  After that, you can normally start it with: gitbr\n"

  yes_no "Install/update the gitbr command?" "Install gitbr" "Cancel" "yes"
  [[ "$MENU_RESULT" == "yes" ]] || return

  mkdir -p "$target_dir"
  install -m 0755 "$source_path" "$target"
  ok "Installed: $target"

  case ":$PATH:" in
    *":$target_dir:"*)
      ok "'gitbr' is available from your PATH."
      ;;
    *)
      warn "$target_dir is not currently in this shell's PATH."
      printf "  Many Linux desktops add it automatically after you sign in again.\n"
      ;;
  esac

  pause
}

worktree_paths() {
  git worktree list --porcelain | awk '/^worktree / {sub(/^worktree /,""); print}'
}

worktrees_menu() {
  while true; do
    app_header
    section "Git worktrees"
    git worktree list
    printf "\n"
    printf "  Worktrees let the same repository have multiple branches checked out in separate folders.\n"

    menu "What do you want to do?" \
      "Add a worktree for an existing branch" "add" \
      "Remove a worktree" "remove" \
      "Prune stale worktree records" "prune" \
      "Back" "back"

    case "$MENU_RESULT" in
      add)
        mapfile -t branches < <(local_branch_names)
        if select_item "Choose a local branch for the new worktree" "${branches[@]}"; then
          local branch="$SELECTED_ITEM"
          local suggested="../${REPO_NAME}-${branch//\//-}"
          menu "Where should the worktree folder be created?" \
            "Use suggested path: $suggested  [recommended]" "suggested" \
            "Enter another path" "custom" \
            "Cancel" "cancel"

          case "$MENU_RESULT" in
            suggested) wt_path="$suggested" ;;
            custom)
              read -r -p "  Worktree path: " wt_path
              ;;
            cancel)
              continue
              ;;
          esac

          if [[ -n "$wt_path" ]]; then
            if git worktree add "$wt_path" "$branch"; then
              ok "Worktree created at '$wt_path'."
            else
              warn "Git could not create that worktree. The branch may already be checked out elsewhere."
            fi
          fi
          pause
        fi
        ;;
      remove)
        mapfile -t paths < <(worktree_paths | grep -Fxv "$REPO_ROOT" || true)
        if (( ${#paths[@]} == 0 )); then
          info "No additional worktrees exist."
          pause
        elif select_item "Choose a worktree to remove" "${paths[@]}"; then
          warn "Git will refuse removal if that worktree has uncommitted changes."
          if danger_confirm "Remove worktree '$SELECTED_ITEM'?"; then
            if ! git worktree remove "$SELECTED_ITEM"; then
              warn "Normal removal was refused, usually because it contains changes."
            fi
          fi
          pause
        fi
        ;;
      prune)
        git worktree prune -v
        pause
        ;;
      back)
        return
        ;;
    esac
  done
}

submodules_menu() {
  while true; do
    app_header
    section "Git submodules"
    git submodule status --recursive 2>/dev/null || true

    menu "What do you want to do?" \
      "Initialize/update all submodules  [recommended]" "init" \
      "Sync submodule URLs from .gitmodules" "sync" \
      "Update submodules to configured remote branches" "remote" \
      "Show recursive submodule status" "status" \
      "Back" "back"

    case "$MENU_RESULT" in
      init)
        git submodule update --init --recursive
        pause
        ;;
      sync)
        git submodule sync --recursive
        pause
        ;;
      remote)
        git submodule update --remote --recursive
        pause
        ;;
      status)
        git submodule status --recursive
        pause
        ;;
      back)
        return
        ;;
    esac
  done
}

git_lfs_menu() {
  if ! command -v git-lfs >/dev/null 2>&1 && ! git lfs version >/dev/null 2>&1; then
    app_header
    section "Git LFS"
    warn "Git LFS is not installed."
    pause
    return
  fi

  while true; do
    app_header
    section "Git LFS"
    menu "What do you want to do?" \
      "Show LFS status" "status" \
      "Pull LFS objects for current checkout" "pull" \
      "Fetch all recent LFS objects" "fetch" \
      "Prune old local LFS objects" "prune" \
      "Show tracked LFS patterns" "track" \
      "Back" "back"

    case "$MENU_RESULT" in
      status) git lfs status; pause ;;
      pull) git lfs pull; pause ;;
      fetch) git lfs fetch; pause ;;
      prune) git lfs prune; pause ;;
      track) git lfs track; pause ;;
      back) return ;;
    esac
  done
}


repo_health_check() {
  app_header
  section "Repository health check"

  printf "\n"
  ok "Git repository detected at: $REPO_ROOT"

  local branch remote operation
  branch="$(current_branch_display)"
  remote="$(default_remote)"
  operation="$(repo_operation)"

  printf "\n  Branch: %s\n" "$branch"
  printf "  Remote: %s\n" "${remote:-none}"

  if has_conflicts; then
    warn "Unresolved merge conflicts exist."
  else
    ok "No unresolved conflicts."
  fi

  if [[ -n "$operation" ]]; then
    warn "A '$operation' operation is in progress."
  else
    ok "No merge/rebase/cherry-pick/revert operation is in progress."
  fi

  if git fsck --no-progress >/dev/null 2>&1; then
    ok "Git object database check passed."
  else
    warn "git fsck reported repository issues. Run it manually to inspect details."
  fi

  if [[ -n "$remote" ]]; then
    if git ls-remote "$remote" HEAD >/dev/null 2>&1; then
      ok "Remote '$remote' is reachable."
    else
      warn "Remote '$remote' could not be reached."
    fi
  fi

  if is_github_repo; then
    ok "GitHub remote detected."
    if github_authenticated; then
      ok "GitHub CLI is authenticated."
    elif github_available; then
      warn "GitHub CLI is installed but not authenticated."
    else
      warn "GitHub CLI is not installed."
    fi
  fi

  pause
}

repo_tools_menu() {
  while true; do
    app_header
    section "Repository tools"

    menu "Choose a tool" \
      "Repository health check" "health" \
      "Show full Git status" "status" \
      "Show repository configuration" "config" \
      "Git worktrees" "worktrees" \
      "Git submodules" "submodules" \
      "Git LFS" "lfs" \
      "Install/update gitbr as a user command" "install_gitbr" \
      "Show ignored-file rules for a path" "ignore" \
      "Run Git garbage collection" "gc" \
      "Show repository disk usage" "size" \
      "Back" "back"

    case "$MENU_RESULT" in
      health) repo_health_check ;;
      status) git status; pause ;;
      config) git config --list --show-origin; pause ;;
      worktrees) worktrees_menu ;;
      submodules) submodules_menu ;;
      lfs) git_lfs_menu ;;
      install_gitbr) install_gitbr_command ;;
      ignore)
        read -r -p "  File/path to check: " path
        [[ -n "$path" ]] && git check-ignore -v "$path" || true
        pause
        ;;
      gc)
        yes_no "Run safe Git maintenance (git gc)?" "Run maintenance" "Cancel" "yes"
        [[ "$MENU_RESULT" == "yes" ]] && git gc
        pause
        ;;
      size)
        printf "\n"
        du -sh "$GIT_DIR" 2>/dev/null || true
        git count-objects -vH
        pause
        ;;
      back) return ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# Quick recommended workflow
# -----------------------------------------------------------------------------

quick_flow() {
  while true; do
    app_header
    section "Quick workflow"
    printf "\n"
    printf "  This is the normal day-to-day flow:\n"
    printf "  review changes -> stage -> commit -> sync -> optionally create PR.\n"

    git status --short --branch
    printf "\n"

    if has_conflicts || [[ -n "$(repo_operation)" ]]; then
      warn "Resolve the active Git operation before the normal workflow."
      yes_no "Open the conflict/recovery helper?" "Open recovery helper" "Back" "yes"
      [[ "$MENU_RESULT" == "yes" ]] && conflicts_menu
      return
    fi

    if working_tree_dirty; then
      menu "You have changes. What should happen next?" \
        "Stage ALL changes and create a commit  [recommended]" "commit_all" \
        "Review/stage files manually" "working" \
        "Save changes for later" "stash" \
        "Back" "back"

      case "$MENU_RESULT" in
        commit_all)
          git add -A
          commit_staged
          ;;
        working)
          working_tree_menu
          ;;
        stash)
          stash_menu
          ;;
        back)
          return
          ;;
      esac
    else
      info "Working tree is clean."
    fi

    if ! working_tree_dirty; then
      yes_no "Synchronize this branch with its remote now?" "Safe sync" "Not now" "yes"
      [[ "$MENU_RESULT" == "yes" ]] && sync_current_safely
    fi

    if github_ready && [[ -n "$(current_branch)" ]]; then
      if gh pr view >/dev/null 2>&1; then
        info "A Pull Request already exists for this branch."
        menu "What do you want to do with its PR?" \
          "View Pull Request" "view" \
          "Check CI/status checks" "checks" \
          "Nothing right now" "none"
        case "$MENU_RESULT" in
          view) gh pr view --comments; pause ;;
          checks) gh pr checks; pause ;;
        esac
      else
        local def
        def="$(default_branch)"
        if [[ "$(current_branch)" != "$def" ]]; then
          yes_no "Create a Pull Request for this branch?" "Create PR" "Not now" "no"
          [[ "$MENU_RESULT" == "yes" ]] && create_pr_guided
        fi
      fi
    fi

    return
  done
}

# -----------------------------------------------------------------------------
# Main menu
# -----------------------------------------------------------------------------

main_menu() {
  while true; do
    app_header
    dashboard

    local recovery_label="Conflicts / recovery"
    [[ -n "$(repo_operation)" ]] && recovery_label="Conflicts / recovery  [ACTION NEEDED]"

    local github_label="GitHub"
    if github_ready; then
      github_label="GitHub: PRs, Issues, Actions, Releases"
    elif is_github_repo; then
      github_label="GitHub setup / features"
    else
      github_label="GitHub features (requires GitHub remote)"
    fi

    menu "What do you want to do?" \
      "Quick workflow  [recommended day-to-day]" "quick" \
      "Working tree / staging / diffs" "working" \
      "Commits" "commits" \
      "Sync / pull / push / fetch" "sync" \
      "Branches" "branches" \
      "Saved changes / stash" "stash" \
      "History / undo / recovery" "history" \
      "$recovery_label" "recovery" \
      "Tags / versions" "tags" \
      "Remotes" "remotes" \
      "$github_label" "github" \
      "Repository tools / health check" "tools" \
      "Exit" "exit"

    case "$MENU_RESULT" in
      quick) quick_flow ;;
      working) working_tree_menu ;;
      commits) commit_menu ;;
      sync) sync_menu ;;
      branches) branches_menu ;;
      stash) stash_menu ;;
      history) history_menu ;;
      recovery) conflicts_menu ;;
      tags) tags_menu ;;
      remotes) remotes_menu ;;
      github) github_menu ;;
      tools) repo_tools_menu ;;
      exit)
        clear_screen
        printf "%s%s%s%s closed.%s\n" "$BOLD" "$CYAN" "$APP_NAME" "$RESET" "$RESET"
        return
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# Command-line entry points
# -----------------------------------------------------------------------------

show_help() {
  cat <<EOF
gitbr v$VERSION

Interactive Git + GitHub repository control center.

Usage:
  gitbr
  gitbr --help
  gitbr --version
  gitbr --status

Normal use:
  Run 'gitbr' anywhere inside a Git repository and select what you want.

Main areas:
  - Quick guided workflow
  - Working tree and staging
  - Commits
  - Safe sync / pull / push / fetch
  - Branches
  - Stash
  - History and recovery
  - Conflict resolution
  - Tags
  - Remotes
  - GitHub Pull Requests
  - GitHub Issues
  - GitHub Actions / Workflows
  - GitHub Releases
  - GitHub Actions secrets and variables
  - GitHub Projects
  - GitHub Labels
  - Worktrees, submodules, Git LFS
  - Repository health and maintenance
  - Self-install/update as ~/.local/bin/gitbr

GitHub features use the official GitHub CLI ('gh'). gitbr can guide installation
on common package managers and can start 'gh auth login' for you.
EOF
}

trap 'printf "\n"; warn "Interrupted. Git changes were not intentionally discarded."; exit 130' INT TERM

case "${1:-}" in
  -h|--help)
    show_help
    exit 0
    ;;
  -v|--version)
    printf '%s\n' "$VERSION"
    exit 0
    ;;
esac

require_git
require_repo
DEFAULT_REMOTE="$(default_remote)"

case "${1:-}" in
  --status)
    app_header
    dashboard
    git status
    exit 0
    ;;
  "")
    main_menu
    ;;
  *)
    fail "Unknown option: $1"
    printf "\n"
    show_help
    exit 2
    ;;
esac

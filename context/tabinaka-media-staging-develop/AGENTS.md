# Git Workflow & Commit Message Convention

## Purpose

- Maintain consistent history across the team and clarify the reasons for changes.
- Based on [Conventional Commits](https://www.conventionalcommits.org/), optimized for AI/prompt-driven development processes.
- Always include the original prompt in commit messages to enable tracking of decision-making context.

## Branch Naming

- `feature/<ticket-number>-<short-description>`: New features or major improvements.
- `fix/<ticket-number>-<short-description>`: Bug fixes.
- `chore/<short-description>`: Refactoring, dependency updates, and other maintenance tasks.

## Pre-Commit Checks

- Always run `npm run lint` and `npm test` and confirm success.
- If additional manual testing is required, briefly record the results in the commit body.
- Verify that there are no uncommitted tasks or pending refreshes, and ensure one commit = one logical change.

## Commit Message Format

### 1. Header

- `type(scope?): subject`
  - `type`: feat / fix / docs / style / refactor / test / chore
  - `scope`: Optional. Briefly specify module or directory name.
  - `subject`: Imperative mood, 50 characters or less. Clearly indicate intent.

### 2. Original Prompt (Required)

- Add a blank line after the header, then add a `Prompt:` line.
- Quote the entire original prompt used without modification. For multi-line prompts, use a quote block with `>` prefix for each line.
- Example:

```text
feat(auth): add passwordless login

Prompt:
> feat(auth): add passwordless login
> - I want to enable login using magic link
```

### 3. Changes Section (Recommended)

- After the `Prompt:` section, add a blank line and a `Changes:` section.
- List the implemented changes as bullet points, focusing on what was actually done.
- Use clear, concise descriptions of the changes.
- Example:

```text
feat(quiz): improve QuizResultModal responsive design and sizing

Prompt:
> Quizresultmodalについて、レスポンシブ対応をお願いします。
> モニターの小さいパソコンだと、写真と説明が横並びになり、下が見切れます。下が見切れないようにしてください。

Changes:
- Added responsive design for mobile and desktop views
- Fixed modal to prevent content from being cut off on small screens
- Made photo area shrink responsively instead of scrolling
- Reduced modal size and adjusted aspect ratio (16:10.9)
- Set photo to description ratio to 1:1.2
- Increased text sizes in description section for better readability
- Optimized padding, gaps, and button sizes for compact display
```

### 4. Body and Footer

- If there are additional notes such as reasons for changes or test results, add them below `Changes:`.
- Related tickets and issues should follow Conventional Commits conventions, with a blank line before the footer, explicitly marked as `Closes #123`.
- Wrap commit body text at 72 characters.

## Commit Frequency and Granularity

- Split changes with different meanings into separate branches or commits.
- Commits should explain "why it's necessary," briefly conveying not just the changes but also their effects and risks.
- Address blocking review comments with fix commits to keep history clear.

## Pull Request Policy

- Title should follow `<type>(<scope>): <subject>` format.
- Verify that all commits include original prompts before creating a PR.
- Link related issues/tickets using `Closes #123` format.
- Document that lint, tests, and necessary builds pass using screenshots or logs.
- Request review from at least one person, and address review comments with follow-up commits.

## Automation and Guardrails

- Introduce custom rules using `commitlint` etc. to validate Conventional Commits header format and the presence of the `Prompt:` section.
- Automate lint/test execution and incomplete TODO detection with pre-commit hooks.
- When generating messages with AI, retry or manually correct until the output satisfies this convention.
-

## Agency

- think in english
- report in japanese
- Focus only on essential and necessary work
- Avoid conflicts and actively perform refactoring
- 勝手にプッシュしないこと

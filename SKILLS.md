# Critical Notes

> These are standing conventions for any AI assistant (or human contributor) working in this codebase. Follow them by default; only deviate with a clear reason stated in a comment or PR description.

## General Principles
- Readability and maintainability always beat cleverness or brevity — optimize for the next person reading the code, not for fewer keystrokes.
- Prefer small, single-purpose functions/methods over large ones that do several things.
- Fail loudly and early: validate inputs, raise/throw meaningful errors, never swallow exceptions silently.
- Every non-trivial change should be accompanied by tests (unit at minimum, integration where it touches multiple components).
- Keep commits atomic and messages descriptive (what changed and why, not just what).
- No dead code, no commented-out blocks left behind, no leftover debug prints/console.logs in committed code.
- Prefer explicit over implicit: avoid hidden side effects, global mutable state, and "magic" behavior that isn't obvious from the call site.

---

## Backend Skills
- Make sure the code is readable; prioritize maintainability over conciseness.
- Make the code modular, testable, and easy to maintain (small functions, single responsibility, dependency injection over hardcoded dependencies).
- Follow a hierarchical design from high-level abstractions down to lower-level concretions — don't mix abstraction levels within the same method.
- Add comments whenever a method is critical, needs special handling, or has a unique/non-obvious implementation.
- Make sure the `.env` file is always updated and always listed in `.gitignore`, alongside any other secrets/config files (keys, credentials, certificates).
- Use the same naming conventions for methods and variables as the rest of the codebase (snake_case).
- **Error handling**: use consistent, centralized error handling (e.g. a single exception-handling middleware/decorator) rather than ad-hoc try/catch scattered everywhere; return structured, predictable error responses.
- **Input validation**: validate and sanitize all external input (request bodies, query params, env vars) at the boundary, not deep inside business logic.
- **Logging**: use structured logging with appropriate levels (debug/info/warn/error); never log secrets, tokens, or PII.
- **Configuration**: no hardcoded config values (URLs, ports, limits, feature flags) — pull from environment/config files, with sane defaults documented.
- **Database/data access**: isolate data-access logic behind a repository/DAO layer; avoid raw queries scattered through business logic; use migrations for schema changes, never manual schema edits.
- **API design**: keep endpoints consistent (naming, versioning, status codes, response shape); document endpoints (OpenAPI/Swagger or equivalent) as they're added or changed.
- **Security**: never trust client input; use parameterized queries (no string-concatenated SQL); hash/salt passwords properly; apply least-privilege to credentials and service accounts.
- **Concurrency/performance**: be explicit about thread-safety assumptions; avoid premature optimization, but flag obvious N+1 queries or blocking calls in async contexts.
- **Testing**: unit test business logic in isolation (mock external calls); add integration tests for critical flows (auth, payments, data writes).

## Frontend Skills
- Make sure the code is readable; prioritize maintainability over conciseness.
- Don't use magic values — if a value is repeated multiple times (colors, font sizes, spacing, breakpoints, timeouts), extract it into a named constant/variable/theme token and reuse it.
- Add comments whenever a method is critical, needs special handling, or has a unique/non-obvious implementation.
- Use the same naming conventions for methods and variables as the rest of the codebase.
- **Component design**: keep components small and focused (presentational vs. container/logic separation); avoid deeply nested prop-drilling — use context/state management where appropriate.
- **State management**: keep state as close to where it's used as possible; lift state up only when genuinely shared; avoid duplicating server state in local state (use a data-fetching/cache layer instead of ad-hoc `useEffect` fetches where possible).
- **Styling**: centralize design tokens (colors, spacing, typography) in one theme/config file rather than repeating literals across components.
- **Accessibility**: use semantic HTML, proper ARIA attributes where needed, keyboard navigability, and sufficient color contrast.
- **Error/loading states**: every async UI (data fetch, form submit) should explicitly handle loading, empty, and error states — never leave a silent blank screen.
- **Forms/validation**: validate on both client and server; show clear, specific error messages tied to the offending field.
- **Performance**: avoid unnecessary re-renders (memoization where it matters, stable keys in lists); lazy-load routes/heavy components where reasonable.
- **Testing**: unit test pure logic/hooks; add component tests for critical user flows; avoid testing implementation details (test behavior, not internals).

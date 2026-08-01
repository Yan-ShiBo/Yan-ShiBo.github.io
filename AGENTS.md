# Repository Rules

These rules apply to every automated or human-assisted change in this repository.

## 1. Scope and authority

- Treat the current files and runtime behavior as the source of truth; use project documentation to explain them, not override them.
- Make only the change the user authorized. Ask before choosing among meaningful alternatives, renaming or deleting beyond the approved map, changing personal content, publishing, or rewriting Git history.
- Preserve unrelated and pre-existing worktree changes. Never use destructive cleanup to obtain a clean status.
- Do not stage, commit, push, open a pull request, deploy, or contact an external party unless the user explicitly authorizes that action.

## 2. Documentation routing

Read only the documents required for the task:

| Task | Required source |
| --- | --- |
| Project orientation | `README.md`, `docs/README.md` |
| Page inventory, runtime, SEO, privacy | `docs/architecture.md` |
| CSS, components, responsive behavior, content style | `docs/design.md` |
| Tests and acceptance evidence | `docs/testing.md` |
| Preview, sitemap, release, rollback, cache | `docs/operations.md` |
| Known deviations and regression history | `docs/maintenance.md` |

Do not copy a contract into multiple documents. Update its single source and link to it elsewhere.

## 3. Personal-content boundary

- Personal pages, resume pages, proof images, transcripts, contact details, awards, research descriptions, and downloadable materials require explicit content authorization before modification.
- Keep `resume.html` and `en/resume.html` compact. Do not add minor awards, new research sections, or detailed history unless the user explicitly requests it.
- When the user asks to add an honor, award, or experience without mentioning the resume, default to the detailed profile only after confirming the intended public content.
- Never commit unpublished research materials, private source data, review materials, or unapproved personal files.
- The repository and every file published by GitHub Pages are public even when not linked from site navigation.

## 4. Site invariants

- The site contains 14 HTML files: 7 Chinese and 7 English.
- Twelve ordinary pages are indexable; two 404 pages are explicit SEO exceptions.
- Shared behavior belongs in `assets/css/site.css` and `assets/js/site.js`.
- `assets/js/stats.js` is limited to the Chinese and English analytics pages.
- The brand mark is `assets/icons/brand-mark.png`, not a Font Awesome terminal glyph.
- Mobile navigation applies through 833px; desktop navigation starts at 834px.
- Bilingual pages must preserve equivalent purpose, navigation, resources, and SEO mapping, but existing DOM structures are not assumed to be identical.

Detailed contracts belong in `docs/architecture.md` and `docs/design.md`.

## 5. Editing rules

- Use small, reviewable edits. Do not use broad regular-expression rewrites on nested HTML.
- Match existing indentation, quoting, attribute order, and component patterns.
- Prefer shared tokens and components over inline styles or page-specific duplication.
- Keep local path casing identical to disk.
- Update both language routes when a shared navigation, page inventory, resource, or SEO contract changes.
- A page add/delete/rename must synchronize both maintenance scripts, sitemap, tests, and architecture inventory.
- A documentation-only change must not regenerate sitemap or touch HTML/CSS/JS unless the user separately authorizes it.

## 6. Git safety

- Read `git status --short` and the relevant diff before and after editing.
- Never discard changes you did not create.
- Avoid catch-all staging; name the intended files explicitly.
- Do not use `git reset --hard`, `git checkout .`, or equivalent destructive commands without direct authorization.
- Force-push and history rewriting require an explicit ref audit, protected worktree changes, an exact lease, and separate user authorization.

## 7. Verification

After any modification, run the applicable checks from `docs/testing.md`; its “最小验证入口” is the repository baseline. Report actual output, manual checks, skipped checks, and known deviations. Never claim success from stale or partial evidence.

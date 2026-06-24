# Agent Rules for Yan-ShiBo.github.io

- **Resume Boundries**: Do NOT update the online resume files (`resume.html` and `en/resume.html`) with minor awards or new sections (like Academic Research) unless the user explicitly requests it. These pages should remain compact and highlight only the most critical information (e.g., the 2nd prize in the Huawei Cup). Always default to updating the detailed profile files (`profile.html` and `en/profile.html`) only when the user asks to add new honors, awards, or research experiences, unless instructed otherwise.

- **Mandatory Pre-flight Documentation Check**: Before answering ANY questions, making ANY design decisions, or modifying ANY code in this project, you MUST first read the onboarding and design documents located in the `docs` directory (e.g., `docs/onboarding.md` and the `docs/design/` folder). This is critical to understand the architecture, design guidelines, and historical context to avoid breaking existing features (like the CSS Masonry grid or bilingual structure).

- **Mandatory Post-modification Testing**: After modifying any code, you MUST run the validation tests exactly as specified in the project's testing documentation (e.g., `docs/design/testing.md` or `docs/onboarding.md`). Never assume your changes work without explicitly running these checks (like `node --check` scripts and `git diff --check`).

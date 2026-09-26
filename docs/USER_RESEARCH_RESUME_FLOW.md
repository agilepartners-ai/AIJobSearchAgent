# User research: the AI résumé → Resume Studio flow

> **What this is, and is not.** No participants were interviewed for this. It is a
> *desk synthesis*: a cognitive walkthrough of the live flow, reading it the way a
> job seeker would, plus the direct feedback you gave while using it. Treat the
> findings as well-grounded hypotheses. Section 6 is the plan to confirm them with
> real people.

## 1. Who and what

**Primary user:** an active job seeker tailoring one base résumé to several
postings a week. Often on a laptop, often mid-application with the job page open
in another tab. Not a designer, not a LaTeX user.

**Jobs to be done** (in the order they occur):

1. *"Make my résumé fit **this** job"* — without me having to rewrite it.
2. *"Let me see it, and trust it"* — is it still true? Did it invent anything?
3. *"Make it look right"* — pick a design, fix a line, keep it to a page.
4. *"Get it out"* — a PDF for the application, plus the cover letter.
5. *"Do it again for the next job"* — quickly, from the same base résumé.

## 2. Journey and where it broke

| Stage | What the user is thinking | What the product did | Verdict |
|---|---|---|---|
| Start | "Upload my résumé, paste the job" | Re-upload a PDF for every job | Friction on every repeat |
| Wait (10–30 s) | "Is it working?" | Progress overlay with tips | Fine |
| **Result** | "Show me **my résumé**" | Switched to an old results page, *then* (sometimes) to the Studio | **Broken.** Two screens, unpredictable which one wins |
| Choose design | "How will **mine** look?" | Sample content in the gallery | Weak: judging a design on someone else's résumé |
| Edit | "Change this line" | Separate editor | OK once there |
| Cover letter | "And the letter that goes with it" | Buried on the old results page | Split from the résumé it belongs to |
| Match score | "Why 68%? What do I fix?" | On the old results page, apart from the document | Advice far from the thing it is about |
| Failure | "I lost it" | A storage or compile outage threw the whole result away | **Worst outcome for the user** |

## 3. Findings

1. **The thing I just made is the thing I edit.** Every screen change between
   "generated" and "editing" is a chance to feel lost. Your own words —
   *"it just switches stupidly"* — are this finding. The requirement is one
   destination, reached once.
2. **People choose templates by their own content.** A design looks different on
   a two-page career than on a sample. Previews must use the user's résumé.
3. **The résumé and cover letter are one deliverable.** They should sit side by
   side, one click apart, under the same job.
4. **Feedback belongs next to what it is about.** The match score, gaps and
   keywords are decisions about *this* document; they should not be a page away.
5. **A finished generation must never be lost.** Users spent a wait and a daily
   allowance on it. Infrastructure failures must degrade (no saved link), not
   destroy.
6. **Trust is the make-or-break.** The biggest fear is invented experience. The
   product must visibly stay within the source (see the prompt's no-invention
   rules) and never surface junk. *(This is why the phantom "Experience" section
   from the preamble was a real bug, not a cosmetic one.)*
7. **Repeat use is the normal case.** Weekly, for several jobs, from one base
   résumé. Re-uploading and starting from a blank Studio each time is the
   biggest avoidable cost.
8. **Legibility in the user's theme.** Half-light screens in dark mode read as
   "broken", regardless of function.

## 4. Requirements → what was built

| # | Requirement | Implementation |
|---|---|---|
| R1 | One destination after generation; no intermediate screen | The **server** saves the Studio résumé before answering and returns its id; the client opens it directly. The old results page shows only if that save fails, with a message saying why |
| R2 | Land on the decision that matters | Fresh résumés open on **Design** with a "Ready for {job} at {company} · {score}% match" banner |
| R3 | Choose a design on my own content | Template gallery of **live thumbnails of the user's résumé** in all 12 designs, in the editor; one click re-flows the page |
| R4 | Résumé + cover letter together | A **Résumé ⇄ Cover letter** switch above the preview, with the cover letter's PDF, source, recompile and Overleaf actions |
| R5 | Advice beside the document | A **Match** tab: score, strengths, gaps, suggestions, matched/missing keywords |
| R6 | Never lose a generation | Storage capped at 20 s; a compile-service outage returns the LaTeX without PDFs; the Studio renders the résumé itself. A genuinely bad document (422) still fails |
| R7 | Never show junk | Importer reads only the document body and strips comments; regression-tested on a real built document |
| R8 | Fast repeats | "Tailor a résumé from your Studio" chips in the AI dialog (no re-upload); Duplicate on résumé cards; per-account memory of every résumé and job |
| R9 | Readable in dark mode | `darkMode: 'media'` plus zero-specificity fallbacks so component styles win |

## 5. Not done, and why

- **The cover letter does not restyle with the template.** It is still the fixed
  cover-letter LaTeX. Doing it properly means a structured cover-letter model and
  a serializer sharing the résumé's tokens — a feature of its own.
- **No Regenerate button in the Studio.** The source text is not stored with the
  résumé. Regenerating means running the AI dialog again (chips make that quick).
- **The application row keeps the first PDF link.** After restyling, that link is
  the original design. Re-uploading a PDF on every save would need its own design.

## 6. Validating this with real people

**Method:** 5 moderated task sessions (5 is enough to surface the dominant
problems; it does not measure rates). Recruit active job seekers, ideally two who
apply to 5+ jobs a week.

**Tasks** (no instructions given):

1. "Here is a job posting and your résumé. Get a version ready to send."
2. "Make it look the way you would actually send it."
3. "Now get the cover letter."
4. "You have another job tomorrow — start it."

**Watch for:** hesitation after generation; whether they look for the cover
letter; whether they compare templates or take the first; whether they check the
content for invented claims (and what they do when unsure); where they go for the
PDF.

**Questions:** "What did you expect to see when it finished?" · "What would you
have to check before sending this?" · "What would make you not trust it?"

**Measures:** time from "Generate" to first edit or download; template changes
before first download; percentage who find the cover letter unaided; number of
factual corrections made; and one confidence rating (1–5) that "this is safe to
send".

**Instrument to add first:** log `generation_completed → studio_opened`,
`template_changed`, `cover_viewed`, `pdf_downloaded` so the same questions can be
answered from real usage.

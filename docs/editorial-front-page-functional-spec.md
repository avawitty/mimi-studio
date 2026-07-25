# Editorial Front Page — Functional Specification

Status: proposed product specification  
Surface: `/editorial-home`  
Primary implementation file: `components/EditorialFrontPage.tsx`

## Product restatement

The Front Page should be Mimi's public publishing and discovery surface.

It should help a visitor:

1. understand what Mimi publishes;
2. open a real essay, briefing, or public zine;
3. discover the creator behind it;
4. subscribe without being forced to create an account;
5. create a profile, submit work, or continue a published idea in Mimi when they are ready.

The Front Page is not the publishing console. The Press remains the place where an editor reviews, schedules, and publishes. The Front Page reads only approved, published records.

## Current-state truth

| Area | Current behavior | Product state |
| --- | --- | --- |
| Essays and briefings | Three local objects inside `EditorialFrontPage.tsx`; titles expand inline | Visual prototype only |
| Save | Local React state and a success alert | Not persisted |
| Contributors | Three hardcoded fictional people | Visual prototype only |
| Newsletter | Clears the input, emits a success alert, and opens the identity gateway | No subscriber or provider integration |
| Canonical Gateway | Opens the existing gateway modal | Reachable, but its value and next state are unclear |
| Public profiles and zines | Supporting services already exist in `publicShowcaseService.ts` | Reusable foundation |

The current “CAN-SPAM fully aligned” claim must be removed until consent, unsubscribe, suppression, and delivery behavior are implemented and verified.

## Primary user flow

### Visitor

As a visitor, I want to see current work and who made it, so I can decide whether Mimi is worth reading or joining.

1. Land on the current issue or latest editorial collection.
2. Open a featured essay, briefing, or public zine.
3. See author, publication date, reading time, tags, access status, and provenance.
4. Continue to the author's public profile or another related piece.
5. Subscribe to the weekly briefing or create a Mimi identity as separate choices.

### Contributor

As a contributor, I want an approved piece to connect to my public profile, so publication builds a durable body of work.

1. Create or select a zine, briefing, or essay.
2. Submit it from The Press.
3. Review the public preview, author attribution, Used Context, rights, cover, and metadata.
4. Submit for editorial review.
5. Receive `changes_requested`, `scheduled`, or `published` status.
6. When published, the piece appears on the Front Page and the contributor profile.

### Editor

As an editor, I want a controlled publishing queue, so only complete and attributable work reaches the public page.

1. Open The Press editorial queue.
2. Review content, cover, author, rights, Used Context, SEO metadata, and access level.
3. Feature, schedule, publish, return for changes, or archive.
4. Publishing writes an immutable release snapshot and updates the Front Page query.
5. Optionally include the release in a newsletter edition.

## 1. Essays and briefings

### Content model

Add an `editorial_entries` collection with:

- `id`
- `type`: `essay | briefing | curation | zine`
- `title`, `slug`, `dek`
- `body` or structured content blocks
- `coverImage`
- `authorUid`, `contributorHandle`, `byline`
- `tags`, `issueId`, `relatedEntryIds`
- `sourceZineId` when promoted from a zine
- `status`: `draft | in_review | changes_requested | scheduled | published | archived`
- `access`: `public | members`
- `isFeatured`, `featuredOrder`
- `scheduledAt`, `publishedAt`, `updatedAt`
- `seoTitle`, `seoDescription`, `canonicalUrl`
- `usedContextSnapshots` and a sanitized public provenance summary
- `rightsStatus` and `editorialApproval`

### Publishing behavior

- The Press owns create, review, schedule, and publish actions.
- The Front Page queries only `status == published`.
- Results order by featured placement, then `publishedAt`.
- Load an initial page and paginate rather than loading the entire archive.
- Selecting a card opens `/editorial/:slug` or the existing `/zine/:id` route.
- “Save” requires identity and persists a reference to Pocket; guests can still read public items.
- Related work should use `relatedEntryIds` and allow a reader to continue the thread into another zine.

### Acceptance criteria

- A hardcoded essay cannot appear in production.
- A scheduled entry does not appear before `scheduledAt`.
- Unpublishing removes the entry from public queries without deleting its release history.
- Every public item resolves to a real author/profile or an explicitly labeled Mimi editorial account.
- The visible item count comes from the query result, not a constant.

## 2. Contributor profiles

Replace the fictional Contributor Dial with an opt-in “Featured Contributors” module backed by existing public profile and public-zine services.

Each card should show:

- avatar;
- display name and `@handle`;
- short editorial bio;
- selected practice/taste tags;
- number of published contributions;
- most recent published piece;
- link to `/u/:handle`.

Recommended eligibility fields:

- `publicShowcase.enabled`
- `contributorStatus`: `none | applicant | approved | suspended`
- `featuredContributor`
- `featuredAt`
- `editorialBio`
- `editorialRoles`

As a user, I control whether my profile is public. As an editor, I control whether it is featured. Email, private archive contents, and unpublished work never appear on the card.

## 3. Newsletter

### Product definition

Rename the visible offer to a plain promise such as **The Mimi Weekly Brief**. The card should state:

- cadence;
- what arrives;
- a link to the public newsletter archive;
- whether membership content is included;
- a real privacy and unsubscribe note.

Newsletter signup and Mimi identity creation are separate flows. A successful subscription must not automatically open the Gateway.

### Technical flow

1. Client posts email, consent, source, and optional topic tags to `/api/newsletter/subscribe`.
2. Server validates and normalizes the email, applies rate limiting, and creates an idempotent subscription record.
3. A provider adapter creates or updates the subscriber.
4. Double opt-in is sent where configured.
5. Provider webhooks update `pending`, `active`, `unsubscribed`, `bounced`, or `complained`.
6. The UI shows a truthful result and never claims active status before provider confirmation.

Store:

- normalized email or its protected equivalent;
- consent timestamp and policy version;
- acquisition source;
- status;
- provider subscriber ID;
- segments/tags;
- unsubscribe, bounce, and complaint timestamps.

Use a provider-agnostic adapter so Mimi can start with a small editorial provider and change later. Choose the provider before implementation based on whether Mimi needs only email delivery or also a hosted newsletter archive, segmentation, referrals, and automations.

## 4. Canonical Gateway

### Product purpose

Restate the Gateway as **Create your Mimi identity**. Its purpose is to let a user:

- save work to Pocket;
- maintain a public contributor profile;
- submit work for publication;
- keep private projects synchronized;
- manage membership if they deliberately choose a paid tier.

Do not combine authentication, newsletter signup, and paid membership into one implicit action.

### State-aware CTA

| User state | Card title | Primary action |
| --- | --- | --- |
| Guest | Create your Mimi identity | Create account |
| Returning guest | Continue in Mimi | Sign in |
| Signed in, profile incomplete | Make your work discoverable | Finish profile |
| Profile ready | Your public Mimi profile | View profile |
| Eligible contributor | Publish with Mimi | Submit work |
| Paid member | Membership active | Manage membership |

The card should explain one immediate benefit in plain language. “Sovereign node,” “vault,” and similar vocabulary can remain as secondary texture, not the primary instruction.

## Front Page information architecture

Recommended order:

1. Current issue / editorial promise
2. Featured story
3. Latest essays and briefings
4. Featured contributors
5. Newsletter signup and archive link
6. Continue in Mimi: save, submit, or create a profile
7. Previous issues and related continuations

Add filters only when enough real content exists: `Latest`, `Essays`, `Briefings`, `Curations`, and `Issues`.

## Implementation sequence

### Release 1 — Make publication real

- Add `editorial_entries` and server-side published queries.
- Connect The Press review/publish flow.
- Replace hardcoded cards with published records.
- Open real article/zine routes.
- Add loading, empty, and error states.

### Release 2 — Make identity useful

- Replace contributor mocks with opted-in public profiles.
- Link author cards and bylines to `/u/:handle`.
- Persist Save to Pocket for signed-in users.
- Make Gateway copy and CTA state-aware.

### Release 3 — Make the audience loop real

- Select a newsletter provider.
- Add subscribe endpoint, consent, double opt-in, webhooks, unsubscribe, and archive.
- Add editorial selection of entries for each newsletter edition.
- Measure view → read → profile → subscribe → submit conversions.

## Guardrails

- Public content remains readable without account creation unless explicitly marked members-only.
- Publishing requires an editor role and creates an audit record.
- AI may help shape metadata or drafts, but deterministic application code owns status, permissions, scheduling, persistence, and access.
- Public provenance must be useful without exposing private source material.
- No invented compliance, membership, delivery, or profile status may be shown.

## Decisions needed before build

1. Are essays first-class editorial records, published zines, or both?
2. Who can publish immediately, and who must enter editorial review?
3. Which content remains public versus members-only?
4. Does the newsletter need a hosted archive and referral system, or only delivery?
5. Should every approved public profile be discoverable, with a smaller editor-curated featured set?


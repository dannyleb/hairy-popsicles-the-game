# itch.io page: draft

Everything here is a draft to paste into itch and edit in your own voice.
Images are in this folder: `cover.jpg` (630x500 at 2x) and `shot-*.jpg`.

---

## 1. Create the project (itch.io → Dashboard → Create new project)

| Field | Value |
|---|---|
| Title | Hairy Popsicles |
| Project URL | `hairy-popsicles` (whatever you pick becomes the second half of ITCH_TARGET) |
| Short description / tagline | A gross, hand-drawn pimple-popping game. Feed Toad, pop everything, collect the weirdos. (Search reads this line, so the key words are in it.) |
| Classification | Games |
| Kind of project | HTML (you have a ZIP or HTML file that will be played in the browser) |
| Release status | In development (switch to Released when you're happy) |
| Pricing | **No payments** for launch. A first-time seller's page (paid or donations) waits days in a manual review queue before it's indexed; a free page skips it. |

### Uploads
- Upload `hairy-popsicles-web.zip` (make it with `npm run itch`) and tick
  **This file will be played in the browser**. Once automatic uploads are
  set up (section 3) you don't need to do this by hand again.

### Embed options
| Option | Value |
|---|---|
| Embed in page | Manually set size: **960 x 600** (the title screen fits exactly) |
| Mobile friendly | **On**, orientation **Default** (it plays in portrait and landscape) |
| Automatically start on page load | **Off** (the "Run game" click lets music start) |
| Fullscreen button | **On** |
| Enable scrollbars | Off |

### Details
| Field | Value |
|---|---|
| Genre | Adventure |
| Tags (up to 10) | `hand-drawn`, `surreal`, `funny`, `gross`, `cute`, `2d`, `short`, `casual`, `exploration`, `collecting`. Pick the autocomplete suggestion where one appears (itch prefers its suggested tags). No synonyms, no game name, nothing the Metadata tab already covers. |
| AI generation disclosure | Answer honestly: art hand-drawn (no), music Suno (yes), code AI-assisted. itch's guidelines also ask for it in the description, so the description says it too. |
| App store links / community | Comments: on |
| Visibility | Draft until you've checked it, then Public |

### Metadata tab (fill every field that's true; each one is another browse page)
| Field | Value |
|---|---|
| Platforms | **HTML5 only**. Don't tick Windows/Mac/Linux. |
| Made with | JavaScript (and HTML5 / Canvas if offered) |
| Inputs | Keyboard, Mouse, Touchscreen |
| Accessibility | Interactive tutorial (the tips). Only tick what's true. |
| Average session | A few minutes |
| Languages | English |
| Multiplayer | None (leave blank) |
| Classification | **Not** adult content. It's gross, not explicit; marking it NSFW hides it from everyone logged out. |

### Cover and screenshots
- Cover image: `cover.jpg`
- Screenshots, in this order: `shot-1-day.jpg`, `shot-2-wart.jpg`,
  `shot-3-night.jpg`, `shot-4-album.jpg`, `shot-5-phone.jpg`

### Trailer
- itch doesn't host video: upload `trailer.mp4` to YouTube (or Vimeo) and
  paste the link into **Gameplay video or trailer**.
- `trailer-pop.gif` (2 MB loop) can go first in the screenshots.
- YouTube thumbnail: `youtube-thumb.jpg` (1920x1080).
- Neither file is in the repo (too big); they're rendered locally.

---

## 2. Description (paste into the Description box)

> **Toad is hungry. He's always hungry.**
>
> Hairy Popsicles is a small, gross, hand-drawn garden made entirely of skin.
> Everyone who lives here is a head on a stick, a self-portrait with a
> problem, and they all want something from you.
>
> **Feed Toad.** Stuff your pockets with crumbs, curly hairs, flies, toenail
> clippings and the occasional pile of mouse droppings, then throw it all in
> his mouth. Fill him up and the hair walls wither away, opening new ground.
>
> **Pop everything.** The floor is covered in swollen pimples. Squeeze them,
> slurp up the pus, and spend it on bigger pockets, a pus magnet and things
> to wear. Chain pops for combos. Look out for golden whiteheads, curios
> hidden in the pus, and, very rarely, a giant wart that takes a lot of
> slapping.
>
> **Collect the album.** Every character has a card in your Self-Portrait
> Album, with the original pencil drawing. Do the gross little thing each
> one wants to earn it. Some only come out at night.
>
> Plays in your browser, on desktop or phone. Your progress saves on your
> device.
>
> **Controls**
> - Desktop: WASD / arrows to walk (or click where to go), Shift to run,
>   Space to slap, E to feed / grab / talk, Q to water, Esc for the menu.
> - Phone: hold anywhere to walk toward your thumb; tap things to use them.
>
> All art is hand-drawn by me. The code was written with an AI assistant
> and the music was made with Suno.
>
> Illustrations © 2026 Danny LeBlanc · @HarryPopsicles

---

## 3. Automatic uploads from GitHub (one time)

After the project exists on itch:

1. itch.io → Settings → **API keys** → Generate new API key. Copy it.
2. GitHub → the `hairy-popsicles-the-game` repo → Settings →
   **Secrets and variables → Actions**:
   - **Secrets** tab → New repository secret: name `BUTLER_API_KEY`,
     value = the key.
   - **Variables** tab → New repository variable: name `ITCH_TARGET`,
     value = `<your itch username>/<project url>`, for example
     `dannyleb/hairy-popsicles`.
3. Push anything to `main` (or run the workflow by hand from the Actions
   tab). The new **itch** job uploads the build to the `html5` channel, and
   itch replaces the playable version automatically.

Until `ITCH_TARGET` is set, that job is skipped, so nothing breaks.

---

## Getting indexed (from itch's "Getting indexed" and quality guidelines)

**Baseline (all must be true or it never shows in search/browse):**
public, no "Unlisted"/"Disable downloads" access setting, cover image,
playable in browser. All covered by the steps above.

**Publish once, when it's finished.** The first time it goes Public it lands
at the top of Most Recent, and that never happens again. So do this order:
1. Build the whole page as a **Draft**: files, cover, screenshots, GIF,
   trailer link, description, tags, Metadata tab, AI disclosure.
2. Check it in the draft preview on desktop and phone.
3. Flip to **Public**.
4. Same day: post the link everywhere you have an audience
   (@HarryPopsicles etc.). Real visits and plays are what lift it on
   browse; "Most Recent" alone gets buried in hours.
5. After about an hour, search the full title "Hairy Popsicles" on itch.
   If it shows, it's indexed. If not after a day, contact itch support.

**After launch:**
- Post a **devlog** for each real update (they go out in email digests and
  are indexed on their own). Don't delete and re-create the page for a
  "boost"; that gets pages delisted.
- Ask players to **follow** you and add it to **collections**.
- Never re-publish to chase Most Recent; itch won't move the date.

**What search actually reads:** title, URL, your name, and the short
description. Body text and tags are not search terms; tags only drive the
browse pages.

---

## Things to know
- **Saves are per site.** Progress on itch and on GitHub Pages are separate.
- **Music and money.** The soundtrack was made with Suno. If you turn on
  payments or donations, check that your Suno plan covers commercial use
  (the free plan doesn't). Free with no donations is fine.
- **Share card.** In itch's frame the "Save / Share" button downloads the
  image (tested); the phone share sheet may not open inside the frame.

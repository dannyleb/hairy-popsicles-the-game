# itch.io page: draft

Everything here is a draft to paste into itch and edit in your own voice.
Images are in this folder: `cover.jpg` (630x500 at 2x) and `shot-*.jpg`.

---

## 1. Create the project (itch.io → Dashboard → Create new project)

| Field | Value |
|---|---|
| Title | Hairy Popsicles |
| Project URL | `hairy-popsicles` (whatever you pick becomes the second half of ITCH_TARGET) |
| Short description / tagline | A gross little garden of hand-drawn heads on sticks. Feed Toad. Pop everything. |
| Classification | Games |
| Kind of project | HTML (you have a ZIP or HTML file that will be played in the browser) |
| Release status | In development (switch to Released when you're happy) |
| Pricing | No payments (or "Donations" / name your price; see the music note below) |

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
| Genre | Adventure (or Other) |
| Tags (up to 10) | `gross`, `surreal`, `hand-drawn`, `2d`, `cute`, `weird`, `short`, `collecting`, `exploration`, `casual` |
| AI generation disclosure | itch asks about AI-generated content. The art is yours and hand-drawn; the code was written with an AI assistant, and the music was made with Suno. Answer it honestly. |
| App store links / community | Comments: on |
| Visibility | Draft until you've checked it, then Public |

### Cover and screenshots
- Cover image: `cover.jpg`
- Screenshots, in this order: `shot-1-day.jpg`, `shot-2-wart.jpg`,
  `shot-3-night.jpg`, `shot-4-album.jpg`, `shot-5-phone.jpg`

### Trailer
- itch doesn't host video: upload `trailer.mp4` to YouTube (or Vimeo) and
  paste the link into **Gameplay video or trailer**.
- `trailer-pop.gif` (2 MB loop) can go first in the screenshots.
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

## Things to know
- **Saves are per site.** Progress on itch and on GitHub Pages are separate.
- **Music and money.** The soundtrack was made with Suno. If you turn on
  payments or donations, check that your Suno plan covers commercial use
  (the free plan doesn't). Free with no donations is fine.
- **Share card.** In itch's frame the "Save / Share" button downloads the
  image (tested); the phone share sheet may not open inside the frame.

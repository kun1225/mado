# Mado brand direction

The feeling, type, color and logo for the Mado brand.

## The story

Mado (窓) means "window". A window frames a view and leaves the rest out. Mado helps brand designers collect what they see and frame it into a direction a client can say yes to.

## Mood (decided 2026-10-27)

**Gallery glass: poised and calm, with a little humanity.** A mix of two moodboards:

- **Through Glass:** frosted glass and layers. Things start blurry and come into focus, the way a brand direction appears from many references.
- **The Gallery:** white walls and one window that frames the view like a painting.

Why the mix: Glass alone felt too calm and cold. Gallery alone felt too warm and luxury. Together they are calm and exact, and small human details keep them friendly: soft corners, kind copy, and the folder colors used as small moments.

Photo references (Wikimedia Commons, open licenses):

- [Kunsthaus Bregenz, frosted glass](https://commons.wikimedia.org/wiki/File:Bregenz_kunsthaus_zumthor_2002_02.jpg) (CC BY-SA 3.0)
- [21st Century Museum, Kanazawa](https://commons.wikimedia.org/wiki/File:21st_Century_Museum_260123.jpg) (CC0)
- [Glass House window](https://commons.wikimedia.org/wiki/File:Phillip_Johnson_Glass_House_Window.jpg) (CC BY 4.0)
- [Glass House sculpture gallery](https://commons.wikimedia.org/wiki/File:Sculpture-gallery-interior-philip-johnson-glass-house.jpg) (CC BY-SA 3.0)
- [Church of the Light](https://commons.wikimedia.org/wiki/File:Ibaraki_Kasugaoka_Church_20080914.jpg) (CC BY 2.0)
- [Louisiana Museum café](https://commons.wikimedia.org/wiki/File:Louisiana_Museum_of_Modern_Art_Cafeen.jpg) (CC BY-SA 4.0)

## Type

- **Clean sans for almost everything:** Geist, already used in the app.
- **One or two words in a sharp serif in a title**, set in a high-contrast italic like Bodoni Moda. For example: "Frame what _you see_." The serif marks the word that matters, like one light line in a dark room.
- Never more than two serif words in a title. Body text is always sans.

## Color

Use the project color system as it is: the `--poise-color-*` tokens in `packages/ui/src/styles.css`.

- Neutral gray with no hue, in light and dark. The user's images are the colorful part.
- The soft folder colors are the only color, used as small moments (a tag, a dot, one card), never as a big fill.
- No new brand palette.

## Logo

**Focus Frame** (chosen 2026-10-27): [`logo/focus-frame.svg`](logo/focus-frame.svg). A gallery frame that goes from hairline (top and left) to heavy (right and bottom), like light from one side. It also reads as "fog to focus".

The logo is flat and one color, with no glass, glow or gradient effects. Use the `--poise-color-fg` token on light backgrounds and the dark-mode `--poise-color-fg` on dark backgrounds.

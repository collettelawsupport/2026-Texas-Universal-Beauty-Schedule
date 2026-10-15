# Candyland home-screen icon

Adapted from the existing `public/assets/candyland.jpg` with the built-in image-generation tool on October 14, 2026. The resulting square artwork was resized without changing its design into opaque PNGs: 180px for Apple home-screen bookmarks, plus 192px and 512px for the web app manifest. The centered circular logo fits the maskable icon's central safe area. The existing simple crown SVG remains the small browser favicon.

## Final generation prompt

Create a finished square mobile home-screen icon for the Texas Our Little Miss competition schedule app by reframing the supplied existing Candyland artwork. Use case: compositing. The reference is the existing app artwork and contains the official circular Texas Our Little Miss & OLM Prince logo. Preserve that exact logo's shapes, typography, words, blue-white-red Texas silhouette, girl and boy silhouettes, metallic silver ring and stars. The complete circular logo should be centered and occupy 72–76% of the square's width and height, fully within the central safe zone. Around it, keep the colorful pastel pink, lavender, sky-blue and peach Candyland mood, with a little of the candy castle, rainbow and swirl lollipops from the original artwork visible as the background. Recompose background as needed but do not invent a new logo or extra text. Prioritize a strong readable silhouette at small phone-icon sizes. Edge-to-edge opaque square artwork, no rounded corners baked in, no white outer border, no phone mockup, no shadow outside the square. Output a single square PNG image.

## Integration

- `public/apple-touch-icon.png`: Apple home-screen icon, explicitly linked from the main schedule and Queens pages and available at the conventional root path.
- `public/assets/app-icon-192-v1.png` and `public/assets/app-icon-512-v1.png`: manifest icons.
- `public/site.webmanifest`: the main schedule's app name, icons, colors, and launch URL. No service worker or offline cache is introduced.
- The Queens page keeps its own bookmark destination and the short title `OLM Queens`; it does not point at the main schedule's launch manifest.

Previously saved shortcuts can retain their old artwork. To get the new icon, open the live site in Safari and use Share → Add to Home Screen. Saved watch lists belong to the browser/install on that device; avoid promising that recreating a shortcut transfers saved selections.

References: [Apple home-screen icon configuration](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html), [web app manifest icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons).

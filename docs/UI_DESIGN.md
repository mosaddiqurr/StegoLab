# Product design

The supplied StegoLab logo is unchanged. A graphite top bar, ivory surfaces, one gold accent, locally bundled Manrope and JetBrains Mono, and thin borders carry the identity. A dark theme follows the system preference; no preference is stored.

Home leads with a live demonstration: a procedurally drawn scene with random bytes written into its lowest bits by the same `embedPixels` function the product uses, and a slider that reveals bit plane 0. Below it, a five-tile grid explains the per-format method and a fact grid states the security properties.

Embed and Extract use a two-column workspace. The form sits on the left; the right panel shows an empty state, a loading skeleton, the carrier preview with capacity, and finally the result. Embed results for PNG and BMP compare the lowest bit plane before and after and report how many colour values changed. Extract offers copy, download and start over. Passwords can be revealed, Embed shows a strength hint, and passwords are kept after an error and cleared after success.

Inspect renders any image one bit plane and channel at a time and reports whether a StegoLab payload is present.

Technical detail stays behind Format details or in About. Focus is visible; controls have semantic labels; reduced-motion preferences remove entrance and reveal animation. The layout collapses to one column below 960px and moves the primary navigation to its own row below 720px.

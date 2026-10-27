# Game surface

Mode: Operate during play; Experience in the lobby. Code-first: an interactive game, whose scene must be rendered by the engine rather than represented by a static comp.

## Direction contract
THESIS: Enter a fictional African savanna outpost. The user's pinned realistic atmosphere controls the work. The game itself fills the first viewport.

OWN-WORLD: dusty red ground, straw grass, olive foliage, pale blue sky, bone-colored interface type, muted orange actions on dark earth translucent panels. Barlow Condensed display lettering and Noto Sans Thai controls. No real faction emblems.

STORY: See the actual playable world, enter a callsign and room, connect, then move and shoot. A second browser in the same room is another player. Solo players can practice on targets.

FIRST VIEWPORT: fullscreen live 3D view looking over a red-dirt approach to an outpost; restrained left-aligned title and room form, tiny status at the top and controls along the bottom. In play the form recedes to health, ammunition, compass and room status at the margins.

FORM: Brief-pinned environmental realism overrides arbitrary catalog motifs. seed:43932a354fadf92d. Grounded candidates considered: field photography, savanna field station, trail wayfinding, wildlife documentary, relief atlas, weather station, outpost observation point (assigned seventh). Observation point chosen, translated to real 3D environment and operable HUD. Ocean-depth and terminal motifs declined as they obscure the environment; retain state clarity. Forge declined; retain impact feedback. Shader portal competitive in immersion; retain scene-first topology. Consumer cards declined; retain readable controls.

SIGNATURE: the lobby camera surveys the actual level; deployment drops into the same scene. Warm sun and wind-driven grass carry motion. Recoil, dust impacts, sight alignment, positional shots and weapon bob make actions tactile. Reduced motion disables idle camera drift and head bob.

Risks: procedural geometry is stylized realism, not a photorealistic asset pipeline. Desktop keyboard and mouse required. Multiplayer needs the Node server deployed on a WebSocket-capable host.

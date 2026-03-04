# Eval Report

## Summary

| Metric | Value |
|--------|-------|
| Total | 50 |
| Pass | 50 |
| Fail | 0 |
| Pass % | 100% |

## By Category

| Category | Total | Pass | Fail | Pass % |
|----------|-------|------|------|--------|
| happy | 20 | 20 | 0 | 100% |
| edge | 12 | 12 | 0 | 100% |
| adversarial | 10 | 10 | 0 | 100% |
| performance | 8 | 8 | 0 | 100% |

## Per Case

| ID | Category | Query | Status | Reason |
|----|----------|-------|--------|--------|
| adv-01-no-opengl | adversarial | Explain the OpenGL rendering pipeline Doom uses. | PASS |  |
| adv-02-no-python | adversarial | Where is the Python scripting engine in the Doom source? | PASS |  |
| adv-03-no-threads | adversarial | How does Doom's multi-threading system work? | PASS |  |
| adv-04-no-cpp | adversarial | What C++ classes does Doom use to represent game objects? | PASS |  |
| adv-05-no-directx | adversarial | Where is DirectX or Direct3D initialized in the Doom source? | PASS |  |
| adv-06-no-encryption | adversarial | How does Doom encrypt savegame files? | PASS |  |
| adv-07-no-stl | adversarial | Where does Doom use the C++ Standard Template Library? | PASS |  |
| adv-08-no-gc | adversarial | Explain Doom's garbage collection system. | PASS |  |
| adv-09-no-ecs | adversarial | How does Doom's entity-component system work? | PASS |  |
| adv-10-no-lobby | adversarial | Where is the network lobby and matchmaking code? | PASS |  |
| edge-01-mobjinfo | edge | What is the mobjinfo array and what does it contain? | PASS |  |
| edge-02-trig-tables | edge | Where are the trigonometric lookup tables stored? | PASS |  |
| edge-03-demo-record | edge | How does Doom record gameplay demos? | PASS |  |
| edge-04-blockmap | edge | What does P_BlockThingsIterator do? | PASS |  |
| edge-05-ammo-check | edge | How does Doom check if the player has enough ammo to fire? | PASS |  |
| edge-06-finale | edge | Where is the end-of-episode finale screen drawn? | PASS |  |
| edge-07-linedef-trigger | edge | How are linedef triggers processed when a player crosses the… | PASS |  |
| edge-08-view-height | edge | How is the player's view height calculated including head bo… | PASS |  |
| edge-09-menu-input | edge | How does the menu system handle keyboard input? | PASS |  |
| edge-10-intermission | edge | Where is the intermission screen between levels drawn? | PASS |  |
| edge-11-sprite-project | edge | How are enemy sprites projected onto the screen? | PASS |  |
| edge-12-wall-render | edge | How are wall segments stored for rendering? | PASS |  |
| happy-01-rendering-loop | happy | Where is the main rendering loop implemented? | PASS |  |
| happy-02-player-movement | happy | How does player movement work? | PASS |  |
| happy-03-weapon-fire | happy | Where is weapon firing handled? | PASS |  |
| happy-04-damage-calc | happy | How is damage to a monster calculated? | PASS |  |
| happy-05-bsp-traversal | happy | Where is BSP tree traversal implemented? | PASS |  |
| happy-06-enemy-chase | happy | How do enemies chase the player? | PASS |  |
| happy-07-automap-draw | happy | Where is the automap drawn? | PASS |  |
| happy-08-sound-start | happy | How are sounds started and played? | PASS |  |
| happy-09-memory-alloc | happy | How does the zone memory allocator work? | PASS |  |
| happy-10-game-loop | happy | How does the main game loop run? | PASS |  |
| happy-11-wad-load | happy | Where are WAD files loaded and parsed? | PASS |  |
| happy-12-fixed-point | happy | How is fixed-point multiplication implemented? | PASS |  |
| happy-13-status-bar | happy | Where is the status bar drawn? | PASS |  |
| happy-14-line-of-sight | happy | How does line-of-sight checking work? | PASS |  |
| happy-15-sector-specials | happy | Where are sector specials processed each tick? | PASS |  |
| happy-16-floor-render | happy | How are floors and ceilings rendered? | PASS |  |
| happy-17-spawn-mobj | happy | How are map objects (monsters, items, decorations) spawned? | PASS |  |
| happy-18-hud-draw | happy | Where is the heads-up display text drawn? | PASS |  |
| happy-19-player-death | happy | What happens when the player dies? | PASS |  |
| happy-20-give-health | happy | Where are health pickups processed? | PASS |  |
| perf-01-full-pipeline | performance | Explain the complete rendering pipeline from BSP traversal t… | PASS |  |
| perf-02-player-tick | performance | How does P_PlayerThink process the player each game tick? | PASS |  |
| perf-03-damage-flow | performance | Trace the full damage flow from a hitscan bullet hit to mons… | PASS |  |
| perf-04-zmalloc-lookup | performance | What does Z_Malloc do and how does the zone allocator work? | PASS |  |
| perf-05-bspnode-lookup | performance | What is R_RenderBSPNode's purpose and how does it decide whi… | PASS |  |
| perf-06-map-geometry | performance | How do sectors, linedefs, and sidedefs relate to each other … | PASS |  |
| perf-07-monster-ai | performance | Describe how monster AI decides when to chase versus attack … | PASS |  |
| perf-08-game-tick | performance | What happens during a single game tick from user input to sc… | PASS |  |
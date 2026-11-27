# Approved Silvia blueprint model

Marvyn approved this exact model on 27 November 2026 and authorized integration into the game. This folder preserves the approved source and renders for that integration.

**Status: integrated into gameplay in V6.5.** Runtime LODs are derived from this source; the live 2JZ simulator is integrated as well. See [the development handover](../../docs/DEVELOPMENT_HANDOVER.md).

- `Silvia_Blueprint_Model_Files.zip` contains the GLB, editable Blender scene, deterministic generator, supplied blueprint, material metadata, checksum and Third Party licence.
- `Silvia_Approval_Sheet.png` shows the approved multi-angle renders.
- `Silvia_Front_Review.png` is the approved front perspective render.
- `model-sha256.txt` identifies the exact approved GLB inside the archive.
- `model-info.json` contains the original export metadata. Its standalone status describes integration state; visual approval has now been granted.

Extract the archive before integration and verify the GLB against `model-sha256.txt`. The original README inside the archive predates approval; the approval recorded above supersedes its request for visual approval.

The GLB is Y-up and faces negative X. The game faces positive X. Align the model to the existing physics, including correct wheel pivots. It contains 43 mesh groups and 361,154 triangles, so profile solo and split screen and create runtime LOD if necessary. Preserve the approved silhouette. Keep brake calipers stationary while the wheels rotate.

The supplied drawing is an undimensioned raster; physical scale is inferred. The model is a visual reconstruction rather than dimension-certified CAD. Keep the original drawing attribution and included Three.js MIT notice.

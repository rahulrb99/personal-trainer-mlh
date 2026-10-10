# Curated coaching boundary

Runtime content is `catalog/demo.json`; get_exercise_guidance returns the chosen catalog entry. No occupancy sensing, observed-form feedback or automatic rep detection is implied. Current entries are developer-authored demo content; professional review remains pending and must not be labeled completed.

| Catalog ID | Grounded answer material |
|---|---|
| chest-press | Chest/triceps; seat and handles; supported back; controlled movement |
| seated-row | Upper back/biceps; comfortable handle reach; steady torso |
| leg-extension | Quadriceps; machine instructions/pivot/pad; comfortable controlled range |
| dumbbell-press | Chest/triceps; stable bench; independent suitable weight; controlled movement |

These are navigation notes for existing fields, not a second runtime knowledge base. For all four entries, Mat retrieves `setup`, `cue`, `mistake` and `muscles` rather than improvising detailed technique. “How should this feel?” receives target-muscle context; sensation, pain diagnosis and safety guarantees are outside the content. Sharp-pain reports prompt stopping the movement, not form experiments or automatic completion.

Before expanding content, have both developers review IDs, approved substitutions, equipment/location, exclusion behavior, wording and source provenance. Record professional review only when it actually occurs. Do not transfer weights across exercises or assume a substitute has been accepted. Unknown IDs and unsupported questions must receive explicit uncertainty.

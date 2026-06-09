# Test Fixtures

Place real STEP files here to enable integration tests.

Expected files (all optional — tests are skipped if absent):
- `flat_plate.step` — a thin flat plate (good for waterjet/laser tests)
- `machinable_block.step` — a solid block with holes and internal fillets
- `shaft.step` — a rotationally symmetric shaft (good for CNC turning tests)
- `assembly.step` — any assembly component for the full-pipeline smoke test

Export from Fusion 360 as AP214 STEP. Single-body components work best.

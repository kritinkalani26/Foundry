#!/usr/bin/env node
// Reads STEP bytes from stdin, outputs OBJ text to stdout.
// Runs as a child process so webpack never touches occt-import-js.

const path = require("path");
const occtimportjs = require(path.join(__dirname, "..", "node_modules", "occt-import-js", "dist", "occt-import-js.js"));

const MAX_TRIS_PER_MESH = 3000;

// Walk the scene graph and map each mesh index → its component name.
// Leaf nodes have meshes=[...], container nodes have children=[...].
function buildNameMap(node, map) {
  const name = node.name || "";
  for (const mi of (node.meshes || [])) {
    if (!map.has(mi)) map.set(mi, name);
  }
  for (const child of (node.children || [])) {
    buildNameMap(child, map);
  }
}

const chunks = [];
process.stdin.on("data", c => chunks.push(c));
process.stdin.on("end", async () => {
  try {
    const bytes  = Buffer.concat(chunks);
    const occt   = await occtimportjs();
    const result = occt.ReadStepFile(new Uint8Array(bytes), null);

    if (!result.success) {
      process.stderr.write("STEP parse failed\n");
      process.exit(1);
    }

    const meshes = result.meshes || [];
    process.stderr.write(`success=true meshes=${meshes.length}\n`);

    // Build mesh-index → component name from scene graph
    const meshIndexToName = new Map();
    if (result.root) buildNameMap(result.root, meshIndexToName);

    // Log name resolution for debugging
    for (let i = 0; i < meshes.length; i++) {
      const sgName   = meshIndexToName.get(i) || "";
      const meshName = meshes[i].name || "";
      process.stderr.write(`  [${i}] sceneGraph="${sgName}" meshName="${meshName}"\n`);
    }

    // Group mesh indices by component name so all sub-meshes of the same
    // component share one "o" entry in the OBJ.
    const nameToIndices = new Map();
    for (let mi = 0; mi < meshes.length; mi++) {
      // Prefer scene-graph name; fall back to mesh.name; then a placeholder
      const raw = (meshIndexToName.get(mi) || meshes[mi].name || `Part_${mi + 1}`).trim();
      if (!nameToIndices.has(raw)) nameToIndices.set(raw, []);
      nameToIndices.get(raw).push(mi);
    }

    const lines      = ["# Converted from STEP by Aztea"];
    let vertexOffset = 1;
    let meshesWritten = 0;

    for (const [rawName, indices] of nameToIndices) {
      // Keep spaces — OBJ "o" token reads to end-of-line, Three.js OBJLoader handles it.
      const safeName    = rawName || `Part_${meshesWritten + 1}`;
      let groupStarted  = false;

      for (const mi of indices) {
        const mesh   = meshes[mi];
        const posArr = mesh.attributes && mesh.attributes.position && mesh.attributes.position.array;
        const idxArr = mesh.index && mesh.index.array;

        if (!posArr || !idxArr || posArr.length === 0 || idxArr.length === 0) {
          process.stderr.write(`  mesh[${mi}] skipped (no geometry)\n`);
          continue;
        }

        const vCount = posArr.length / 3;
        const tCount = idxArr.length / 3;

        // Start the "o" group once (even if this component has multiple sub-meshes)
        if (!groupStarted) {
          lines.push(`o ${safeName}`);
          groupStarted = true;
          meshesWritten++;
          process.stderr.write(`  wrote component "${safeName}"\n`);
        }

        for (let v = 0; v < posArr.length; v += 3) {
          lines.push(`v ${posArr[v].toFixed(6)} ${posArr[v+1].toFixed(6)} ${posArr[v+2].toFixed(6)}`);
        }

        const stride = Math.max(1, Math.ceil(tCount / MAX_TRIS_PER_MESH));
        for (let t = 0; t < idxArr.length; t += stride * 3) {
          lines.push(`f ${idxArr[t] + vertexOffset} ${idxArr[t+1] + vertexOffset} ${idxArr[t+2] + vertexOffset}`);
        }

        vertexOffset += vCount;
      }
    }

    process.stderr.write(`done meshesWritten=${meshesWritten}\n`);
    process.stdout.write(lines.join("\n"));
  } catch (err) {
    process.stderr.write((err && err.message) || "Conversion error");
    process.exit(1);
  }
});

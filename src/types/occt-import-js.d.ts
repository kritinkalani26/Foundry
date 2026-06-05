declare module "occt-import-js" {
  interface OcctVertex { x: number; y: number; z: number }
  interface OcctTriangle { v0: number; v1: number; v2: number }
  interface OcctColor { r: number; g: number; b: number; a: number }

  interface OcctMesh {
    name: string;
    color: OcctColor;
    VertexCount(): number;
    TriangleCount(): number;
    GetVertex(index: number): OcctVertex;
    GetNormal(index: number): OcctVertex;
    GetTriangle(index: number): OcctTriangle;
  }

  interface OcctResult {
    success: boolean;
    meshCount: number;
    GetMesh(index: number): OcctMesh;
  }

  interface OcctInstance {
    ReadStepFile(data: Uint8Array, params: null): OcctResult;
  }

  type InitFn = (opts?: { locateFile?: (file: string) => string }) => Promise<OcctInstance>;
  const init: InitFn;
  export default init;
}

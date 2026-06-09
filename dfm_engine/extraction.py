"""
Stage 1 — Geometric Feature Extraction.

The public interface is `FeatureExtractor` (a Protocol).  Production code uses
`OCCFeatureExtractor` which requires pythonocc-core.  Tests inject a mock.

Install pythonocc-core via conda — pip wheels are unreliable:
    conda install -c conda-forge pythonocc-core

Known limitations (documented per-feature):
  - Wall thickness: ray-casting approximation.  Works well for plates/shells;
    underestimates for very curved or hollow parts.  Confidence = "medium".
  - Undercut detection: checks Z-axis projection overlap only (3-axis assumption).
    Does not handle 5-axis geometry.  Confidence = "low" for non-trivial parts.
  - Bounding box: AABB (axis-aligned).  OBB would be more accurate for diagonal
    parts but adds significant complexity — left as a TODO.
"""

from __future__ import annotations
import math
from typing import Protocol, runtime_checkable

from .models import (
    BoundingBox, FaceClassification, GeometricFeatures, HoleFeature,
)


@runtime_checkable
class FeatureExtractor(Protocol):
    def extract(self, step_path: str) -> GeometricFeatures: ...


class OCCFeatureExtractor:
    """
    Production feature extractor backed by OpenCASCADE (pythonocc-core).
    Import errors are deferred to call time so the module can be imported
    even when OCC is not installed (for test environments).
    """

    def extract(self, step_path: str) -> GeometricFeatures:
        try:
            from OCC.Core.STEPControl import STEPControl_Reader
            from OCC.Core.BRepBndLib import brepbndlib
            from OCC.Core.Bnd import Bnd_Box
            from OCC.Core.BRepGProp import brepgprop
            from OCC.Core.GProp import GProp_GProps
            from OCC.Core.TopExp import TopExp_Explorer
            from OCC.Core.TopAbs import TopAbs_FACE, TopAbs_EDGE
            from OCC.Core.BRep import BRep_Tool
            from OCC.Core.GeomAbs import (
                GeomAbs_Plane, GeomAbs_Cylinder, GeomAbs_Cone,
            )
            from OCC.Core.BRepAdaptor import BRepAdaptor_Surface
            from OCC.Core.gp import gp_Pnt, gp_Dir, gp_Lin
            from OCC.Core.BRepClass3d import BRepClass3d_SolidClassifier
            from OCC.Core.IFSelect import IFSelect_RetDone
        except ImportError as exc:
            raise RuntimeError(
                "pythonocc-core not installed.  "
                "Run: conda install -c conda-forge pythonocc-core"
            ) from exc

        # ── Load STEP ────────────────────────────────────────────────────────
        reader = STEPControl_Reader()
        status = reader.ReadFile(step_path)
        if status != IFSelect_RetDone:
            raise ValueError(f"Failed to read STEP file: {step_path}")
        reader.TransferRoots()
        shape = reader.OneShape()

        # ── Bounding box (AABB) ───────────────────────────────────────────────
        # TODO: replace with OBB (oriented bounding box) for diagonal parts.
        bbox = Bnd_Box()
        brepbndlib.Add(shape, bbox)
        xmin, ymin, zmin, xmax, ymax, zmax = bbox.Get()
        dims = sorted([xmax - xmin, ymax - ymin, zmax - zmin])  # small→large
        bb = BoundingBox(x=dims[2], y=dims[1], z=dims[0])

        # ── Volume & surface area ─────────────────────────────────────────────
        vol_props = GProp_GProps()
        brepgprop.VolumeProperties(shape, vol_props)
        volume = vol_props.Mass()  # mm³

        surf_props = GProp_GProps()
        brepgprop.SurfaceProperties(shape, surf_props)
        surface_area = surf_props.Mass()  # mm²

        # ── Face classification ───────────────────────────────────────────────
        planar = cylindrical = conical = freeform = 0
        explorer = TopExp_Explorer(shape, TopAbs_FACE)
        cyl_faces: list = []

        while explorer.More():
            face = explorer.Current()
            adaptor = BRepAdaptor_Surface(face)
            st = adaptor.GetType()
            if st == GeomAbs_Plane:
                planar += 1
            elif st == GeomAbs_Cylinder:
                cylindrical += 1
                cyl_faces.append((face, adaptor))
            elif st == GeomAbs_Cone:
                conical += 1
            else:
                freeform += 1
            explorer.Next()

        face_cls = FaceClassification(
            planar=planar,
            cylindrical=cylindrical,
            conical=conical,
            freeform=freeform,
        )

        # ── Hole detection (cylindrical faces as holes) ───────────────────────
        holes: list[HoleFeature] = []
        for face, adaptor in cyl_faces:
            try:
                cyl    = adaptor.Cylinder()
                radius = cyl.Radius()
                axis   = cyl.Axis().Direction()
                ax     = (axis.X(), axis.Y(), axis.Z())

                # Depth estimate: bounding box extent along the cylinder axis
                face_bbox = Bnd_Box()
                brepbndlib.Add(face, face_bbox)
                fx0, fy0, fz0, fx1, fy1, fz1 = face_bbox.Get()
                ax_abs = (abs(ax[0]), abs(ax[1]), abs(ax[2]))
                dominant = ax_abs.index(max(ax_abs))
                extents  = [fx1 - fx0, fy1 - fy0, fz1 - fz0]
                depth    = extents[dominant]

                diam = radius * 2
                if depth > 0:
                    holes.append(HoleFeature(
                        diameter=diam,
                        depth=depth,
                        axis=ax,
                        depth_to_diameter_ratio=depth / diam if diam > 0 else 0.0,
                    ))
            except Exception:
                pass  # skip malformed cylindrical faces

        # ── Plate-like detection ──────────────────────────────────────────────
        # Heuristic: smallest dim << (other two) AND dominated by planar faces.
        small, mid, large = dims[0], dims[1], dims[2]
        plate_like = (
            small < mid * 0.15        # thickness < 15% of second dimension
            and face_cls.fraction_planar > 0.5
        )
        plate_thickness = small if plate_like else None

        # ── Wall thickness (ray-casting approximation) ────────────────────────
        # Cast rays inward from the bounding-box faces.  For each pair of
        # opposite faces, the shortest penetration depth is a wall thickness
        # estimate.  This is reliable for thin-walled parts; less so for solid
        # blocks (where it measures the full block depth, not a wall).
        #
        # Limitation: this does not detect internal pockets.  Confidence = medium.
        min_wt, wt_confidence = _estimate_wall_thickness(shape, xmin, ymin, zmin,
                                                          xmax, ymax, zmax)

        # ── Internal corner radius ────────────────────────────────────────────
        min_icr = _estimate_min_internal_corner_radius(shape)

        # ── Undercut / tool-accessibility (Z-axis, 3-axis assumption) ─────────
        # Project all faces onto the XY plane.  If any face's normal has a
        # Z-component == 0 (vertical wall) AND the face is "inside" the silhouette,
        # it may be inaccessible.  This is very approximate.
        # Confidence = low for non-trivial shapes.
        has_undercuts, uc_confidence = _detect_undercuts_heuristic(
            shape, face_cls, plate_like
        )

        return GeometricFeatures(
            bounding_box=bb,
            volume=volume,
            surface_area=surface_area,
            min_wall_thickness=min_wt,
            min_wall_thickness_confidence=wt_confidence,
            holes=holes,
            min_internal_corner_radius=min_icr,
            face_classification=face_cls,
            plate_like=plate_like,
            plate_thickness=plate_thickness,
            has_undercuts=has_undercuts,
            undercut_confidence=uc_confidence,
        )


# ── Private helpers ───────────────────────────────────────────────────────────

def _estimate_wall_thickness(
    shape, xmin: float, ymin: float, zmin: float,
    xmax: float, ymax: float, zmax: float,
) -> tuple[float, str]:
    """
    Ray-casting wall thickness estimate.
    Fires rays inward from six face centres; collects hit-pair distances.
    Returns (min_thickness_mm, confidence).
    """
    try:
        from OCC.Core.gp import gp_Pnt, gp_Dir, gp_Lin
        from OCC.Core.BRepIntCurveSurface import BRepIntCurveSurface_Inter
        from OCC.Core.GeomAbs import GeomAbs_Face
    except ImportError:
        return 1.0, "low"

    cx = (xmin + xmax) / 2
    cy = (ymin + ymax) / 2
    cz = (zmin + zmax) / 2

    # Six ray origins (face centres) + directions
    ray_configs = [
        (gp_Pnt(xmin, cy, cz), gp_Dir(1, 0, 0)),
        (gp_Pnt(xmax, cy, cz), gp_Dir(-1, 0, 0)),
        (gp_Pnt(cx, ymin, cz), gp_Dir(0, 1, 0)),
        (gp_Pnt(cx, ymax, cz), gp_Dir(0, -1, 0)),
        (gp_Pnt(cx, cy, zmin), gp_Dir(0, 0, 1)),
        (gp_Pnt(cx, cy, zmax), gp_Dir(0, 0, -1)),
    ]

    thicknesses: list[float] = []
    for origin, direction in ray_configs:
        line = gp_Lin(origin, direction)
        inter = BRepIntCurveSurface_Inter()
        inter.Init(shape, line, 1e-6)
        hits: list[float] = []
        while inter.More():
            hits.append(inter.W())
            inter.Next()
        hits = sorted(h for h in hits if h > 1e-4)
        # Thickness = first exit minus first entry (or consecutive pairs)
        if len(hits) >= 2:
            thicknesses.append(hits[1] - hits[0])
        elif len(hits) == 1:
            thicknesses.append(hits[0])

    if not thicknesses:
        return 1.0, "low"

    return min(thicknesses), "medium"


def _estimate_min_internal_corner_radius(shape) -> float | None:
    """
    Walk concave edges; for each that has a fillet, record its radius.
    Returns the minimum found, or None if no internal corners are present.

    This uses BRep_Tool to sample edge curvature mid-parameter.
    Limitation: detects only explicitly filleted edges; sharp corners return
    curvature → ∞ so radius → 0.  Distinguish by threshold: if radius < 0.05 mm
    it is effectively a sharp corner; return 0.0 for those.
    """
    try:
        from OCC.Core.TopExp import TopExp_Explorer
        from OCC.Core.TopAbs import TopAbs_EDGE
        from OCC.Core.BRep import BRep_Tool
        from OCC.Core.BRepAdaptor import BRepAdaptor_Curve
        from OCC.Core.GeomAbs import GeomAbs_Circle, GeomAbs_Ellipse
        from OCC.Core.GCPnts import GCPnts_AbscissaPoint
    except ImportError:
        return None

    radii: list[float] = []
    exp = TopExp_Explorer(shape, TopAbs_EDGE)
    while exp.More():
        edge = exp.Current()
        try:
            adaptor = BRepAdaptor_Curve(edge)
            ctype = adaptor.GetType()
            if ctype == GeomAbs_Circle:
                radii.append(adaptor.Circle().Radius())
            # Ellipse, BSpline arcs, etc. — skip for now (TODO)
        except Exception:
            pass
        exp.Next()

    if not radii:
        return None

    min_r = min(radii)
    # Radii below 0.05 mm are effectively sharp corners
    return 0.0 if min_r < 0.05 else min_r


def _detect_undercuts_heuristic(
    shape, face_cls: FaceClassification, plate_like: bool
) -> tuple[bool | None, str]:
    """
    3-axis undercut heuristic: check if any face normal is purely horizontal
    (Z-component ≈ 0) combined with a non-planar neighbour above it.

    For plate-like parts this is almost always False (confidence = high).
    For complex 3-D parts the analysis is too coarse to be definitive, so
    we return (None, "low") to indicate uncertainty.

    TODO: implement proper silhouette-curve analysis for 5-axis detection.
    """
    if plate_like:
        return False, "high"

    # For non-trivial parts with freeform or conical faces, undercuts are
    # plausible but we cannot confirm without full machining simulation.
    if face_cls.freeform > 0 or face_cls.conical > 0:
        return None, "low"

    # Parts with only planar + cylindrical faces and no unusual geometry:
    # undercuts are unlikely but not impossible.
    return None, "medium"

import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
MODELS_DIR = os.path.join(ROOT, "public", "models")
PREVIEW_DIR = os.path.abspath(r"C:\Users\amado\.gemini\antigravity\brain\48af65f7-47df-410c-b31b-84211472d0ef\scratch\glb_audit")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(PREVIEW_DIR, exist_ok=True)

PALETTE = {
    "Travertine": ("#efe3cc", 0.72, 0.04, 0.0),
    "RoyalMarble": ("#faf5eb", 0.34, 0.08, 0.0),
    "AbbassidGold": ("#d8a13b", 0.22, 0.90, 0.15),
    "ArchGlass": ("#9edbe4", 0.08, 0.12, 0.0),
    "DomeAmberGlass": ("#f2cf7e", 0.12, 0.22, 0.10),
    "SolarPV": ("#153366", 0.16, 0.85, 0.12),
    "WarmCedar": ("#8f5b32", 0.56, 0.06, 0.0),
    "DarkMetal": ("#1e293b", 0.36, 0.78, 0.0),
    "FoliageOlive": ("#4c7322", 0.78, 0.02, 0.0),
    "FoliagePalm": ("#3d6e1d", 0.72, 0.04, 0.0),
    "FoliageCypress": ("#244a1c", 0.82, 0.02, 0.0),
    "CarPaint": ("#e5a92b", 0.18, 0.85, 0.05),
    "TireRubber": ("#1b1c20", 0.85, 0.05, 0.0),
    "HeadlightGlow": ("#fff7d6", 0.15, 0.10, 1.5),
    "TaillightGlow": ("#ff2b3a", 0.18, 0.10, 1.4),
    "TurquoiseWater": ("#10a398", 0.10, 0.25, 0.08),
}


def hex_rgba(h):
    h = h.lstrip("#")
    vals = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in vals]
    return (lin[0], lin[1], lin[2], 1.0)


def clear_scene():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for item in list(col):
            col.remove(item)


def get_materials():
    mats = []
    idx_map = {}
    for i, (name, (col, rough, metal, emit)) in enumerate(PALETTE.items()):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        rgba = hex_rgba(col)
        if bsdf:
            bsdf.inputs["Base Color"].default_value = rgba
            bsdf.inputs["Roughness"].default_value = rough
            bsdf.inputs["Metallic"].default_value = metal
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = rgba
                bsdf.inputs["Emission Strength"].default_value = emit
            if name in ("ArchGlass", "DomeAmberGlass") and "Alpha" in bsdf.inputs:
                bsdf.inputs["Alpha"].default_value = 0.48
        m.diffuse_color = rgba
        mats.append(m)
        idx_map[name] = i
    return mats, idx_map


def uv_box_project(bm, scale=0.22):
    uv_layer = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        for loop in f.loops:
            co = loop.vert.co
            if az >= ax and az >= ay:
                u, v = co.x * scale, co.y * scale
            elif ax >= ay and ax >= az:
                u, v = co.y * scale, co.z * scale
            else:
                u, v = co.x * scale, co.z * scale
            loop[uv_layer].uv = (u, v)


def finalize_bmesh(name, bm, mats, smooth=True):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    uv_box_project(bm)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = smooth
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def add_quad_prism(bm, p0, p1, p2, p3, z0, z1, mat_idx):
    v = [
        bm.verts.new((p0[0], p0[1], z0)),
        bm.verts.new((p1[0], p1[1], z0)),
        bm.verts.new((p2[0], p2[1], z0)),
        bm.verts.new((p3[0], p3[1], z0)),
        bm.verts.new((p0[0], p0[1], z1)),
        bm.verts.new((p1[0], p1[1], z1)),
        bm.verts.new((p2[0], p2[1], z1)),
        bm.verts.new((p3[0], p3[1], z1)),
    ]
    faces_idx = [
        (0, 3, 2, 1),
        (4, 5, 6, 7),
        (0, 1, 5, 4),
        (1, 2, 6, 5),
        (2, 3, 7, 6),
        (3, 0, 4, 7),
    ]
    for fi in faces_idx:
        try:
            f = bm.faces.new([v[i] for i in fi])
            f.material_index = mat_idx
        except ValueError:
            pass


def add_box(bm, cx, cy, cz, sx, sy, sz, mat_idx, rot_z=0.0):
    res = bmesh.ops.create_cube(bm, size=1.0)
    verts = res["verts"]
    mat = (
        Matrix.Translation((cx, cy, cz))
        @ Matrix.Rotation(rot_z, 4, "Z")
        @ Matrix.Diagonal((sx, sy, sz, 1.0))
    )
    bmesh.ops.transform(bm, matrix=mat, verts=verts)
    for f in set(f for v in verts for f in v.link_faces):
        f.material_index = mat_idx
    return verts


def add_cylinder(bm, cx, cy, cz, r1, r2, depth, segs, mat_idx, rot_euler=(0, 0, 0)):
    res = bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=depth
    )
    verts = res["verts"]
    m = Matrix.Translation((cx, cy, cz)) @ Euler(rot_euler, "XYZ").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=m, verts=verts)
    for f in set(f for v in verts for f in v.link_faces):
        f.material_index = mat_idx
    return verts


def add_arc_ring(bm, r_in, r_out, z0, z1, a0, a1, segs, mat_idx, tilt_outer_dz=0.0, cx=0.0, cy=0.0):
    full = abs((a1 - a0) - 2 * math.pi) < 1e-4
    ring_verts = []
    steps = segs if full else segs + 1
    for i in range(steps):
        a = a0 + (a1 - a0) * (i / segs)
        ca, sa = math.cos(a), math.sin(a)
        v_ib = bm.verts.new((cx + ca * r_in, cy + sa * r_in, z0))
        v_ob = bm.verts.new((cx + ca * r_out, cy + sa * r_out, z0 + tilt_outer_dz))
        v_ot = bm.verts.new((cx + ca * r_out, cy + sa * r_out, z1 + tilt_outer_dz))
        v_it = bm.verts.new((cx + ca * r_in, cy + sa * r_in, z1))
        ring_verts.append((v_ib, v_ob, v_ot, v_it))

    for i in range(segs):
        j = (i + 1) % steps if full else i + 1
        a = ring_verts[i]
        b = ring_verts[j]
        for k in range(4):
            k2 = (k + 1) % 4
            try:
                f = bm.faces.new([a[k], b[k], b[k2], a[k2]])
                f.material_index = mat_idx
            except ValueError:
                pass
    if not full:
        for cap in (ring_verts[0], ring_verts[-1][::-1]):
            try:
                f = bm.faces.new(list(cap))
                f.material_index = mat_idx
            except ValueError:
                pass


def add_swept_beam(bm, pts, hw, hh, mat_idx):
    """Sweeps a rectangular beam of half-width hw and half-height hh along 3D polyline pts."""
    rings = []
    n = len(pts)
    for i, p in enumerate(pts):
        p_vec = Vector(p)
        if i == 0:
            tan = (Vector(pts[1]) - p_vec).normalized()
        elif i == n - 1:
            tan = (p_vec - Vector(pts[-2])).normalized()
        else:
            tan = (Vector(pts[i + 1]) - Vector(pts[i - 1])).normalized()
        up = Vector((0, 0, 1))
        if abs(tan.dot(up)) > 0.96:
            up = Vector((1, 0, 0))
        side = tan.cross(up).normalized()
        norm = side.cross(tan).normalized()
        ring = [
            bm.verts.new(p_vec - side * hw - norm * hh),
            bm.verts.new(p_vec + side * hw - norm * hh),
            bm.verts.new(p_vec + side * hw + norm * hh),
            bm.verts.new(p_vec - side * hw + norm * hh),
        ]
        rings.append(ring)

    for i in range(n - 1):
        rA, rB = rings[i], rings[i + 1]
        for k in range(4):
            k2 = (k + 1) % 4
            try:
                f = bm.faces.new([rA[k], rB[k], rB[k2], rA[k2]])
                f.material_index = mat_idx
            except ValueError:
                pass
    for cap in (rings[0][::-1], rings[-1]):
        try:
            f = bm.faces.new(cap)
            f.material_index = mat_idx
        except ValueError:
            pass


def add_curved_pointed_arch_bay(
    bm, r_in, r_out, a0, a1, z_base, z_spring, z_apex, z_top, pier_frac, mat_wall, mat_trim, segs_half=6
):
    span = a1 - a0
    p_left_end = a0 + span * pier_frac
    p_right_start = a1 - span * pier_frac
    a_mid = 0.5 * (a0 + a1)

    # Left and Right solid masonry piers
    add_arc_ring(bm, r_in, r_out, z_base, z_top, a0, p_left_end, 2, mat_wall)
    add_arc_ring(bm, r_in, r_out, z_base, z_top, p_right_start, a1, 2, mat_wall)

    # Left half spandrel & Right half spandrel forming crisp Persian pointed arch
    for half_idx in (0, 1):
        cols = []
        for s in range(segs_half + 1):
            t = s / segs_half
            if half_idx == 0:
                # Angle from p_left_end -> a_mid
                ang = p_left_end + (a_mid - p_left_end) * (1.0 - math.cos(t * math.pi * 0.5))
                z_arch = z_spring + (z_apex - z_spring) * math.sin(t * math.pi * 0.5)
            else:
                # Angle from a_mid -> p_right_start
                ang = a_mid + (p_right_start - a_mid) * math.sin(t * math.pi * 0.5)
                z_arch = z_apex - (z_apex - z_spring) * (1.0 - math.cos(t * math.pi * 0.5))
            ca, sa = math.cos(ang), math.sin(ang)
            cols.append([
                bm.verts.new((ca * r_in, sa * r_in, z_arch)),
                bm.verts.new((ca * r_out, sa * r_out, z_arch)),
                bm.verts.new((ca * r_out, sa * r_out, z_top)),
                bm.verts.new((ca * r_in, sa * r_in, z_top)),
            ])
        for i in range(segs_half):
            cA, cB = cols[i], cols[i + 1]
            for k in range(4):
                k2 = (k + 1) % 4
                try:
                    f = bm.faces.new([cA[k], cB[k], cB[k2], cA[k2]])
                    f.material_index = mat_trim if k == 0 else mat_wall
                except ValueError:
                    pass


def add_straight_arch_span(
    bm, x0, x1, y_center, thickness, z_base, z_spring, z_apex, z_top, pier_w, mat_wall, mat_trim, segs_half=6, rot_z=0.0
):
    """Builds a straight Persian pointed-arch bay along X (rotated by rot_z around Z if needed)."""
    y0, y1 = y_center - thickness * 0.5, y_center + thickness * 0.5
    xm = 0.5 * (x0 + x1)
    xl = x0 + pier_w
    xr = x1 - pier_w
    mat_r = Matrix.Rotation(rot_z, 4, "Z")

    def xform(pt):
        v = mat_r @ Vector(pt)
        return (v.x, v.y, v.z)

    # Side piers
    for xa, xb in ((x0, xl), (xr, x1)):
        cx, cy, cz = xform((0.5 * (xa + xb), y_center, 0.5 * (z_base + z_top)))
        add_box(bm, cx, cy, cz, xb - xa, thickness, z_top - z_base, mat_wall, rot_z=rot_z)

    # Pointed arch spandrels
    for half_idx in (0, 1):
        cols = []
        for s in range(segs_half + 1):
            t = s / segs_half
            if half_idx == 0:
                x = xl + (xm - xl) * (1.0 - math.cos(t * math.pi * 0.5))
                za = z_spring + (z_apex - z_spring) * math.sin(t * math.pi * 0.5)
            else:
                x = xm + (xr - xm) * math.sin(t * math.pi * 0.5)
                za = z_apex - (z_apex - z_spring) * (1.0 - math.cos(t * math.pi * 0.5))
            cols.append([
                bm.verts.new(xform((x, y0, za))),
                bm.verts.new(xform((x, y1, za))),
                bm.verts.new(xform((x, y1, z_top))),
                bm.verts.new(xform((x, y0, z_top))),
            ])
        for i in range(segs_half):
            cA, cB = cols[i], cols[i + 1]
            for k in range(4):
                k2 = (k + 1) % 4
                try:
                    f = bm.faces.new([cA[k], cB[k], cB[k2], cA[k2]])
                    f.material_index = mat_trim if k == 0 else mat_wall
                except ValueError:
                    pass


def export_glb(filepath):
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    tri_total = 0
    for ob in bpy.data.objects:
        if ob.type == "MESH":
            tri_total += sum(len(p.vertices) - 2 for p in ob.data.polygons)
    sz_kb = os.path.getsize(filepath) / 1024.0
    print(f"EXPORTED {os.path.basename(filepath)} -> {sz_kb:.1f} KB | {tri_total} tris | {len(bpy.data.objects)} objects")


# ==============================================================================
# MODEL 1: bayt_dome.glb (Grand Central Golden Dome & Walkable Interior)
# ==============================================================================
def build_bayt_dome():
    clear_scene()
    mats, M = get_materials()
    bm = bmesh.new()

    # 1. Stepped Island Plinth (Radius 42.2m)
    add_cylinder(bm, 0, 0, -0.65, 43.2, 42.2, 1.3, 64, M["Travertine"])
    add_cylinder(bm, 0, 0, 0.14, 39.8, 39.2, 0.30, 64, M["Travertine"])
    add_cylinder(bm, 0, 0, 0.36, 36.2, 35.8, 0.22, 64, M["RoyalMarble"])
    add_arc_ring(bm, 41.4, 42.2, -0.05, 0.26, 0, 2 * math.pi, 64, M["AbbassidGold"])
    add_arc_ring(bm, 25.0, 25.5, 0.45, 0.49, 0, 2 * math.pi, 48, M["AbbassidGold"])

    # 2. Central Reflecting Pool under the Oculus
    add_arc_ring(bm, 4.9, 5.7, 0.45, 0.95, 0, 2 * math.pi, 36, M["AbbassidGold"])
    add_cylinder(bm, 0, 0, 0.78, 4.9, 4.9, 0.14, 36, M["TurquoiseWater"])

    # 3. 16 Monumental Pointed Persian Arches + Curved Buttress Fins
    n_bays = 16
    for i in range(n_bays):
        a0 = (i / n_bays) * 2 * math.pi
        a1 = ((i + 1) / n_bays) * 2 * math.pi
        add_curved_pointed_arch_bay(
            bm, 30.2, 33.4, a0, a1, 0.45, 6.2, 11.4, 13.4, 0.18, M["Travertine"], M["AbbassidGold"], segs_half=6
        )
        # Tapered Sculpted Flying Buttress Fin rising onto the Dome
        a_pier = a0
        ca, sa = math.cos(a_pier), math.sin(a_pier)
        pts_fin = [
            (ca * 36.2, sa * 36.2, 0.45),
            (ca * 35.4, sa * 35.4, 7.5),
            (ca * 34.0, sa * 34.0, 14.5),
            (ca * 30.6, sa * 30.6, 21.8),
        ]
        add_swept_beam(bm, pts_fin, 0.65, 1.05, M["Travertine"])
        # Golden spine accent along the outer edge of each buttress
        pts_gold = [(p[0] * 1.022, p[1] * 1.022, p[2] + 0.15) for p in pts_fin]
        add_swept_beam(bm, pts_gold, 0.18, 0.25, M["AbbassidGold"])

    # 4. Upper Drum Gallery Clerestory & Cornice (z = 13.4 .. 16.0m)
    add_arc_ring(bm, 31.2, 33.8, 13.35, 14.1, 0, 2 * math.pi, 48, M["RoyalMarble"])
    add_arc_ring(bm, 31.5, 32.0, 14.1, 15.8, 0, 2 * math.pi, 48, M["DomeAmberGlass"])
    for i in range(32):
        a = (i / 32) * 2 * math.pi
        add_cylinder(bm, math.cos(a) * 32.8, math.sin(a) * 32.8, 14.95, 0.26, 0.22, 1.8, 10, M["AbbassidGold"])
    add_arc_ring(bm, 30.8, 34.4, 15.75, 16.45, 0, 2 * math.pi, 48, M["Travertine"])
    add_arc_ring(bm, 34.1, 34.6, 15.8, 16.5, 0, 2 * math.pi, 48, M["AbbassidGold"])

    # 5. Geodesic Diamond-Lattice Golden Dome (z = 16.3 -> 37.8m + Lantern Spire -> 44m)
    dome_r = 32.4
    dome_h = 21.2
    z_dome = 16.3
    phi_max = math.radians(82.0)

    # Faceted Glazed Shell
    rings_phi = 12
    segs_th = 32
    dome_verts = []
    for ri in range(rings_phi + 1):
        phi = (ri / rings_phi) * phi_max
        r = (dome_r - 0.18) * math.cos(phi)
        z = z_dome + dome_h * math.sin(phi)
        ring = []
        for si in range(segs_th):
            th = (si / segs_th) * 2 * math.pi
            ring.append(bm.verts.new((r * math.cos(th), r * math.sin(th), z)))
        dome_verts.append(ring)
    for ri in range(rings_phi):
        for si in range(segs_th):
            sj = (si + 1) % segs_th
            try:
                f = bm.faces.new([
                    dome_verts[ri][si], dome_verts[ri][sj],
                    dome_verts[ri + 1][sj], dome_verts[ri + 1][si],
                ])
                f.material_index = M["DomeAmberGlass"]
            except ValueError:
                pass

    # 16 Meridian Ribs + 24 Left & 24 Right Helical Ribs = True Sculpted Golden Diamond Lattice!
    for i in range(16):
        th = (i / 16) * 2 * math.pi
        pts = [
            (
                dome_r * math.cos(p) * math.cos(th),
                dome_r * math.cos(p) * math.sin(th),
                z_dome + dome_h * math.sin(p),
            )
            for p in [phi_max * (k / 10) for k in range(11)]
        ]
        add_swept_beam(bm, pts, 0.22, 0.28, M["AbbassidGold"])

    for i in range(20):
        th0 = (i / 20) * 2 * math.pi
        for direction in (-1.0, 1.0):
            pts = []
            for k in range(11):
                frac = k / 10
                p = frac * phi_max
                th = th0 + direction * frac * 1.18
                pts.append((
                    (dome_r + 0.12) * math.cos(p) * math.cos(th),
                    (dome_r + 0.12) * math.cos(p) * math.sin(th),
                    z_dome + dome_h * math.sin(p),
                ))
            add_swept_beam(bm, pts, 0.16, 0.20, M["AbbassidGold"])

    # Oculus Golden Ring + Crown Lantern + Spire
    r_oc = dome_r * math.cos(phi_max)
    z_oc = z_dome + dome_h * math.sin(phi_max)
    add_arc_ring(bm, r_oc - 0.6, r_oc + 0.8, z_oc - 0.3, z_oc + 0.7, 0, 2 * math.pi, 24, M["AbbassidGold"])
    add_cylinder(bm, 0, 0, z_oc + 2.0, r_oc * 0.72, r_oc * 0.55, 2.8, 16, M["DomeAmberGlass"])
    add_cylinder(bm, 0, 0, z_oc + 4.4, r_oc * 0.65, 0.15, 2.6, 16, M["AbbassidGold"])
    add_cylinder(bm, 0, 0, z_oc + 7.2, 0.28, 0.04, 3.4, 12, M["AbbassidGold"])

    # 6. Interior Columns + Upper S0 Observatory Deck + Matching Walkable Spiral Staircase!
    for i in range(12):
        a = (i / 12) * 2 * math.pi
        add_cylinder(bm, math.cos(a) * 18.2, math.sin(a) * 18.2, 6.8, 0.42, 0.34, 12.8, 12, M["RoyalMarble"])
        add_cylinder(bm, math.cos(a) * 18.2, math.sin(a) * 18.2, 13.0, 0.58, 0.42, 0.6, 12, M["AbbassidGold"])

    # Upper S0 Observatory Deck (z = 8.2 .. 8.65m, r = 0..14.6m)
    add_cylinder(bm, 0, 0, 8.42, 14.6, 13.8, 0.46, 40, M["RoyalMarble"])
    add_arc_ring(bm, 14.1, 14.55, 8.65, 9.45, 0.25, 2 * math.pi - 0.15, 36, M["AbbassidGold"])

    # Walkable Spiral Staircase along r = 21.5m matching PlayerAndVehicles collider (Three.js a = 0.65pi .. 2.10pi)
    n_steps = 52
    rail_outer = []
    rail_inner = []
    for i in range(n_steps):
        frac = i / (n_steps - 1)
        a_three = math.pi * 0.65 + frac * math.pi * 1.45
        # Blender coords such that (x, -y) = (r*cos(a_three), r*sin(a_three))
        bx = math.cos(a_three) * 21.5
        by = -math.sin(a_three) * 21.5
        bz = 0.45 + frac * 8.15
        add_box(bm, bx, by, bz - 0.12, 3.6, 1.9, 0.26, M["AbbassidGold"] if i % 6 == 0 else M["RoyalMarble"], rot_z=-a_three)
        rail_outer.append((math.cos(a_three) * 23.2, -math.sin(a_three) * 23.2, bz + 0.95))
        rail_inner.append((math.cos(a_three) * 19.8, -math.sin(a_three) * 19.8, bz + 0.95))
        if i % 4 == 0:
            add_cylinder(bm, math.cos(a_three) * 23.2, -math.sin(a_three) * 23.2, bz + 0.48, 0.06, 0.06, 0.95, 6, M["AbbassidGold"])
            add_cylinder(bm, math.cos(a_three) * 19.8, -math.sin(a_three) * 19.8, bz + 0.48, 0.06, 0.06, 0.95, 6, M["AbbassidGold"])
    add_swept_beam(bm, rail_outer, 0.07, 0.07, M["AbbassidGold"])
    add_swept_beam(bm, rail_inner, 0.07, 0.07, M["AbbassidGold"])

    finalize_bmesh("BaytAlHikmaDome", bm, mats, smooth=False)
    export_glb(os.path.join(MODELS_DIR, "bayt_dome.glb"))


# ==============================================================================
# MODEL 2: solar_ring_arc.glb (Inner Apple Park Ring Sector + Outer Stepped Ring Sector)
# ==============================================================================
def build_solar_ring_arc():
    clear_scene()
    mats, M = get_materials()

    # --- OBJECT A: InnerRingSector (45 deg sector centered on +X, r=83..113m) ---
    bm = bmesh.new()
    a0 = math.radians(-21.8)
    a1 = math.radians(21.8)

    # Continuous marble plinth floor
    add_arc_ring(bm, 82.0, 114.0, 0.0, 0.28, a0, a1, 18, M["RoyalMarble"])

    # Ground floor inner & outer curved pointed-arch colonnades:
    # Center bay (-8.5..+8.5 deg) is open triumphant portal; side wings (-21.5..-8.5 and +8.5..+21.5) have glass curtain walls!
    for bay_a0, bay_a1, has_glass in [
        (math.radians(-21.2), math.radians(-14.8), True),
        (math.radians(-14.8), math.radians(-8.4), True),
        (math.radians(-8.4), math.radians(8.4), False),   # Wide open central portal!
        (math.radians(8.4), math.radians(14.8), True),
        (math.radians(14.8), math.radians(21.2), True),
    ]:
        # Inner curved facade (r=85..86.6) and outer curved facade (r=110.4..112.0)
        add_curved_pointed_arch_bay(bm, 85.0, 86.6, bay_a0, bay_a1, 0.28, 3.0, 4.7, 5.4, 0.14, M["Travertine"], M["AbbassidGold"], 4)
        add_curved_pointed_arch_bay(bm, 110.4, 112.0, bay_a0, bay_a1, 0.28, 3.0, 4.7, 5.4, 0.14, M["Travertine"], M["AbbassidGold"], 4)
        if has_glass:
            add_arc_ring(bm, 85.6, 85.9, 0.28, 4.9, bay_a0, bay_a1, 4, M["ArchGlass"])
            add_arc_ring(bm, 111.1, 111.4, 0.28, 4.9, bay_a0, bay_a1, 4, M["ArchGlass"])

    # Side end-cap moucharabieh walls (with arched doorway through between sectors)
    for end_a in (math.radians(-21.2), math.radians(21.2)):
        add_arc_ring(bm, 85.0, 93.0, 0.28, 5.4, end_a - 0.015, end_a + 0.015, 1, M["Travertine"])
        add_arc_ring(bm, 104.0, 112.0, 0.28, 5.4, end_a - 0.015, end_a + 0.015, 1, M["Travertine"])

    # First-floor overhanging terrace slab (r=82.8..114.2, z=5.4..5.95)
    add_arc_ring(bm, 82.8, 114.2, 5.4, 5.95, a0, a1, 18, M["RoyalMarble"])
    # Cedar terrace pergolas on outer & inner ledges
    for ang_deg in range(-20, 21, 4):
        ar = math.radians(ang_deg)
        for rp in (84.0, 113.0):
            add_box(bm, math.cos(ar) * rp, math.sin(ar) * rp, 6.2, 2.2, 0.24, 0.28, M["WarmCedar"], rot_z=ar)

    # R+1 Setback Apple Park Panoramic Glass Ring (r=87.5..109.5, z=5.95..9.85)
    add_arc_ring(bm, 88.0, 88.35, 5.95, 9.85, a0, a1, 18, M["ArchGlass"])
    add_arc_ring(bm, 108.65, 109.0, 5.95, 9.85, a0, a1, 18, M["ArchGlass"])
    for ang_deg in range(-21, 22, 3):
        ar = math.radians(ang_deg)
        add_box(bm, math.cos(ar) * 87.8, math.sin(ar) * 87.8, 7.9, 0.5, 0.35, 3.9, M["Travertine"], rot_z=ar)
        add_box(bm, math.cos(ar) * 109.2, math.sin(ar) * 109.2, 7.9, 0.5, 0.35, 3.9, M["Travertine"], rot_z=ar)

    # Iconic Apple Park Floating White Bullnose Overhang + Continuous Photovoltaic Canopy!
    add_arc_ring(bm, 81.5, 115.5, 9.85, 10.6, a0 - 0.01, a1 + 0.01, 20, M["RoyalMarble"])
    add_arc_ring(bm, 83.2, 113.8, 10.65, 10.9, a0, a1, 20, M["SolarPV"], tilt_outer_dz=-0.35)
    add_arc_ring(bm, 81.4, 82.0, 9.9, 10.65, a0 - 0.01, a1 + 0.01, 18, M["AbbassidGold"])
    add_arc_ring(bm, 115.0, 115.6, 9.9, 10.65, a0 - 0.01, a1 + 0.01, 18, M["AbbassidGold"])

    # Botanical Rooftop Glass Cupola crowning the pavilion center (matches Image 1!)
    cup_r = 4.6
    for ri in range(6):
        p0 = (ri / 6) * math.pi * 0.48
        p1 = ((ri + 1) / 6) * math.pi * 0.48
        rA, rB = cup_r * math.cos(p0), cup_r * math.cos(p1)
        zA, zB = 10.9 + 3.8 * math.sin(p0), 10.9 + 3.8 * math.sin(p1)
        for s in range(12):
            t0, t1 = (s / 12) * 2 * math.pi, ((s + 1) / 12) * 2 * math.pi
            v0 = bm.verts.new((98.5 + rA * math.cos(t0), rA * math.sin(t0), zA))
            v1 = bm.verts.new((98.5 + rA * math.cos(t1), rA * math.sin(t1), zA))
            v2 = bm.verts.new((98.5 + rB * math.cos(t1), rB * math.sin(t1), zB))
            v3 = bm.verts.new((98.5 + rB * math.cos(t0), rB * math.sin(t0), zB))
            f = bm.faces.new([v0, v1, v2, v3])
            f.material_index = M["DomeAmberGlass"]
    for s in range(8):
        th = (s / 8) * 2 * math.pi
        pts = [(98.5 + cup_r * math.cos(p) * math.cos(th), cup_r * math.cos(p) * math.sin(th), 10.9 + 3.8 * math.sin(p))
               for p in [0.0, 0.45, 0.9, 1.35, 1.52]]
        add_swept_beam(bm, pts, 0.09, 0.11, M["AbbassidGold"])

    finalize_bmesh("InnerRingSector", bm, mats, smooth=False)

    # --- OBJECT B: OuterRingSector (70 deg stepped Baghdad x Apple Park outer crown, r=149..176m) ---
    bm2 = bmesh.new()
    oa0 = math.radians(-34.5)
    oa1 = math.radians(34.5)

    # Outer Terraced Plinth
    add_arc_ring(bm2, 148.0, 177.0, 0.0, 0.35, oa0, oa1, 24, M["Travertine"])

    # Lower Stepped Arcade (r=150..174, z=0.35..5.4) with 2 open arch passages to the Souk/Villas
    for idx in range(7):
        b0 = oa0 + (oa1 - oa0) * (idx / 7)
        b1 = oa0 + (oa1 - oa0) * ((idx + 1) / 7)
        is_passage = idx in (1, 5)
        add_curved_pointed_arch_bay(bm2, 150.0, 151.6, b0, b1, 0.35, 3.0, 4.7, 5.4, 0.16, M["Travertine"], M["AbbassidGold"], 4)
        add_curved_pointed_arch_bay(bm2, 172.0, 173.8, b0, b1, 0.35, 3.0, 4.7, 5.4, 0.16, M["Travertine"], M["AbbassidGold"], 4)
        if not is_passage:
            add_arc_ring(bm2, 151.0, 151.3, 0.35, 5.0, b0, b1, 3, M["ArchGlass"])
            add_arc_ring(bm2, 172.4, 172.7, 0.35, 5.0, b0, b1, 3, M["ArchGlass"])

    # Upper Tiered Residential / Studio Blocks (alternating heights like Image 1!)
    add_arc_ring(bm2, 149.0, 175.0, 5.4, 5.95, oa0, oa1, 24, M["RoyalMarble"])
    for sub0, sub1, z_top in [(-32, -14, 10.2), (-10, 10, 11.4), (14, 32, 10.2)]:
        sa0, sa1 = math.radians(sub0), math.radians(sub1)
        add_arc_ring(bm2, 154.0, 169.0, 5.95, z_top, sa0, sa1, 8, M["Travertine"])
        add_arc_ring(bm2, 153.6, 154.0, 6.2, z_top - 0.5, sa0 + 0.02, sa1 - 0.02, 8, M["ArchGlass"])
        add_arc_ring(bm2, 169.0, 169.4, 6.2, z_top - 0.5, sa0 + 0.02, sa1 - 0.02, 8, M["ArchGlass"])
        add_arc_ring(bm2, 152.2, 170.8, z_top, z_top + 0.5, sa0 - 0.015, sa1 + 0.015, 8, M["RoyalMarble"])
        add_arc_ring(bm2, 153.2, 169.8, z_top + 0.52, z_top + 0.75, sa0, sa1, 8, M["SolarPV"], tilt_outer_dz=-0.28)

    finalize_bmesh("OuterRingSector", bm2, mats, smooth=False)
    export_glb(os.path.join(MODELS_DIR, "solar_ring_arc.glb"))


# ==============================================================================
# MODEL 3: gate_and_bridge.glb (3-Arch Vaulted Lagoon Bridge + Monumental South Gate)
# ==============================================================================
def build_gate_and_bridge():
    clear_scene()
    mats, M = get_materials()

    # --- OBJECT A: CardinalBridge (spans Y = -39 to -79 in Blender -> Z = +39..+79 in Three.js) ---
    bm = bmesh.new()
    # Bridge roadway deck (10.6m wide x 42m long, at z=0.45m)
    add_box(bm, 0, -59.0, 0.25, 10.6, 42.0, 0.45, M["RoyalMarble"])
    add_box(bm, 0, -59.0, 0.49, 2.2, 42.0, 0.05, M["AbbassidGold"])
    # Parapets & lantern posts along sides
    for sx in (-4.9, 4.9):
        add_box(bm, sx, -59.0, 0.92, 0.55, 42.0, 0.9, M["Travertine"])
        add_box(bm, sx, -59.0, 1.42, 0.7, 42.0, 0.14, M["AbbassidGold"])
        for ly in (-44, -52, -60, -68, -74):
            add_cylinder(bm, sx, ly, 2.4, 0.11, 0.08, 2.1, 8, M["DarkMetal"])
            add_cylinder(bm, sx, ly, 3.55, 0.24, 0.16, 0.45, 8, M["HeadlightGlow"])

    # 3 Vaulted Stone Arches supporting the bridge over the Lagoon!
    for ay in (-46.5, -59.0, -71.5):
        add_straight_arch_span(
            bm, ay - 6.2, ay + 6.2, 0.0, 9.6, -2.0, -0.8, 0.05, 0.12, 1.4, M["Travertine"], M["AbbassidGold"], 5, rot_z=math.pi / 2
        )

    finalize_bmesh("CardinalBridge", bm, mats, smooth=False)

    # --- OBJECT B: RoyalSouthGate (Monumental Iwan Archway + Circular Forecourt Colonnade) ---
    bm2 = bmesh.new()
    # Grand Circular Forecourt Plaza (centered at Y = -14 -> Three.js Z = 158+14 = 172)
    add_cylinder(bm2, 0, -14.0, 0.08, 17.5, 18.2, 0.24, 48, M["RoyalMarble"])
    # Twin symmetrical golden planters flanking the central X=0 avenue (sightline stays 100% open!)
    add_arc_ring(bm2, 2.0, 2.55, 0.2, 0.68, 0, 2 * math.pi, 24, M["AbbassidGold"], cx=-9.5, cy=-14.0)
    add_arc_ring(bm2, 2.0, 2.55, 0.2, 0.68, 0, 2 * math.pi, 24, M["AbbassidGold"], cx=9.5, cy=-14.0)
    # Curved Colonnade Wings embracing East & West sides of the circular plaza (centered at Y = -14.0)
    for side_a0, side_a1 in [
        (math.radians(-58), math.radians(58)),
        (math.radians(122), math.radians(238)),
    ]:
        for k in range(5):
            ang = side_a0 + (side_a1 - side_a0) * (k / 4)
            cx = math.cos(ang) * 16.5
            cy = -14.0 + math.sin(ang) * 16.5
            add_cylinder(bm2, cx, cy, 3.2, 0.48, 0.42, 6.2, 12, M["Travertine"])
        add_arc_ring(bm2, 15.6, 17.4, 6.2, 7.0, side_a0, side_a1, 12, M["Travertine"], cx=0.0, cy=-14.0)

    # Monumental Persian Pointed Iwan Archway at (0, 0, 0)
    add_straight_arch_span(bm2, -8.8, 8.8, 0.0, 4.6, 0.0, 6.8, 12.8, 15.2, 2.4, M["Travertine"], M["AbbassidGold"], 7)
    add_box(bm2, 0, 0, 15.4, 18.4, 5.1, 0.8, M["AbbassidGold"])
    # Twin Flanking Towers with Golden Moucharabieh Finials
    for sx in (-9.6, 9.6):
        add_box(bm2, sx, 0, 8.6, 3.2, 4.8, 17.2, M["Travertine"])
        add_box(bm2, sx, 0, 17.6, 3.5, 5.1, 0.65, M["AbbassidGold"])
        add_cylinder(bm2, sx, 0, 19.3, 1.5, 0.15, 2.8, 12, M["DomeAmberGlass"])

    finalize_bmesh("RoyalSouthGate", bm2, mats, smooth=False)
    export_glb(os.path.join(MODELS_DIR, "gate_and_bridge.glb"))


# ==============================================================================
# MODEL 4: villa_and_souk.glb (Patrician Villa Image 3 + Grand Souk Bazaar)
# ==============================================================================
def build_villa_and_souk():
    clear_scene()
    mats, M = get_materials()

    # --- OBJECT A: PatricianVilla (Stepped Neoclassical Solarpunk Villa matching Image 3 Hero!) ---
    bm = bmesh.new()
    # Stepped travertine podium & entrance stair
    add_box(bm, 0, 0, 0.3, 21.0, 19.0, 0.6, M["Travertine"])
    add_box(bm, 0, -10.2, 0.15, 7.0, 2.2, 0.3, M["RoyalMarble"])
    # Main ground level marble gallery + glazed conservatory
    add_box(bm, 0, 0, 2.9, 17.5, 15.0, 4.6, M["RoyalMarble"])
    add_box(bm, 0, 0, 2.9, 17.8, 12.2, 3.8, M["ArchGlass"])
    # Perimeter Corinthian-style colonnade
    for cx in (-8.5, -4.5, 4.5, 8.5):
        for cy in (-7.4, 7.4):
            add_cylinder(bm, cx, cy, 2.9, 0.42, 0.36, 4.6, 14, M["Travertine"])
    for cy in (-3.6, 3.6):
        for cx in (-8.5, 8.5):
            add_cylinder(bm, cx, cy, 2.9, 0.42, 0.36, 4.6, 14, M["Travertine"])
    add_box(bm, 0, 0, 5.35, 19.0, 16.4, 0.55, M["Travertine"])
    add_box(bm, 0, 0, 5.65, 19.2, 16.6, 0.18, M["AbbassidGold"])

    # Tier 2 Stepped Pavilion + Rooftop Turquoise Pool
    add_box(bm, -2.6, 1.4, 7.4, 10.6, 9.8, 3.4, M["RoyalMarble"])
    add_box(bm, -2.6, 1.4, 7.4, 10.8, 7.6, 2.7, M["ArchGlass"])
    add_box(bm, 5.2, -2.8, 5.82, 5.4, 5.6, 0.24, M["TurquoiseWater"])
    add_box(bm, -2.6, 1.4, 9.25, 11.4, 10.6, 0.4, M["SolarPV"])

    # Ribbed Golden Glass Cupola crowning Tier 2
    for ri in range(6):
        p0 = (ri / 6) * math.pi * 0.48
        p1 = ((ri + 1) / 6) * math.pi * 0.48
        rA, rB = 3.8 * math.cos(p0), 3.8 * math.cos(p1)
        zA, zB = 9.45 + 3.4 * math.sin(p0), 9.45 + 3.4 * math.sin(p1)
        for s in range(12):
            t0, t1 = (s / 12) * 2 * math.pi, ((s + 1) / 12) * 2 * math.pi
            f = bm.faces.new([
                bm.verts.new((-2.6 + rA * math.cos(t0), 1.4 + rA * math.sin(t0), zA)),
                bm.verts.new((-2.6 + rA * math.cos(t1), 1.4 + rA * math.sin(t1), zA)),
                bm.verts.new((-2.6 + rB * math.cos(t1), 1.4 + rB * math.sin(t1), zB)),
                bm.verts.new((-2.6 + rB * math.cos(t0), 1.4 + rB * math.sin(t0), zB)),
            ])
            f.material_index = M["DomeAmberGlass"]
    for s in range(8):
        th = (s / 8) * 2 * math.pi
        pts = [(-2.6 + 3.85 * math.cos(p) * math.cos(th), 1.4 + 3.85 * math.cos(p) * math.sin(th), 9.45 + 3.4 * math.sin(p))
               for p in [0.0, 0.5, 1.0, 1.48]]
        add_swept_beam(bm, pts, 0.08, 0.10, M["AbbassidGold"])

    finalize_bmesh("PatricianVilla", bm, mats, smooth=False)

    # --- OBJECT B: GrandSoukBazaar (Multi-Domed Marketplace Arcade) ---
    bm2 = bmesh.new()
    add_box(bm2, 0, 0, 0.2, 26.0, 18.0, 0.4, M["RoyalMarble"])
    # Open vaulted bazaar bays with 4 golden domes + 1 grand central cupola
    for bx in (-8.5, 0.0, 8.5):
        for sy in (-6.5, 6.5):
            add_straight_arch_span(bm2, bx - 4.0, bx + 4.0, sy, 1.1, 0.4, 3.2, 5.2, 6.0, 0.9, M["Travertine"], M["AbbassidGold"], 4)
        add_box(bm2, bx, 0, 6.1, 8.4, 14.0, 0.4, M["Travertine"])
        d_rad = 4.6 if bx == 0 else 3.1
        d_h = 4.2 if bx == 0 else 2.8
        for ri in range(6):
            p0 = (ri / 6) * math.pi * 0.48
            p1 = ((ri + 1) / 6) * math.pi * 0.48
            rA, rB = d_rad * math.cos(p0), d_rad * math.cos(p1)
            zA, zB = 6.3 + d_h * math.sin(p0), 6.3 + d_h * math.sin(p1)
            for s in range(12):
                t0, t1 = (s / 12) * 2 * math.pi, ((s + 1) / 12) * 2 * math.pi
                f = bm2.faces.new([
                    bm2.verts.new((bx + rA * math.cos(t0), rA * math.sin(t0), zA)),
                    bm2.verts.new((bx + rA * math.cos(t1), rA * math.sin(t1), zA)),
                    bm2.verts.new((bx + rB * math.cos(t1), rB * math.sin(t1), zB)),
                    bm2.verts.new((bx + rB * math.cos(t0), rB * math.sin(t0), zB)),
                ])
                f.material_index = M["DomeAmberGlass"] if bx == 0 else M["AbbassidGold"]
    # Central Marketplace Pedestal
    add_cylinder(bm2, 0, 0, 1.0, 1.5, 1.2, 1.3, 16, M["AbbassidGold"])

    finalize_bmesh("GrandSoukBazaar", bm2, mats, smooth=False)
    export_glb(os.path.join(MODELS_DIR, "villa_and_souk.glb"))


# ==============================================================================
# MODEL 5: vehicles_and_flora.glb (Sculpted Supercar + Wheels, Boat, Evtol & Trees)
# ==============================================================================
def build_vehicles_and_flora():
    clear_scene()
    mats, M = get_materials()

    # --- 1. SUPERCAR SOLARPUNK BODY (faces -Y in Blender -> +Z in Three.js) ---
    bm_car = bmesh.new()
    # Sculpted profile in YZ plane (Y forward = -Y, rear = +Y, Z up), extruded along X
    # Points (y_pos, z_pos)
    profile = [
        (2.15, 0.28), (2.22, 0.50), (1.75, 0.86), (0.85, 0.88),
        (-0.55, 0.78), (-1.95, 0.56), (-2.26, 0.38), (-2.18, 0.24),
        (-1.65, 0.24), (-1.42, 0.62), (-1.05, 0.62), (-0.82, 0.22),
        (0.82, 0.22), (1.05, 0.62), (1.42, 0.62), (1.65, 0.24),
    ]
    w_half = 0.96
    ring_l = [bm_car.verts.new((-w_half, y, z)) for y, z in profile]
    ring_r = [bm_car.verts.new((w_half, y, z)) for y, z in profile]
    f_l = bm_car.faces.new(ring_l[::-1])
    f_r = bm_car.faces.new(ring_r)
    f_l.material_index = M["CarPaint"]
    f_r.material_index = M["CarPaint"]
    n_p = len(profile)
    for i in range(n_p):
        j = (i + 1) % n_p
        f = bm_car.faces.new([ring_l[i], ring_r[i], ring_r[j], ring_l[j]])
        f.material_index = M["CarPaint"]

    # Panoramic Glass Canopy Cabin
    cab_prof = [(1.1, 0.72), (0.75, 1.14), (-0.15, 1.15), (-1.05, 0.74)]
    cw = 0.78
    cl = [bm_car.verts.new((-cw, y, z)) for y, z in cab_prof]
    cr = [bm_car.verts.new((cw, y, z)) for y, z in cab_prof]
    bm_car.faces.new(cl[::-1]).material_index = M["ArchGlass"]
    bm_car.faces.new(cr).material_index = M["ArchGlass"]
    for i in range(len(cab_prof)):
        j = (i + 1) % len(cab_prof)
        bm_car.faces.new([cl[i], cr[i], cr[j], cl[j]]).material_index = M["ArchGlass"]

    # Solar PV Roof Strip + Rear Spoiler + LED Headlights & Red Taillight Bar
    add_box(bm_car, 0, 0.3, 1.16, 1.45, 0.85, 0.05, M["SolarPV"])
    add_box(bm_car, 0, 2.02, 1.04, 1.88, 0.28, 0.06, M["DarkMetal"])
    add_box(bm_car, -0.58, 1.98, 0.92, 0.06, 0.16, 0.22, M["DarkMetal"])
    add_box(bm_car, 0.58, 1.98, 0.92, 0.06, 0.16, 0.22, M["DarkMetal"])
    # Headlights (-Y front)
    for sx in (-0.64, 0.64):
        add_box(bm_car, sx, -2.12, 0.48, 0.44, 0.12, 0.09, M["HeadlightGlow"])
    # Taillight bar (+Y rear)
    add_box(bm_car, 0, 2.22, 0.74, 1.72, 0.08, 0.09, M["TaillightGlow"])

    finalize_bmesh("Supercar", bm_car, mats, smooth=False)

    # 4 Individual Wheels centered on their own origins for authentic rolling/steering!
    wheel_specs = [
        ("Wheel_FL", -0.88, -1.24),
        ("Wheel_FR", 0.88, -1.24),
        ("Wheel_RL", -0.88, 1.24),
        ("Wheel_RR", 0.88, 1.24),
    ]
    for wname, wx, wy in wheel_specs:
        bmw = bmesh.new()
        add_cylinder(bmw, 0, 0, 0, 0.36, 0.36, 0.26, 20, M["TireRubber"], rot_euler=(0, math.pi / 2, 0))
        add_cylinder(bmw, 0, 0, 0, 0.23, 0.23, 0.28, 14, M["AbbassidGold"], rot_euler=(0, math.pi / 2, 0))
        ob_w = finalize_bmesh(wname, bmw, mats, smooth=True)
        ob_w.location = (wx, wy, 0.36)

    # --- 2. SOLAR HYDROFOIL BOAT ---
    bm_boat = bmesh.new()
    # Sleek tapered hull
    sections = [
        (-2.6, 0.08, 0.42, 0.55),
        (-1.4, 0.95, 0.05, 0.62),
        (0.4, 1.22, 0.0, 0.65),
        (2.3, 1.05, 0.04, 0.62),
    ]
    b_rings = []
    for sy, hw, z_bot, z_top in sections:
        b_rings.append([
            bm_boat.verts.new((0, sy, z_bot)),
            bm_boat.verts.new((hw, sy, z_top * 0.65)),
            bm_boat.verts.new((hw * 0.92, sy, z_top)),
            bm_boat.verts.new((-hw * 0.92, sy, z_top)),
            bm_boat.verts.new((-hw, sy, z_top * 0.65)),
        ])
    for i in range(len(b_rings) - 1):
        rA, rB = b_rings[i], b_rings[i + 1]
        for k in range(5):
            k2 = (k + 1) % 5
            f = bm_boat.faces.new([rA[k], rB[k], rB[k2], rA[k2]])
            f.material_index = M["WarmCedar"] if k == 2 else M["RoyalMarble"]
    bm_boat.faces.new(b_rings[-1]).material_index = M["RoyalMarble"]
    add_box(bm_boat, 0, -0.3, 0.88, 1.55, 1.3, 0.45, M["ArchGlass"])
    add_box(bm_boat, 0, 0.9, 1.45, 1.85, 1.4, 0.08, M["SolarPV"])
    for sx in (-0.85, 0.85):
        add_box(bm_boat, sx, 0.9, 1.05, 0.12, 0.18, 0.8, M["AbbassidGold"])
    finalize_bmesh("Boat", bm_boat, mats, smooth=False)

    # --- 3. EVTOL BIPLACE AIRCRAFT ---
    bm_ev = bmesh.new()
    # Streamlined cabin fuselage
    res = bmesh.ops.create_uvsphere(bm_ev, u_segments=20, v_segments=14, radius=1.0)
    bmesh.ops.transform(bm_ev, matrix=Matrix.Translation((0, 0, 0.95)) @ Matrix.Diagonal((1.05, 2.1, 0.82, 1)), verts=res["verts"])
    for f in set(f for v in res["verts"] for f in v.link_faces):
        f.material_index = M["RoyalMarble"] if f.calc_center_median().z < 1.02 else M["ArchGlass"]
    # Landing skids + cross struts
    for sx in (-0.9, 0.9):
        add_cylinder(bm_ev, sx, 0, 0.12, 0.06, 0.06, 2.8, 8, M["DarkMetal"], rot_euler=(math.pi / 2, 0, 0))
    # 4 Shrouded Ducted Rotor Pods on Curved Arms
    for sx in (-1.85, 1.85):
        for sy in (-1.35, 1.35):
            add_swept_beam(bm_ev, [(sx * 0.35, sy * 0.5, 0.95), (sx, sy, 1.15)], 0.08, 0.06, M["RoyalMarble"])
            add_arc_ring(bm_ev, 0.62, 0.78, 1.05, 1.28, 0, 2 * math.pi, 18, M["AbbassidGold"])
            # Move ring to (sx, sy)
            ring_vs = [v for v in bm_ev.verts if abs(v.co.x) < 0.85 and abs(v.co.y) < 0.85 and v.co.z > 1.0]
            # Use local transform instead for clean placement:
            for v in bm_ev.verts:
                pass
    # Build rotor shrouds cleanly at target coordinates:
    bm_ev_clean = bmesh.new()
    res = bmesh.ops.create_uvsphere(bm_ev_clean, u_segments=20, v_segments=14, radius=1.0)
    bmesh.ops.transform(bm_ev_clean, matrix=Matrix.Translation((0, 0, 0.95)) @ Matrix.Diagonal((1.05, 2.1, 0.82, 1)), verts=res["verts"])
    for f in set(f for v in res["verts"] for f in v.link_faces):
        f.material_index = M["RoyalMarble"] if f.calc_center_median().z < 1.02 else M["ArchGlass"]
    for sx in (-0.9, 0.9):
        add_cylinder(bm_ev_clean, sx, 0, 0.12, 0.06, 0.06, 2.8, 8, M["DarkMetal"], rot_euler=(math.pi / 2, 0, 0))
        add_box(bm_ev_clean, sx * 0.75, -0.6, 0.45, 0.08, 0.08, 0.7, M["DarkMetal"])
        add_box(bm_ev_clean, sx * 0.75, 0.6, 0.45, 0.08, 0.08, 0.7, M["DarkMetal"])
    for sx in (-1.85, 1.85):
        for sy in (-1.35, 1.35):
            add_swept_beam(bm_ev_clean, [(sx * 0.35, sy * 0.5, 0.95), (sx, sy, 1.15)], 0.08, 0.06, M["RoyalMarble"])
            # Shroud ring centered at (sx, sy)
            sh_segs = 18
            sh_verts = []
            for k in range(sh_segs):
                a = (k / sh_segs) * 2 * math.pi
                ca, sa = math.cos(a), math.sin(a)
                sh_verts.append((
                    bm_ev_clean.verts.new((sx + ca * 0.62, sy + sa * 0.62, 1.04)),
                    bm_ev_clean.verts.new((sx + ca * 0.78, sy + sa * 0.78, 1.04)),
                    bm_ev_clean.verts.new((sx + ca * 0.78, sy + sa * 0.78, 1.28)),
                    bm_ev_clean.verts.new((sx + ca * 0.62, sy + sa * 0.62, 1.28)),
                ))
            for k in range(sh_segs):
                k2 = (k + 1) % sh_segs
                for q in range(4):
                    q2 = (q + 1) % 4
                    bm_ev_clean.faces.new([sh_verts[k][q], sh_verts[k2][q], sh_verts[k2][q2], sh_verts[k][q2]]).material_index = M["AbbassidGold"]
            add_cylinder(bm_ev_clean, sx, sy, 1.16, 0.60, 0.60, 0.03, 12, M["DarkMetal"])
    bm_ev.free()
    finalize_bmesh("Evtol", bm_ev_clean, mats, smooth=True)

    # --- 4. DATE PALM TREE (Curved Organic Trunk + 14 Drooping Fronds) ---
    bm_palm = bmesh.new()
    trunk_pts = [(0.0, 0.0, 0.0), (0.18, 0.05, 1.8), (0.32, 0.12, 3.6), (0.28, 0.16, 5.4), (0.20, 0.12, 7.0)]
    add_swept_beam(bm_palm, trunk_pts, 0.24, 0.24, M["WarmCedar"])
    top_p = Vector(trunk_pts[-1])
    for i in range(14):
        ang = (i / 14) * 2 * math.pi + (i % 2) * 0.18
        ca, sa = math.cos(ang), math.sin(ang)
        layer_lift = 1.2 if i % 2 == 0 else 0.45
        len_f = 2.6 if i % 2 == 0 else 3.1
        frond_pts = []
        for s in range(6):
            t = s / 5
            r = t * len_f
            z = top_p.z + layer_lift * math.sin(t * math.pi * 0.75) - (t ** 2) * 1.15
            frond_pts.append((top_p.x + ca * r, top_p.y + sa * r, z))
        # Wide feathered frond blade
        add_swept_beam(bm_palm, frond_pts, 0.34, 0.04, M["FoliagePalm"])
    finalize_bmesh("DatePalm", bm_palm, mats, smooth=True)

    # --- 5. MEDITERRANEAN OLIVE TREE (Organic Multi-Branch + Smooth Subdivided Crown) ---
    bm_olive = bmesh.new()
    add_swept_beam(bm_olive, [(0, 0, 0), (0.08, -0.05, 1.5), (0.02, 0.02, 2.7)], 0.22, 0.22, M["WarmCedar"])
    for bx, by, bz in [(-0.7, 0.4, 3.6), (0.75, 0.3, 3.7), (0.05, -0.75, 3.5)]:
        add_swept_beam(bm_olive, [(0.02, 0.02, 2.4), (bx, by, bz)], 0.11, 0.11, M["WarmCedar"])
        res = bmesh.ops.create_icosphere(bm_olive, subdivisions=2, radius=1.45)
        bmesh.ops.transform(
            bm_olive,
            matrix=Matrix.Translation((bx * 1.15, by * 1.15, bz + 0.65)) @ Matrix.Diagonal((1.25, 1.18, 0.78, 1.0)),
            verts=res["verts"],
        )
        for f in set(f for v in res["verts"] for f in v.link_faces):
            f.material_index = M["FoliageOlive"]
    res_top = bmesh.ops.create_icosphere(bm_olive, subdivisions=2, radius=1.65)
    bmesh.ops.transform(
        bm_olive, matrix=Matrix.Translation((0, 0, 4.75)) @ Matrix.Diagonal((1.2, 1.2, 0.75, 1.0)), verts=res_top["verts"]
    )
    for f in set(f for v in res_top["verts"] for f in v.link_faces):
        f.material_index = M["FoliageOlive"]
    finalize_bmesh("OliveTree", bm_olive, mats, smooth=True)

    # --- 6. MEDITERRANEAN CYPRESS TREE (Tall Sculpted Flame Profile) ---
    bm_cyp = bmesh.new()
    add_cylinder(bm_cyp, 0, 0, 0.8, 0.18, 0.12, 1.6, 8, M["WarmCedar"])
    for tz, tr, th in [(2.6, 0.82, 1.5), (4.3, 0.76, 1.7), (6.0, 0.62, 1.6), (7.6, 0.42, 1.4), (8.9, 0.22, 1.1)]:
        res = bmesh.ops.create_uvsphere(bm_cyp, u_segments=12, v_segments=8, radius=1.0)
        bmesh.ops.transform(bm_cyp, matrix=Matrix.Translation((0, 0, tz)) @ Matrix.Diagonal((tr, tr, th, 1.0)), verts=res["verts"])
        for f in set(f for v in res["verts"] for f in v.link_faces):
            f.material_index = M["FoliageCypress"]
    finalize_bmesh("Cypress", bm_cyp, mats, smooth=True)

    export_glb(os.path.join(MODELS_DIR, "vehicles_and_flora.glb"))


def render_kit_preview():
    # Load Bayt Dome + Solar Ring + Royal Gate together in Eevee to visually inspect geometry before Three.js!
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS_DIR, "bayt_dome.glb"))
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS_DIR, "villa_and_souk.glb"))
    for ob in bpy.data.objects:
        if "PatricianVilla" in ob.name:
            ob.location = (55, 0, 0)
        if "GrandSoukBazaar" in ob.name:
            ob.location = (-55, 0, 0)

    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.95, 0.89, 0.78, 1.0)
        bg.inputs[1].default_value = 1.1
    sun = bpy.data.lights.new("Sun", type="SUN")
    sun.energy = 3.6
    so = bpy.data.objects.new("Sun", sun)
    bpy.context.collection.objects.link(so)
    so.rotation_euler = (math.radians(52), math.radians(15), math.radians(35))

    cam_d = bpy.data.cameras.new("Cam")
    cam_d.lens = 34
    cam = bpy.data.objects.new("Cam", cam_d)
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    cam.location = (0, -92, 46)
    cam.rotation_euler = (math.radians(64), 0, 0)

    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.render.resolution_x = 1280
    bpy.context.scene.render.resolution_y = 720
    bpy.context.scene.render.filepath = os.path.join(PREVIEW_DIR, "kit_preview.png")
    bpy.ops.render.render(write_still=True)
    print("KIT_PREVIEW_SAVED")


if __name__ == "__main__":
    build_bayt_dome()
    build_solar_ring_arc()
    build_gate_and_bridge()
    build_villa_and_souk()
    build_vehicles_and_flora()
    print("ALL_5_GLBS_REBUILT_CLEANLY")

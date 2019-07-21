import Vec3 from "../math/Vec3";
import Shape, { ShapeOptions } from "./Shape";
import Quaternion from "../math/Quaternion";
import Transform from "../math/Transform";

const computeEdges_tmpEdge = new Vec3();
const maxminA: number[] = [];
const maxminB: number[] = [];

const cli_aabbmin = new Vec3();
const cli_aabbmax = new Vec3();

const computeLocalAABB_worldVert = new Vec3();
const tempWorldVertex = new Vec3();
/**
 * A set of polygons describing a convex shape.
 * @class ConvexPolyhedron
 * @constructor
 * @extends Shape
 * @description The shape MUST be convex for the code to work properly. No polygons may be coplanar (contained
 * in the same 3D plane), instead these should be merged into one polygon.
 *
 * @param {array} points An array of Vec3's
 * @param {array} faces Array of integer arrays, describing which vertices that is included in each face.
 *
 * @author qiao / https://github.com/qiao (original author, see https://github.com/qiao/three.js/commit/85026f0c769e4000148a67d45a9e9b9c5108836f)
 * @author schteppe / https://github.com/schteppe
 * @see http://www.altdevblogaday.com/2011/05/13/contact-generation-between-3d-convex-meshes/
 * @see http://bullet.googlecode.com/svn/trunk/src/BulletCollision/NarrowPhaseCollision/btPolyhedralContactClipping.cpp
 *
 * @todo Move the clipping functions to ContactGenerator?
 * @todo Automatically merge coplanar polygons in constructor.
 */
export default class ConvexPolyhedron extends Shape {
  /**
   * Array of Vec3
   * @property vertices
   * @type {Array}
   */
  public vertices: Vec3[];
  public worldVertices: Vec3[];
  /**
   * Array of integer arrays, indicating which vertices each face consists of
   * @property faces
   * @type {Array}
   */
  public faces: number[][];
  /**
   * Array of Vec3
   * @property faceNormals
   * @type {Array}
   */
  public faceNormals: Vec3[];
  public worldFaceNormals: Vec3[];
  /**
   * Array of Vec3
   * @property uniqueEdges
   * @type {Array}
   */
  public uniqueEdges: Vec3[];
  /**
   * If given, these locally defined, normalized axes are the only ones being checked when doing separating axis check.
   * @property {Array} uniqueAxes
   */
  public uniqueAxes: Vec3[] | null;
  public worldVerticesNeedsUpdate: boolean;
  public worldFaceNormalsNeedsUpdate: boolean;
  constructor(
    points?: Vec3[],
    faces?: number[][],
    uniqueAxes?: Vec3[],
    options?: ShapeOptions
  ) {
    super(options);
    this.type = Shape.types.CONVEXPOLYHEDRON;

    this.vertices = points || [];

    this.worldVertices = []; // World transformed version of .vertices
    this.worldVerticesNeedsUpdate = true;

    this.faces = faces || [];

    this.faceNormals = [];
    this.computeNormals();

    this.worldFaceNormalsNeedsUpdate = true;
    this.worldFaceNormals = []; // World transformed version of .faceNormals

    this.uniqueEdges = [];

    this.uniqueAxes = uniqueAxes ? uniqueAxes.slice() : null;

    this.computeEdges();
    this.updateBoundingSphereRadius();
  }

  /**
   * Computes uniqueEdges
   * @method computeEdges
   */
  computeEdges(): void {
    const faces = this.faces;
    const vertices = this.vertices;
    const edges: Vec3[] = [];
    const edge = computeEdges_tmpEdge;
    let face: number[];
    let k: number;
    let found: boolean;
    for (let i = 0; i !== faces.length; i++) {
      face = faces[i];
      // var numVertices = face.length;
      for (let j = 0; j !== face.length; j++) {
        k = (j + 1) % face.length;
        vertices[face[j]].sub(vertices[face[k]], edge);
        edge.normalize();
        found = false;
        for (var p = 0; p !== edges.length; p++) {
          if (edges[p].almostEquals(edge) || edges[p].almostEquals(edge)) {
            found = true;
            break;
          }
        }

        if (!found) {
          edges.push(edge.clone());
        }
      }
    }

    this.uniqueEdges = edges;
  }

  /**
   * Compute the normals of the faces. Will reuse existing Vec3 objects in the .faceNormals array if they exist.
   * @method computeNormals
   */
  computeNormals(): void {
    this.faceNormals.length = this.faces.length;
    let n: Vec3;
    let vertex: Vec3;
    // Generate normals
    for (let i = 0; i < this.faces.length; i++) {
      // Check so all vertices exists for this face
      for (let j = 0; j < this.faces[i].length; j++) {
        if (!this.vertices[this.faces[i][j]]) {
          throw new Error("Vertex " + this.faces[i][j] + " not found!");
        }
      }

      n = this.faceNormals[i] || new Vec3();
      this.getFaceNormal(i, n);
      n.negate(n);
      this.faceNormals[i] = n;
      vertex = this.vertices[this.faces[i][0]];
      if (n.dot(vertex) < 0) {
        console.error(
          ".faceNormals[" +
            i +
            "] = Vec3(" +
            n.toString() +
            ") looks like it points into the shape? The vertices follow. Make sure they are ordered CCW around the normal, using the right hand rule."
        );
        for (var j = 0; j < this.faces[i].length; j++) {
          console.warn(
            ".vertices[" +
              this.faces[i][j] +
              "] = Vec3(" +
              this.vertices[this.faces[i][j]].toString() +
              ")"
          );
        }
      }
    }
  }

  /**
   * Get face normal given 3 vertices
   * @static
   * @method getFaceNormal
   * @param {Vec3} va
   * @param {Vec3} vb
   * @param {Vec3} vc
   * @param {Vec3} target
   */
  static computeNormal(va: Vec3, vb: Vec3, vc: Vec3, target: Vec3): void {
    const cb = new Vec3();
    const ab = new Vec3();
    vb.sub(va, ab);
    vc.sub(vb, cb);
    cb.cross(ab, target);
    if (!target.isZero()) {
      target.normalize();
    }
  }
  /**
   * Compute the normal of a face from its vertices
   * @method getFaceNormal
   * @param  {Number} i
   * @param  {Vec3} target
   */
  getFaceNormal(i: number, target: Vec3): void {
    const f = this.faces[i];
    const va = this.vertices[f[0]];
    const vb = this.vertices[f[1]];
    const vc = this.vertices[f[2]];
    ConvexPolyhedron.computeNormal(va, vb, vc, target);
  }

  /**
   * @method clipAgainstHull
   * @param {Vec3} posA
   * @param {Quaternion} quatA
   * @param {ConvexPolyhedron} hullB
   * @param {Vec3} posB
   * @param {Quaternion} quatB
   * @param {Vec3} separatingNormal
   * @param {Number} minDist Clamp distance
   * @param {Number} maxDist
   * @param {array} result The an array of contact point objects, see clipFaceAgainstHull
   * @see http://bullet.googlecode.com/svn/trunk/src/BulletCollision/NarrowPhaseCollision/btPolyhedralContactClipping.cpp
   */
  clipAgainstHull(
    posA: Vec3,
    quatA: Quaternion,
    hullB: ConvexPolyhedron,
    posB: Vec3,
    quatB: Quaternion,
    separatingNormal: Vec3,
    minDist: number,
    maxDist: number,
    result: Vec3[]
  ) {
    const cah_WorldNormal = new Vec3();
    const WorldNormal = cah_WorldNormal;
    const worldVertsB1 = [];
    // var hullA = this;
    // var curMaxDist = maxDist;
    let closestFaceB = -1;
    let dmax = -Number.MAX_VALUE;
    let b: Vec3;
    let worldb: Vec3;
    for (let face = 0; face < hullB.faces.length; face++) {
      WorldNormal.copy(hullB.faceNormals[face]);
      quatB.vmult(WorldNormal, WorldNormal);
      //posB.vadd(WorldNormal,WorldNormal);
      let d = WorldNormal.dot(separatingNormal);
      if (d > dmax) {
        dmax = d;
        closestFaceB = face;
      }
    }

    const polyB = hullB.faces[closestFaceB];
    // const numVertices = polyB.length;
    for (let e0 = 0; e0 < polyB.length; e0++) {
      b = hullB.vertices[polyB[e0]];
      worldb = new Vec3();
      worldb.copy(b);
      quatB.vmult(worldb, worldb);
      posB.add(worldb, worldb);
      worldVertsB1.push(worldb);
    }

    if (closestFaceB >= 0) {
      this.clipFaceAgainstHull(
        separatingNormal,
        posA,
        quatA,
        worldVertsB1,
        minDist,
        maxDist,
        result
      );
    }
  }

  /**
   * Find the separating axis between this hull and another
   * @method findSeparatingAxis
   * @param {ConvexPolyhedron} hullB
   * @param {Vec3} posA
   * @param {Quaternion} quatA
   * @param {Vec3} posB
   * @param {Quaternion} quatB
   * @param {Vec3} target The target vector to save the axis in
   * @return {bool} Returns false if a separation is found, else true
   */

  findSeparatingAxis(
    hullB: ConvexPolyhedron,
    posA: Vec3,
    quatA: Quaternion,
    posB: Vec3,
    quatB: Quaternion,
    target: Vec3,
    faceListA: number[],
    faceListB: number[]
  ): boolean {
    const fsa_faceANormalWS3 = new Vec3();
    const fsa_Worldnormal1 = new Vec3();
    const fsa_deltaC = new Vec3();
    const fsa_worldEdge0 = new Vec3();
    const fsa_worldEdge1 = new Vec3();
    const fsa_Cross = new Vec3();
    const faceANormalWS3 = fsa_faceANormalWS3;
    const Worldnormal1 = fsa_Worldnormal1;
    const deltaC = fsa_deltaC;
    const worldEdge0 = fsa_worldEdge0;
    const worldEdge1 = fsa_worldEdge1;
    const Cross = fsa_Cross;

    let dmin: number = Number.MAX_VALUE;
    // var hullA = this;
    // let curPlaneTests = 0;

    if (!this.uniqueAxes) {
      const numFacesA = faceListA ? faceListA.length : this.faces.length;

      // Test face normals from hullA
      for (let i = 0; i < numFacesA; i++) {
        let fi = faceListA ? faceListA[i] : i;

        // Get world face normal
        faceANormalWS3.copy(this.faceNormals[fi]);
        quatA.vmult(faceANormalWS3, faceANormalWS3);

        let d = this.testSepAxis(
          faceANormalWS3,
          hullB,
          posA,
          quatA,
          posB,
          quatB
        );

        if (d === false) {
          return false;
        }

        if (d < dmin) {
          dmin = d as number;
          target.copy(faceANormalWS3);
        }
      }
    } else {
      // Test unique axes
      for (let i = 0; i !== this.uniqueAxes.length; i++) {
        // Get world axis
        quatA.vmult(this.uniqueAxes[i], faceANormalWS3);

        let d = this.testSepAxis(
          faceANormalWS3,
          hullB,
          posA,
          quatA,
          posB,
          quatB
        );
        if (d === false) {
          return false;
        }

        if (d < dmin) {
          dmin = d as number;
          target.copy(faceANormalWS3);
        }
      }
    }

    if (!hullB.uniqueAxes) {
      // Test face normals from hullB
      let numFacesB = faceListB ? faceListB.length : hullB.faces.length;
      for (let i = 0; i < numFacesB; i++) {
        let fi = faceListB ? faceListB[i] : i;

        Worldnormal1.copy(hullB.faceNormals[fi]);
        quatB.vmult(Worldnormal1, Worldnormal1);
        // curPlaneTests++;
        let d = this.testSepAxis(Worldnormal1, hullB, posA, quatA, posB, quatB);
        if (d === false) {
          return false;
        }

        if (d < dmin) {
          dmin = d as number;
          target.copy(Worldnormal1);
        }
      }
    } else {
      // Test unique axes in B
      for (let i = 0; i !== hullB.uniqueAxes.length; i++) {
        quatB.vmult(hullB.uniqueAxes[i], Worldnormal1);

        // curPlaneTests++;
        let d = this.testSepAxis(Worldnormal1, hullB, posA, quatA, posB, quatB);
        if (d === false) {
          return false;
        }

        if (d < dmin) {
          dmin = d as number;
          target.copy(Worldnormal1);
        }
      }
    }

    // Test edges
    for (let e0 = 0; e0 !== this.uniqueEdges.length; e0++) {
      // Get world edge
      quatA.vmult(this.uniqueEdges[e0], worldEdge0);

      for (let e1 = 0; e1 !== hullB.uniqueEdges.length; e1++) {
        // Get world edge 2
        quatB.vmult(hullB.uniqueEdges[e1], worldEdge1);
        worldEdge0.cross(worldEdge1, Cross);

        if (!Cross.almostZero()) {
          Cross.normalize();
          let dist = this.testSepAxis(Cross, hullB, posA, quatA, posB, quatB);
          if (dist === false) {
            return false;
          }
          if (dist < dmin) {
            dmin = dist as number;
            target.copy(Cross);
          }
        }
      }
    }

    posB.sub(posA, deltaC);
    if (deltaC.dot(target) > 0.0) {
      target.negate(target);
    }

    return true;
  }

  /**
   * Test separating axis against two hulls. Both hulls are projected onto the axis and the overlap size is returned if there is one.
   * @method testSepAxis
   * @param {Vec3} axis
   * @param {ConvexPolyhedron} hullB
   * @param {Vec3} posA
   * @param {Quaternion} quatA
   * @param {Vec3} posB
   * @param {Quaternion} quatB
   * @return {number} The overlap depth, or FALSE if no penetration.
   */
  testSepAxis(
    axis: Vec3,
    hullB: ConvexPolyhedron,
    posA: Vec3,
    quatA: Quaternion,
    posB: Vec3,
    quatB: Quaternion
  ): number | boolean {
    // var hullA = this;
    ConvexPolyhedron.project(this, axis, posA, quatA, maxminA);
    ConvexPolyhedron.project(hullB, axis, posB, quatB, maxminB);
    const maxA = maxminA[0];
    const minA = maxminA[1];
    const maxB = maxminB[0];
    const minB = maxminB[1];
    if (maxA < minB || maxB < minA) {
      return false; // Separated
    }
    const d0 = maxA - minB;
    const d1 = maxB - minA;
    const depth = d0 < d1 ? d0 : d1;
    return depth;
  }

  /**
   * @method calculateLocalInertia
   * @param  {Number} mass
   * @param  {Vec3} target
   */
  calculateLocalInertia(mass: number, target: Vec3) {
    // Approximate with box inertia
    // Exact inertia calculation is overkill, but see http://geometrictools.com/Documentation/PolyhedralMassProperties.pdf for the correct way to do it
    this.computeLocalAABB(cli_aabbmin, cli_aabbmax);
    const x = cli_aabbmax.x - cli_aabbmin.x;
    const y = cli_aabbmax.y - cli_aabbmin.y;
    const z = cli_aabbmax.z - cli_aabbmin.z;
    target.x = (1.0 / 12.0) * mass * (2 * y * 2 * y + 2 * z * 2 * z);
    target.y = (1.0 / 12.0) * mass * (2 * x * 2 * x + 2 * z * 2 * z);
    target.z = (1.0 / 12.0) * mass * (2 * y * 2 * y + 2 * x * 2 * x);
  }

  /**
   * @method getPlaneConstantOfFace
   * @param  {Number} face_i Index of the face
   * @return {Number}
   */
  getPlaneConstantOfFace(face_i: number): number {
    const f = this.faces[face_i];
    const n = this.faceNormals[face_i];
    const v = this.vertices[f[0]];
    const c = -n.dot(v);
    return c;
  }

  /**
   * Clip a face against a hull.
   * @method clipFaceAgainstHull
   * @param {Vec3} separatingNormal
   * @param {Vec3} posA
   * @param {Quaternion} quatA
   * @param {Array} worldVertsB1 An array of Vec3 with vertices in the world frame.
   * @param {Number} minDist Distance clamping
   * @param {Number} maxDist
   * @param Array result Array to store resulting contact points in. Will be objects with properties: point, depth, normal. These are represented in world coordinates.
   */

  clipFaceAgainstHull(
    separatingNormal: Vec3,
    posA: Vec3,
    quatA: Quaternion,
    worldVertsB1: Vec3[],
    minDist: number,
    maxDist: number,
    result: any[]
  ) {
    const cfah_faceANormalWS = new Vec3();
    const cfah_edge0 = new Vec3();
    const cfah_WorldEdge0 = new Vec3();
    const cfah_worldPlaneAnormal1 = new Vec3();
    const cfah_planeNormalWS1 = new Vec3();
    const cfah_worldA1 = new Vec3();
    const cfah_localPlaneNormal = new Vec3();
    const cfah_planeNormalWS = new Vec3();
    const faceANormalWS = cfah_faceANormalWS;
    const edge0 = cfah_edge0;
    const WorldEdge0 = cfah_WorldEdge0;
    const worldPlaneAnormal1 = cfah_worldPlaneAnormal1;
    const planeNormalWS1 = cfah_planeNormalWS1;
    const worldA1 = cfah_worldA1;
    const localPlaneNormal = cfah_localPlaneNormal;
    const planeNormalWS = cfah_planeNormalWS;

    // var hullA = this;
    // var worldVertsB2 = [];
    const pVtxIn = worldVertsB1;
    const pVtxOut: Vec3[] = [];
    // Find the face with normal closest to the separating axis
    let closestFaceA: number = -1;
    let dmin: number = Number.MAX_VALUE;
    let planeEqWS: number;
    for (var face = 0; face < this.faces.length; face++) {
      faceANormalWS.copy(this.faceNormals[face]);
      quatA.vmult(faceANormalWS, faceANormalWS);
      //posA.vadd(faceANormalWS,faceANormalWS);
      var d = faceANormalWS.dot(separatingNormal);
      if (d < dmin) {
        dmin = d;
        closestFaceA = face;
      }
    }
    if (closestFaceA < 0) {
      // console.log("--- did not find any closest face... ---");
      return;
    }
    //console.log("closest A: ",closestFaceA);
    // Get the face and construct connected faces
    var polyA = this.faces[closestFaceA];
    polyA.connectedFaces = [];
    for (var i = 0; i < this.faces.length; i++) {
      for (var j = 0; j < this.faces[i].length; j++) {
        if (
          polyA.indexOf(this.faces[i][j]) !== -1 /* Sharing a vertex*/ &&
          i !==
            closestFaceA /* Not the one we are looking for connections from */ &&
          polyA.connectedFaces.indexOf(i) === -1 /* Not already added */
        ) {
          polyA.connectedFaces.push(i);
        }
      }
    }
    // Clip the polygon to the back of the planes of all faces of hull A, that are adjacent to the witness face
    // var numContacts = pVtxIn.length;
    const numVerticesA = polyA.length;
    // var res = [];
    for (let e0 = 0; e0 < numVerticesA; e0++) {
      let a = this.vertices[polyA[e0]];
      let b = this.vertices[polyA[(e0 + 1) % numVerticesA]];
      a.sub(b, edge0);
      WorldEdge0.copy(edge0);
      quatA.vmult(WorldEdge0, WorldEdge0);
      posA.add(WorldEdge0, WorldEdge0);
      worldPlaneAnormal1.copy(this.faceNormals[closestFaceA]); //transA.getBasis()* btVector3(polyA.m_plane[0],polyA.m_plane[1],polyA.m_plane[2]);
      quatA.vmult(worldPlaneAnormal1, worldPlaneAnormal1);
      posA.add(worldPlaneAnormal1, worldPlaneAnormal1);
      WorldEdge0.cross(worldPlaneAnormal1, planeNormalWS1);
      planeNormalWS1.negate(planeNormalWS1);
      worldA1.copy(a);
      quatA.vmult(worldA1, worldA1);
      posA.add(worldA1, worldA1);
      let planeEqWS1 = -worldA1.dot(planeNormalWS1);
      if (true) {
        var otherFace = polyA.connectedFaces[e0];
        localPlaneNormal.copy(this.faceNormals[otherFace]);
        var localPlaneEq = this.getPlaneConstantOfFace(otherFace);

        planeNormalWS.copy(localPlaneNormal);
        quatA.vmult(planeNormalWS, planeNormalWS);
        //posA.vadd(planeNormalWS,planeNormalWS);
        planeEqWS = localPlaneEq - planeNormalWS.dot(posA);
      } else {
        planeNormalWS.copy(planeNormalWS1);
        planeEqWS = planeEqWS1;
      }

      // Clip face against our constructed plane
      this.clipFaceAgainstPlane(pVtxIn, pVtxOut, planeNormalWS, planeEqWS);

      // Throw away all clipped points, but save the reamining until next clip
      // while (pVtxIn.length) {
      //   pVtxIn.shift();
      // }
      // while (pVtxOut.length) {
      //   pVtxIn.push(pVtxOut.shift());
      // }

      pVtxIn.length = 0;
      pVtxIn.push(...pVtxOut);
    }

    //console.log("Resulting points after clip:",pVtxIn);

    // only keep contact points that are behind the witness face
    localPlaneNormal.copy(this.faceNormals[closestFaceA]);

    var localPlaneEq = this.getPlaneConstantOfFace(closestFaceA);
    planeNormalWS.copy(localPlaneNormal);
    quatA.vmult(planeNormalWS, planeNormalWS);

    planeEqWS = localPlaneEq - planeNormalWS.dot(posA);
    for (let i = 0; i < pVtxIn.length; i++) {
      let depth = planeNormalWS.dot(pVtxIn[i]) + planeEqWS; //???
      /*console.log("depth calc from normal=",planeNormalWS.toString()," and constant "+planeEqWS+" and vertex ",pVtxIn[i].toString()," gives "+depth);*/
      if (depth <= minDist) {
        console.log(
          "clamped: depth=" + depth + " to minDist=" + (minDist + "")
        );
        depth = minDist;
      }

      if (depth <= maxDist) {
        let point = pVtxIn[i];
        if (depth <= 0) {
          /*console.log("Got contact point ",point.toString(),
                ", depth=",depth,
                "contact normal=",separatingNormal.toString(),
                "plane",planeNormalWS.toString(),
                "planeConstant",planeEqWS);*/
          let p = {
            point: point,
            normal: planeNormalWS,
            depth: depth
          };
          result.push(p);
        }
      }
    }
  }

  /**
   * Clip a face in a hull against the back of a plane.
   * @method clipFaceAgainstPlane
   * @param {Array} inVertices
   * @param {Array} outVertices
   * @param {Vec3} planeNormal
   * @param {Number} planeConstant The constant in the mathematical plane equation
   * @returns {Array}
   */
  clipFaceAgainstPlane(
    inVertices: Vec3[],
    outVertices: Vec3[],
    planeNormal: Vec3,
    planeConstant: number
  ): Vec3[] {
    let n_dot_first: number;
    let n_dot_last: number;
    let numVerts = inVertices.length;
    let firstVertex: Vec3 = inVertices[inVertices.length - 1];
    let lastVertex: Vec3 = inVertices[0];
    if (numVerts < 2) {
      return outVertices;
    }

    n_dot_first = planeNormal.dot(firstVertex) + planeConstant;

    for (let vi = 0; vi < numVerts; vi++) {
      lastVertex = inVertices[vi];
      n_dot_last = planeNormal.dot(lastVertex) + planeConstant;
      if (n_dot_first < 0) {
        if (n_dot_last < 0) {
          // Start < 0, end < 0, so output lastVertex
          var newv = new Vec3();
          newv.copy(lastVertex);
          outVertices.push(newv);
        } else {
          // Start < 0, end >= 0, so output intersection
          var newv = new Vec3();
          firstVertex.lerp(
            lastVertex,
            n_dot_first / (n_dot_first - n_dot_last),
            newv
          );
          outVertices.push(newv);
        }
      } else {
        if (n_dot_last < 0) {
          // Start >= 0, end < 0 so output intersection and end
          var newv = new Vec3();
          firstVertex.lerp(
            lastVertex,
            n_dot_first / (n_dot_first - n_dot_last),
            newv
          );
          outVertices.push(newv);
          outVertices.push(lastVertex);
        }
      }
      firstVertex = lastVertex;
      n_dot_first = n_dot_last;
    }
    return outVertices;
  }

  // Updates .worldVertices and sets .worldVerticesNeedsUpdate to false.
  computeWorldVertices(position: Vec3, quat: Quaternion): void {
    const N = this.vertices.length;
    while (this.worldVertices.length < N) {
      this.worldVertices.push(new Vec3());
    }

    const verts = this.vertices;
    const worldVerts = this.worldVertices;
    for (let i = 0; i !== N; i++) {
      quat.vmult(verts[i], worldVerts[i]);
      position.add(worldVerts[i], worldVerts[i]);
    }

    this.worldVerticesNeedsUpdate = false;
  }

  computeLocalAABB(aabbmin: Vec3, aabbmax: Vec3): void {
    const n = this.vertices.length;
    const vertices = this.vertices;
    // const worldVert = computeLocalAABB_worldVert;
    let v: Vec3;
    aabbmin.set(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    aabbmax.set(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

    for (let i = 0; i < n; i++) {
      v = vertices[i];
      if (v.x < aabbmin.x) {
        aabbmin.x = v.x;
      } else if (v.x > aabbmax.x) {
        aabbmax.x = v.x;
      }
      if (v.y < aabbmin.y) {
        aabbmin.y = v.y;
      } else if (v.y > aabbmax.y) {
        aabbmax.y = v.y;
      }
      if (v.z < aabbmin.z) {
        aabbmin.z = v.z;
      } else if (v.z > aabbmax.z) {
        aabbmax.z = v.z;
      }
    }
  }

  /**
   * Updates .worldVertices and sets .worldVerticesNeedsUpdate to false.
   * @method computeWorldFaceNormals
   * @param  {Quaternion} quat
   */
  computeWorldFaceNormals(quat: Quaternion): void {
    const N = this.faceNormals.length;
    while (this.worldFaceNormals.length < N) {
      this.worldFaceNormals.push(new Vec3());
    }

    const normals = this.faceNormals;
    const worldNormals = this.worldFaceNormals;
    for (let i = 0; i !== N; i++) {
      quat.vmult(normals[i], worldNormals[i]);
    }

    this.worldFaceNormalsNeedsUpdate = false;
  }

  /**
   * @method updateBoundingSphereRadius
   */
  updateBoundingSphereRadius(): void {
    // Assume points are distributed with local (0,0,0) as center
    const verts = this.vertices;
    let max2 = 0;
    let norm2: number;

    for (let i = 0, N = verts.length; i !== N; i++) {
      norm2 = verts[i].lengthSquared();
      if (norm2 > max2) {
        max2 = norm2;
      }
    }
    this.boundingSphereRadius = Math.sqrt(max2);
  }

  /**
   * @method calculateWorldAABB
   * @param {Vec3}        pos
   * @param {Quaternion}  quat
   * @param {Vec3}        min
   * @param {Vec3}        max
   */
  calculateWorldAABB(pos: Vec3, quat: Quaternion, min: Vec3, max: Vec3): void {
    // const n = this.vertices.length;
    const verts = this.vertices;
    let minx = Number.MAX_VALUE;
    let miny = Number.MAX_VALUE;
    let minz = Number.MAX_VALUE;
    let maxx = Number.MIN_VALUE;
    let maxy = Number.MIN_VALUE;
    let maxz = Number.MIN_VALUE;
    let v: Vec3;
    for (var i = 0; i < verts.length; i++) {
      v = verts[i];
      quat.vmult(v, v);
      pos.add(v, v);
      //  v = tempWorldVertex;
      if (v.x < minx) {
        minx = v.x;
      } else if (v.x > maxx) {
        maxx = v.x;
      }

      if (v.y < miny) {
        miny = v.y;
      } else if (v.y > maxy) {
        maxy = v.y;
      }

      if (v.z < minz) {
        minz = v.z;
      } else if (v.z > maxz) {
        maxz = v.z;
      }
    }
    min.set(minx, miny, minz);
    max.set(maxx, maxy, maxz);
  }

  /**
   * Get approximate convex volume
   * @method volume
   * @return {Number}
   */
  volume(): number {
    return (4.0 * Math.PI * this.boundingSphereRadius) / 3.0;
  }

  /**
   * Get an average of all the vertices positions
   * @method getAveragePointLocal
   * @param  {Vec3} target
   * @return {Vec3}
   */
  getAveragePointLocal(target?: Vec3): Vec3 {
    target = target || new Vec3();
    // const n = this.vertices.length,
    const verts = this.vertices;
    for (var i = 0; i < verts.length; i++) {
      target.add(verts[i], target);
    }
    target.scale(1 / verts.length, target);
    return target;
  }

  /**
   * Transform all local points. Will change the .vertices
   * @method transformAllPoints
   * @param  {Vec3} offset
   * @param  {Quaternion} quat
   */
  transformAllPoints(offset?: Vec3, quat?: Quaternion) {
    // const n = this.vertices.length,
    const verts = this.vertices;
    let v: Vec3;
    // Apply rotation
    if (quat) {
      // Rotate vertices
      for (let i = 0; i < verts.length; i++) {
        v = verts[i];
        quat.vmult(v, v);
      }
      // Rotate face normals
      for (let i = 0; i < this.faceNormals.length; i++) {
        v = this.faceNormals[i];
        quat.vmult(v, v);
      }
      /*
          // Rotate edges
          for(var i=0; i<this.uniqueEdges.length; i++){
              var v = this.uniqueEdges[i];
              quat.vmult(v,v);
          }*/
    }

    // Apply offset
    if (offset) {
      for (let i = 0; i < verts.length; i++) {
        v = verts[i];
        v.add(offset, v);
      }
    }
  }

  /**
   * Checks whether p is inside the polyhedra. Must be in local coords. The point lies outside of the convex hull of the other points if and only if the direction of all the vectors from it to those other points are on less than one half of a sphere around it.
   * @method pointIsInside
   * @param  {Vec3} p      A point given in local coordinates
   * @return {Boolean}
   */
  pointIsInside(p: Vec3): number | boolean {
    const ConvexPolyhedron_pointIsInside = new Vec3();
    const ConvexPolyhedron_vToP = new Vec3();
    const ConvexPolyhedron_vToPointInside = new Vec3();
    // const n = this.vertices.length;
    const verts = this.vertices;
    const faces = this.faces;
    const normals = this.faceNormals;
    const positiveResult = null;
    const N = this.faces.length;
    const pointInside = ConvexPolyhedron_pointIsInside;
    let v: Vec3;
    let r1: number;
    let r2: number;
    this.getAveragePointLocal(pointInside);
    for (let i = 0; i < N; i++) {
      v = verts[faces[i][0]]; // We only need one point in the face

      // This dot product determines which side of the edge the point is
      // var vToP = ConvexPolyhedron_vToP;
      p.sub(v, ConvexPolyhedron_vToP);
      r1 = normals[i].dot(ConvexPolyhedron_vToP);

      // var vToPointInside = ConvexPolyhedron_vToPointInside;
      pointInside.sub(v, ConvexPolyhedron_vToPointInside);
      r2 = normals[i].dot(ConvexPolyhedron_vToPointInside);

      if ((r1 < 0 && r2 > 0) || (r1 > 0 && r2 < 0)) {
        return false; // Encountered some other sign. Exit.
      } else {
      }
    }

    // If we got here, all dot products were of the same sign.
    return positiveResult ? 1 : -1;
  }

  /**
   * Get max and min dot product of a convex hull at position (pos,quat) projected onto an axis. Results are saved in the array maxmin.
   * @static
   * @method project
   * @param {ConvexPolyhedron} hull
   * @param {Vec3} axis
   * @param {Vec3} pos
   * @param {Quaternion} quat
   * @param {array} result result[0] and result[1] will be set to maximum and minimum, respectively.
   */
  static project(
    hull: ConvexPolyhedron,
    axis: Vec3,
    pos: Vec3,
    quat: Quaternion,
    result: number[]
  ) {
    // const project_worldVertex = new Vec3();
    const project_localAxis = new Vec3();
    const project_localOrigin = new Vec3();
    const n = hull.vertices.length;
    // const worldVertex = new Vec3();
    const localAxis = project_localAxis;
    let max = 0;
    let min = 0;
    let dot: number;
    const localOrigin = project_localOrigin;
    const vs = hull.vertices;

    localOrigin.setZero();

    // Transform the axis to local
    Transform.vectorToLocalFrame(pos, quat, axis, localAxis);
    Transform.pointToLocalFrame(pos, quat, localOrigin, localOrigin);
    const add = localOrigin.dot(localAxis);

    min = max = vs[0].dot(localAxis);

    for (let i = 1; i < n; i++) {
      dot = vs[i].dot(localAxis);

      if (dot > max) {
        max = dot;
      }

      if (dot < min) {
        min = dot;
      }
    }

    min -= add;
    max -= add;

    if (min > max) {
      // Inconsistent - swap
      let temp = min;
      min = max;
      max = temp;
    }
    // Output
    result[0] = max;
    result[1] = min;
  }
}

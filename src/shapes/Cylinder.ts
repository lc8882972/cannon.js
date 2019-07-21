import Vec3 from "../math/Vec3";
import Shape, { ShapeOptions } from "./Shape";
import ConvexPolyhedron from "./ConvexPolyhedron";
/**
 * @class Cylinder
 * @constructor
 * @extends ConvexPolyhedron
 * @author schteppe / https://github.com/schteppe
 * @param {Number} radiusTop
 * @param {Number} radiusBottom
 * @param {Number} height
 * @param {Number} numSegments The number of segments to build the cylinder out of
 */
export default class Cylinder extends ConvexPolyhedron {
  constructor(
    radiusTop: number,
    radiusBottom: number,
    height: number,
    numSegments: number,
    options?: ShapeOptions
  ) {
    super(undefined, undefined, undefined, options);
    this.type = Shape.types.CYLINDER;
    const verts: Vec3[] = [];
    const axes: Vec3[] = [];
    const faces: number[][] = [];
    const bottomface: number[] = [];
    const topface: number[] = [];

    // First bottom point
    verts.push(
      new Vec3(
        radiusBottom * Math.cos(0),
        radiusBottom * Math.sin(0),
        -height * 0.5
      )
    );
    bottomface.push(0);

    // First top point
    verts.push(
      new Vec3(radiusTop * Math.cos(0), radiusTop * Math.sin(0), height * 0.5)
    );
    topface.push(1);

    for (var i = 0; i < numSegments; i++) {
      var theta = ((2 * Math.PI) / numSegments) * (i + 1);
      var thetaN = ((2 * Math.PI) / numSegments) * (i + 0.5);
      if (i < numSegments - 1) {
        // Bottom
        verts.push(
          new Vec3(
            radiusBottom * Math.cos(theta),
            radiusBottom * Math.sin(theta),
            -height * 0.5
          )
        );
        bottomface.push(2 * i + 2);
        // Top
        verts.push(
          new Vec3(
            radiusTop * Math.cos(theta),
            radiusTop * Math.sin(theta),
            height * 0.5
          )
        );
        topface.push(2 * i + 3);

        // Face
        faces.push([2 * i + 2, 2 * i + 3, 2 * i + 1, 2 * i]);
      } else {
        faces.push([0, 1, 2 * i + 1, 2 * i]); // Connect
      }

      // Axis: we can cut off half of them if we have even number of segments
      if (numSegments % 2 === 1 || i < numSegments / 2) {
        axes.push(new Vec3(Math.cos(thetaN), Math.sin(thetaN), 0));
      }
    }
    faces.push(topface);
    axes.push(new Vec3(0, 0, 1));

    // Reorder bottom face
    var temp = [];
    for (var i = 0; i < bottomface.length; i++) {
      temp.push(bottomface[bottomface.length - i - 1]);
    }
    faces.push(temp);

    this.vertices = verts;
    this.faces = faces;
    this.uniqueAxes = axes;
  }
}

import Vec3 from "../math/Vec3";
import Shape, { ShapeOptions } from "./Shape";
import Quaternion from "../math/Quaternion";

/**
 * Spherical shape
 * @class Sphere
 * @constructor
 * @extends Shape
 * @param {Number} radius The radius of the sphere, a non-negative number.
 * @author schteppe / http://github.com/schteppe
 */
export default class Sphere extends Shape {
  /**
   * @property {Number} radius
   */
  public radius: number;

  constructor(radius: number = 1.0, options?: ShapeOptions) {
    super(options);
    this.type = Shape.types.SPHERE;
    this.radius = radius;

    if (this.radius < 0) {
      throw new Error("The sphere radius cannot be negative.");
    }

    this.updateBoundingSphereRadius();
  }

  calculateLocalInertia(mass: number, target?: Vec3): Vec3 {
    target = target || new Vec3();
    var I = (2.0 * mass * this.radius * this.radius) / 5.0;
    target.x = I;
    target.y = I;
    target.z = I;
    return target;
  }

  volume(): number {
    return (4.0 * Math.PI * this.radius) / 3.0;
  }

  updateBoundingSphereRadius(): void {
    this.boundingSphereRadius = this.radius;
  }

  calculateWorldAABB(pos: Vec3, quat: Quaternion, min: Vec3, max: Vec3): void {
    const r = this.radius;
    const rVec3 = new Vec3(r, r, r);
    pos.sub(rVec3, min);
    pos.add(rVec3, max);
  }
}

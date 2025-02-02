import Vec3 from "../math/Vec3";
import Shape, { ShapeOptions } from "./Shape";
import Quaternion from "../math/Quaternion";

const tempNormal = new Vec3();
/**
 * A plane, facing in the Z direction. The plane has its surface at z=0 and everything below z=0 is assumed to be solid plane. To make the plane face in some other direction than z, you must put it inside a Body and rotate that body. See the demos.
 * @class Plane
 * @constructor
 * @extends Shape
 * @author schteppe
 */
export default class Plane extends Shape {
  public worldNormal: Vec3;
  public worldNormalNeedsUpdate: boolean;
  public boundingSphereRadius: number;
  constructor(options?: ShapeOptions) {
    super(options);
    this.type = Shape.types.PLANE;
    // World oriented normal
    this.worldNormal = new Vec3();
    this.worldNormalNeedsUpdate = true;

    this.boundingSphereRadius = Number.MAX_VALUE;
  }

  computeWorldNormal(quat: Quaternion): void {
    const n = this.worldNormal;
    n.set(0, 0, 1);
    quat.vmult(n, n);
    this.worldNormalNeedsUpdate = false;
  }

  calculateLocalInertia(mass: number, target?: Vec3): Vec3 {
    target = target || new Vec3();
    return target;
  }

  volume() {
    return Number.MAX_VALUE; // The plane is infinite...
  }

  calculateWorldAABB(pos: Vec3, quat: Quaternion, min: Vec3, max: Vec3): void {
    // The plane AABB is infinite, except if the normal is pointing along any axis
    tempNormal.set(0, 0, 1); // Default plane normal is z
    quat.vmult(tempNormal, tempNormal);
    min.set(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
    max.set(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);

    if (tempNormal.x === 1) {
      max.x = pos.x;
    }
    if (tempNormal.y === 1) {
      max.y = pos.y;
    }
    if (tempNormal.z === 1) {
      max.z = pos.z;
    }

    if (tempNormal.x === -1) {
      min.x = pos.x;
    }
    if (tempNormal.y === -1) {
      min.y = pos.y;
    }
    if (tempNormal.z === -1) {
      min.z = pos.z;
    }
  }

  updateBoundingSphereRadius(): void {
    this.boundingSphereRadius = Number.MAX_VALUE;
  }
}

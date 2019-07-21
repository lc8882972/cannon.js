import Equation from "./Equation";
import Vec3 from "../math/Vec3";
import Body from "../objects/Body";

const tmpVec1 = new Vec3();
const tmpVec2 = new Vec3();

export interface RotationalEquationOptions {
  axisA?: Vec3;
  axisB?: Vec3;
  maxForce?: number;
}
/**
 * Rotational constraint. Works to keep the local vectors orthogonal to each other in world space.
 * @class RotationalEquation
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {Vec3} [options.axisA]
 * @param {Vec3} [options.axisB]
 * @param {number} [options.maxForce]
 * @extends Equation
 */
export default class RotationalEquation extends Equation {
  public axisA: Vec3;
  public axisB: Vec3;
  public maxAngle: number;

  constructor(
    bodyA: Body,
    bodyB: Body,
    options: RotationalEquationOptions = {
      axisA: new Vec3(1, 0, 0),
      axisB: new Vec3(0, 1, 0),
      maxForce: 1e6
    }
  ) {
    super(bodyA, bodyB, -options.maxForce, options.maxForce);
    this.axisA = options.axisA.clone();
    this.axisB = options.axisB.clone();

    this.maxAngle = Math.PI / 2;
  }

  computeB(h: number): number {
    var a = this.a,
      b = this.b,
      ni = this.axisA,
      nj = this.axisB,
      nixnj = tmpVec1,
      njxni = tmpVec2,
      GA = this.jacobianElementA,
      GB = this.jacobianElementB;

    // Caluclate cross products
    ni.cross(nj, nixnj);
    nj.cross(ni, njxni);

    // g = ni * nj
    // gdot = (nj x ni) * wi + (ni x nj) * wj
    // G = [0 njxni 0 nixnj]
    // W = [vi wi vj wj]
    GA.rotational.copy(njxni);
    GB.rotational.copy(nixnj);

    var g = Math.cos(this.maxAngle) - ni.dot(nj),
      GW = this.computeGW(),
      GiMf = this.computeGiMf();

    var B = -g * a - GW * b - h * GiMf;

    return B;
  }
}

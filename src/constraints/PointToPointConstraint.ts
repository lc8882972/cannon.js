import Constraint from "./Constraint";
import ContactEquation from "../equations/ContactEquation";
import Body from "../objects/Body";
import Vec3 from "../math/Vec3";

/**
 * Connects two bodies at given offset points.
 * @class PointToPointConstraint
 * @extends Constraint
 * @constructor
 * @param {Body} bodyA
 * @param {Vec3} pivotA The point relative to the center of mass of bodyA which bodyA is constrained to.
 * @param {Body} bodyB Body that will be constrained in a similar way to the same point as bodyA. We will therefore get a link between bodyA and bodyB. If not specified, bodyA will be constrained to a static point.
 * @param {Vec3} pivotB See pivotA.
 * @param {Number} maxForce The maximum force that should be applied to constrain the bodies.
 *
 * @example
 *     var bodyA = new Body({ mass: 1 });
 *     var bodyB = new Body({ mass: 1 });
 *     bodyA.position.set(-1, 0, 0);
 *     bodyB.position.set(1, 0, 0);
 *     bodyA.addShape(shapeA);
 *     bodyB.addShape(shapeB);
 *     world.addBody(bodyA);
 *     world.addBody(bodyB);
 *     var localPivotA = new Vec3(1, 0, 0);
 *     var localPivotB = new Vec3(-1, 0, 0);
 *     var constraint = new PointToPointConstraint(bodyA, localPivotA, bodyB, localPivotB);
 *     world.addConstraint(constraint);
 */
export default class PointToPointConstraint extends Constraint {
  /**
   * Pivot, defined locally in bodyA.
   * @property {Vec3} pivotA
   */
  pivotA: Vec3;
  /**
   * Pivot, defined locally in bodyB.
   * @property {Vec3} pivotB
   */
  pivotB: Vec3;
  /**
   * @property {ContactEquation} equationX
   */
  equationX: ContactEquation;
  /**
   * @property {ContactEquation} equationY
   */
  equationY: ContactEquation;
  /**
   * @property {ContactEquation} equationZ
   */
  equationZ: ContactEquation;

  constructor(
    bodyA: Body,
    pivotA: Vec3,
    bodyB: Body,
    pivotB: Vec3,
    maxForce: number = 1e6
  ) {
    super(bodyA, bodyB);

    this.pivotA = pivotA.clone();
    this.pivotB = pivotB.clone();
    this.equationX = new ContactEquation(bodyA, bodyB);
    this.equationY = new ContactEquation(bodyA, bodyB);
    this.equationZ = new ContactEquation(bodyA, bodyB);

    // Equations to be fed to the solver
    this.equations.push(this.equationX);
    this.equations.push(this.equationY);
    this.equations.push(this.equationZ);
    // Make the equations bidirectional
    this.equationX.minForce = this.equationY.minForce = this.equationZ.minForce = -maxForce;
    this.equationX.maxForce = this.equationY.maxForce = this.equationZ.maxForce = maxForce;

    this.equationX.ni.set(1, 0, 0);
    this.equationY.ni.set(0, 1, 0);
    this.equationZ.ni.set(0, 0, 1);
  }

  update() {
    const bodyA = this.bodyA;
    const bodyB = this.bodyB;
    const x = this.equationX;
    const y = this.equationY;
    const z = this.equationZ;

    // Rotate the pivots to world space
    bodyA.quaternion.vmult(this.pivotA, x.ri);
    bodyB.quaternion.vmult(this.pivotB, x.rj);

    y.ri.copy(x.ri);
    y.rj.copy(x.rj);
    z.ri.copy(x.ri);
    z.rj.copy(x.rj);
  }
}

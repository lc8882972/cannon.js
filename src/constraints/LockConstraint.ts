import PointToPointConstraint from "./PointToPointConstraint";
import Body from "../objects/Body";
import Vec3 from "../math/Vec3";
import RotationalEquation from "../equations/RotationalEquation";

export interface LockConstraintOptions {
  maxForce: number;
}

/**
 * Lock constraint. Will remove all degrees of freedom between the bodies.
 * @class LockConstraint
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {object} [options]
 * @param {Number} [options.maxForce=1e6]
 * @extends PointToPointConstraint
 */
export default class LockConstraint extends PointToPointConstraint {
  public xA: Vec3;
  public xB: Vec3;
  public yA: Vec3;
  public yB: Vec3;
  public zA: Vec3;
  public zB: Vec3;
  /**
   * @property {RotationalEquation} rotationalEquation1
   */
  public rotationalEquation1: RotationalEquation;
  /**
   * @property {RotationalEquation} rotationalEquation2
   */
  public rotationalEquation2: RotationalEquation;
  /**
   * @property {RotationalEquation} rotationalEquation3
   */
  public rotationalEquation3: RotationalEquation;

  constructor(
    bodyA: Body,
    bodyB: Body,
    options: LockConstraintOptions = {
      maxForce: 1e6
    }
  ) {
    super(bodyA, new Vec3(), bodyB, new Vec3(), options.maxForce);

    // Set pivot point in between
    const pivotA = new Vec3();
    const pivotB = new Vec3();
    const halfWay = new Vec3();
    bodyA.position.add(bodyB.position, halfWay);
    halfWay.scale(0.5, halfWay);
    bodyB.pointToLocalFrame(halfWay, pivotB);
    bodyA.pointToLocalFrame(halfWay, pivotA);

    // Store initial rotation of the bodies as unit vectors in the local body spaces
    this.xA = bodyA.vectorToLocalFrame(Vec3.UNIT_X);
    this.xB = bodyB.vectorToLocalFrame(Vec3.UNIT_X);
    this.yA = bodyA.vectorToLocalFrame(Vec3.UNIT_Y);
    this.yB = bodyB.vectorToLocalFrame(Vec3.UNIT_Y);
    this.zA = bodyA.vectorToLocalFrame(Vec3.UNIT_Z);
    this.zB = bodyB.vectorToLocalFrame(Vec3.UNIT_Z);

    // ...and the following rotational equations will keep all rotational DOF's in place
    this.rotationalEquation1 = new RotationalEquation(bodyA, bodyB, options);
    this.rotationalEquation2 = new RotationalEquation(bodyA, bodyB, options);
    this.rotationalEquation3 = new RotationalEquation(bodyA, bodyB, options);

    this.equations.push(this.rotationalEquation1);
    this.equations.push(this.rotationalEquation2);
    this.equations.push(this.rotationalEquation3);
  }

  update() {
    super.update();
    const bodyA = this.bodyA;
    const bodyB = this.bodyB;
    const r1 = this.rotationalEquation1;
    const r2 = this.rotationalEquation2;
    const r3 = this.rotationalEquation3;

    // These vector pairs must be orthogonal
    bodyA.vectorToWorldFrame(this.xA, r1.axisA);
    bodyB.vectorToWorldFrame(this.yB, r1.axisB);

    bodyA.vectorToWorldFrame(this.yA, r2.axisA);
    bodyB.vectorToWorldFrame(this.zB, r2.axisB);

    bodyA.vectorToWorldFrame(this.zA, r3.axisA);
    bodyB.vectorToWorldFrame(this.xB, r3.axisB);
  }
}

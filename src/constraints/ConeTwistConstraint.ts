import PointToPointConstraint from "./PointToPointConstraint";
import ConeEquation from "../equations/ConeEquation";
import RotationalEquation from "../equations/RotationalEquation";
import Body from "../objects/Body";
import Vec3 from "../math/Vec3";

export interface ConeTwistConstraintOptions {
  pivotA: Vec3;
  pivotB: Vec3;
  axisA: Vec3;
  axisB: Vec3;
  maxForce: number;
  collideConnected: boolean;
  angle: number;
  twistAngle: number;
}
/**
 * @class ConeTwistConstraint
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {object} [options]
 * @param {Vec3} [options.pivotA]
 * @param {Vec3} [options.pivotB]
 * @param {Vec3} [options.axisA]
 * @param {Vec3} [options.axisB]
 * @param {Number} [options.angle]
 * @param {Number} [options.twistAngle]
 * @param {Boolean} [options.collideConnected]
 * @param {Number} [options.maxForce=1e6]
 * @extends PointToPointConstraint
 */
export default class ConeTwistConstraint extends PointToPointConstraint {
  public axisA: Vec3;
  public axisB: Vec3;
  public collideConnected: boolean;
  /**
   * @property {ConeEquation} coneEquation
   */
  public coneEquation: ConeEquation;
  /**
   * @property {RotationalEquation} twistEquation
   */
  public twistEquation: RotationalEquation;
  public angle: number;
  public twistAngle: number;

  constructor(
    bodyA: Body,
    bodyB: Body,
    options: ConeTwistConstraintOptions = {
      maxForce: 1e6,
      axisA: new Vec3(),
      axisB: new Vec3(),
      angle: 0,
      twistAngle: 0,
      pivotA: new Vec3(),
      pivotB: new Vec3(),
      collideConnected: true
    }
  ) {
    super(bodyA, options.pivotA, bodyB, options.pivotB, options.maxForce);

    var maxForce = options.maxForce;

    // Set pivot point in between
    this.axisA = options.axisA.clone();
    this.axisB = options.axisB.clone();

    this.collideConnected = !!options.collideConnected;

    this.angle = options.angle;
    this.coneEquation = new ConeEquation(bodyA, bodyB, options);

    this.twistEquation = new RotationalEquation(bodyA, bodyB, options);
    this.twistAngle = options.twistAngle;

    // Make the cone equation push the bodies toward the cone axis, not outward
    this.coneEquation.maxForce = 0;
    this.coneEquation.minForce = -maxForce;

    // Make the twist equation add torque toward the initial position
    this.twistEquation.maxForce = 0;
    this.twistEquation.minForce = -maxForce;

    this.equations.push(this.coneEquation);
    this.equations.push(this.twistEquation);
  }

  update() {
    super.update();
    const bodyA = this.bodyA;
    const bodyB = this.bodyB;
    const cone = this.coneEquation;
    const twist = this.twistEquation;

    // Update the axes to the cone constraint
    bodyA.vectorToWorldFrame(this.axisA, cone.axisA);
    bodyB.vectorToWorldFrame(this.axisB, cone.axisB);

    // Update the world axes in the twist constraint
    this.axisA.tangents(twist.axisA, twist.axisA);
    bodyA.vectorToWorldFrame(twist.axisA, twist.axisA);

    this.axisB.tangents(twist.axisB, twist.axisB);
    bodyB.vectorToWorldFrame(twist.axisB, twist.axisB);

    cone.angle = this.angle;
    twist.maxAngle = this.twistAngle;
  }
}

import { ConstraintOptions } from "./Constraint";
import PointToPointConstraint from "./PointToPointConstraint";
import Body from "../objects/Body";
import Vec3 from "../math/Vec3";
import RotationalEquation from "../equations/RotationalEquation";
import RotationalMotorEquation from "../equations/RotationalMotorEquation";

const HingeConstraint_update_tmpVec1 = new Vec3();
const HingeConstraint_update_tmpVec2 = new Vec3();

export interface HingeConstraintOptions extends ConstraintOptions {
  pivotA?: Vec3;
  axisA?: Vec3;
  pivotB?: Vec3;
  axisB?: Vec3;
  maxForce?: number;
}
/**
 * Hinge constraint. Think of it as a door hinge. It tries to keep the door in the correct place and with the correct orientation.
 * @class HingeConstraint
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {object} [options]
 * @param {Vec3} [options.pivotA] A point defined locally in bodyA. This defines the offset of axisA.
 * @param {Vec3} [options.axisA] An axis that bodyA can rotate around, defined locally in bodyA.
 * @param {Vec3} [options.pivotB]
 * @param {Vec3} [options.axisB]
 * @param {Number} [options.maxForce=1e6]
 * @extends PointToPointConstraint
 */
export default class HingeConstraint extends PointToPointConstraint {
  /**
   * Rotation axis, defined locally in bodyA.
   * @property {Vec3} axisA
   */
  public axisA: Vec3;
  /**
   * Rotation axis, defined locally in bodyB.
   * @property {Vec3} axisB
   */
  public axisB: Vec3;
  /**
   * @property {RotationalEquation} rotationalEquation1
   */
  public rotationalEquation1: RotationalEquation;
  /**
   * @property {RotationalEquation} rotationalEquation2
   */
  public rotationalEquation2: RotationalEquation;
  /**
   * @property {RotationalMotorEquation} motorEquation
   */
  public motorEquation: RotationalMotorEquation;
  public motorTargetVelocity: number;

  constructor(
    bodyA: Body,
    bodyB: Body,
    options: HingeConstraintOptions = {
      axisA: new Vec3(1, 0, 0),
      axisB: new Vec3(1, 0, 0),
      pivotA: new Vec3(),
      pivotB: new Vec3(),
      maxForce: 1e6,
      collideConnected: true,
      wakeUpBodies: true
    }
  ) {
    super(bodyA, options.pivotA, bodyB, options.pivotB, options.maxForce);

    // var maxForce = options.maxForce;
    // //   typeof options.maxForce !== "undefined" ? options.maxForce : 1e6;
    // var pivotA = options.pivotA ? options.pivotA.clone() : new Vec3();
    // var pivotB = options.pivotB ? options.pivotB.clone() : new Vec3();

    this.axisA = options.axisA;
    this.axisB = options.axisB;

    this.rotationalEquation1 = new RotationalEquation(bodyA, bodyB, options);

    this.rotationalEquation2 = new RotationalEquation(bodyA, bodyB, options);

    this.motorEquation = new RotationalMotorEquation(
      bodyA,
      bodyB,
      options.maxForce
    );
    this.motorEquation.enabled = false; // Not enabled by default

    // Equations to be fed to the solver
    this.equations.push(this.rotationalEquation1);
    this.equations.push(this.rotationalEquation2);
    this.equations.push(this.motorEquation);
  }

  /**
   * @method enableMotor
   */
  enableMotor() {
    this.motorEquation.enabled = true;
  }

  /**
   * @method disableMotor
   */
  disableMotor() {
    this.motorEquation.enabled = false;
  }

  /**
   * @method setMotorSpeed
   * @param {number} speed
   */
  setMotorSpeed(speed: number) {
    this.motorEquation.targetVelocity = speed;
  }

  /**
   * @method setMotorMaxForce
   * @param {number} maxForce
   */
  setMotorMaxForce(maxForce: number) {
    this.motorEquation.maxForce = maxForce;
    this.motorEquation.minForce = -maxForce;
  }

  update() {
    super.update();
    var bodyA = this.bodyA,
      bodyB = this.bodyB,
      motor = this.motorEquation,
      r1 = this.rotationalEquation1,
      r2 = this.rotationalEquation2,
      worldAxisA = HingeConstraint_update_tmpVec1,
      worldAxisB = HingeConstraint_update_tmpVec2;

    var axisA = this.axisA;
    var axisB = this.axisB;

    // Get world axes
    bodyA.quaternion.vmult(axisA, worldAxisA);
    bodyB.quaternion.vmult(axisB, worldAxisB);

    worldAxisA.tangents(r1.axisA, r2.axisA);
    r1.axisB.copy(worldAxisB);
    r2.axisB.copy(worldAxisB);

    if (this.motorEquation.enabled) {
      bodyA.quaternion.vmult(this.axisA, motor.axisA);
      bodyB.quaternion.vmult(this.axisB, motor.axisB);
    }
  }
}

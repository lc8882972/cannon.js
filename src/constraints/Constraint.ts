import Body from "../objects/Body";
import Equation from "../equations/Equation";
export interface ConstraintOptions {
  collideConnected: boolean;
  wakeUpBodies: boolean;
}
/**
 * Constraint base class
 * @class Constraint
 * @author schteppe
 * @constructor
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {object} [options]
 * @param {boolean} [options.collideConnected=true]
 * @param {boolean} [options.wakeUpBodies=true]
 */
export default abstract class Constraint {
  static idCounter: number = 0;
  /**
   * @property {Number} id
   */
  public id: number;
  /**
   * Equations to be solved in this constraint
   * @property equations
   * @type {Array}
   */
  public equations: Equation[];
  /**
   * @property {Body} bodyA
   */
  public bodyA: Body;
  /**
   * @property {Body} bodyB
   */
  public bodyB: Body;
  /**
   * Set to true if you want the bodies to collide when they are connected.
   * @property collideConnected
   * @type {boolean}
   */
  public collideConnected: boolean;

  constructor(
    bodyA: Body,
    bodyB: Body,
    options: ConstraintOptions = { collideConnected: true, wakeUpBodies: true }
  ) {
    this.id = Constraint.idCounter++;
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.equations = [];
    this.collideConnected = options.collideConnected;
    if (options.wakeUpBodies) {
      this.bodyA.wakeUp();
      this.bodyB.wakeUp();
    }
  }

  /**
   * Update all the equations with data.
   * @method update
   */
  abstract update(): void;

  /**
   * Enables all equations in the constraint.
   * @method enable
   */
  enable() {
    for (const eqs of this.equations) {
      eqs.enabled = true;
    }
  }

  /**
   * Disables all equations in the constraint.
   * @method disable
   */
  disable() {
    for (const eqs of this.equations) {
      eqs.enabled = false;
    }
  }
}

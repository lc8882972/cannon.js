import Constraint from "./Constraint";
import ContactEquation from "../equations/ContactEquation";
import Body from "../objects/Body";
/**
 * Constrains two bodies to be at a constant distance from each others center of mass.
 * @class DistanceConstraint
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {Number} [distance] The distance to keep. If undefined, it will be set to the current distance between bodyA and bodyB
 * @param {Number} [maxForce=1e6]
 * @extends Constraint
 */
export default class DistanceConstraint extends Constraint {
  /**
   * @property {number} distance
   */
  public distance: number;
  /**
   * @property {ContactEquation} distanceEquation
   */
  public distanceEquation: ContactEquation;

  constructor(
    bodyA: Body,
    bodyB: Body,
    distance: number = 0,
    maxForce: number = 1e6
  ) {
    super(bodyA, bodyB);
    this.distanceEquation = new ContactEquation(bodyA, bodyB);
    this.equations.push(this.distanceEquation);
    if (distance === 0) {
      this.distance = bodyA.position.distanceTo(bodyB.position);
    } else {
      this.distance = distance;
    }

    this.distanceEquation.maxForce = maxForce;
    this.distanceEquation.minForce = -maxForce;
  }

  update() {
    const bodyA = this.bodyA;
    const bodyB = this.bodyB;
    const eq = this.distanceEquation;
    const halfDist = this.distance * 0.5;
    const normal = eq.ni;

    bodyB.position.sub(bodyA.position, normal);
    normal.normalize();
    normal.scale(halfDist, eq.ri);
    normal.scale(-halfDist, eq.rj);
  }
}

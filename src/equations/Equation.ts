import JacobianElement from "../math/JacobianElement";
import Vec3 from "../math/Vec3";
import Body from "../objects/Body";

// var zero = new Vec3();
const iMfi = new Vec3();
const iMfj = new Vec3();
const invIi_vmult_taui = new Vec3();
const invIj_vmult_tauj = new Vec3();
// const addToWlambda_temp = new Vec3();
// addToWlambda_Gi = new Vec3(),
// addToWlambda_Gj = new Vec3(),
// addToWlambda_ri = new Vec3(),
// addToWlambda_rj = new Vec3(),
// addToWlambda_Mdiag = new Vec3();

/**
 * Equation base class
 * @class Equation
 * @constructor
 * @author schteppe
 * @param {Body} bi
 * @param {Body} bj
 * @param {Number} minForce Minimum (read: negative max) force to be applied by the constraint.
 * @param {Number} maxForce Maximum (read: positive max) force to be applied by the constraint.
 */
export default class Equation {
  static id: number = 0;
  public id: number;
  /**
   * @property {number} minForce
   */
  public minForce: number;
  /**
   * @property {number} maxForce
   */
  public maxForce: number;
  /**
   * @property bi
   * @type {Body}
   */
  public bi: Body;
  /**
   * @property bj
   * @type {Body}
   */
  public bj: Body;
  /**
   * SPOOK parameter
   * @property {number} a
   */
  public a: number;
  /**
   * SPOOK parameter
   * @property {number} b
   */
  public b: number;
  /**
   * SPOOK parameter
   * @property {number} eps
   */
  public eps: number;
  /**
   * @property {JacobianElement} jacobianElementA
   */
  public jacobianElementA: JacobianElement;
  /**
   * @property {JacobianElement} jacobianElementB
   */
  public jacobianElementB: JacobianElement;
  /**
   * @property {boolean} enabled
   * @default true
   */
  public enabled: boolean;
  /**
   * A number, proportional to the force added to the bodies.
   * @property {number} multiplier
   * @readonly
   */
  public multiplier: number;

  constructor(
    bi: Body,
    bj: Body,
    minForce: number = -1e6,
    maxForce: number = 1e6
  ) {
    this.id = Equation.id++;
    this.minForce = minForce;
    this.maxForce = maxForce;
    this.bi = bi;
    this.bj = bj;
    this.a = 0.0;
    this.b = 0.0;
    this.eps = 0.0;
    this.jacobianElementA = new JacobianElement();
    this.jacobianElementB = new JacobianElement();
    this.enabled = true;
    this.multiplier = 0;
    // Set typical spook params
    this.setSpookParams(1e7, 4, 1 / 60);
  }

  /**
   * Recalculates a,b,eps.
   * @method setSpookParams
   */
  setSpookParams(
    stiffness: number,
    relaxation: number,
    timeStep: number
  ): void {
    // var d = relaxation,
    //   k = stiffness,
    //   h = timeStep;
    this.a = 4.0 / (timeStep * (1 + 4 * relaxation));
    this.b = (4.0 * relaxation) / (1 + 4 * relaxation);
    this.eps = 4.0 / (timeStep * timeStep * stiffness * (1 + 4 * relaxation));
  }

  /**
   * Computes the RHS of the SPOOK equation
   * @method computeB
   * @return {Number}
   */
  computeB(a: number, b: number, h: number): number {
    const GW = this.computeGW();
    const Gq = this.computeGq();
    const GiMf = this.computeGiMf();
    return -Gq * a - GW * b - GiMf * h;
  }

  /**
   * Computes G*q, where q are the generalized body coordinates
   * @method computeGq
   * @return {Number}
   */
  computeGq() {
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;
    const bi = this.bi;
    const bj = this.bj;
    const xi = bi.position;
    const xj = bj.position;
    return GA.spatial.dot(xi) + GB.spatial.dot(xj);
  }

  /**
   * Computes G*W, where W are the body velocities
   * @method computeGW
   * @return {Number}
   */
  computeGW(): number {
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;
    const bi = this.bi;
    const bj = this.bj;
    const vi = bi.velocity;
    const vj = bj.velocity;
    const wi = bi.angularVelocity;
    const wj = bj.angularVelocity;
    return GA.multiplyVectors(vi, wi) + GB.multiplyVectors(vj, wj);
  }

  /**
   * Computes G*Wlambda, where W are the body velocities
   * @method computeGWlambda
   * @return {Number}
   */
  computeGWlambda(): number {
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;
    const bi = this.bi;
    const bj = this.bj;
    const vi = bi.vlambda;
    const vj = bj.vlambda;
    const wi = bi.wlambda;
    const wj = bj.wlambda;
    return GA.multiplyVectors(vi, wi) + GB.multiplyVectors(vj, wj);
  }
  /**
   * Computes G*inv(M)*f, where M is the mass matrix with diagonal blocks for each body, and f are the forces on the bodies.
   * @method computeGiMf
   * @return {Number}
   */
  computeGiMf(): number {
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;
    const bi = this.bi;
    const bj = this.bj;
    const fi = bi.force;
    const ti = bi.torque;
    const fj = bj.force;
    const tj = bj.torque;
    const invMassi = bi.invMassSolve;
    const invMassj = bj.invMassSolve;

    fi.scale(invMassi, iMfi);
    fj.scale(invMassj, iMfj);

    bi.invInertiaWorldSolve.vmult(ti, invIi_vmult_taui);
    bj.invInertiaWorldSolve.vmult(tj, invIj_vmult_tauj);

    return (
      GA.multiplyVectors(iMfi, invIi_vmult_taui) +
      GB.multiplyVectors(iMfj, invIj_vmult_tauj)
    );
  }

  /**
   * Computes G*inv(M)*G'
   * @method computeGiMGt
   * @return {Number}
   */

  computeGiMGt() {
    const tmp = new Vec3();
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;
    const bi = this.bi;
    const bj = this.bj;
    const invMassi = bi.invMassSolve;
    const invMassj = bj.invMassSolve;
    const invIi = bi.invInertiaWorldSolve;
    const invIj = bj.invInertiaWorldSolve;
    let result = invMassi + invMassj;

    invIi.vmult(GA.rotational, tmp);
    result += tmp.dot(GA.rotational);

    invIj.vmult(GB.rotational, tmp);
    result += tmp.dot(GB.rotational);

    return result;
  }
  /**
   * Add constraint velocity to the bodies.
   * @method addToWlambda
   * @param {Number} deltalambda
   */
  addToWlambda(deltalambda: number): void {
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;
    const bi = this.bi;
    const bj = this.bj;
    const temp = new Vec3();

    // Add to linear velocity
    // v_lambda += inv(M) * delta_lamba * G
    bi.vlambda.addScaledVector(
      bi.invMassSolve * deltalambda,
      GA.spatial,
      bi.vlambda
    );
    bj.vlambda.addScaledVector(
      bj.invMassSolve * deltalambda,
      GB.spatial,
      bj.vlambda
    );

    // Add to angular velocity
    bi.invInertiaWorldSolve.vmult(GA.rotational, temp);
    bi.wlambda.addScaledVector(deltalambda, temp, bi.wlambda);

    bj.invInertiaWorldSolve.vmult(GB.rotational, temp);
    bj.wlambda.addScaledVector(deltalambda, temp, bj.wlambda);
  }

  /**
   * Compute the denominator part of the SPOOK equation: C = G*inv(M)*G' + eps
   * @method computeInvC
   * @param  {Number} eps
   * @return {Number}
   */
  computeC(): number {
    return this.computeGiMGt() + this.eps;
  }
}

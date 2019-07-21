import Equation from "./Equation";
import Body from "../objects/Body";
import Vec3 from "../math/Vec3";

const FrictionEquation_computeB_temp1 = new Vec3();
const FrictionEquation_computeB_temp2 = new Vec3();

/**
 * Constrains the slipping in a contact along a tangent
 * @class FrictionEquation
 * @constructor
 * @author schteppe
 * @param {Body} bodyA
 * @param {Body} bodyB
 * @param {Number} slipForce should be +-F_friction = +-mu * F_normal = +-mu * m * g
 * @extends Equation
 */
export default class FrictionEquation extends Equation {
  public rj: Vec3;
  public ri: Vec3;
  /**
   * tangent
   * @param {Vec3} t
   */
  public t: Vec3;

  constructor(bodyA: Body, bodyB: Body, slipForce: number) {
    super(bodyA, bodyB, -slipForce, slipForce);
    this.ri = new Vec3();
    this.rj = new Vec3();
    this.t = new Vec3();
  }

  computeB(h: number): number {
    // const a = this.a;
    const b = this.b;
    // const bi = this.bi;
    // const bj = this.bj;
    const ri = this.ri;
    const rj = this.rj;
    const rixt = FrictionEquation_computeB_temp1;
    const rjxt = FrictionEquation_computeB_temp2;
    const t = this.t;
    const GA = this.jacobianElementA;
    const GB = this.jacobianElementB;

    // Caluclate cross products
    ri.cross(t, rixt);
    rj.cross(t, rjxt);
    // G = [-t -rixt t rjxt]
    // And remember, this is a pure velocity constraint, g is always zero!
    t.negate(GA.spatial);
    rixt.negate(GA.rotational);
    GB.spatial.copy(t);
    GB.rotational.copy(rjxt);

    const GW = this.computeGW();
    const GiMf = this.computeGiMf();

    const B = -GW * b - h * GiMf;

    return B;
  }
}

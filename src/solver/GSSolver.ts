import Solver from "./Solver";
import World from "../world/World";

const GSSolver_solve_lambda: number[] = []; // Just temporary number holders that we want to reuse each solve.
const GSSolver_solve_invCs: number[] = [];
const GSSolver_solve_Bs: number[] = [];

/**
 * Constraint equation Gauss-Seidel solver.
 * @class GSSolver
 * @constructor
 * @todo The spook parameters should be specified for each constraint, not globally.
 * @author schteppe / https://github.com/schteppe
 * @see https://www8.cs.umu.se/kurser/5DV058/VT09/lectures/spooknotes.pdf
 * @extends Solver
 */
export default class GSSolver extends Solver {
  /**
   * The number of solver iterations determines quality of the constraints in the world. The more iterations, the more correct simulation. More iterations need more computations though. If you have a large gravity force in your world, you will need more iterations.
   * @property iterations
   * @type {Number}
   * @todo write more about solver and iterations in the wiki
   */
  public iterations: number;
  /**
   * When tolerance is reached, the system is assumed to be converged.
   * @property tolerance
   * @type {Number}
   */
  public tolerance: number;

  constructor() {
    super();

    this.iterations = 10;
    this.tolerance = 1e-7;
  }

  solve(dt: number, world: World): number {
    const iter = 0;
    const maxIter = this.iterations;
    const tolSquared = this.tolerance * this.tolerance;
    const equations = this.equations;
    const Neq = equations.length;
    const bodies = world.bodies;
    const Nbodies = bodies.length;
    const h = dt;
    const invCs = GSSolver_solve_invCs;
    const Bs = GSSolver_solve_Bs;
    const lambda = GSSolver_solve_lambda;

    // let q;
    let B: number;
    let invC: number;
    let deltalambda: number;
    let deltalambdaTot: number;
    let GWlambda: number;
    let lambdaj: number;

    // Update solve mass
    if (Neq !== 0) {
      for (let i = 0; i !== Nbodies; i++) {
        bodies[i].updateSolveMassProperties();
      }
    }

    // Things that does not change during iteration can be computed once
    invCs.length = Neq;
    Bs.length = Neq;
    lambda.length = Neq;
    for (let i = 0; i !== Neq; i++) {
      // var c = equations[i];
      lambda[i] = 0.0;
      Bs[i] = equations[i].computeB(h);
      invCs[i] = 1.0 / equations[i].computeC();
    }

    if (Neq !== 0) {
      // Reset vlambda
      for (let i = 0; i !== Nbodies; i++) {
        bodies[i].vlambda.set(0, 0, 0);
        bodies[i].wlambda.set(0, 0, 0);
      }

      // Iterate over equations
      for (let iter = 0; iter !== maxIter; iter++) {
        // Accumulate the total error for each iteration.
        deltalambdaTot = 0.0;

        for (let j = 0; j !== Neq; j++) {
          // var c = equations[j];

          // Compute iteration
          B = Bs[j];
          invC = invCs[j];
          lambdaj = lambda[j];
          GWlambda = equations[j].computeGWlambda();
          deltalambda = invC * (B - GWlambda - equations[j].eps * lambdaj);

          // Clamp if we are not within the min/max interval
          if (lambdaj + deltalambda < equations[j].minForce) {
            deltalambda = equations[j].minForce - lambdaj;
          } else if (lambdaj + deltalambda > equations[j].maxForce) {
            deltalambda = equations[j].maxForce - lambdaj;
          }
          lambda[j] += deltalambda;

          deltalambdaTot += deltalambda > 0.0 ? deltalambda : -deltalambda; // abs(deltalambda)

          equations[j].addToWlambda(deltalambda);
        }

        // If the total error is small enough - stop iterate
        if (deltalambdaTot * deltalambdaTot < tolSquared) {
          break;
        }
      }

      // Add result to velocity
      for (let i = 0; i !== Nbodies; i++) {
        // var b = bodies[i],
        // let v = b.velocity;
        // let w = b.angularVelocity;

        bodies[i].vlambda.vmul(bodies[i].linearFactor, bodies[i].vlambda);
        bodies[i].velocity.add(bodies[i].vlambda, bodies[i].velocity);

        bodies[i].wlambda.vmul(bodies[i].angularFactor, bodies[i].wlambda);
        bodies[i].angularVelocity.add(
          bodies[i].wlambda,
          bodies[i].angularVelocity
        );
      }

      // Set the .multiplier property of each equation
      let l = equations.length;
      let invDt = 1 / h;
      while (l--) {
        equations[l].multiplier = lambda[l] * invDt;
      }
    }

    return iter;
  }
}

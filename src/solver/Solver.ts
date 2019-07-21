import Equation from "../math/Quaternion";

/**
 * Constraint equation solver base class.
 * @class Solver
 * @constructor
 * @author schteppe / https://github.com/schteppe
 */
export default class Solver {
  /**
   * All equations to be solved
   * @property {Array} equations
   */
  public equations: any[];
  constructor() {
    this.equations = [];
  }

  /**
   * Should be implemented in subclasses!
   * @method solve
   * @param  {Number} dt
   * @param  {World} world
   */
  solve(dt: number, world: any) {
    // Should return the number of iterations done!
    return 0;
  }

  /**
   * Add an equation
   * @method addEquation
   * @param {Equation} eq
   */
  addEquation(eq) {
    if (eq.enabled) {
      this.equations.push(eq);
    }
  }

  /**
   * Remove an equation
   * @method removeEquation
   * @param {Equation} eq
   */
  removeEquation(eq) {
    var eqs = this.equations;
    var i = eqs.indexOf(eq);
    if (i !== -1) {
      eqs.splice(i, 1);
    }
  }

  /**
   * Add all equations
   * @method removeAllEquations
   */
  removeAllEquations() {
    this.equations.length = 0;
  }
}

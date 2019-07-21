import Vec3 from "../math/Vec3";
import Pool from "./Pool";

/**
 * @class Vec3Pool
 * @constructor
 * @extends Pool
 */
class Vec3Pool extends Pool<Vec3> {
  constructor() {
    super();
    this.type = Vec3;
  }

  /**
   * Construct a vector
   * @method constructObject
   * @return {Vec3}
   */
  constructObject() {
    return new Vec3();
  }
}

export default Vec3Pool;

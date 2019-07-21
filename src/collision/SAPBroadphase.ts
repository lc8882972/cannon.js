import Broadphase from "../collision/Broadphase";
import Body from "../objects/Body";
import World from "../world/World";
import AABB from "./AABB";

/**
 * Sweep and prune broadphase along one axis.
 *
 * @class SAPBroadphase
 * @constructor
 * @param {World} [world]
 * @extends Broadphase
 */

export default class SAPBroadphase extends Broadphase {
  /**
   * List of bodies currently in the broadphase.
   * @property axisList
   * @type {Array}
   */
  public axisList: Body[];
  /**
   * Axis to sort the bodies along. Set to 0 for x axis, and 1 for y axis. For best performance, choose an axis that the bodies are spread out more on.
   * @property axisIndex
   * @type {Number}
   */
  public axisIndex: number;

  constructor(world: any) {
    super();

    this.axisList = [];

    /**
     * The world to search in.
     * @property world
     * @type {World}
     */
    this.world = null;

    this.axisIndex = 0;

    if (world) {
      this.setWorld(world);
    }
  }

  private addBodyHandler = (e: any) => {
    this.axisList.push(e.body);
  };

  private removeBodyHandler = (e: any) => {
    var idx = this.axisList.indexOf(e.body);
    if (idx !== -1) {
      this.axisList.splice(idx, 1);
    }
  };

  /**
   * Change the world
   * @method setWorld
   * @param  {World} world
   */
  setWorld(world: any) {
    // Clear the old axis array
    this.axisList.length = 0;

    // Add all bodies from the new world
    for (let i = 0; i < world.bodies.length; i++) {
      this.axisList.push(world.bodies[i]);
    }

    // Remove old handlers, if any
    world.removeEventListener("addBody", this.addBodyHandler);
    world.removeEventListener("removeBody", this.removeBodyHandler);

    // Add handlers to update the list of bodies.
    world.addEventListener("addBody", this.addBodyHandler);
    world.addEventListener("removeBody", this.removeBodyHandler);

    this.world = world;
    this.dirty = true;
  }

  /**
   * @static
   * @method insertionSortX
   * @param  {Array} a
   * @return {Array}
   */
  static insertionSortX = function(a: Body[]) {
    let swap: Body;
    let j: number;
    for (let i = 1, l = a.length; i < l; i++) {
      swap = a[i];
      for (j = i - 1; j >= 0; j--) {
        if (a[j].aabb.lowerBound.x <= swap.aabb.lowerBound.x) {
          break;
        }
        a[j + 1] = a[j];
      }
      a[j + 1] = swap;
    }
    return a;
  };

  /**
   * @static
   * @method insertionSortY
   * @param  {Array} a
   * @return {Array}
   */
  static insertionSortY(a: Body[]) {
    for (var i = 1, l = a.length; i < l; i++) {
      var v = a[i];
      for (var j = i - 1; j >= 0; j--) {
        if (a[j].aabb.lowerBound.y <= v.aabb.lowerBound.y) {
          break;
        }
        a[j + 1] = a[j];
      }
      a[j + 1] = v;
    }
    return a;
  }

  /**
   * @static
   * @method insertionSortZ
   * @param  {Array} a
   * @return {Array}
   */
  static insertionSortZ(a: Body[]) {
    for (var i = 1, l = a.length; i < l; i++) {
      var v = a[i];
      for (var j = i - 1; j >= 0; j--) {
        if (a[j].aabb.lowerBound.z <= v.aabb.lowerBound.z) {
          break;
        }
        a[j + 1] = a[j];
      }
      a[j + 1] = v;
    }
    return a;
  }

  /**
   * Collect all collision pairs
   * @method collisionPairs
   * @param  {World} world
   * @param  {Array} p1
   * @param  {Array} p2
   */
  collisionPairs(world: any, p1: any, p2: any) {
    var bodies = this.axisList,
      N = bodies.length,
      axisIndex = this.axisIndex,
      i,
      j;

    if (this.dirty) {
      this.sortList();
      this.dirty = false;
    }

    // Look through the list
    for (i = 0; i !== N; i++) {
      var bi = bodies[i];

      for (j = i + 1; j < N; j++) {
        var bj = bodies[j];

        if (!this.needBroadphaseCollision(bi, bj)) {
          continue;
        }

        if (!SAPBroadphase.checkBounds(bi, bj, axisIndex)) {
          break;
        }

        this.intersectionTest(bi, bj, p1, p2);
      }
    }
  }

  sortList() {
    const axisList = this.axisList;
    const axisIndex = this.axisIndex;

    // Update AABBs
    for (let i = 0; i !== axisList.length; i++) {
      if (axisList[i].aabbNeedsUpdate) {
        axisList[i].computeAABB();
      }
    }

    // Sort the list
    if (axisIndex === 0) {
      SAPBroadphase.insertionSortX(axisList);
    } else if (axisIndex === 1) {
      SAPBroadphase.insertionSortY(axisList);
    } else if (axisIndex === 2) {
      SAPBroadphase.insertionSortZ(axisList);
    }
  }

  /**
   * Check if the bounds of two bodies overlap, along the given SAP axis.
   * @static
   * @method checkBounds
   * @param  {Body} bi
   * @param  {Body} bj
   * @param  {Number} axisIndex
   * @return {Boolean}
   */
  static checkBounds(bi: Body, bj: Body, axisIndex: 0 | 1 | 2): boolean {
    let biPos: number;
    let bjPos: number;

    if (axisIndex === 0) {
      biPos = bi.position.x;
      bjPos = bj.position.x;
    } else if (axisIndex === 1) {
      biPos = bi.position.y;
      bjPos = bj.position.y;
    } else if (axisIndex === 2) {
      biPos = bi.position.z;
      bjPos = bj.position.z;
    } else {
      throw new Error("axisIndex = 1,2,3");
    }

    const ri = bi.boundingRadius;
    const rj = bj.boundingRadius;
    // const boundA1 = biPos - ri;
    const boundA2 = biPos + ri;
    const boundB1 = bjPos - rj;
    // const boundB2 = bjPos + rj;

    return boundB1 < boundA2;
  }

  /**
   * Computes the variance of the body positions and estimates the best
   * axis to use. Will automatically set property .axisIndex.
   * @method autoDetectAxis
   */
  autoDetectAxis() {
    const invN = 1 / this.axisList.length;
    let sumX = 0;
    let sumX2 = 0;
    let sumY = 0;
    let sumY2 = 0;
    let sumZ = 0;
    let sumZ2 = 0;

    for (const item of this.axisList) {
      sumX += item.position.x;
      sumX2 += item.position.x * item.position.x;

      sumY += item.position.y;
      sumY2 += item.position.y * item.position.y;

      sumZ += item.position.z;
      sumZ2 += item.position.z * item.position.z;
    }

    const varianceX = sumX2 - sumX * sumX * invN;
    const varianceY = sumY2 - sumY * sumY * invN;
    const varianceZ = sumZ2 - sumZ * sumZ * invN;

    if (varianceX > varianceY) {
      if (varianceX > varianceZ) {
        this.axisIndex = 0;
      } else {
        this.axisIndex = 2;
      }
    } else if (varianceY > varianceZ) {
      this.axisIndex = 1;
    } else {
      this.axisIndex = 2;
    }
  }

  /**
   * Returns all the bodies within an AABB.
   * @method aabbQuery
   * @param  {World} world
   * @param  {AABB} aabb
   * @param {array} result An array to store resulting bodies in.
   * @return {array}
   */
  aabbQuery(world: World, aabb: AABB, result: Body[]): Body[] {
    result = result || [];
    const axisList = this.axisList;
    if (this.dirty) {
      this.sortList();
      this.dirty = false;
    }

    // let axisIndex = this.axisIndex;
    // let axis = "x";
    // if (axisIndex === 1) {
    //   axis = "y";
    // }
    // if (axisIndex === 2) {
    //   axis = "z";
    // }

    // var lower = aabb.lowerBound[axis];
    // var upper = aabb.upperBound[axis];
    for (const axis of axisList) {
      if (axis.aabbNeedsUpdate) {
        axis.computeAABB();
      }

      if (axis.aabb.overlaps(aabb)) {
        result.push(axis);
      }
    }
    return result;
  }
}

import Body from "../objects/Body";
import Vec3 from "../math/Vec3";
import World from "../world/World";
import AABB from "./AABB";

/**
 * Base class for broadphase implementations
 * @class Broadphase
 * @constructor
 * @author schteppe
 */
export default abstract class Broadphase {
  /**
   * The world to search for collisions in.
   * @property world
   * @type {World}
   */
  public world: any;
  /**
   * If set to true, the broadphase uses bounding boxes for intersection test, else it uses bounding spheres.
   * @property useBoundingBoxes
   * @type {Boolean}
   */
  public useBoundingBoxes: boolean;
  /**
   * Set to true if the objects in the world moved.
   * @property {Boolean} dirty
   */
  public dirty: boolean;

  constructor() {
    this.world = null;
    this.useBoundingBoxes = false;
    this.dirty = true;
  }

  /**
   * Get the collision pairs from the world
   * @method collisionPairs
   * @param {World} world The world to search in
   * @param {Array} p1 Empty array to be filled with body objects
   * @param {Array} p2 Empty array to be filled with body objects
   */
  abstract collisionPairs(world: World, p1, p2): void;

  /**
   * Check if a body pair needs to be intersection tested at all.
   * @method needBroadphaseCollision
   * @param {Body} bodyA
   * @param {Body} bodyB
   * @return {bool}
   */
  needBroadphaseCollision(bodyA: Body, bodyB: Body): boolean {
    // Check collision filter masks
    if (
      (bodyA.collisionFilterGroup & bodyB.collisionFilterMask) === 0 ||
      (bodyB.collisionFilterGroup & bodyA.collisionFilterMask) === 0
    ) {
      return false;
    }

    // Check types
    if (
      ((bodyA.type & Body.STATIC) !== 0 ||
        bodyA.sleepState === Body.SLEEPING) &&
      ((bodyB.type & Body.STATIC) !== 0 || bodyB.sleepState === Body.SLEEPING)
    ) {
      // Both bodies are static or sleeping. Skip.
      return false;
    }

    return true;
  }

  /**
   * Check if the bounding volumes of two bodies intersect.
   * @method intersectionTest
   * @param {Body} bodyA
   * @param {Body} bodyB
   * @param {array} pairs1
   * @param {array} pairs2
   */
  intersectionTest(bodyA: Body, bodyB: Body, pairs1: any, pairs2: any) {
    if (this.useBoundingBoxes) {
      this.doBoundingBoxBroadphase(bodyA, bodyB, pairs1, pairs2);
    } else {
      this.doBoundingSphereBroadphase(bodyA, bodyB, pairs1, pairs2);
    }
  }

  /**
   * Check if the bounding spheres of two bodies are intersecting.
   * @method doBoundingSphereBroadphase
   * @param {Body} bodyA
   * @param {Body} bodyB
   * @param {Array} pairs1 bodyA is appended to this array if intersection
   * @param {Array} pairs2 bodyB is appended to this array if intersection
   */
  doBoundingSphereBroadphase(
    bodyA: Body,
    bodyB: Body,
    pairs1: any,
    pairs2: any
  ) {
    var r = new Vec3();
    bodyB.position.sub(bodyA.position, r);
    var boundingRadiusSum2 = Math.pow(
      bodyA.boundingRadius + bodyB.boundingRadius,
      2
    );
    var norm2 = r.lengthSquared();
    if (norm2 < boundingRadiusSum2) {
      pairs1.push(bodyA);
      pairs2.push(bodyB);
    }
  }

  /**
   * Check if the bounding boxes of two bodies are intersecting.
   * @method doBoundingBoxBroadphase
   * @param {Body} bodyA
   * @param {Body} bodyB
   * @param {Array} pairs1
   * @param {Array} pairs2
   */
  doBoundingBoxBroadphase(bodyA: Body, bodyB: Body, pairs1: any, pairs2: any) {
    if (bodyA.aabbNeedsUpdate) {
      bodyA.computeAABB();
    }
    if (bodyB.aabbNeedsUpdate) {
      bodyB.computeAABB();
    }

    // Check AABB / AABB
    if (bodyA.aabb.overlaps(bodyB.aabb)) {
      pairs1.push(bodyA);
      pairs2.push(bodyB);
    }
  }

  /**
   * Removes duplicate pairs from the pair arrays.
   * @method makePairsUnique
   * @param {Array} pairs1
   * @param {Array} pairs2
   */
  makePairsUnique(pairs1: any[], pairs2: any[]) {
    const t: { [key: string]: any; keys: string[] } = { keys: [] as string[] };
    const p1 = [];
    const p2 = [];
    const N = pairs1.length;
    let key: string | undefined;
    let pairIndex: any;
    let id1;
    let id2;
    for (var i = 0; i !== N; i++) {
      p1[i] = pairs1[i];
      p2[i] = pairs2[i];
    }

    pairs1.length = 0;
    pairs2.length = 0;

    for (var i = 0; i !== N; i++) {
      id1 = p1[i].id;
      id2 = p2[i].id;
      key = id1 < id2 ? id1 + "," + id2 : id2 + "," + id1;
      t[key] = i;
      t.keys.push(key);
    }

    for (var i = 0; i < t.keys.length; i++) {
      key = t.keys.pop();
      if (key) {
        pairIndex = t[key];
        pairs1.push(p1[pairIndex]);
        pairs2.push(p2[pairIndex]);
        delete t[key];
      }
    }
  }

  /**
   * To be implemented by subcasses
   * @method setWorld
   * @param {World} world
   */
  setWorld(world: World) {}

  /**
   * Check if the bounding spheres of two bodies overlap.
   * @method boundingSphereCheck
   * @param {Body} bodyA
   * @param {Body} bodyB
   * @return {boolean}
   */
  boundingSphereCheck(bodyA: Body, bodyB: Body): boolean {
    var dist = new Vec3();
    bodyA.position.sub(bodyB.position, dist);
    return (
      Math.pow(
        bodyA.shape.boundingSphereRadius + bodyB.shape.boundingSphereRadius,
        2
      ) > dist.lengthSquared()
    );
  }

  /**
   * Returns all the bodies within the AABB.
   * @method aabbQuery
   * @param  {World} world
   * @param  {AABB} aabb
   * @param  {array} result An array to store resulting bodies in.
   * @return {array}
   */
  abstract aabbQuery(world: World, aabb: AABB, result: Body[]): Body[];
}

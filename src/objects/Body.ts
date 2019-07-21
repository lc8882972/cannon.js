import EventTarget, { Event } from "../utils/EventTarget";
import Shape from "../shapes/Shape";
import Vec3 from "../math/Vec3";
import Mat3 from "../math/Mat3";
import Quaternion from "../math/Quaternion";
import Material from "../material/Material";
import AABB from "../collision/AABB";
import Box from "../shapes/Box";

const tmpVec = new Vec3();
const tmpQuat = new Quaternion();

const computeAABB_shapeAABB = new AABB();

const uiw_m1 = new Mat3(),
  uiw_m2 = new Mat3(),
  uiw_m3 = new Mat3();

// var Body_applyForce_r = new Vec3();
const Body_applyForce_rotForce = new Vec3();

const Body_applyLocalForce_worldForce = new Vec3();
const Body_applyLocalForce_relativePointWorld = new Vec3();

// var Body_applyImpulse_r = new Vec3();
const Body_applyImpulse_velo = new Vec3();
const Body_applyImpulse_rotVelo = new Vec3();

const Body_applyLocalImpulse_worldImpulse = new Vec3();
const Body_applyLocalImpulse_relativePoint = new Vec3();

const Body_updateMassProperties_halfExtents = new Vec3();

// var torque = new Vec3();
// var invI_tau_dt = new Vec3();
// var w = new Quaternion();
// var wq = new Quaternion();

export interface BodyOptions {
  position?: Vec3;
  velocity?: Vec3;
  angularVelocity?: Vec3;
  quaternion?: Quaternion;
  mass?: number;
  material?: Material;
  type?: number;
  linearDamping?: number;
  allowSleep?: boolean;
  sleepSpeedLimit?: number;
  sleepTimeLimit?: number;
  collisionFilterGroup?: number;
  collisionFilterMask?: number;
  fixedRotation?: boolean;
  linearFactor?: Vec3;
  angularFactor?: Vec3;
  angularDamping?: number;
  shape?: Shape;
}
/**
 * Base class for all body types.
 * @class Body
 * @constructor
 * @extends EventTarget
 * @param {object} [options]
 * @param {Vec3} [options.position]
 * @param {Vec3} [options.velocity]
 * @param {Vec3} [options.angularVelocity]
 * @param {Quaternion} [options.quaternion]
 * @param {number} [options.mass]
 * @param {Material} [options.material]
 * @param {number} [options.type]
 * @param {number} [options.linearDamping=0.01]
 * @param {number} [options.angularDamping=0.01]
 * @param {boolean} [options.allowSleep=true]
 * @param {number} [options.sleepSpeedLimit=0.1]
 * @param {number} [options.sleepTimeLimit=1]
 * @param {number} [options.collisionFilterGroup=1]
 * @param {number} [options.collisionFilterMask=-1]
 * @param {boolean} [options.fixedRotation=false]
 * @param {Vec3} [options.linearFactor]
 * @param {Vec3} [options.angularFactor]
 * @param {Shape} [options.shape]
 * @example
 *     var body = new Body({
 *         mass: 1
 *     });
 *     var shape = new Sphere(1);
 *     body.addShape(shape);
 *     world.addBody(body);
 */
export default class Body extends EventTarget {
  static idCounter: number = 0;
  /**
   * Dispatched after two bodies collide. This event is dispatched on each
   * of the two bodies involved in the collision.
   * @event collide
   * @param {Body} body The body that was involved in the collision.
   * @param {ContactEquation} contact The details of the collision.
   */
  static readonly COLLIDE_EVENT_NAME = "collide";
  /**
   * A dynamic body is fully simulated. Can be moved manually by the user, but normally they move according to forces. A dynamic body can collide with all body types. A dynamic body always has finite, non-zero mass.
   * @static
   * @property DYNAMIC
   * @type {Number}
   */
  static readonly DYNAMIC: number = 1;
  /**
   * A static body does not move during simulation and behaves as if it has infinite mass. Static bodies can be moved manually by setting the position of the body. The velocity of a static body is always zero. Static bodies do not collide with other static or kinematic bodies.
   * @static
   * @property STATIC
   * @type {Number}
   */
  static readonly STATIC: number = 2;
  /**
   * A kinematic body moves under simulation according to its velocity. They do not respond to forces. They can be moved manually, but normally a kinematic body is moved by setting its velocity. A kinematic body behaves as if it has infinite mass. Kinematic bodies do not collide with other static or kinematic bodies.
   * @static
   * @property KINEMATIC
   * @type {Number}
   */
  static readonly KINEMATIC: number = 4;

  /**
   * @static
   * @property AWAKE
   * @type {number}
   */
  static readonly AWAKE: number = 0;
  /**
   * @static
   * @property SLEEPY
   * @type {number}
   */
  static readonly SLEEPY: number = 1;

  /**
   * @static
   * @property SLEEPING
   * @type {number}
   */
  static readonly SLEEPING = 2;

  /**
   * Dispatched after a sleeping body has woken up.
   * @event wakeup
   */
  static readonly wakeupEvent: Event = {
    type: "wakeup"
  };
  /**
   * Dispatched after a body has gone in to the sleepy state.
   * @event sleepy
   */
  static readonly sleepyEvent: Event = {
    type: "sleepy"
  };

  /**
   * Dispatched after a body has fallen asleep.
   * @event sleep
   */
  static readonly sleepEvent: Event = {
    type: "sleep"
  };

  public id: number;
  public index: number;
  public world: any;
  public preStep: any;
  public postStep: any;
  public vlambda: Vec3;
  public collisionFilterGroup: number;
  public collisionFilterMask: number;
  public collisionResponse: boolean | number;
  public position: Vec3;
  public previousPosition: Vec3;
  public interpolatedPosition: Vec3;
  public initPosition: Vec3;
  public velocity: Vec3;
  public initVelocity: Vec3;
  public force: Vec3;
  public mass: number;
  public invMass: number;
  public material: Material | null;
  public linearDamping: number;
  public type: number;
  public allowSleep: boolean;
  public sleepState: number;
  public sleepSpeedLimit: number;
  public sleepTimeLimit: number;
  public timeLastSleepy: number;
  public _wakeUpAfterNarrowphase: boolean;
  public torque: Vec3;
  public quaternion: Quaternion;
  public initQuaternion: Quaternion;
  public previousQuaternion: Quaternion;
  public interpolatedQuaternion: Quaternion;
  public angularVelocity: Vec3;
  public shapes: Shape[];
  public shape: Shape;
  public shapeOffsets: Vec3[];
  public shapeOrientations: Quaternion[];
  public inertia: Vec3;
  public invInertia: Vec3;
  public invInertiaWorld: Mat3;
  public invMassSolve: number;
  public invInertiaSolve: Vec3;
  public invInertiaWorldSolve: Mat3;
  public fixedRotation: boolean;
  public angularDamping: number;
  public angularFactor: Vec3;
  public initAngularVelocity: Vec3;
  public linearFactor: Vec3;
  public aabb: AABB;
  public aabbNeedsUpdate: boolean;
  public boundingRadius: number;
  public wlambda: Vec3;

  constructor(options: BodyOptions = {}) {
    super();
    this.id = Body.idCounter++;

    this.index = -1;
    this.world = null;
    this.preStep = null;
    this.postStep = null;
    this.vlambda = new Vec3();
    this.collisionFilterGroup =
      typeof options.collisionFilterGroup === "number"
        ? options.collisionFilterGroup
        : 1;

    this.collisionFilterMask =
      typeof options.collisionFilterMask === "number"
        ? options.collisionFilterMask
        : -1;

    this.collisionResponse = true;
    this.position = new Vec3();
    this.previousPosition = new Vec3();
    this.interpolatedPosition = new Vec3();
    this.initPosition = new Vec3();

    if (options.position) {
      this.position.copy(options.position);
      this.previousPosition.copy(options.position);
      this.interpolatedPosition.copy(options.position);
      this.initPosition.copy(options.position);
    }

    this.velocity = new Vec3();
    if (options.velocity) {
      this.velocity.copy(options.velocity);
    }
    this.initVelocity = new Vec3();
    this.force = new Vec3();
    var mass = typeof options.mass === "number" ? options.mass : 0;
    this.mass = mass;
    this.invMass = mass > 0 ? 1.0 / mass : 0;
    this.material = options.material || null;
    this.linearDamping =
      typeof options.linearDamping === "number" ? options.linearDamping : 0.01;
    this.type = mass <= 0.0 ? Body.STATIC : Body.DYNAMIC;
    if (typeof options.type === "number") {
      this.type = options.type;
    }
    this.allowSleep =
      typeof options.allowSleep !== "undefined" ? options.allowSleep : true;
    this.sleepState = 0;
    this.sleepSpeedLimit =
      typeof options.sleepSpeedLimit !== "undefined"
        ? options.sleepSpeedLimit
        : 0.1;
    this.sleepTimeLimit =
      typeof options.sleepTimeLimit !== "undefined"
        ? options.sleepTimeLimit
        : 1;
    this.timeLastSleepy = 0;
    this._wakeUpAfterNarrowphase = false;
    this.torque = new Vec3();
    this.quaternion = new Quaternion();
    this.initQuaternion = new Quaternion();
    this.previousQuaternion = new Quaternion();
    this.interpolatedQuaternion = new Quaternion();
    if (options.quaternion) {
      this.quaternion.copy(options.quaternion);
      this.initQuaternion.copy(options.quaternion);
      this.previousQuaternion.copy(options.quaternion);
      this.interpolatedQuaternion.copy(options.quaternion);
    }
    this.angularVelocity = new Vec3();

    if (options.angularVelocity) {
      this.angularVelocity.copy(options.angularVelocity);
    }
    this.initAngularVelocity = new Vec3();
    this.shapes = [];
    this.shapeOffsets = [];
    this.shapeOrientations = [];
    this.inertia = new Vec3();
    this.invInertia = new Vec3();
    this.invInertiaWorld = new Mat3();
    this.invMassSolve = 0;
    this.invInertiaSolve = new Vec3();
    this.invInertiaWorldSolve = new Mat3();
    this.fixedRotation =
      typeof options.fixedRotation !== "undefined"
        ? options.fixedRotation
        : false;
    this.angularDamping =
      typeof options.angularDamping !== "undefined"
        ? options.angularDamping
        : 0.01;
    this.linearFactor = new Vec3(1, 1, 1);
    if (options.linearFactor) {
      this.linearFactor.copy(options.linearFactor);
    }

    this.angularFactor = new Vec3(1, 1, 1);
    if (options.angularFactor) {
      this.angularFactor.copy(options.angularFactor);
    }

    this.aabb = new AABB();
    this.aabbNeedsUpdate = true;
    this.boundingRadius = 0;
    this.wlambda = new Vec3();

    if (options.shape) {
      this.addShape(options.shape);
      this.shape = options.shape;
    }
    this.updateMassProperties();
  }

  /**
   * Wake the body up.
   * @method wakeUp
   */
  wakeUp() {
    var s = this.sleepState;
    this.sleepState = 0;
    this._wakeUpAfterNarrowphase = false;
    if (s === Body.SLEEPING) {
      this.dispatchEvent(Body.wakeupEvent);
    }
  }

  /**
   * Force body sleep
   * @method sleep
   */
  sleep() {
    this.sleepState = Body.SLEEPING;
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this._wakeUpAfterNarrowphase = false;
  }

  /**
   * Called every timestep to update internal sleep timer and change sleep state if needed.
   * @method sleepTick
   * @param {Number} time The world time in seconds
   */
  sleepTick(time: number): void {
    if (this.allowSleep) {
      var sleepState = this.sleepState;
      var speedSquared =
        this.velocity.lengthSquared() + this.angularVelocity.lengthSquared();
      var speedLimitSquared = Math.pow(this.sleepSpeedLimit, 2);
      if (sleepState === Body.AWAKE && speedSquared < speedLimitSquared) {
        this.sleepState = Body.SLEEPY; // Sleepy
        this.timeLastSleepy = time;
        this.dispatchEvent(Body.sleepyEvent);
      } else if (
        sleepState === Body.SLEEPY &&
        speedSquared > speedLimitSquared
      ) {
        this.wakeUp(); // Wake up
      } else if (
        sleepState === Body.SLEEPY &&
        time - this.timeLastSleepy > this.sleepTimeLimit
      ) {
        this.sleep(); // Sleeping
        this.dispatchEvent(Body.sleepEvent);
      }
    }
  }

  /**
   * If the body is sleeping, it should be immovable / have infinite mass during solve. We solve it by having a separate "solve mass".
   * @method updateSolveMassProperties
   */
  updateSolveMassProperties(): void {
    if (this.sleepState === Body.SLEEPING || this.type === Body.KINEMATIC) {
      this.invMassSolve = 0;
      this.invInertiaSolve.setZero();
      this.invInertiaWorldSolve.setZero();
    } else {
      this.invMassSolve = this.invMass;
      this.invInertiaSolve.copy(this.invInertia);
      this.invInertiaWorldSolve.copy(this.invInertiaWorld);
    }
  }

  /**
   * Convert a world point to local body frame.
   * @method pointToLocalFrame
   * @param  {Vec3} worldPoint
   * @param  {Vec3} result
   * @return {Vec3}
   */
  pointToLocalFrame(worldPoint: Vec3, result: Vec3): Vec3 {
    var result = result || new Vec3();
    worldPoint.sub(this.position, result);
    this.quaternion.conjugate().vmult(result, result);
    return result;
  }

  /**
   * Convert a world vector to local body frame.
   * @method vectorToLocalFrame
   * @param  {Vec3} worldPoint
   * @param  {Vec3} result
   * @return {Vec3}
   */
  vectorToLocalFrame(worldVector: Vec3, result: Vec3 = new Vec3()): Vec3 {
    this.quaternion.conjugate().vmult(worldVector, result);
    return result;
  }

  /**
   * Convert a local body point to world frame.
   * @method pointToWorldFrame
   * @param  {Vec3} localPoint
   * @param  {Vec3} result
   * @return {Vec3}
   */
  pointToWorldFrame(localPoint: Vec3, result: Vec3): Vec3 {
    var result = result || new Vec3();
    this.quaternion.vmult(localPoint, result);
    result.add(this.position, result);
    return result;
  }

  /**
   * Convert a local body point to world frame.
   * @method vectorToWorldFrame
   * @param  {Vec3} localVector
   * @param  {Vec3} result
   * @return {Vec3}
   */
  vectorToWorldFrame(localVector: Vec3, result: Vec3): Vec3 {
    var result = result || new Vec3();
    this.quaternion.vmult(localVector, result);
    return result;
  }

  /**
   * Add a shape to the body with a local offset and orientation.
   * @method addShape
   * @param {Shape} shape
   * @param {Vec3} [_offset]
   * @param {Quaternion} [_orientation]
   * @return {Body} The body object, for chainability.
   */
  addShape(shape: Shape, _offset?: Vec3, _orientation?: Quaternion): Body {
    var offset = new Vec3();
    var orientation = new Quaternion();

    if (_offset) {
      offset.copy(_offset);
    }
    if (_orientation) {
      orientation.copy(_orientation);
    }

    this.shapes.push(shape);
    this.shapeOffsets.push(offset);
    this.shapeOrientations.push(orientation);
    this.updateMassProperties();
    this.updateBoundingRadius();

    this.aabbNeedsUpdate = true;

    shape.body = this;

    return this;
  }

  /**
   * Update the bounding radius of the body. Should be done if any of the shapes are changed.
   * @method updateBoundingRadius
   */
  updateBoundingRadius(): void {
    var shapes = this.shapes,
      shapeOffsets = this.shapeOffsets,
      N = shapes.length,
      radius = 0;

    for (var i = 0; i !== N; i++) {
      var shape = shapes[i];
      shape.updateBoundingSphereRadius();
      var offset = shapeOffsets[i].length(),
        r = shape.boundingSphereRadius;
      if (offset + r > radius) {
        radius = offset + r;
      }
    }

    this.boundingRadius = radius;
  }

  /**
   * Updates the .aabb
   * @method computeAABB
   * @todo rename to updateAABB()
   */
  computeAABB() {
    var shapes = this.shapes,
      shapeOffsets = this.shapeOffsets,
      shapeOrientations = this.shapeOrientations,
      N = shapes.length,
      offset = tmpVec,
      orientation = tmpQuat,
      bodyQuat = this.quaternion,
      aabb = this.aabb,
      shapeAABB = computeAABB_shapeAABB;

    for (var i = 0; i !== N; i++) {
      var shape = shapes[i];

      // Get shape world position
      bodyQuat.vmult(shapeOffsets[i], offset);
      offset.add(this.position, offset);

      // Get shape world quaternion
      shapeOrientations[i].mult(bodyQuat, orientation);

      // Get shape AABB
      shape.calculateWorldAABB(
        offset,
        orientation,
        shapeAABB.lowerBound,
        shapeAABB.upperBound
      );

      if (i === 0) {
        aabb.copy(shapeAABB);
      } else {
        aabb.extend(shapeAABB);
      }
    }

    this.aabbNeedsUpdate = false;
  }

  /**
   * Update .inertiaWorld and .invInertiaWorld
   * @method updateInertiaWorld
   */
  updateInertiaWorld(force: boolean = true): void {
    var I = this.invInertia;
    if (I.x === I.y && I.y === I.z && !force) {
      // If inertia M = s*I, where I is identity and s a scalar, then
      //    R*M*R' = R*(s*I)*R' = s*R*I*R' = s*R*R' = s*I = M
      // where R is the rotation matrix.
      // In other words, we don't have to transform the inertia if all
      // inertia diagonal entries are equal.
    } else {
      var m1 = uiw_m1,
        m2 = uiw_m2,
        m3 = uiw_m3;
      m1.setRotationFromQuaternion(this.quaternion);
      m1.transpose(m2);
      m1.scale(I, m1);
      m1.mmult(m2, this.invInertiaWorld);
    }
  }

  /**
   * Apply force to a world point. This could for example be a point on the Body surface. Applying force this way will add to Body.force and Body.torque.
   * @method applyForce
   * @param  {Vec3} force The amount of force to add.
   * @param  {Vec3} relativePoint A point relative to the center of mass to apply the force on.
   */
  applyForce(force: Vec3, relativePoint: Vec3): void {
    if (this.type !== Body.DYNAMIC) {
      // Needed?
      return;
    }

    // Compute produced rotational force
    var rotForce = Body_applyForce_rotForce;
    relativePoint.cross(force, rotForce);

    // Add linear force
    this.force.add(force, this.force);

    // Add rotational force
    this.torque.add(rotForce, this.torque);
  }

  /**
   * Apply force to a local point in the body.
   * @method applyLocalForce
   * @param  {Vec3} force The force vector to apply, defined locally in the body frame.
   * @param  {Vec3} localPoint A local point in the body to apply the force on.
   */
  applyLocalForce(localForce: Vec3, localPoint: Vec3): void {
    if (this.type !== Body.DYNAMIC) {
      return;
    }

    var worldForce = Body_applyLocalForce_worldForce;
    var relativePointWorld = Body_applyLocalForce_relativePointWorld;

    // Transform the force vector to world space
    this.vectorToWorldFrame(localForce, worldForce);
    this.vectorToWorldFrame(localPoint, relativePointWorld);

    this.applyForce(worldForce, relativePointWorld);
  }

  /**
   * Apply impulse to a world point. This could for example be a point on the Body surface. An impulse is a force added to a body during a short period of time (impulse = force * time). Impulses will be added to Body.velocity and Body.angularVelocity.
   * @method applyImpulse
   * @param  {Vec3} impulse The amount of impulse to add.
   * @param  {Vec3} relativePoint A point relative to the center of mass to apply the force on.
   */
  applyImpulse(impulse: Vec3, relativePoint: Vec3): void {
    if (this.type !== Body.DYNAMIC) {
      return;
    }

    // Compute point position relative to the body center
    var r = relativePoint;

    // Compute produced central impulse velocity
    var velo = Body_applyImpulse_velo;
    velo.copy(impulse);
    velo.scale(this.invMass, velo);

    // Add linear impulse
    this.velocity.add(velo, this.velocity);

    // Compute produced rotational impulse velocity
    var rotVelo = Body_applyImpulse_rotVelo;
    r.cross(impulse, rotVelo);

    /*
      rotVelo.x *= this.invInertia.x;
      rotVelo.y *= this.invInertia.y;
      rotVelo.z *= this.invInertia.z;
      */
    this.invInertiaWorld.vmult(rotVelo, rotVelo);

    // Add rotational Impulse
    this.angularVelocity.add(rotVelo, this.angularVelocity);
  }

  /**
   * Apply locally-defined impulse to a local point in the body.
   * @method applyLocalImpulse
   * @param  {Vec3} force The force vector to apply, defined locally in the body frame.
   * @param  {Vec3} localPoint A local point in the body to apply the force on.
   */
  applyLocalImpulse(localImpulse: Vec3, localPoint: Vec3): void {
    if (this.type !== Body.DYNAMIC) {
      return;
    }

    var worldImpulse = Body_applyLocalImpulse_worldImpulse;
    var relativePointWorld = Body_applyLocalImpulse_relativePoint;

    // Transform the force vector to world space
    this.vectorToWorldFrame(localImpulse, worldImpulse);
    this.vectorToWorldFrame(localPoint, relativePointWorld);

    this.applyImpulse(worldImpulse, relativePointWorld);
  }

  /**
   * Should be called whenever you change the body shape or mass.
   * @method updateMassProperties
   */
  updateMassProperties(): void {
    var halfExtents = Body_updateMassProperties_halfExtents;

    this.invMass = this.mass > 0 ? 1.0 / this.mass : 0;
    var I = this.inertia;
    var fixed = this.fixedRotation;

    // Approximate with AABB box
    this.computeAABB();
    halfExtents.set(
      (this.aabb.upperBound.x - this.aabb.lowerBound.x) / 2,
      (this.aabb.upperBound.y - this.aabb.lowerBound.y) / 2,
      (this.aabb.upperBound.z - this.aabb.lowerBound.z) / 2
    );
    Box.calculateInertia(halfExtents, this.mass, I);

    this.invInertia.set(
      I.x > 0 && !fixed ? 1.0 / I.x : 0,
      I.y > 0 && !fixed ? 1.0 / I.y : 0,
      I.z > 0 && !fixed ? 1.0 / I.z : 0
    );
    this.updateInertiaWorld(true);
  }

  /**
   * Get world velocity of a point in the body.
   * @method getVelocityAtWorldPoint
   * @param  {Vec3} worldPoint
   * @param  {Vec3} result
   * @return {Vec3} The result vector.
   */
  getVelocityAtWorldPoint(worldPoint: Vec3, result: Vec3): Vec3 {
    var r = new Vec3();
    worldPoint.sub(this.position, r);
    this.angularVelocity.cross(r, result);
    this.velocity.add(result, result);
    return result;
  }

  /**
   * Move the body forward in time.
   * @param {number} dt Time step
   * @param {boolean} quatNormalize Set to true to normalize the body quaternion
   * @param {boolean} quatNormalizeFast If the quaternion should be normalized using "fast" quaternion normalization
   */
  integrate(
    dt: number,
    quatNormalize: boolean,
    quatNormalizeFast: boolean
  ): void {
    // Save previous position
    this.previousPosition.copy(this.position);
    this.previousQuaternion.copy(this.quaternion);

    if (
      !(this.type === Body.DYNAMIC || this.type === Body.KINEMATIC) ||
      this.sleepState === Body.SLEEPING
    ) {
      // Only for dynamic
      return;
    }

    var velo = this.velocity,
      angularVelo = this.angularVelocity,
      pos = this.position,
      force = this.force,
      torque = this.torque,
      quat = this.quaternion,
      invMass = this.invMass,
      invInertia = this.invInertiaWorld,
      linearFactor = this.linearFactor;

    var iMdt = invMass * dt;
    velo.x += force.x * iMdt * linearFactor.x;
    velo.y += force.y * iMdt * linearFactor.y;
    velo.z += force.z * iMdt * linearFactor.z;

    var e = invInertia.elements;
    var angularFactor = this.angularFactor;
    var tx = torque.x * angularFactor.x;
    var ty = torque.y * angularFactor.y;
    var tz = torque.z * angularFactor.z;
    angularVelo.x += dt * (e[0] * tx + e[1] * ty + e[2] * tz);
    angularVelo.y += dt * (e[3] * tx + e[4] * ty + e[5] * tz);
    angularVelo.z += dt * (e[6] * tx + e[7] * ty + e[8] * tz);

    // Use new velocity  - leap frog
    pos.x += velo.x * dt;
    pos.y += velo.y * dt;
    pos.z += velo.z * dt;

    quat.integrate(this.angularVelocity, dt, this.angularFactor, quat);

    if (quatNormalize) {
      if (quatNormalizeFast) {
        quat.normalizeFast();
      } else {
        quat.normalize();
      }
    }

    this.aabbNeedsUpdate = true;

    // Update world inertia
    this.updateInertiaWorld();
  }
}

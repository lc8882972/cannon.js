/* global performance */

import Shape from "../shapes/Shape";
import Vec3 from "../math/Vec3";
import GSSolver from "../solver/GSSolver";
import ContactEquation from "../equations/ContactEquation";
import FrictionEquation from "../equations/FrictionEquation";
import Narrowphase from "./Narrowphase";
import Constraint from "../constraints/Constraint";
import EventTarget from "../utils/EventTarget";
import ArrayCollisionMatrix from "../collision/ArrayCollisionMatrix";
import OverlapKeeper from "../collision/OverlapKeeper";
import Material from "../material/Material";
import ContactMaterial from "../material/ContactMaterial";
import Body from "../objects/Body";
import TupleDictionary from "../utils/TupleDictionary";
import RaycastResult from "../collision/RaycastResult";
import Ray from "../collision/Ray";
import NaiveBroadphase from "../collision/NaiveBroadphase";
import Broadphase from "../collision/Broadphase";
import Solver from "../solver/Solver";

export interface WorldOptions {
  gravity?: Vec3;
  allowSleep?: boolean;
  broadphase?: Broadphase;
  solver?: Solver;
  quatNormalizeFast?: boolean;
  quatNormalizeSkip?: number;
}

export interface AddBodyEvent {
  type: string;
  body: null | Body;
}

export interface RemoveBodyEvent {
  type: string;
  body: null | Body;
}

export interface WorldStepCollideEvent {
  type: string;
  body: null | Body;
  contact: ContactEquation | null;
}

export interface WorldStepEvent {
  type: string;
}

export interface BeginContactEvent {
  type: "beginContact";
  bodyA: Body | null;
  bodyB: Body | null;
}

export interface EndContactEvent {
  type: "endContact";
  bodyA: Body | null;
  bodyB: Body | null;
}

export interface BeginShapeContactEvent {
  type: "beginShapeContact";
  bodyA: Body | null;
  bodyB: Body | null;
  shapeA: Shape | null;
  shapeB: Shape | null;
}

export interface EndShapeContactEvent {
  type: "endShapeContact";
  bodyA: Body | null;
  bodyB: Body | null;
  shapeA: Shape | null;
  shapeB: Shape | null;
}

// Temp stuff
// var tmpAABB1 = new AABB();
// var tmpArray1 = [];
const tmpRay = new Ray();

// performance.now()
// if (typeof performance === "undefined") {
//   performance = {};
// }
// if (!performance.now) {
//   var nowOffset = Date.now();
//   if (performance.timing && performance.timing.navigationStart) {
//     nowOffset = performance.timing.navigationStart;
//   }
//   performance.now = function() {
//     return Date.now() - nowOffset;
//   };
// }

// var step_tmp1 = new Vec3();

/**
 * Dispatched after the world has stepped forward in time.
 * @event postStep
 */
const World_step_postStepEvent: WorldStepEvent = { type: "postStep" }; // Reusable event objects to save memory
/**
 * Dispatched before the world steps forward in time.
 * @event preStep
 */
const World_step_preStepEvent: WorldStepEvent = { type: "preStep" };
const World_step_collideEvent: WorldStepCollideEvent = {
  type: Body.COLLIDE_EVENT_NAME,
  body: null,
  contact: null
};
const World_step_oldContacts: ContactEquation[] = []; // Pools for unused objects
const World_step_frictionEquationPool: FrictionEquation[] = [];
const World_step_p1: any[] = []; // Reusable arrays for collision pairs
const World_step_p2: any[] = [];

/**
 * The physics world
 * @class World
 * @constructor
 * @extends EventTarget
 * @param {object} [options]
 * @param {Vec3} [options.gravity]
 * @param {boolean} [options.allowSleep]
 * @param {Broadphase} [options.broadphase]
 * @param {Solver} [options.solver]
 * @param {boolean} [options.quatNormalizeFast]
 * @param {number} [options.quatNormalizeSkip]
 */
export default class World extends EventTarget {
  /**
   * Currently / last used timestep. Is set to -1 if not available. This value is updated before each internal step, which means that it is "fresh" inside event callbacks.
   * @property {Number} dt
   */
  public dt: number;
  /**
   * Makes bodies go to sleep when they've been inactive
   * @property allowSleep
   * @type {Boolean}
   * @default false
   */
  public allowSleep: boolean;
  /**
   * All the current contacts (instances of ContactEquation) in the world.
   * @property contacts
   * @type {Array}
   */
  public contacts: ContactEquation[];
  public frictionEquations: FrictionEquation[];
  /**
   * How often to normalize quaternions. Set to 0 for every step, 1 for every second etc.. A larger value increases performance. If bodies tend to explode, set to a smaller value (zero to be sure nothing can go wrong).
   * @property quatNormalizeSkip
   * @type {Number}
   * @default 0
   */
  public quatNormalizeSkip: number;
  /**
   * Set to true to use fast quaternion normalization. It is often enough accurate to use. If bodies tend to explode, set to false.
   * @property quatNormalizeFast
   * @type {Boolean}
   * @see Quaternion.normalizeFast
   * @see Quaternion.normalize
   * @default false
   */
  public quatNormalizeFast: boolean;
  /**
   * The wall-clock time since simulation start
   * @property time
   * @type {Number}
   */
  public time: number;
  /**
   * Number of timesteps taken since start
   * @property stepnumber
   * @type {Number}
   */
  public stepnumber: number;
  public default_dt: number;
  public nextId: number;
  /**
   * @property gravity
   * @type {Vec3}
   */
  public gravity: Vec3;
  /**
   * The broadphase algorithm to use. Default is NaiveBroadphase
   * @property broadphase
   * @type {Broadphase}
   */
  public broadphase: Broadphase;
  /**
   * @property bodies
   * @type {Array}
   */
  public bodies: Body[];
  /**
   * The solver algorithm to use. Default is GSSolver
   * @property solver
   * @type {Solver}
   */
  public solver: Solver;
  /**
   * @property constraints
   * @type {Array}
   */
  public constraints: Constraint[];
  /**
   * @property narrowphase
   * @type {Narrowphase}
   */
  public narrowphase: any;
  /**
   * @property {ArrayCollisionMatrix} collisionMatrix
   * @type {ArrayCollisionMatrix}
   */
  public collisionMatrix: ArrayCollisionMatrix;
  /**
   * CollisionMatrix from the previous step.
   * @property {ArrayCollisionMatrix} collisionMatrixPrevious
   * @type {ArrayCollisionMatrix}
   */
  public collisionMatrixPrevious: ArrayCollisionMatrix;
  public bodyOverlapKeeper: OverlapKeeper;
  public shapeOverlapKeeper: OverlapKeeper;
  /**
   * All added materials
   * @property materials
   * @type {Array}
   */
  public materials: Material[];
  /**
   * @property contactmaterials
   * @type {Array}
   */
  public contactmaterials: ContactMaterial[];
  /**
   * Used to look up a ContactMaterial given two instances of Material.
   * @property {TupleDictionary} contactMaterialTable
   */
  public contactMaterialTable: TupleDictionary;
  public defaultMaterial: Material;
  /**
   * This contact material is used if no suitable contactmaterial is found for a contact.
   * @property defaultContactMaterial
   * @type {ContactMaterial}
   */
  public defaultContactMaterial: ContactMaterial;
  /**
   * @property doProfiling
   * @type {Boolean}
   */
  public doProfiling: boolean;
  /**
   * @property profile
   * @type {Object}
   */
  public profile: any;
  /**
   * Time accumulator for interpolation. See http://gafferongames.com/game-physics/fix-your-timestep/
   * @property {Number} accumulator
   */
  public accumulator: number;
  /**
   * @property subsystems
   * @type {Array}
   */
  public subsystems: any[];
  /**
   * Dispatched after a body has been added to the world.
   * @event addBody
   * @param {Body} body The body that has been added to the world.
   */
  public addBodyEvent: AddBodyEvent;
  /**
   * Dispatched after a body has been removed from the world.
   * @event removeBody
   * @param {Body} body The body that has been removed from the world.
   */
  public removeBodyEvent: RemoveBodyEvent;
  public idToBodyMap: Map<number, Body>;

  constructor(options: WorldOptions = {}) {
    super();
    this.dt = -1;
    this.allowSleep = !!options.allowSleep;
    this.contacts = [];
    this.frictionEquations = [];
    this.quatNormalizeSkip =
      options.quatNormalizeSkip !== undefined ? options.quatNormalizeSkip : 0;
    this.quatNormalizeFast =
      options.quatNormalizeFast !== undefined
        ? options.quatNormalizeFast
        : false;
    this.time = 0.0;
    this.stepnumber = 0;

    /// Default and last timestep sizes
    this.default_dt = 1 / 60;

    this.nextId = 0;
    this.gravity = new Vec3();
    if (options.gravity) {
      this.gravity.copy(options.gravity);
    }

    this.broadphase =
      options.broadphase !== undefined
        ? options.broadphase
        : new NaiveBroadphase();

    this.bodies = [];
    this.solver =
      options.solver !== undefined ? options.solver : new GSSolver();
    this.constraints = [];
    this.narrowphase = new Narrowphase(this);
    this.collisionMatrix = new ArrayCollisionMatrix();
    this.collisionMatrixPrevious = new ArrayCollisionMatrix();
    this.bodyOverlapKeeper = new OverlapKeeper();
    this.shapeOverlapKeeper = new OverlapKeeper();
    this.materials = [];
    this.contactmaterials = [];
    this.contactMaterialTable = new TupleDictionary();

    this.defaultMaterial = new Material("default");
    this.defaultContactMaterial = new ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      {
        friction: 0.3,
        restitution: 0.0,
        contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3,
        frictionEquationStiffness: 1e7,
        frictionEquationRelaxation: 3
      }
    );

    this.doProfiling = false;
    this.profile = {
      solve: 0,
      makeContactConstraints: 0,
      broadphase: 0,
      integrate: 0,
      narrowphase: 0
    };

    this.accumulator = 0;
    this.subsystems = [];
    this.addBodyEvent = {
      type: "addBody",
      body: null
    };
    this.removeBodyEvent = {
      type: "removeBody",
      body: null
    };
    this.idToBodyMap = new Map();
    this.broadphase.setWorld(this);
  }

  /**
   * Get the contact material between materials m1 and m2
   * @method getContactMaterial
   * @param {Material} m1
   * @param {Material} m2
   * @return {ContactMaterial} The contact material if it was found.
   */
  getContactMaterial(m1: Material, m2: Material): ContactMaterial {
    return this.contactMaterialTable.get(m1.id, m2.id); //this.contactmaterials[this.mats2cmat[i+j*this.materials.length]];
  }

  /**
   * Get number of objects in the world.
   * @method numObjects
   * @return {Number}
   * @deprecated
   */
  numObjects() {
    return this.bodies.length;
  }

  /**
   * Store old collision state info
   * @method collisionMatrixTick
   */
  collisionMatrixTick() {
    var temp = this.collisionMatrixPrevious;
    this.collisionMatrixPrevious = this.collisionMatrix;
    this.collisionMatrix = temp;
    this.collisionMatrix.reset();
    this.bodyOverlapKeeper.tick();
    this.shapeOverlapKeeper.tick();
  }

  /**
   * Add a rigid body to the simulation.
   * @method add
   * @param {Body} body
   * @todo If the simulation has not yet started, why recrete and copy arrays for each body? Accumulate in dynamic arrays in this case.
   * @todo Adding an array of bodies should be possible. This would save some loops too
   */
  addBody(body: Body) {
    if (this.bodies.indexOf(body) !== -1) {
      return;
    }
    body.index = this.bodies.length;
    this.bodies.push(body);
    body.world = this;
    body.initPosition.copy(body.position);
    body.initVelocity.copy(body.velocity);
    body.timeLastSleepy = this.time;
    if (body instanceof Body) {
      body.initAngularVelocity.copy(body.angularVelocity);
      body.initQuaternion.copy(body.quaternion);
    }
    this.collisionMatrix.setNumObjects(this.bodies.length);
    this.addBodyEvent.body = body;
    // this.idToBodyMap[body.id] = body;
    this.idToBodyMap.set(body.id, body);
    this.dispatchEvent(this.addBodyEvent);
  }

  /**
   * Add a rigid body to the simulation.
   * @method add
   * @param {Body} body
   * @todo If the simulation has not yet started, why recrete and copy arrays for each body? Accumulate in dynamic arrays in this case.
   * @todo Adding an array of bodies should be possible. This would save some loops too
   * @deprecated Use .addBody instead
   */
  add(body: Body) {
    this.addBody(body);
  }

  /**
   * Add a constraint to the simulation.
   * @method addConstraint
   * @param {Constraint} c
   */
  addConstraint(c: Constraint) {
    this.constraints.push(c);
  }

  /**
   * Removes a constraint
   * @method removeConstraint
   * @param {Constraint} c
   */
  removeConstraint(c: Constraint) {
    var idx = this.constraints.indexOf(c);
    if (idx !== -1) {
      this.constraints.splice(idx, 1);
    }
  }

  /**
   * Raycast test
   * @method rayTest
   * @param {Vec3} from
   * @param {Vec3} to
   * @param {RaycastResult} result
   * @deprecated Use .raycastAll, .raycastClosest or .raycastAny instead.
   */
  rayTest(from: Vec3, to: Vec3, result: RaycastResult) {
    if (result instanceof RaycastResult) {
      // Do raycastclosest
      this.raycastClosest(
        from,
        to,
        {
          skipBackfaces: true
        },
        result
      );
    } else {
      // Do raycastAll
      this.raycastAll(
        from,
        to,
        {
          skipBackfaces: true
        },
        result
      );
    }
  }

  /**
   * Ray cast against all bodies. The provided callback will be executed for each hit with a RaycastResult as single argument.
   * @method raycastAll
   * @param  {Vec3} from
   * @param  {Vec3} to
   * @param  {Object} options
   * @param  {number} [options.collisionFilterMask=-1]
   * @param  {number} [options.collisionFilterGroup=-1]
   * @param  {boolean} [options.skipBackfaces=false]
   * @param  {boolean} [options.checkCollisionResponse=true]
   * @param  {Function} callback
   * @return {boolean} True if any body was hit.
   */
  raycastAll(from: Vec3, to: Vec3, options: any, callback: any) {
    options.mode = Ray.ALL;
    options.from = from;
    options.to = to;
    options.callback = callback;
    return tmpRay.intersectWorld(this, options);
  }

  /**
   * Ray cast, and stop at the first result. Note that the order is random - but the method is fast.
   * @method raycastAny
   * @param  {Vec3} from
   * @param  {Vec3} to
   * @param  {Object} options
   * @param  {number} [options.collisionFilterMask=-1]
   * @param  {number} [options.collisionFilterGroup=-1]
   * @param  {boolean} [options.skipBackfaces=false]
   * @param  {boolean} [options.checkCollisionResponse=true]
   * @param  {RaycastResult} result
   * @return {boolean} True if any body was hit.
   */
  raycastAny(
    from: Vec3,
    to: Vec3,
    options: any,
    result: RaycastResult
  ): boolean {
    options.mode = Ray.ANY;
    options.from = from;
    options.to = to;
    options.result = result;
    return tmpRay.intersectWorld(this, options);
  }

  /**
   * Ray cast, and return information of the closest hit.
   * @method raycastClosest
   * @param  {Vec3} from
   * @param  {Vec3} to
   * @param  {Object} options
   * @param  {number} [options.collisionFilterMask=-1]
   * @param  {number} [options.collisionFilterGroup=-1]
   * @param  {boolean} [options.skipBackfaces=false]
   * @param  {boolean} [options.checkCollisionResponse=true]
   * @param  {RaycastResult} result
   * @return {boolean} True if any body was hit.
   */
  raycastClosest(
    from: Vec3,
    to: Vec3,
    options: any,
    result: RaycastResult
  ): boolean {
    options.mode = Ray.CLOSEST;
    options.from = from;
    options.to = to;
    options.result = result;
    return tmpRay.intersectWorld(this, options);
  }

  /**
   * Remove a rigid body from the simulation.
   * @method remove
   * @param {Body} body
   * @deprecated Use .removeBody instead
   */
  remove(body: Body) {
    this.removeBody(body);
  }

  /**
   * Remove a rigid body from the simulation.
   * @method remove
   * @param {Body} body
   */
  removeBody(body: Body) {
    body.world = null;
    const bodies = this.bodies;
    const idx = bodies.indexOf(body);
    if (idx > -1) {
      bodies.splice(idx, 1); // Todo: should use a garbage free method

      // Recompute index
      for (var i = 0; i !== bodies.length; i++) {
        bodies[i].index = i;
      }

      this.collisionMatrix.setNumObjects(this.bodies.length);
      this.removeBodyEvent.body = body;
      // delete this.idToBodyMap[body.id];
      this.idToBodyMap.delete(body.id);
      this.dispatchEvent(this.removeBodyEvent);
    }
  }

  getBodyById(id: number): Body {
    return this.idToBodyMap.get(id);
  }

  // TODO Make a faster map
  getShapeById(id: number): Shape | null {
    const bodies = this.bodies;

    for (let i = 0, bl = bodies.length; i < bl; i++) {
      // let shapes = bodies[i].shapes;
      for (let j = 0, sl = bodies[i].shapes.length; j < sl; j++) {
        // let shape = bodies[i].shapes[j];
        if (bodies[i].shapes[j].id === id) {
          return bodies[i].shapes[j];
        }
      }
    }

    return null;
  }

  /**
   * Adds a material to the World.
   * @method addMaterial
   * @param {Material} m
   * @todo Necessary?
   */
  addMaterial(m: Material) {
    this.materials.push(m);
  }

  /**
   * Adds a contact material to the World
   * @method addContactMaterial
   * @param {ContactMaterial} cmat
   */
  addContactMaterial(cmat: ContactMaterial) {
    // Add contact material
    this.contactmaterials.push(cmat);

    // Add current contact material to the material table
    this.contactMaterialTable.set(
      cmat.materials[0].id,
      cmat.materials[1].id,
      cmat
    );
  }

  /**
   * Step the physics world forward in time.
   *
   * There are two modes. The simple mode is fixed timestepping without interpolation. In this case you only use the first argument. The second case uses interpolation. In that you also provide the time since the function was last used, as well as the maximum fixed timesteps to take.
   *
   * @method step
   * @param {Number} dt                       The fixed time step size to use.
   * @param {Number} [timeSinceLastCalled]    The time elapsed since the function was last called.
   * @param {Number} [maxSubSteps=10]         Maximum number of fixed steps to take per function call.
   *
   * @example
   *     // fixed timestepping without interpolation
   *     world.step(1/60);
   *
   * @see http://bulletphysics.org/mediawiki-1.5.8/index.php/Stepping_The_World
   */
  step(dt: number, timeSinceLastCalled: number = 0, maxSubSteps: number = 10) {
    if (timeSinceLastCalled === 0) {
      // Fixed, simple stepping

      this.internalStep(dt);

      // Increment time
      this.time += dt;
    } else {
      this.accumulator += timeSinceLastCalled;
      var substeps = 0;
      while (this.accumulator >= dt && substeps < maxSubSteps) {
        // Do fixed steps to catch up
        this.internalStep(dt);
        this.accumulator -= dt;
        substeps++;
      }

      var t = (this.accumulator % dt) / dt;
      for (var j = 0; j !== this.bodies.length; j++) {
        var b = this.bodies[j];
        b.previousPosition.lerp(b.position, t, b.interpolatedPosition);
        b.previousQuaternion.slerp(b.quaternion, t, b.interpolatedQuaternion);
        b.previousQuaternion.normalize();
      }
      this.time += timeSinceLastCalled;
    }
  }

  internalStep(dt: number) {
    this.dt = dt;

    const contacts = this.contacts;
    const p1: any = World_step_p1;
    const p2: any = World_step_p2;
    const N = this.numObjects();
    const bodies = this.bodies;
    const solver = this.solver;
    const gravity = this.gravity;
    const doProfiling = this.doProfiling;
    const profile = this.profile;
    const DYNAMIC = Body.DYNAMIC;
    const constraints = this.constraints;
    const frictionEquationPool = World_step_frictionEquationPool;
    const gx = gravity.x;
    const gy = gravity.y;
    const gz = gravity.z;
    let profilingStart: number = 0;

    if (doProfiling) {
      profilingStart = performance.now();
    }

    // Add gravity to all objects
    for (let i = 0; i !== N; i++) {
      var bi = bodies[i];
      if (bi.type === Body.DYNAMIC) {
        // Only for dynamic bodies
        var f = bi.force,
          m = bi.mass;
        f.x += m * gx;
        f.y += m * gy;
        f.z += m * gz;
      }
    }

    // Update subsystems
    for (
      var i = 0, Nsubsystems = this.subsystems.length;
      i !== Nsubsystems;
      i++
    ) {
      this.subsystems[i].update();
    }

    // Collision detection
    if (doProfiling) {
      profilingStart = performance.now();
    }
    p1.length = 0; // Clean up pair arrays from last step
    p2.length = 0;
    this.broadphase.collisionPairs(this, p1, p2);
    if (doProfiling) {
      profile.broadphase = performance.now() - profilingStart;
    }

    // Remove constrained pairs with collideConnected == false
    var Nconstraints = constraints.length;
    for (i = 0; i !== Nconstraints; i++) {
      var c = constraints[i];
      if (!c.collideConnected) {
        for (var j = p1.length - 1; j >= 0; j -= 1) {
          if (
            (c.bodyA === p1[j] && c.bodyB === p2[j]) ||
            (c.bodyB === p1[j] && c.bodyA === p2[j])
          ) {
            p1.splice(j, 1);
            p2.splice(j, 1);
          }
        }
      }
    }

    this.collisionMatrixTick();

    // Generate contacts
    if (doProfiling) {
      profilingStart = performance.now();
    }
    var oldcontacts = World_step_oldContacts;
    var NoldContacts = contacts.length;

    for (i = 0; i !== NoldContacts; i++) {
      oldcontacts.push(contacts[i]);
    }
    contacts.length = 0;

    // Transfer FrictionEquation from current list to the pool for reuse
    var NoldFrictionEquations = this.frictionEquations.length;
    for (i = 0; i !== NoldFrictionEquations; i++) {
      frictionEquationPool.push(this.frictionEquations[i]);
    }
    this.frictionEquations.length = 0;

    this.narrowphase.getContacts(
      p1,
      p2,
      this,
      contacts,
      oldcontacts, // To be reused
      this.frictionEquations,
      frictionEquationPool
    );

    if (doProfiling) {
      profile.narrowphase = performance.now() - profilingStart;
    }

    // Loop over all collisions
    if (doProfiling) {
      profilingStart = performance.now();
    }

    // Add all friction eqs
    for (var i = 0; i < this.frictionEquations.length; i++) {
      solver.addEquation(this.frictionEquations[i]);
    }

    var ncontacts = contacts.length;
    for (var k = 0; k !== ncontacts; k++) {
      // Current contact
      let c = contacts[k];

      // Get current collision indeces
      let bi = c.bi,
        bj = c.bj,
        si = c.si,
        sj = c.sj;

      // Get collision properties
      var cm;
      if (bi.material && bj.material) {
        cm =
          this.getContactMaterial(bi.material, bj.material) ||
          this.defaultContactMaterial;
      } else {
        cm = this.defaultContactMaterial;
      }

      // c.enabled = bi.collisionResponse && bj.collisionResponse && si.collisionResponse && sj.collisionResponse;

      var mu = cm.friction;
      // c.restitution = cm.restitution;

      // If friction or restitution were specified in the material, use them
      if (bi.material && bj.material) {
        if (bi.material.friction >= 0 && bj.material.friction >= 0) {
          mu = bi.material.friction * bj.material.friction;
        }

        if (bi.material.restitution >= 0 && bj.material.restitution >= 0) {
          c.restitution = bi.material.restitution * bj.material.restitution;
        }
      }

      // c.setSpookParams(
      //           cm.contactEquationStiffness,
      //           cm.contactEquationRelaxation,
      //           dt
      //       );

      solver.addEquation(c);

      // // Add friction constraint equation
      // if(mu > 0){

      // 	// Create 2 tangent equations
      // 	var mug = mu * gnorm;
      // 	var reducedMass = (bi.invMass + bj.invMass);
      // 	if(reducedMass > 0){
      // 		reducedMass = 1/reducedMass;
      // 	}
      // 	var pool = frictionEquationPool;
      // 	var c1 = pool.length ? pool.pop() : new FrictionEquation(bi,bj,mug*reducedMass);
      // 	var c2 = pool.length ? pool.pop() : new FrictionEquation(bi,bj,mug*reducedMass);
      // 	this.frictionEquations.push(c1, c2);

      // 	c1.bi = c2.bi = bi;
      // 	c1.bj = c2.bj = bj;
      // 	c1.minForce = c2.minForce = -mug*reducedMass;
      // 	c1.maxForce = c2.maxForce = mug*reducedMass;

      // 	// Copy over the relative vectors
      // 	c1.ri.copy(c.ri);
      // 	c1.rj.copy(c.rj);
      // 	c2.ri.copy(c.ri);
      // 	c2.rj.copy(c.rj);

      // 	// Construct tangents
      // 	c.ni.tangents(c1.t, c2.t);

      //           // Set spook params
      //           c1.setSpookParams(cm.frictionEquationStiffness, cm.frictionEquationRelaxation, dt);
      //           c2.setSpookParams(cm.frictionEquationStiffness, cm.frictionEquationRelaxation, dt);

      //           c1.enabled = c2.enabled = c.enabled;

      // 	// Add equations to solver
      // 	solver.addEquation(c1);
      // 	solver.addEquation(c2);
      // }

      if (
        bi.allowSleep &&
        bi.type === Body.DYNAMIC &&
        bi.sleepState === Body.SLEEPING &&
        bj.sleepState === Body.AWAKE &&
        bj.type !== Body.STATIC
      ) {
        var speedSquaredB =
          bj.velocity.lengthSquared() + bj.angularVelocity.lengthSquared();
        var speedLimitSquaredB = Math.pow(bj.sleepSpeedLimit, 2);
        if (speedSquaredB >= speedLimitSquaredB * 2) {
          bi._wakeUpAfterNarrowphase = true;
        }
      }

      if (
        bj.allowSleep &&
        bj.type === Body.DYNAMIC &&
        bj.sleepState === Body.SLEEPING &&
        bi.sleepState === Body.AWAKE &&
        bi.type !== Body.STATIC
      ) {
        var speedSquaredA =
          bi.velocity.lengthSquared() + bi.angularVelocity.lengthSquared();
        var speedLimitSquaredA = Math.pow(bi.sleepSpeedLimit, 2);
        if (speedSquaredA >= speedLimitSquaredA * 2) {
          bj._wakeUpAfterNarrowphase = true;
        }
      }

      // Now we know that i and j are in contact. Set collision matrix state
      this.collisionMatrix.set(bi.index, bj.index, true);

      if (!this.collisionMatrixPrevious.get(bi.index, bj.index)) {
        // First contact!
        // We reuse the collideEvent object, otherwise we will end up creating new objects for each new contact, even if there's no event listener attached.
        World_step_collideEvent.body = bj;
        World_step_collideEvent.contact = c;
        bi.dispatchEvent(World_step_collideEvent);

        World_step_collideEvent.body = bi;
        bj.dispatchEvent(World_step_collideEvent);
      }

      this.bodyOverlapKeeper.set(bi.id, bj.id);
      this.shapeOverlapKeeper.set(si.id, sj.id);
    }

    this.emitContactEvents();

    if (doProfiling) {
      profile.makeContactConstraints = performance.now() - profilingStart;
      profilingStart = performance.now();
    }

    // Wake up bodies
    for (i = 0; i !== N; i++) {
      var bi = bodies[i];
      if (bi._wakeUpAfterNarrowphase) {
        bi.wakeUp();
        bi._wakeUpAfterNarrowphase = false;
      }
    }

    // Add user-added constraints
    var Nconstraints = constraints.length;
    for (i = 0; i !== Nconstraints; i++) {
      var c = constraints[i];
      c.update();
      for (var j = 0, Neq = c.equations.length; j !== Neq; j++) {
        var eq = c.equations[j];
        solver.addEquation(eq);
      }
    }

    // Solve the constrained system
    solver.solve(dt, this);

    if (doProfiling) {
      profile.solve = performance.now() - profilingStart;
    }

    // Remove all contacts from solver
    solver.removeAllEquations();

    // Apply damping, see http://code.google.com/p/bullet/issues/detail?id=74 for details
    var pow = Math.pow;
    for (i = 0; i !== N; i++) {
      var bi = bodies[i];
      if (bi.type & DYNAMIC) {
        // Only for dynamic bodies
        var ld = pow(1.0 - bi.linearDamping, dt);
        var v = bi.velocity;
        v.scale(ld, v);
        var av = bi.angularVelocity;
        if (av) {
          var ad = pow(1.0 - bi.angularDamping, dt);
          av.scale(ad, av);
        }
      }
    }

    this.dispatchEvent(World_step_preStepEvent);

    // Invoke pre-step callbacks
    for (i = 0; i !== N; i++) {
      var bi = bodies[i];
      if (bi.preStep) {
        bi.preStep.call(bi);
      }
    }

    // Leap frog
    // vnew = v + h*f/m
    // xnew = x + h*vnew
    if (doProfiling) {
      profilingStart = performance.now();
    }
    var stepnumber = this.stepnumber;
    var quatNormalize = stepnumber % (this.quatNormalizeSkip + 1) === 0;
    var quatNormalizeFast = this.quatNormalizeFast;

    for (i = 0; i !== N; i++) {
      bodies[i].integrate(dt, quatNormalize, quatNormalizeFast);
    }
    this.clearForces();

    this.broadphase.dirty = true;

    if (doProfiling) {
      profile.integrate = performance.now() - profilingStart;
    }

    // Update world time
    this.time += dt;
    this.stepnumber += 1;

    this.dispatchEvent(World_step_postStepEvent);

    // Invoke post-step callbacks
    for (i = 0; i !== N; i++) {
      var bi = bodies[i];
      var postStep = bi.postStep;
      if (postStep) {
        postStep.call(bi);
      }
    }

    // Sleeping update
    if (this.allowSleep) {
      for (i = 0; i !== N; i++) {
        bodies[i].sleepTick(this.time);
      }
    }
  }

  private emitContactEvents = (() => {
    const additions: number[] = [];
    const removals: number[] = [];
    const beginContactEvent: BeginContactEvent = {
      type: "beginContact",
      bodyA: null,
      bodyB: null
    };
    const endContactEvent: EndContactEvent = {
      type: "endContact",
      bodyA: null,
      bodyB: null
    };
    const beginShapeContactEvent: BeginShapeContactEvent = {
      type: "beginShapeContact",
      bodyA: null,
      bodyB: null,
      shapeA: null,
      shapeB: null
    };
    const endShapeContactEvent: EndShapeContactEvent = {
      type: "endShapeContact",
      bodyA: null,
      bodyB: null,
      shapeA: null,
      shapeB: null
    };
    return () => {
      var hasBeginContact = this.hasAnyEventListener("beginContact");
      var hasEndContact = this.hasAnyEventListener("endContact");

      if (hasBeginContact || hasEndContact) {
        this.bodyOverlapKeeper.getDiff(additions, removals);
      }

      if (hasBeginContact) {
        for (var i = 0, l = additions.length; i < l; i += 2) {
          beginContactEvent.bodyA = this.getBodyById(additions[i]);
          beginContactEvent.bodyB = this.getBodyById(additions[i + 1]);
          this.dispatchEvent(beginContactEvent);
        }
        beginContactEvent.bodyA = beginContactEvent.bodyB = null;
      }

      if (hasEndContact) {
        for (var i = 0, l = removals.length; i < l; i += 2) {
          endContactEvent.bodyA = this.getBodyById(removals[i]);
          endContactEvent.bodyB = this.getBodyById(removals[i + 1]);
          this.dispatchEvent(endContactEvent);
        }
        endContactEvent.bodyA = endContactEvent.bodyB = null;
      }

      additions.length = removals.length = 0;

      var hasBeginShapeContact = this.hasAnyEventListener("beginShapeContact");
      var hasEndShapeContact = this.hasAnyEventListener("endShapeContact");

      if (hasBeginShapeContact || hasEndShapeContact) {
        this.shapeOverlapKeeper.getDiff(additions, removals);
      }

      if (hasBeginShapeContact) {
        for (var i = 0, l = additions.length; i < l; i += 2) {
          var shapeA = this.getShapeById(additions[i]);
          var shapeB = this.getShapeById(additions[i + 1]);
          if (shapeA && shapeB) {
            beginShapeContactEvent.shapeA = shapeA;
            beginShapeContactEvent.shapeB = shapeB;
            beginShapeContactEvent.bodyA = shapeA.body;
            beginShapeContactEvent.bodyB = shapeB.body;
            this.dispatchEvent(beginShapeContactEvent);
          }
        }
        beginShapeContactEvent.bodyA = beginShapeContactEvent.bodyB = beginShapeContactEvent.shapeA = beginShapeContactEvent.shapeB = null;
      }

      if (hasEndShapeContact) {
        for (var i = 0, l = removals.length; i < l; i += 2) {
          var shapeA = this.getShapeById(removals[i]);
          var shapeB = this.getShapeById(removals[i + 1]);
          if (shapeA && shapeB) {
            endShapeContactEvent.shapeA = shapeA;
            endShapeContactEvent.shapeB = shapeB;
            endShapeContactEvent.bodyA = shapeA.body;
            endShapeContactEvent.bodyB = shapeB.body;
            this.dispatchEvent(endShapeContactEvent);
          }
        }
        endShapeContactEvent.bodyA = endShapeContactEvent.bodyB = endShapeContactEvent.shapeA = endShapeContactEvent.shapeB = null;
      }
    };
  })();

  /**
   * Sets all body forces in the world to zero.
   * @method clearForces
   */
  clearForces() {
    for (const b of this.bodies) {
      b.force.set(0, 0, 0);
      b.torque.set(0, 0, 0);
    }
  }
}

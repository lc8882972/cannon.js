import Vec3 from "../math/Vec3";
import Transform from "../math/Transform";
import RaycastResult from "../collision/RaycastResult";

export interface WheelInfoOptions {
  chassisConnectionPointLocal?: Vec3;
  chassisConnectionPointWorld?: Vec3;
  directionLocal?: Vec3;
  directionWorld?: Vec3;
  axleLocal?: Vec3;
  axleWorld?: Vec3;
  suspensionRestLength?: number;
  suspensionMaxLength?: number;
  radius?: number;
  suspensionStiffness?: number;
  dampingCompression?: number;
  dampingRelaxation?: number;
  frictionSlip?: number;
  steering?: number;
  rotation?: number;
  deltaRotation?: number;
  rollInfluence?: number;
  maxSuspensionForce?: number;
  isFrontWheel?: boolean;
  clippedInvContactDotSuspension?: number;
  suspensionRelativeVelocity?: number;
  suspensionForce?: number;
  skidInfo?: number;
  suspensionLength?: number;
  maxSuspensionTravel?: number;
  useCustomSlidingRotationalSpeed?: boolean;
  customSlidingRotationalSpeed?: number;
}

/**
 * @class WheelInfo
 * @constructor
 * @param {Object} [options]
 * @param {Vec3} [defaulrOptions.chassisConnectionPointLocal]
 * @param {Vec3} [defaulrOptions.chassisConnectionPointWorld]
 * @param {Vec3} [defaulrOptions.directionLocal]
 * @param {Vec3} [defaulrOptions.directionWorld]
 * @param {Vec3} [defaulrOptions.axleLocal]
 * @param {Vec3} [defaulrOptions.axleWorld]
 * @param {number} [defaulrOptions.suspensionRestLength=1]
 * @param {number} [defaulrOptions.suspensionMaxLength=2]
 * @param {number} [defaulrOptions.radius=1]
 * @param {number} [defaulrOptions.suspensionStiffness=100]
 * @param {number} [defaulrOptions.dampingCompression=10]
 * @param {number} [defaulrOptions.dampingRelaxation=10]
 * @param {number} [defaulrOptions.frictionSlip=10000]
 * @param {number} [defaulrOptions.steering=0]
 * @param {number} [defaulrOptions.rotation=0]
 * @param {number} [defaulrOptions.deltaRotation=0]
 * @param {number} [defaulrOptions.rollInfluence=0.01]
 * @param {number} [defaulrOptions.maxSuspensionForce]
 * @param {boolean} [defaulrOptions.isFrontWheel=true]
 * @param {number} [defaulrOptions.clippedInvContactDotSuspension=1]
 * @param {number} [defaulrOptions.suspensionRelativeVelocity=0]
 * @param {number} [defaulrOptions.suspensionForce=0]
 * @param {number} [defaulrOptions.skidInfo=0]
 * @param {number} [defaulrOptions.suspensionLength=0]
 * @param {number} [defaulrOptions.maxSuspensionTravel=1]
 * @param {boolean} [defaulrOptions.useCustomSlidingRotationalSpeed=false]
 * @param {number} [defaulrOptions.customSlidingRotationalSpeed=-0.1]
 */
export default class WheelInfo {
  /**
   * Max travel distance of the suspension, in meters.
   * @property {number} maxSuspensionTravel
   */
  maxSuspensionTravel: number;

  /**
   * Speed to apply to the wheel rotation when the wheel is sliding.
   * @property {number} customSlidingRotationalSpeed
   */
  customSlidingRotationalSpeed: number;

  /**
   * If the customSlidingRotationalSpeed should be used.
   * @property {Boolean} useCustomSlidingRotationalSpeed
   */
  useCustomSlidingRotationalSpeed: boolean;

  /**
   * @property {Boolean} sliding
   */
  sliding: boolean;

  /**
   * Connection point, defined locally in the chassis body frame.
   * @property {Vec3} chassisConnectionPointLocal
   */
  chassisConnectionPointLocal: Vec3;

  /**
   * @property {Vec3} chassisConnectionPointWorld
   */
  chassisConnectionPointWorld: Vec3;

  /**
   * @property {Vec3} directionLocal
   */
  directionLocal: Vec3;

  /**
   * @property {Vec3} directionWorld
   */
  directionWorld: Vec3;

  /**
   * @property {Vec3} axleLocal
   */
  axleLocal: Vec3;

  /**
   * @property {Vec3} axleWorld
   */
  axleWorld: Vec3;

  /**
   * @property {number} suspensionRestLength
   */
  suspensionRestLength: number;

  /**
   * @property {number} suspensionMaxLength
   */
  suspensionMaxLength: number;

  /**
   * @property {number} radius
   */
  radius: number;

  /**
   * @property {number} suspensionStiffness
   */
  suspensionStiffness: number;

  /**
   * @property {number} dampingCompression
   */
  dampingCompression: number;

  /**
   * @property {number} dampingRelaxation
   */
  dampingRelaxation: number;

  /**
   * @property {number} frictionSlip
   */
  frictionSlip: number;

  /**
   * @property {number} steering
   */
  steering: number;

  /**
   * Rotation value, in radians.
   * @property {number} rotation
   */
  rotation: number;

  /**
   * @property {number} deltaRotation
   */
  deltaRotation: number;

  /**
   * @property {number} rollInfluence
   */
  rollInfluence: number;

  /**
   * @property {number} maxSuspensionForce
   */
  maxSuspensionForce: number;

  /**
   * @property {number} engineForce
   */
  engineForce: number;

  /**
   * @property {number} brake
   */
  brake: number;

  /**
   * @property {boolean} isFrontWheel
   */
  isFrontWheel: boolean;

  /**
   * @property {number} clippedInvContactDotSuspension
   */
  clippedInvContactDotSuspension: number;

  /**
   * @property {number} suspensionRelativeVelocity
   */
  suspensionRelativeVelocity: number;

  /**
   * @property {number} suspensionForce
   */
  suspensionForce: number;

  /**
   * @property {number} skidInfo
   */
  skidInfo: number;

  /**
   * @property {number} suspensionLength
   */
  suspensionLength: number;

  /**
   * @property {number} sideImpulse
   */
  sideImpulse: number;

  /**
   * @property {number} forwardImpulse
   */
  forwardImpulse: number;

  /**
   * The result from raycasting
   * @property {RaycastResult} raycastResult
   */
  raycastResult: RaycastResult;

  /**
   * Wheel world transform
   * @property {Transform} worldTransform
   */
  worldTransform: Transform;

  /**
   * @property {boolean} isInContact
   */
  isInContact: boolean;
  constructor(options?: WheelInfoOptions) {
    const defaulrOptions = Object.assign(
      {
        chassisConnectionPointLocal: new Vec3(),
        chassisConnectionPointWorld: new Vec3(),
        directionLocal: new Vec3(),
        directionWorld: new Vec3(),
        axleLocal: new Vec3(),
        axleWorld: new Vec3(),
        suspensionRestLength: 1,
        suspensionMaxLength: 2,
        radius: 1,
        suspensionStiffness: 100,
        dampingCompression: 10,
        dampingRelaxation: 10,
        frictionSlip: 10000,
        steering: 0,
        rotation: 0,
        deltaRotation: 0,
        rollInfluence: 0.01,
        maxSuspensionForce: Number.MAX_VALUE,
        isFrontWheel: true,
        clippedInvContactDotSuspension: 1,
        suspensionRelativeVelocity: 0,
        suspensionForce: 0,
        skidInfo: 0,
        suspensionLength: 0,
        maxSuspensionTravel: 1,
        useCustomSlidingRotationalSpeed: false,
        customSlidingRotationalSpeed: -0.1
      },
      options
    );

    this.maxSuspensionTravel = defaulrOptions.maxSuspensionTravel;
    this.customSlidingRotationalSpeed =
      defaulrOptions.customSlidingRotationalSpeed;
    this.useCustomSlidingRotationalSpeed =
      defaulrOptions.useCustomSlidingRotationalSpeed;
    this.sliding = false;
    this.chassisConnectionPointLocal = defaulrOptions.chassisConnectionPointLocal.clone();
    this.chassisConnectionPointWorld = defaulrOptions.chassisConnectionPointWorld.clone();
    this.directionLocal = defaulrOptions.directionLocal.clone();
    this.directionWorld = defaulrOptions.directionWorld.clone();
    this.axleLocal = defaulrOptions.axleLocal.clone();
    this.axleWorld = defaulrOptions.axleWorld.clone();
    this.suspensionRestLength = defaulrOptions.suspensionRestLength;
    this.suspensionMaxLength = defaulrOptions.suspensionMaxLength;
    this.radius = defaulrOptions.radius;
    this.suspensionStiffness = defaulrOptions.suspensionStiffness;
    this.dampingCompression = defaulrOptions.dampingCompression;
    this.dampingRelaxation = defaulrOptions.dampingRelaxation;
    this.frictionSlip = defaulrOptions.frictionSlip;
    this.steering = 0;
    this.rotation = 0;
    this.deltaRotation = 0;
    this.rollInfluence = defaulrOptions.rollInfluence;
    this.maxSuspensionForce = defaulrOptions.maxSuspensionForce;
    this.engineForce = 0;
    this.brake = 0;
    this.isFrontWheel = defaulrOptions.isFrontWheel;
    this.clippedInvContactDotSuspension = 1;
    this.suspensionRelativeVelocity = 0;
    this.suspensionForce = 0;
    this.skidInfo = 0;
    this.suspensionLength = 0;
    this.sideImpulse = 0;
    this.forwardImpulse = 0;
    this.raycastResult = new RaycastResult();
    this.worldTransform = new Transform();
    this.isInContact = false;
  }

  updateWheel(chassis: any) {
    var raycastResult = this.raycastResult;

    if (this.isInContact) {
      var project = raycastResult.hitNormalWorld.dot(
        raycastResult.directionWorld
      );
      raycastResult.hitPointWorld.sub(chassis.position, relpos);
      chassis.getVelocityAtWorldPoint(relpos, chassis_velocity_at_contactPoint);
      var projVel = raycastResult.hitNormalWorld.dot(
        chassis_velocity_at_contactPoint
      );
      if (project >= -0.1) {
        this.suspensionRelativeVelocity = 0.0;
        this.clippedInvContactDotSuspension = 1.0 / 0.1;
      } else {
        var inv = -1 / project;
        this.suspensionRelativeVelocity = projVel * inv;
        this.clippedInvContactDotSuspension = inv;
      }
    } else {
      // Not in contact : position wheel in a nice (rest length) position
      raycastResult.suspensionLength = this.suspensionRestLength;
      this.suspensionRelativeVelocity = 0.0;
      raycastResult.directionWorld.scale(-1, raycastResult.hitNormalWorld);
      this.clippedInvContactDotSuspension = 1.0;
    }
  }
}
var chassis_velocity_at_contactPoint = new Vec3();
var relpos = new Vec3();
var chassis_velocity_at_contactPoint = new Vec3();

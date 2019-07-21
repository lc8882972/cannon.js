import Body from "./Body";
import Sphere from "../shapes/Sphere";
import Box from "../shapes/Box";
import Vec3 from "../math/Vec3";
import HingeConstraint from "../constraints/HingeConstraint";
import World from "../world/World";

const torque = new Vec3();
const worldAxis = new Vec3();

export interface WheelOptions {
  isFrontWheel: boolean;
  position: Vec3;
  direction: Vec3;
  axis: Vec3;
  body: Body;
}
/**
 * Simple vehicle helper class with spherical rigid body wheels.
 * @class RigidVehicle
 * @constructor
 * @param {Body} [options.chassisBody]
 */
export default class RigidVehicle {
  wheelBodies: Body[];
  /**
   * @property coordinateSystem
   * @type {Vec3}
   */
  coordinateSystem: Vec3;
  /**
   * @property {Body} chassisBody
   */
  chassisBody: Body;
  constraints: HingeConstraint[];
  wheelAxes: Vec3[];
  wheelForces: number[];

  constructor(options) {
    this.wheelBodies = [];

    this.coordinateSystem =
      typeof options.coordinateSystem === "undefined"
        ? new Vec3(1, 2, 3)
        : options.coordinateSystem.clone();

    this.chassisBody = options.chassisBody;

    if (!this.chassisBody) {
      // No chassis body given. Create it!
      this.chassisBody = new Body({
        mass: 1,
        shape: new Box(new Vec3(5, 2, 0.5))
      });
    }

    this.constraints = [];
    this.wheelAxes = [];
    this.wheelForces = [];
  }

  /**
   * Add a wheel
   * @method addWheel
   * @param {object} options
   * @param {boolean} [options.isFrontWheel]
   * @param {Vec3} [options.position] Position of the wheel, locally in the chassis body.
   * @param {Vec3} [options.direction] Slide direction of the wheel along the suspension.
   * @param {Vec3} [options.axis] Axis of rotation of the wheel, locally defined in the chassis.
   * @param {Body} [options.body] The wheel body.
   */
  addWheel(options: WheelOptions) {
    var wheelBody = options.body;
    if (!wheelBody) {
      wheelBody = new Body({
        mass: 1,
        shape: new Sphere(1.2)
      });
    }
    this.wheelBodies.push(wheelBody);
    this.wheelForces.push(0);

    // Position constrain wheels
    var zero = new Vec3();
    var position =
      typeof options.position !== "undefined"
        ? options.position.clone()
        : new Vec3();

    // Set position locally to the chassis
    var worldPosition = new Vec3();
    this.chassisBody.pointToWorldFrame(position, worldPosition);
    wheelBody.position.set(worldPosition.x, worldPosition.y, worldPosition.z);

    // Constrain wheel
    var axis =
      typeof options.axis !== "undefined"
        ? options.axis.clone()
        : new Vec3(0, 1, 0);
    this.wheelAxes.push(axis);

    var hingeConstraint = new HingeConstraint(this.chassisBody, wheelBody, {
      pivotA: position,
      axisA: axis,
      pivotB: Vec3.ZERO,
      axisB: axis,
      collideConnected: false
    });
    this.constraints.push(hingeConstraint);
    return this.wheelBodies.length - 1;
  }

  /**
   * Set the steering value of a wheel.
   * @method setSteeringValue
   * @param {number} value
   * @param {integer} wheelIndex
   * @todo check coordinateSystem
   */
  setSteeringValue(value: number, wheelIndex: number) {
    // Set angle of the hinge axis
    var axis = this.wheelAxes[wheelIndex];

    var c = Math.cos(value),
      s = Math.sin(value),
      x = axis.x,
      y = axis.y;
    this.constraints[wheelIndex].axisA.set(c * x - s * y, s * x + c * y, 0);
  }

  /**
   * Set the target rotational speed of the hinge constraint.
   * @method setMotorSpeed
   * @param {number} value
   * @param {integer} wheelIndex
   */
  setMotorSpeed(value: number, wheelIndex: number) {
    var hingeConstraint = this.constraints[wheelIndex];
    hingeConstraint.enableMotor();
    hingeConstraint.motorTargetVelocity = value;
  }

  /**
   * Set the target rotational speed of the hinge constraint.
   * @method disableMotor
   * @param {integer} wheelIndex
   */
  disableMotor(wheelIndex: number) {
    var hingeConstraint = this.constraints[wheelIndex];
    hingeConstraint.disableMotor();
  }

  /**
   * Set the wheel force to apply on one of the wheels each time step
   * @method setWheelForce
   * @param  {number} value
   * @param  {integer} wheelIndex
   */
  setWheelForce(value: number, wheelIndex: number) {
    this.wheelForces[wheelIndex] = value;
  }

  /**
   * Apply a torque on one of the wheels.
   * @method applyWheelForce
   * @param  {number} value
   * @param  {integer} wheelIndex
   */
  applyWheelForce(value: number, wheelIndex: number) {
    var axis = this.wheelAxes[wheelIndex];
    var wheelBody = this.wheelBodies[wheelIndex];
    var bodyTorque = wheelBody.torque;

    axis.scale(value, torque);
    wheelBody.vectorToWorldFrame(torque, torque);
    bodyTorque.add(torque, bodyTorque);
  }

  /**
   * Add the vehicle including its constraints to the world.
   * @method addToWorld
   * @param {World} world
   */
  addToWorld(world: World) {
    var constraints = this.constraints;
    var bodies = this.wheelBodies.concat([this.chassisBody]);

    for (var i = 0; i < bodies.length; i++) {
      world.addBody(bodies[i]);
    }

    for (var i = 0; i < constraints.length; i++) {
      world.addConstraint(constraints[i]);
    }

    world.addEventListener("preStep", this.update);
  }

  private update = () => {
    var wheelForces = this.wheelForces;
    for (var i = 0; i < wheelForces.length; i++) {
      this.applyWheelForce(wheelForces[i], i);
    }
  };

  /**
   * Remove the vehicle including its constraints from the world.
   * @method removeFromWorld
   * @param {World} world
   */
  removeFromWorld(world: World) {
    var constraints = this.constraints;
    var bodies = this.wheelBodies.concat([this.chassisBody]);

    for (var i = 0; i < bodies.length; i++) {
      world.remove(bodies[i]);
    }

    for (var i = 0; i < constraints.length; i++) {
      world.removeConstraint(constraints[i]);
    }
  }

  /**
   * Get current rotational velocity of a wheel
   * @method getWheelSpeed
   * @param {integer} wheelIndex
   */
  getWheelSpeed(wheelIndex: number) {
    var axis = this.wheelAxes[wheelIndex];
    var wheelBody = this.wheelBodies[wheelIndex];
    var w = wheelBody.angularVelocity;
    this.chassisBody.vectorToWorldFrame(axis, worldAxis);
    return w.dot(worldAxis);
  }
}

import Vec3 from "../math/Vec3";
import Quaternion from "../math/Quaternion";
import Material from "../material/Material";

export interface ShapeOptions {
  type: number;
  collisionFilterGroup: number;
  collisionFilterMask: number;
  collisionResponse: boolean;
  material: Material | null;
}
/**
 * Base class for shapes
 * @class Shape
 * @constructor
 * @param {object} [options]
 * @param {number} [options.collisionFilterGroup=1]
 * @param {number} [options.collisionFilterMask=-1]
 * @param {number} [options.collisionResponse=true]
 * @param {number} [options.material=null]
 * @author schteppe
 */
export default abstract class Shape {
  static idCounter: number = 0;
  /**
   * The available shape types.
   * @static
   * @property types
   * @type {Object}
   */
  static types = {
    SPHERE: 1,
    PLANE: 2,
    BOX: 4,
    COMPOUND: 8,
    CONVEXPOLYHEDRON: 16,
    HEIGHTFIELD: 32,
    PARTICLE: 64,
    CYLINDER: 128,
    TRIMESH: 256
  };
  /**
   * Identifyer of the Shape.
   * @property {number} id
   */
  public id: number;
  /**
   * The type of this shape. Must be set to an int > 0 by subclasses.
   * @property type
   * @type {Number}
   * @see Shape.types
   */
  public type: number;
  /**
   * The local bounding sphere radius of this shape.
   * @property {Number} boundingSphereRadius
   */
  public boundingSphereRadius: number;
  /**
   * Whether to produce contact forces when in contact with other bodies. Note that contacts will be generated, but they will be disabled.
   * @property {boolean} collisionResponse
   */
  public collisionResponse: boolean;
  /**
   * @property {Number} collisionFilterGroup
   */
  public collisionFilterGroup: number;
  /**
   * @property {Number} collisionFilterMask
   */
  public collisionFilterMask: number;
  /**
   * @property {Material} material
   */
  public material: Material | null;
  /**
   * @property {Body} body
   */
  public body: any;

  constructor(
    options: ShapeOptions = {
      type: 0,
      collisionFilterGroup: 1,
      collisionFilterMask: -1,
      collisionResponse: true,
      material: null
    }
  ) {
    this.id = Shape.idCounter++;

    this.type = options.type;

    this.boundingSphereRadius = 0;

    this.collisionResponse = options.collisionResponse;

    this.collisionFilterGroup = options.collisionFilterGroup;

    this.collisionFilterMask = options.collisionFilterMask;
    this.material = options.material;

    this.body = null;
  }

  /**
   * Computes the bounding sphere radius. The result is stored in the property .boundingSphereRadius
   * @method updateBoundingSphereRadius
   */
  public abstract updateBoundingSphereRadius(): void;
  /**
   * Get the volume of this shape
   * @method volume
   * @return {Number}
   */
  public abstract volume(): number;

  /**
   * Calculates the inertia in the local frame for this shape.
   * @method calculateLocalInertia
   * @param {Number} mass
   * @param {Vec3} target
   * @see http://en.wikipedia.org/wiki/List_of_moments_of_inertia
   */
  public abstract calculateLocalInertia(mass: Number, target: Vec3): void;

  public abstract calculateWorldAABB(
    pos: Vec3,
    quat: Quaternion,
    min: Vec3,
    max: Vec3
  ): void;
}

import Utils from "../utils/Utils";
import Material from "./Material";

export interface ContactMaterialOptions {
  friction: number;
  restitution: number;
  contactEquationStiffness: number;
  contactEquationRelaxation: number;
  frictionEquationStiffness: number;
  frictionEquationRelaxation: number;
}
/**
 * Defines what happens when two materials meet.
 * @class ContactMaterial
 * @constructor
 * @param {Material} m1
 * @param {Material} m2
 * @param {object} [options]
 * @param {Number} [options.friction=0.3]
 * @param {Number} [options.restitution=0.3]
 * @param {number} [options.contactEquationStiffness=1e7]
 * @param {number} [options.contactEquationRelaxation=3]
 * @param {number} [options.frictionEquationStiffness=1e7]
 * @param {Number} [options.frictionEquationRelaxation=3]
 */
export default class ContactMaterial {
  static idCounter: number = 0;
  /**
   * Identifier of this material
   * @property {Number} id
   */
  public id: number;
  /**
   * Participating materials
   * @property {Array} materials
   * @todo  Should be .materialA and .materialB instead
   */
  public materials: Material[];
  /**
   * Friction coefficient
   * @property {Number} friction
   */
  public friction: number;
  /**
   * Restitution coefficient
   * @property {Number} restitution
   */
  public restitution: number;
  /**
   * Stiffness of the produced contact equations
   * @property {Number} contactEquationStiffness
   */
  public contactEquationStiffness: number;
  /**
   * Relaxation time of the produced contact equations
   * @property {Number} contactEquationRelaxation
   */
  public contactEquationRelaxation: number;
  /**
   * Stiffness of the produced friction equations
   * @property {Number} frictionEquationStiffness
   */
  public frictionEquationStiffness: number;
  /**
   * Relaxation time of the produced friction equations
   * @property {Number} frictionEquationRelaxation
   */
  public frictionEquationRelaxation: number;
  
  constructor(
    m1: Material,
    m2: Material,
    options: ContactMaterialOptions = {
      friction: 0.3,
      restitution: 0.3,
      contactEquationStiffness: 1e7,
      contactEquationRelaxation: 3,
      frictionEquationStiffness: 1e7,
      frictionEquationRelaxation: 3
    }
  ) {
    this.id = ContactMaterial.idCounter++;

    this.materials = [m1, m2];

    this.friction = options.friction;

    this.restitution = options.restitution;

    this.contactEquationStiffness = options.contactEquationStiffness;

    this.contactEquationRelaxation = options.contactEquationRelaxation;

    this.frictionEquationStiffness = options.frictionEquationStiffness;

    this.frictionEquationRelaxation = options.frictionEquationRelaxation;
  }
}

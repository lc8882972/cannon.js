export interface MaterialOptions {
  friction: number;
  restitution: number;
}
/**
 * Defines a physics material.
 * @class Material
 * @constructor
 * @param {object} [options]
 * @author schteppe
 */
export default class Material {
  public id: number;
  public name: string;
  public friction: number;
  public restitution: number;
  static idCounter: number = 0;
  constructor(
    name: string = "",
    options: MaterialOptions = { friction: -1, restitution: -1 }
  ) {
    /**
     * @property name
     * @type {String}
     */
    this.name = name;

    /**
     * material id.
     * @property id
     * @type {number}
     */
    this.id = Material.idCounter++;

    /**
     * Friction for this material. If non-negative, it will be used instead of the friction given by ContactMaterials. If there's no matching ContactMaterial, the value from .defaultContactMaterial in the World will be used.
     * @property {number} friction
     */
    this.friction = options.friction;

    /**
     * Restitution for this material. If non-negative, it will be used instead of the restitution given by ContactMaterials. If there's no matching ContactMaterial, the value from .defaultContactMaterial in the World will be used.
     * @property {number} restitution
     */
    this.restitution = options.restitution;
  }
}

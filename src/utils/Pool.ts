/**
 * For pooling objects that can be reused.
 * @class Pool
 * @constructor
 */
abstract class Pool<T> {
  /**
   * The pooled objects
   * @property {Array} objects
   */
  public objects: T[];
  /**
   * Constructor of the objects
   * @property {mixed} type
   */
  public type: any;
  constructor() {
    this.objects = [];
    this.type = Object;
  }

  /**
   * Release an object after use
   * @method release
   * @param {Object} obj
   */
  release(...args) {
    var Nargs = args.length;
    for (var i = 0; i !== Nargs; i++) {
      this.objects.push(args[i]);
    }
    return this;
  }

  /**
   * Get an object
   * @method get
   * @return {mixed}
   */
  get(): T {
    if (this.objects.length === 0) {
      return this.constructObject();
    } else {
      return this.objects.pop();
    }
  }

  /**
   * Construct an object. Should be implmented in each subclass.
   * @method constructObject
   * @return {mixed}
   */
  abstract constructObject();

  /**
   * @method resize
   * @param {number} size
   * @return {Pool} Self, for chaining
   */
  resize(size) {
    var objects = this.objects;

    while (objects.length > size) {
      objects.pop();
    }

    while (objects.length < size) {
      objects.push(this.constructObject());
    }

    return this;
  }
}

export default Pool;

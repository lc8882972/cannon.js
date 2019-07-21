/**
 * @class TupleDictionary
 * @constructor
 */
class TupleDictionary {
  /**
   * The data storage
   * @property data
   * @type {Map}
   */
  private readonly data: Map<string, any>;

  constructor() {
    this.data = new Map();
  }

  getKey(i: number, j: number) {
    if (i > j) {
      return `${j}-${i}`;
    }

    return `${i}-${j}`;
  }

  /**
   * @method get
   * @param  {Number} i
   * @param  {Number} j
   * @return {Number}
   */
  get(i: number, j: number): any {
    const key = this.getKey(i, j);
    return this.data.get(key);
  }

  /**
   * @method set
   * @param  {Number} i
   * @param  {Number} j
   * @param {Number} value
   */
  set(i: number, j: number, value: any) {
    const key = this.getKey(i, j);
    this.data.set(key, value);
  }

  /**
   * @method reset
   */
  reset() {
    this.data.clear();
  }
}

export default TupleDictionary;

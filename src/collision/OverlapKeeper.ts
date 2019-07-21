function unpackAndPush(array, key) {
  array.push((key & 0xffff0000) >> 16, key & 0x0000ffff);
}

/**
 * @class OverlapKeeper
 * @constructor
 */
export default class OverlapKeeper {
  current: number[];
  previous: number[];

  constructor() {
    this.current = [];
    this.previous = [];
  }

  getKey(i: number, j: number): number {
    if (j < i) {
      var temp = j;
      j = i;
      i = temp;
    }
    return (i << 16) | j;
  }

  /**
   * @method set
   * @param {Number} i
   * @param {Number} j
   */
  set(i: number, j: number) {
    // Insertion sort. This way the diff will have linear complexity.
    var key = this.getKey(i, j);
    var current = this.current;
    var index = 0;
    while (key > current[index]) {
      index++;
    }
    if (key === current[index]) {
      return; // Pair was already added
    }
    for (var j = current.length - 1; j >= index; j--) {
      current[j + 1] = current[j];
    }
    current[index] = key;
  }

  /**
   * @method tick
   */
  tick() {
    var tmp = this.current;
    this.current = this.previous;
    this.previous = tmp;
    this.current.length = 0;
  }

  /**
   * @method getDiff
   * @param  {array} additions
   * @param  {array} removals
   */
  getDiff(additions: number[], removals: number[]) {
    var a = this.current;
    var b = this.previous;
    var al = a.length;
    var bl = b.length;

    var j = 0;
    for (var i = 0; i < al; i++) {
      var found = false;
      var keyA = a[i];
      while (keyA > b[j]) {
        j++;
      }
      found = keyA === b[j];

      if (!found) {
        unpackAndPush(additions, keyA);
      }
    }
    j = 0;
    for (var i = 0; i < bl; i++) {
      var found = false;
      var keyB = b[i];
      while (keyB > a[j]) {
        j++;
      }
      found = a[j] === keyB;

      if (!found) {
        unpackAndPush(removals, keyB);
      }
    }
  }
}

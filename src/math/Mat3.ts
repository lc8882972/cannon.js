import Vec3 from "./Vec3";
import Quaternion from "./Quaternion";

/**
 * A 3x3 matrix.
 * @class Mat3
 * @constructor
 * @param array elements Array of nine elements. Optional.
 * @author schteppe / http://github.com/schteppe
 */
class Mat3 {
  public elements: number[];
  constructor(elements: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0]) {
    this.elements = elements;
  }

  /**
   * Sets the matrix to identity
   * @method identity
   * @todo Should perhaps be renamed to setIdentity() to be more clear.
   * @todo Create another function that immediately creates an identity matrix eg. eye()
   */
  identity() {
    var e = this.elements;
    e[0] = 1;
    e[1] = 0;
    e[2] = 0;

    e[3] = 0;
    e[4] = 1;
    e[5] = 0;

    e[6] = 0;
    e[7] = 0;
    e[8] = 1;
  }

  /**
   * Set all elements to zero
   * @method setZero
   */
  setZero() {
    var e = this.elements;
    e[0] = 0;
    e[1] = 0;
    e[2] = 0;
    e[3] = 0;
    e[4] = 0;
    e[5] = 0;
    e[6] = 0;
    e[7] = 0;
    e[8] = 0;
  }

  /**
   * Sets the matrix diagonal elements from a Vec3
   * @method setTrace
   * @param {Vec3} vec3
   */
  setTrace(vec3: Vec3) {
    var e = this.elements;
    e[0] = vec3.x;
    e[4] = vec3.y;
    e[8] = vec3.z;
  }

  /**
   * Gets the matrix diagonal elements
   * @method getTrace
   * @return {Vec3}
   */
  getTrace(target: Vec3) {
    var target = target || new Vec3();
    var e = this.elements;
    target.x = e[0];
    target.y = e[4];
    target.z = e[8];
  }

  /**
   * Matrix-Vector multiplication
   * @method vmult
   * @param {Vec3} v The vector to multiply with
   * @param {Vec3} target Optional, target to save the result in.
   */
  vmult(v: Vec3, target?: Vec3) {
    target = target || new Vec3();

    var e = this.elements,
      x = v.x,
      y = v.y,
      z = v.z;
    target.x = e[0] * x + e[1] * y + e[2] * z;
    target.y = e[3] * x + e[4] * y + e[5] * z;
    target.z = e[6] * x + e[7] * y + e[8] * z;

    return target;
  }

  multiplyMatrices(a: Mat3, b: Mat3) {
    // from three.js 
    var ae = a.elements;
    var be = b.elements;
    var te = this.elements;

    var a11 = ae[0],
      a12 = ae[3],
      a13 = ae[6];
    var a21 = ae[1],
      a22 = ae[4],
      a23 = ae[7];
    var a31 = ae[2],
      a32 = ae[5],
      a33 = ae[8];

    var b11 = be[0],
      b12 = be[3],
      b13 = be[6];
    var b21 = be[1],
      b22 = be[4],
      b23 = be[7];
    var b31 = be[2],
      b32 = be[5],
      b33 = be[8];

    te[0] = a11 * b11 + a12 * b21 + a13 * b31;
    te[3] = a11 * b12 + a12 * b22 + a13 * b32;
    te[6] = a11 * b13 + a12 * b23 + a13 * b33;

    te[1] = a21 * b11 + a22 * b21 + a23 * b31;
    te[4] = a21 * b12 + a22 * b22 + a23 * b32;
    te[7] = a21 * b13 + a22 * b23 + a23 * b33;

    te[2] = a31 * b11 + a32 * b21 + a33 * b31;
    te[5] = a31 * b12 + a32 * b22 + a33 * b32;
    te[8] = a31 * b13 + a32 * b23 + a33 * b33;

    return this;
  }

  /**
   * Matrix-scalar multiplication
   * @method smult
   * @param {Number} s
   */
  smult(s: number) {
    for (var i = 0; i < this.elements.length; i++) {
      this.elements[i] *= s;
    }
  }

  /**
   * Matrix multiplication
   * @method mmult
   * @param {Mat3} m Matrix to multiply with from left side.
   * @return {Mat3} The result.
   */
  mmult(m: Mat3, target?: Mat3) {
    var r = target || new Mat3();
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        var sum = 0.0;
        for (var k = 0; k < 3; k++) {
          sum += m.elements[i + k * 3] * this.elements[k + j * 3];
        }
        r.elements[i + j * 3] = sum;
      }
    }
    return r;
  }

  /**
   * Scale each column of the matrix
   * @method scale
   * @param {Vec3} v
   * @return {Mat3} The result.
   */
  scale(v: Vec3, target?: Mat3) {
    target = target || new Mat3();
    var e = this.elements,
      t = target.elements;
    for (var i = 0; i !== 3; i++) {
      t[3 * i + 0] = v.x * e[3 * i + 0];
      t[3 * i + 1] = v.y * e[3 * i + 1];
      t[3 * i + 2] = v.z * e[3 * i + 2];
    }
    return target;
  }

  /**
   * Solve Ax=b
   * @method solve
   * @param {Vec3} b The right hand side
   * @param {Vec3} target Optional. Target vector to save in.
   * @return {Vec3} The solution x
   * @todo should reuse arrays
   */
  solve(b: Vec3, target?: Vec3) {
    target = target || new Vec3();

    // Construct equations
    var nr = 3; // num rows
    var nc = 4; // num cols
    var eqns = [];
    for (var i = 0; i < nr * nc; i++) {
      eqns.push(0);
    }
    var i, j;
    for (i = 0; i < 3; i++) {
      for (j = 0; j < 3; j++) {
        eqns[i + nc * j] = this.elements[i + 3 * j];
      }
    }
    eqns[3 + 4 * 0] = b.x;
    eqns[3 + 4 * 1] = b.y;
    eqns[3 + 4 * 2] = b.z;

    // Compute right upper triangular version of the matrix - Gauss elimination
    var n = 3,
      k = n,
      np;
    var kp = 4; // num rows
    var p, els;
    do {
      i = k - n;
      if (eqns[i + nc * i] === 0) {
        // the pivot is null, swap lines
        for (j = i + 1; j < k; j++) {
          if (eqns[i + nc * j] !== 0) {
            np = kp;
            do {
              // do ligne( i ) = ligne( i ) + ligne( k )
              p = kp - np;
              eqns[p + nc * i] += eqns[p + nc * j];
            } while (--np);
            break;
          }
        }
      }
      if (eqns[i + nc * i] !== 0) {
        for (j = i + 1; j < k; j++) {
          var multiplier = eqns[i + nc * j] / eqns[i + nc * i];
          np = kp;
          do {
            // do ligne( k ) = ligne( k ) - multiplier * ligne( i )
            p = kp - np;
            eqns[p + nc * j] =
              p <= i ? 0 : eqns[p + nc * j] - eqns[p + nc * i] * multiplier;
          } while (--np);
        }
      }
    } while (--n);

    // Get the solution
    target.z = eqns[2 * nc + 3] / eqns[2 * nc + 2];
    target.y =
      (eqns[1 * nc + 3] - eqns[1 * nc + 2] * target.z) / eqns[1 * nc + 1];
    target.x =
      (eqns[0 * nc + 3] -
        eqns[0 * nc + 2] * target.z -
        eqns[0 * nc + 1] * target.y) /
      eqns[0 * nc + 0];

    if (
      isNaN(target.x) ||
      isNaN(target.y) ||
      isNaN(target.z) ||
      target.x === Infinity ||
      target.y === Infinity ||
      target.z === Infinity
    ) {
      throw "Could not solve equation! Got x=[" +
        target.toString() +
        "], b=[" +
        b.toString() +
        "], A=[" +
        this.toString() +
        "]";
    }

    return target;
  }

  /**
   * Get an element in the matrix by index. Index starts at 0, not 1!!!
   * @method e
   * @param {Number} row
   * @param {Number} column
   * @param {Number} value Optional. If provided, the matrix element will be set to this value.
   * @return {Number}
   */
  e(row: number, column: number, value?: number) {
    if (value === undefined) {
      return this.elements[column + 3 * row];
    } else {
      // Set value
      this.elements[column + 3 * row] = value;
    }
  }

  /**
   * Copy another matrix into this matrix object.
   * @method copy
   * @param {Mat3} source
   * @return {Mat3} this
   */
  copy(source: Mat3) {
    for (var i = 0; i < source.elements.length; i++) {
      this.elements[i] = source.elements[i];
    }
    return this;
  }

  /**
   * Returns a string representation of the matrix.
   * @method toString
   * @return string
   */
  toString() {
    var r = "";
    var sep = ",";
    for (var i = 0; i < 9; i++) {
      r += this.elements[i] + sep;
    }
    return r;
  }

  /**
   * reverse the matrix
   * @method reverse
   * @param {Mat3} target Optional. Target matrix to save in.
   * @return {Mat3} The solution x
   */
  reverse(target?: Mat3) {
    target = target || new Mat3();

    // Construct equations
    var nr = 3; // num rows
    var nc = 6; // num cols
    var eqns = [];
    for (var i = 0; i < nr * nc; i++) {
      eqns.push(0);
    }
    var i, j;
    for (i = 0; i < 3; i++) {
      for (j = 0; j < 3; j++) {
        eqns[i + nc * j] = this.elements[i + 3 * j];
      }
    }
    eqns[3 + 6 * 0] = 1;
    eqns[3 + 6 * 1] = 0;
    eqns[3 + 6 * 2] = 0;
    eqns[4 + 6 * 0] = 0;
    eqns[4 + 6 * 1] = 1;
    eqns[4 + 6 * 2] = 0;
    eqns[5 + 6 * 0] = 0;
    eqns[5 + 6 * 1] = 0;
    eqns[5 + 6 * 2] = 1;

    // Compute right upper triangular version of the matrix - Gauss elimination
    var n = 3,
      k = n,
      np;
    var kp = nc; // num rows
    var p;
    do {
      i = k - n;
      if (eqns[i + nc * i] === 0) {
        // the pivot is null, swap lines
        for (j = i + 1; j < k; j++) {
          if (eqns[i + nc * j] !== 0) {
            np = kp;
            do {
              // do line( i ) = line( i ) + line( k )
              p = kp - np;
              eqns[p + nc * i] += eqns[p + nc * j];
            } while (--np);
            break;
          }
        }
      }
      if (eqns[i + nc * i] !== 0) {
        for (j = i + 1; j < k; j++) {
          var multiplier = eqns[i + nc * j] / eqns[i + nc * i];
          np = kp;
          do {
            // do line( k ) = line( k ) - multiplier * line( i )
            p = kp - np;
            eqns[p + nc * j] =
              p <= i ? 0 : eqns[p + nc * j] - eqns[p + nc * i] * multiplier;
          } while (--np);
        }
      }
    } while (--n);

    // eliminate the upper left triangle of the matrix
    i = 2;
    do {
      j = i - 1;
      do {
        var multiplier = eqns[i + nc * j] / eqns[i + nc * i];
        np = nc;
        do {
          p = nc - np;
          eqns[p + nc * j] = eqns[p + nc * j] - eqns[p + nc * i] * multiplier;
        } while (--np);
      } while (j--);
    } while (--i);

    // operations on the diagonal
    i = 2;
    do {
      var multiplier = 1 / eqns[i + nc * i];
      np = nc;
      do {
        p = nc - np;
        eqns[p + nc * i] = eqns[p + nc * i] * multiplier;
      } while (--np);
    } while (i--);

    i = 2;
    do {
      j = 2;
      do {
        p = eqns[nr + j + nc * i];
        if (isNaN(p) || p === Infinity) {
          throw "Could not reverse! A=[" + this.toString() + "]";
        }
        target.e(i, j, p);
      } while (j--);
    } while (i--);

    return target;
  }

  /**
   * Set the matrix from a quaterion
   * @method setRotationFromQuaternion
   * @param {Quaternion} q
   */
  setRotationFromQuaternion(q: Quaternion) {
    var x = q.x,
      y = q.y,
      z = q.z,
      w = q.w,
      x2 = x + x,
      y2 = y + y,
      z2 = z + z,
      xx = x * x2,
      xy = x * y2,
      xz = x * z2,
      yy = y * y2,
      yz = y * z2,
      zz = z * z2,
      wx = w * x2,
      wy = w * y2,
      wz = w * z2,
      e = this.elements;

    e[3 * 0 + 0] = 1 - (yy + zz);
    e[3 * 0 + 1] = xy - wz;
    e[3 * 0 + 2] = xz + wy;

    e[3 * 1 + 0] = xy + wz;
    e[3 * 1 + 1] = 1 - (xx + zz);
    e[3 * 1 + 2] = yz - wx;

    e[3 * 2 + 0] = xz - wy;
    e[3 * 2 + 1] = yz + wx;
    e[3 * 2 + 2] = 1 - (xx + yy);

    return this;
  }

  /**
   * Transpose the matrix
   * @method transpose
   * @param  {Mat3} target Where to store the result.
   * @return {Mat3} The target Mat3, or a new Mat3 if target was omitted.
   */
  transpose(target?: Mat3) {
    target = target || new Mat3();

    var Mt = target.elements,
      M = this.elements;

    for (var i = 0; i !== 3; i++) {
      for (var j = 0; j !== 3; j++) {
        Mt[3 * i + j] = M[3 * j + i];
      }
    }

    return target;
  }
}

export default Mat3;

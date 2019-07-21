import Vec3 from "../math/Vec3";
import Body from "../objects/Body";

const SPHSystem_getNeighbors_dist = new Vec3();
// Temp vectors for calculation
const SPHSystem_update_dist = new Vec3();
const SPHSystem_update_a_pressure = new Vec3();
const SPHSystem_update_a_visc = new Vec3();
const SPHSystem_update_gradW = new Vec3();
const SPHSystem_update_r_vec = new Vec3();
const SPHSystem_update_u = new Vec3(); // Relative velocity

/**
 * Smoothed-particle hydrodynamics system
 * @class SPHSystem
 * @constructor
 */
export default class SPHSystem {
  particles: Body[];
  /**
   * Density of the system (kg/m3).
   * @property {number} density
   */
  density: number;
  /**
   * Distance below which two particles are considered to be neighbors.
   * It should be adjusted so there are about 15-20 neighbor particles within this radius.
   * @property {number} smoothingRadius
   */
  smoothingRadius: number;
  speedOfSound: number;
  /**
   * Viscosity of the system.
   * @property {number} viscosity
   */
  viscosity: number;
  eps: number;
  pressures: number[];
  densities: number[];
  neighbors: Body[][];

  constructor() {
    this.particles = [];

    this.density = 1;

    this.smoothingRadius = 1;
    this.speedOfSound = 1;

    this.viscosity = 0.01;
    this.eps = 0.000001;

    // Stuff Computed per particle
    this.pressures = [];
    this.densities = [];
    this.neighbors = [];
  }

  /**
   * Add a particle to the system.
   * @method add
   * @param {Body} particle
   */
  add(particle: Body) {
    this.particles.push(particle);
    if (this.neighbors.length < this.particles.length) {
      this.neighbors.push([]);
    }
  }

  /**
   * Remove a particle from the system.
   * @method remove
   * @param {Body} particle
   */
  remove(particle: Body) {
    var idx = this.particles.indexOf(particle);
    if (idx !== -1) {
      this.particles.splice(idx, 1);
      if (this.neighbors.length > this.particles.length) {
        this.neighbors.pop();
      }
    }
  }

  /**
   * Get neighbors within smoothing volume, save in the array neighbors
   * @method getNeighbors
   * @param {Body} particle
   * @param {Array} neighbors
   */
  getNeighbors(particle: Body, neighbors: Body[]) {
    var N = this.particles.length,
      id = particle.id,
      R2 = this.smoothingRadius * this.smoothingRadius,
      dist = SPHSystem_getNeighbors_dist;
    for (var i = 0; i !== N; i++) {
      var p = this.particles[i];
      p.position.sub(particle.position, dist);
      if (id !== p.id && dist.lengthSquared() < R2) {
        neighbors.push(p);
      }
    }
  }

  update() {
    var N = this.particles.length,
      dist = SPHSystem_update_dist,
      cs = this.speedOfSound,
      eps = this.eps;

    for (var i = 0; i !== N; i++) {
      var p = this.particles[i]; // Current particle
      var neighbors = this.neighbors[i];

      // Get neighbors
      neighbors.length = 0;
      this.getNeighbors(p, neighbors);
      neighbors.push(this.particles[i]); // Add current too
      var numNeighbors = neighbors.length;

      // Accumulate density for the particle
      var sum = 0.0;
      for (var j = 0; j !== numNeighbors; j++) {
        //printf("Current particle has position %f %f %f\n",objects[id].pos.x(),objects[id].pos.y(),objects[id].pos.z());
        p.position.sub(neighbors[j].position, dist);
        var len = dist.length();

        var weight = this.w(len);
        sum += neighbors[j].mass * weight;
      }

      // Save
      this.densities[i] = sum;
      this.pressures[i] = cs * cs * (this.densities[i] - this.density);
    }

    // Add forces

    // Sum to these accelerations
    var a_pressure = SPHSystem_update_a_pressure;
    var a_visc = SPHSystem_update_a_visc;
    var gradW = SPHSystem_update_gradW;
    var r_vec = SPHSystem_update_r_vec;
    var u = SPHSystem_update_u;

    for (var i = 0; i !== N; i++) {
      var particle = this.particles[i];

      a_pressure.set(0, 0, 0);
      a_visc.set(0, 0, 0);

      // Init vars
      var Pij;
      var nabla;
      var Vij;

      // Sum up for all other neighbors
      var neighbors = this.neighbors[i];
      var numNeighbors = neighbors.length;

      //printf("Neighbors: ");
      for (var j = 0; j !== numNeighbors; j++) {
        var neighbor = neighbors[j];
        //printf("%d ",nj);

        // Get r once for all..
        particle.position.sub(neighbor.position, r_vec);
        var r = r_vec.length();

        // Pressure contribution
        Pij =
          -neighbor.mass *
          (this.pressures[i] / (this.densities[i] * this.densities[i] + eps) +
            this.pressures[j] / (this.densities[j] * this.densities[j] + eps));
        this.gradw(r_vec, gradW);
        // Add to pressure acceleration
        gradW.scale(Pij, gradW);
        a_pressure.add(gradW, a_pressure);

        // Viscosity contribution
        neighbor.velocity.sub(particle.velocity, u);
        u.scale(
          (1.0 / (0.0001 + this.densities[i] * this.densities[j])) *
            this.viscosity *
            neighbor.mass,
          u
        );
        nabla = this.nablaw(r);
        u.scale(nabla, u);
        // Add to viscosity acceleration
        a_visc.add(u, a_visc);
      }

      // Calculate force
      a_visc.scale(particle.mass, a_visc);
      a_pressure.scale(particle.mass, a_pressure);

      // Add force to particles
      particle.force.add(a_visc, particle.force);
      particle.force.add(a_pressure, particle.force);
    }
  }

  // Calculate the weight using the W(r) weightfunction
  w(r: number): number {
    // 315
    var h = this.smoothingRadius;
    return (
      (315.0 / (64.0 * Math.PI * Math.pow(h, 9))) * Math.pow(h * h - r * r, 3)
    );
  }

  // calculate gradient of the weight function
  gradw(rVec: Vec3, resultVec: Vec3) {
    var r = rVec.length(),
      h = this.smoothingRadius;
    rVec.scale(
      (945.0 / (32.0 * Math.PI * Math.pow(h, 9))) * Math.pow(h * h - r * r, 2),
      resultVec
    );
  }

  // Calculate nabla(W)
  nablaw(r: number): number {
    var h = this.smoothingRadius;
    var nabla =
      (945.0 / (32.0 * Math.PI * Math.pow(h, 9))) *
      (h * h - r * r) *
      (7 * r * r - 3 * h * h);
    return nabla;
  }
}

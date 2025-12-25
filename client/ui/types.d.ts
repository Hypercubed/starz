declare module 'd3-geo-voronoi' {
  interface GeoVoronoi<T extends object> {
    polygons(data: T[]): FeatureCollection<GeometryObject>;
    x(projection: any): GeoVoronoi<T>;
    y(projection: any): GeoVoronoi<T>;
  }

  export function geoVoronoi<T extends object>(): GeoVoronoi<T>;
}

declare module 'versor' {
  interface Versor {
    (e: [number, number, number]): [number, number, number, number];
    cartesian(euler: [number, number]): [number, number, number];
    rotate(e: [number, number, number, number]): [number, number, number];
    delta(
      v0: [number, number, number],
      v1: [number, number, number]
    ): [number, number, number, number];
    angle(v0: [number, number, number], v1: [number, number, number]): number;
    multiply(
      q0: [number, number, number, number],
      q1: [number, number, number, number]
    ): [number, number, number, number];
    rotation(e: [number, number, number, number]): [number, number, number];
  }

  declare const versor: Versor;
  export default versor;
}

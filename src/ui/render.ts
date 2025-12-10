import * as d3 from 'd3';
import { geoVoronoi } from 'd3-geo-voronoi';
import versor from 'versor';

import { ENABLE_GRATICULE, HEIGHT, PROJECTION, WIDTH } from '../constants.ts';
import { getPlayersHomeworld } from '../game/state.ts';

import { onClickLane, onClickSystem } from './controls.ts';
import { isSelected } from './selection.ts';

import type { Coordinates, GameState, Lane, System } from '../game/types.d.ts';
import type { FnContext } from '../managers/types.d.ts';

const ZOOM_SENSITIVITY = 0.5;
const MIN_ZOOM_SCALE = 0.25;
const MAX_ZOOM_SCALE = 100;
const SYSTEM_SIZE = 20;

const ENABLE_MESH = true;

const projections = {
  Orthographic: d3.geoOrthographic,
  Stereographic: d3.geoStereographic,
  Mercator: d3.geoMercator,
  TransverseMercator: d3.geoTransverseMercator
};

let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown>;

let selectedProjectionType = projections[PROJECTION];
let geoProjection = selectedProjectionType().translate([0, 0]);
let initialScale = geoProjection.scale();
let geoPathGenerator = d3.geoPath().projection(geoProjection);
let graticuleFeature: any;

const mesh = geoVoronoi()
  .x((d: System) => d.location[0])
  .y((d: System) => d.location[1]);

export function changeView() {
  const projectionNames = Object.keys(projections);
  const currentIndex = projectionNames.findIndex(
    (name) =>
      projections[name as keyof typeof projections] === selectedProjectionType
  );
  const nextIndex = (currentIndex + 1) % projectionNames.length;
  setProjection(projectionNames[nextIndex]);
}

function setProjection(projectionName: string) {
  selectedProjectionType =
    projections[projectionName as keyof typeof projections];
  geoProjection = selectedProjectionType();
  geoProjection.translate([0, 0]).rotate([0, 0, 0]).scale(initialScale);
  initialScale = geoProjection.scale();
  geoPathGenerator = d3.geoPath().projection(geoProjection);
}

export function rotateProjection(
  deltaRotation: [number, number] | [number, number, number]
) {
  const rotation = geoProjection.rotate();
  rotation[0] += deltaRotation[0];
  rotation[1] += deltaRotation[1];
  if (deltaRotation.length === 3) {
    rotation[2] += deltaRotation[2];
  }
  geoProjection.rotate(rotation);
}

export function drawMap() {
  const ctx = globalThis.gameManager.getContext();

  d3.select('#app').select('svg').remove();

  svg = d3
    .select('#app')
    .append('svg')
    .attr('width', '100vw')
    .attr('height', '100vh')
    .attr('viewBox', `-${WIDTH / 2} -${HEIGHT / 2} ${WIDTH} ${HEIGHT}`)
    .on('contextmenu', (ev: PointerEvent) => ev.preventDefault());

  if (ENABLE_GRATICULE) drawGraticule(ctx.S);
  if (ENABLE_MESH) drawRegions(ctx);
  drawLanes(ctx);
  drawSystems(ctx);

  svg.call(createDrag() as any);
  svg.call(createZoom() as any);

  function createDrag() {
    return drag()
      .on('drag.render', () => rerender())
      .on('end.render', () => rerender());
  }

  function createZoom(): d3.ZoomBehavior<Element, unknown> {
    return d3
      .zoom()
      .filter((e) => {
        return e.type === 'wheel';
      })
      .on('zoom', (event) => {
        if (event.transform.k > ZOOM_SENSITIVITY) {
          const newScale = initialScale * event.transform.k;
          geoProjection.scale(newScale);
          rerender();
        } else {
          event.transform.k = ZOOM_SENSITIVITY;
        }
      });
  }

  function drag() {
    let v0: number;
    let q0: number;
    let r0: [number, number, number];
    let a0: number;
    let l: number;

    function pointer(event: any, that: any) {
      const t = d3.pointers(event, that);

      if (t.length !== l) {
        l = t.length;
        if (l > 1) a0 = Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0]);
        dragstarted.apply(that, [event, that] as any);
      }

      // For multitouch, average positions and compute rotation.
      if (l > 1) {
        const x = d3.mean(t, (p) => p[0]);
        const y = d3.mean(t, (p) => p[1]);
        const a = Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0]);
        return [x, y, a];
      }

      return t[0];
    }

    function dragstarted({ x, y }: any) {
      const ep = transform([x, y]);
      v0 = versor.cartesian(geoProjection.invert!(ep));
      r0 = geoProjection.rotate();
      q0 = versor(r0);
    }

    function dragged(this: any, event: any) {
      const ep = transform([event.x, event.y]);
      const v1 = versor.cartesian(geoProjection.rotate(r0).invert!(ep));
      const delta = versor.delta(v0, v1);
      let q1 = versor.multiply(q0, delta);

      // For multitouch, compose with a rotation around the axis.
      const p = pointer(event, this);
      if (p[2]) {
        const d = (p[2] - a0) / 2;
        const s = -Math.sin(d);
        const c = Math.sign(Math.cos(d));
        q1 = versor.multiply([Math.sqrt(1 - s * s), 0, 0, c * s], q1);
      }

      geoProjection.rotate(versor.rotation(q1));

      // In vicinity of the antipode (unstable) of q0, restart.
      if (delta[0] < 0.7) dragstarted.apply(this, [event, this] as any);
    }

    function transform(point: [number, number]): [number, number] {
      const width = parseInt(svg.style('width'));
      const height = parseInt(svg.style('height'));
      return [point[0] - width / 2, point[1] - height / 2];
    }

    return d3
      .drag()
      .filter((event) => {
        return event.button === 1 || event.touches;
      })
      .on('start', dragstarted)
      .on('drag', dragged);
  }
}

function getFeature(state: GameState) {
  const geoGraticuleGenerator = d3.geoGraticule();
  const playersHome = getPlayersHomeworld(state);

  if (playersHome) {
    if (!graticuleFeature) {
      const rot1 = d3.geoRotation([0, 90 + playersHome.location[1], 0]);
      const rot2 = d3.geoRotation([playersHome.location[0], 0, 0]);

      graticuleFeature = {
        type: 'FeatureCollection',
        features: geoGraticuleGenerator.lines().map((line) => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: line.coordinates.map((coord) =>
              rot2(rot1(coord as [number, number]))
            )
          }
        }))
      };
    }
    return graticuleFeature;
  }

  return geoGraticuleGenerator();
}

function drawGraticule(state: GameState) {
  const feature = getFeature(state);

  const g = svg
    .selectAll('g#graticule')
    .data([feature])
    .join((enter) => enter.append('g').attr('id', 'graticule'));

  g.selectAll('path')
    .data([feature])
    .join((enter) =>
      enter
        .append('path')
        .attr('class', 'graticule')
        .style('fill', 'none')
        .style('stroke', '#333')
    )
    .attr('d', geoPathGenerator);
}

export function scaleZoom(scale: number) {
  const newScale = geoProjection.scale() * scale;
  if (newScale < initialScale * MIN_ZOOM_SCALE) return;
  if (newScale > initialScale * MAX_ZOOM_SCALE) return;
  geoProjection.scale(newScale);
  rerender();
}

export function centerOnHome() {
  const ctx = globalThis.gameManager.getContext();
  const home = getPlayersHomeworld(ctx.S);
  if (!home) return;

  graticuleFeature = null;

  const location = home.location;
  if (selectedProjectionType === projections['Orthographic']) {
    centerOnCoordinates([location[0], location[1] - 45]);
  } else {
    centerOnCoordinates(location);
  }
  geoProjection.scale(initialScale);
}

export function centerOnSystem(systemId: string) {
  const ctx = globalThis.gameManager.getContext();

  const system = ctx.S.world.systemMap.get(systemId);
  if (!system) return;
  centerOnCoordinates(system.location);
  geoProjection.scale(initialScale);
}

export function centerOnCoordinates(coords: Coordinates) {
  geoProjection.rotate([-coords[0], -coords[1], 0]);
  rerender();
}

export function rerender() {
  if (!svg) return;

  const ctx = globalThis.gameManager.getContext();
  if (ENABLE_GRATICULE) drawGraticule(ctx.S);
  if (ENABLE_MESH) drawRegions(ctx);

  drawSystems(ctx);
  drawLanes(ctx);
}

function drawSystems({ S, C, P }: FnContext) {
  const currentScale = geoProjection.scale();
  const reducedSize = currentScale / initialScale < 1;

  let visibleSystems = Array.from(S.world.systemMap.values());

  if (C.config.fow) {
    visibleSystems = visibleSystems.filter((system) =>
      P.revealedSystems.has(system.id)
    );
  }

  // Filter out systems that are not currently visible in the projection
  visibleSystems = visibleSystems.filter(
    (d) => !!geoPathGenerator({ type: 'Point', coordinates: d.location })
  );

  const layer = svg
    .selectAll('g#systems')
    .data([visibleSystems])
    .join((enter) => enter.append('g').attr('id', 'systems'))
    .classed('reduced-size', reducedSize)
    .classed('hidden', false);

  const group = layer
    .selectAll('.system')
    .data(
      (d) => d,
      (d) => (d as System).id
    )
    .join((enter) => {
      const g = enter
        .append('g')
        .attr('class', 'system')
        .attr('id', (d) => d.id)
        .on('click', (ev: PointerEvent, d: System) => {
          onClickSystem(ev, d);
          rerender();
        })
        .on('contextmenu', (ev: PointerEvent, d: System) => {
          ev.preventDefault();
          onClickSystem(ev, d);
          rerender();
        });

      g.append('circle')
        .attr('class', 'system-outline')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', SYSTEM_SIZE / 2);

      g.append('text')
        .attr('class', 'ship-count')
        .attr('y', -10)
        .attr('x', 0)
        .attr('text-anchor', 'start');

      g.append('text')
        .attr('class', 'system-icon')
        .attr('y', 0)
        .attr('x', 0)
        .attr('text-anchor', 'end');

      return g;
    });

  group
    .style('--owner-color', (d) => S.playerMap.get(d.ownerId!)?.color ?? null)
    .classed('selected', (d) => isSelected(d.id))
    .classed('moved', (d) => d.movement[0] > 0 || d.movement[1] > 0)
    .classed('inhabited', (d) => d.type === 'INHABITED')
    .classed('homeworld', (d) => !!d.homeworld && d.ownerId === d.homeworld)
    .classed('visited', (d) => P.visitedSystems.has(d.id))
    .attr('transform', (d) => `translate(${geoProjection(d.location)})`);

  group.select('.system-icon').text((d) => {
    if (d.homeworld && d.ownerId === d.homeworld) return '✶';
    if (d.type === 'INHABITED') return '✦';
    return '●'; // ⚬❍⊙⊛◉〇⦾◎⊚●⬤▲◯⍟✪★✦⭑✰✦✧✶
  });

  group.select('.ship-count').text((d) => {
    if (reducedSize) return '';
    const icon = d.type === 'INHABITED' ? '▴' : '';
    return icon + (d.ships ? d.ships.toString() : '');
  });
}

// Memoized features for regions
const getFeatures = (() => {
  let features: d3.ExtendedFeature[] = [];
  let systems: Map<string, System>;

  return (state: GameState) => {
    if (!features || systems !== state.world.systemMap) {
      systems = state.world.systemMap;
      const systemArray = Array.from(systems.values());
      features = mesh.polygons(systemArray).features;
    }
    return features!;
  };
})();

function drawRegions({ S, C, P }: FnContext) {
  let features = getFeatures(S);

  if (C.config.fow) {
    features = features.filter((feature) => {
      const system = feature.properties?.site as System;
      return P.visitedSystems.has(system.id);
    });
  }

  const g = svg
    .selectAll('g#mesh')
    .data([features])
    .join((enter) => enter.append('g').attr('id', 'mesh'));

  const path = g
    .selectAll('path')
    .data(
      (d) => d,
      (d: any) => d.properties?.site.id
    )
    .join((enter: any) =>
      enter
        .append('path')
        .classed('region', true)
        .on('click', (ev: PointerEvent, d: System) => {
          onClickSystem(ev, d);
          rerender();
        })
        .on('contextmenu', (ev: PointerEvent, d: System) => {
          ev.preventDefault();
          onClickSystem(ev, d);
          rerender();
        })
    );

  path
    .attr('d', (d) => geoPathGenerator(d))
    .datum((d: any) => d.properties.site as System)
    .style('--owner-color', (d) => S.playerMap.get(d.ownerId!)?.color ?? null);
}

function drawLanes({ S, C, P }: FnContext) {
  let visibleLanes = Array.from(S.world.laneMap.values());

  if (C.config.fow) {
    visibleLanes = visibleLanes.filter(
      (lane) =>
        P.revealedSystems.has(lane.fromId) && P.revealedSystems.has(lane.toId)
    );
  }

  const layer = svg
    .selectAll('g#lanes')
    .data([visibleLanes])
    .join((enter) => enter.append('g').attr('id', 'lanes'));

  const group = layer
    .selectAll('g.lane-group')
    .data(
      (d) => d,
      (d) => (d as Lane).id
    )
    .join((enter) => {
      const g = enter
        .append('g')
        .attr('class', 'lane-group')
        .attr('id', (d) => d.id)
        .on('click', (ev: PointerEvent, d: Lane) => {
          onClickLane(ev, d);
          rerender();
        })
        .on('contextmenu', (ev: PointerEvent, d: Lane) => {
          ev.preventDefault();
          onClickLane(ev, d);
          rerender();
        });

      g.append('path').attr('class', 'lane');
      g.append('path').attr('class', 'pulse');

      return g;
    })
    .datum((d) => {
      const to = S.world.systemMap.get(d.toId)!;
      const from = S.world.systemMap.get(d.fromId)!;
      const path = geoPathGenerator({
        type: 'LineString',
        coordinates: [from.location, to.location]
      });

      return {
        ...d,
        from: S.world.systemMap.get(d.fromId)!,
        to: S.world.systemMap.get(d.toId)!,
        path
      };
    });

  group.style('--owner-color', (d) => {
    const from = d.from;
    if (!from.ownerId) return null;
    const to = d.to;
    if (!to.ownerId) return null;
    if (from.ownerId !== to.ownerId) return null;
    return S.playerMap.get(from.ownerId)?.color ?? null;
  });

  group
    .select('path.lane')
    .attr('d', (d) => d.path)
    .style('--path-length', (d) => {
      const pathElement = d3
        .select<SVGPathElement, unknown>(`#${d.id} .lane`)
        .node();
      if (pathElement) {
        const length = pathElement.getTotalLength();
        return length;
      }
      return 200;
    });

  group
    .select('path.pulse')
    .attr('d', (d) => d.path)
    .classed('moved', (d) => d.movement[0] > 0 || d.movement[1] > 0)
    .style('stroke-width', (d) => {
      if (d.movement[0] === 0 && d.movement[1] === 0) return null;
      const baseWidth = 2;
      const extraWidth = Math.floor(
        Math.log2(Math.max(d.movement[0], d.movement[1]))
      );
      const w = baseWidth + extraWidth;
      return `${w * 2}px`;
    })
    .classed('moved--fwd', (d) => d.movement[0] > d.movement[1])
    .classed('moved--bak', (d) => d.movement[1] > d.movement[0]);
  // .transition()
  // .duration(250)
  //   .attrTween("stroke-dashoffset", function (d) {
  //     const L = 200; // d3.select(this).node()?.getTotalLength?.() ?? 200;

  //     return (t) => {
  //       if (d.movement[0] > d.movement[1]) {
  //         return `${L * (1 - t)}`;
  //       } else if (d.movement[1] > d.movement[0]) {
  //         return `${L * t}`;
  //       }
  //       return `0`;
  //     }
  //   });
}

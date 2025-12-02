import * as d3 from 'd3';
import { debounce } from 'ts-debounce';
// import { smoothPath } from "svg-smoother";

// @ts-ignore
import { geoVoronoi } from 'd3-geo-voronoi';

// @ts-ignore
import versor from 'versor';

import {
  ENABLE_FOG_OF_WAR,
  HEIGHT,
  PROJECTION,
  WIDTH
} from '../core/constants.ts';
import { getPlayersHomeworld, state, thisPlayer } from '../game/state.ts';
import {
  SystemTypes,
  type Coordinates,
  type Lane,
  type System
} from '../types.ts';

const ZOOM_SENSITIVITY = 0.5;
const MIN_ZOOM_SCALE = 0.25;
const MAX_ZOOM_SCALE = 100;
const SYSTEM_SIZE = 20;

const ENABLE_MESH = true;
const ENABLE_GRATICULE = true;

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
  d3.select('#app').select('svg').remove();

  svg = d3
    .select('#app')
    .append('svg')
    .attr('width', '100vw')
    .attr('height', '100vh')
    .attr('viewBox', `-${WIDTH / 2} -${HEIGHT / 2} ${WIDTH} ${HEIGHT}`)
    .on('contextmenu', (ev: PointerEvent) => ev.preventDefault());

  if (ENABLE_GRATICULE) drawGraticule();
  if (ENABLE_MESH) drawRegions();
  drawLanes();
  drawSystems();

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
          rerenderUnthrottled();
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

function getFeature() {
  const geoGraticuleGenerator = d3.geoGraticule();
  const playersHome = getPlayersHomeworld();

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

function drawGraticule() {
  const feature = getFeature();

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
  const home = getPlayersHomeworld();
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
  const system = state.world.systemMap.get(systemId);
  if (!system) return;
  centerOnCoordinates(system.location);
  geoProjection.scale(initialScale);
}

export function centerOnCoordinates(coords: Coordinates) {
  geoProjection.rotate([-coords[0], -coords[1], 0]);
  rerender();
}

function rerenderUnthrottled() {
  if (!svg) return;

  drawGraticule();

  if (ENABLE_MESH) drawRegions();
  drawSystems();
  drawLanes();
}

export const rerender = debounce(rerenderUnthrottled, 16);

function drawSystems() {
  const currentScale = geoProjection.scale();
  const reducedSize = currentScale / initialScale < 1;

  let visibleSystems = state.world.systems;

  const player = thisPlayer();

  if (ENABLE_FOG_OF_WAR) {
    visibleSystems = visibleSystems.filter((system) =>
      player ? player.revealedSystems.has(system.id) : false
    );
  }

  const g = svg
    .selectAll('g#systems')
    .data([visibleSystems])
    .join((enter) => enter.append('g').attr('id', 'systems'))
    .classed('reduced-size', reducedSize);

  const join = g
    .selectAll('.system')
    .data(visibleSystems, (d) => (d as System).id)
    .join((enter) => {
      const group = enter
        .append('g')
        .attr('class', 'system')
        .attr('id', (d) => `system-${d.id}`)
        .on('click', (ev: PointerEvent, d: System) =>
          globalThis.gameManager.onSystemClick(ev, d)
        )
        .on('contextmenu', (ev: PointerEvent, d: System) => {
          ev.preventDefault();
          globalThis.gameManager.onSystemClick(ev, d);
        });

      group
        .append('circle')
        .attr('class', 'system-outline')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', SYSTEM_SIZE / 2);

      group
        .append('text')
        .attr('class', 'ship-count')
        .attr('y', -10)
        .attr('x', 0)
        .attr('text-anchor', 'start');

      group
        .append('text')
        .attr('class', 'system-icon')
        .attr('y', 0)
        .attr('x', 0)
        .attr('text-anchor', 'end');
      return group;
    });

  join
    .style(
      '--owner-color',
      (d) => state.playerMap.get(d.ownerId!)?.color ?? null
    )
    .classed('selected', (d) => state.selectedSystems.has(d.id))
    .classed('inhabited', (d) => d.type === SystemTypes.INHABITED)
    .classed('homeworld', (d) => !!d.homeworld && d.ownerId === d.homeworld)
    .classed('visited', (d) => player?.visitedSystems.has(d.id) ?? false)
    .classed(
      'hidden',
      (d) => !geoPathGenerator({ type: 'Point', coordinates: d.location })
    )
    .attr('transform', (d) => `translate(${geoProjection(d.location)})`);

  join.select('.system-icon').text((d) => {
    if (d.homeworld && d.ownerId === d.homeworld) return '✶';
    if (d.type === 'inhabited') return '✦';
    return '●'; // ⚬❍⊙⊛◉〇⦾◎⊚●⬤▲◯⍟✪★✦⭑✰✦✧✶
  });

  join.select('.ship-count').text((d) => {
    if (reducedSize) return '';
    const icon = d.type === SystemTypes.INHABITED ? '▴' : '';
    return icon + (d.ships ? d.ships.toString() : '');
  });
}

// Memoized features for regions
const getFeatures = (() => {
  let features: d3.ExtendedFeature[] = [];
  let systems: System[] = [];

  return () => {
    if (!features || systems !== state.world.systems) {
      systems = state.world.systems;
      features = mesh.polygons(systems).features;
    }
    return features!;
  };
})();

function drawRegions() {
  let features = getFeatures();

  const player = thisPlayer();

  if (ENABLE_FOG_OF_WAR) {
    features = features.filter((feature) => {
      const system = feature.properties?.site as System;
      return player ? player.visitedSystems.has(system.id) : false;
    });
  }

  const g = svg
    .selectAll('g#mesh')
    .data([features])
    .join((enter) => enter.append('g').attr('id', 'mesh'));

  const join = g
    .selectAll('path')
    .data(features, (d: any) => d.properties?.site.id)
    .join((enter: any) =>
      enter
        .append('path')
        .classed('region', true)
        .on('click', (ev: PointerEvent, d: System) =>
          globalThis.gameManager.onSystemClick(ev, d)
        )
        .on('contextmenu', (ev: PointerEvent, d: System) => {
          ev.preventDefault();
          globalThis.gameManager.onSystemClick(ev, d);
        })
    );

  join
    .attr('d', (d) => {
      const path = geoPathGenerator(d);
      return path; // ? smoothPath(path, { radius: 5 }) : path;
    })
    .datum((d: any) => d.properties.site as System)
    .style(
      '--owner-color',
      (d) => state.playerMap.get(d.ownerId!)?.color ?? null
    );
}

function drawLanes() {
  let visibleLanes = state.world.lanes;

  const playerId = state.thisPlayerId;
  const player = state.playerMap.get(playerId!);

  if (ENABLE_FOG_OF_WAR) {
    visibleLanes = visibleLanes.filter(
      (lane) =>
        !!player &&
        player.revealedSystems.has(lane.fromId) &&
        player.revealedSystems.has(lane.toId)
    );
  }

  const g = svg
    .selectAll('g#lanes')
    .data([null])
    .join((enter) => enter.append('g').attr('id', 'lanes'));

  g.selectAll('.lane')
    .data(visibleLanes, (d) => (d as Lane).id)
    .join((enter) =>
      enter
        .append('path')
        .attr('class', 'lane')
        .attr('fill', 'none')
        .attr('stroke-width', 2)
        .attr('stroke', 'orange')
        .attr('id', (_, i) => `lane-${i}`)
        .on('click', (ev: PointerEvent, d: Lane) =>
          globalThis.gameManager.onLaneClick(ev, d)
        )
        .on('contextmenu', (ev: PointerEvent, d: Lane) => {
          ev.preventDefault();
          globalThis.gameManager.onLaneClick(ev, d);
        })
    )
    .style('--owner-color', (d) => {
      const from = state.world.systemMap.get(d.fromId)!;
      if (!from.ownerId) return null;
      const to = state.world.systemMap.get(d.toId)!;
      if (!to.ownerId) return null;
      if (from.ownerId !== to.ownerId) return null;
      return state.playerMap.get(from.ownerId)?.color ?? null;
    })
    .attr('d', (d) => {
      const from = state.world.systemMap.get(d.fromId)!;
      const to = state.world.systemMap.get(d.toId)!;
      return geoPathGenerator({
        type: 'LineString',
        coordinates: [from.location, to.location]
      });
    });
}

import * as d3 from 'd3';

// @ts-ignore
import versor from 'versor';

import { HEIGHT, WIDTH } from './constants';
import { state } from './state';
import type { Coordinates, Lane, System } from './types';
import { onClickLane, onClickSystem } from './actions';

const ZOOM_SENSITIVITY = 0.5
const SYSTEM_SIZE = 20;

const projections = {
  'Orthographic': { fn: d3.geoOrthographic, clipAngle: 90, projectionHiding: true },
  'Stereographic': { fn: d3.geoStereographic, clipAngle: 180.1, projectionHiding: false },
  'Mercator': { fn: d3.geoMercator, clipAngle: 270, projectionHiding: false }
}

let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;

let width = WIDTH;
let height = HEIGHT;
let center = [width / 2, height / 2] satisfies [number, number];

const selectedProjectionType = projections['Stereographic'];

const geoProjection = selectedProjectionType.fn().translate(center).clipAngle(selectedProjectionType.clipAngle);
const initialScale = geoProjection.scale();
const geoPathGenerator = d3.geoPath().projection(geoProjection);

const SYSTEM_PROJECTION_HIDING = selectedProjectionType.projectionHiding;

export function drawMap() {
  d3.select('#app').select('svg').remove();

  svg = d3.select('#app')
    .append('svg')
    .attr('width', '100vw')
    .attr('height', '100vh')
    .on('contextmenu', (ev: PointerEvent) => ev.preventDefault());
    // .attr('width', width + 'px')
    // .attr('height', height + 'px')
    // .attr('viewBox', `0 0 ${width} ${height}`);

  width = parseInt(svg.style('width'));
  height = parseInt(svg.style('height'));
  center = [width / 2, height / 2] satisfies [number, number];
  geoProjection.translate(center);
  
  // if (SYSTEM_PROJECTION_HIDING) drawOutline();
  drawGraticule();

  svg.append('g').attr('id', 'lanes');
  svg.append('g').attr('id', 'systems');

  drawLanes();
  drawSystems();
  
  svg.call(createDrag() as any);
  svg.call(createZoom() as any);

  // function drawOutline() {
  //   const g = svg.append('g').attr('id', 'outline');

  //   // Set outline of the globe
  //   g.append('circle')
  //     .attr('id', 'globe')
  //     .attr('cx', width / 2)
  //     .attr('cy', height / 2)
  //     .attr('r', geoProjection.scale());
  // }

  function drawGraticule() {
    const g = svg.append('g').attr('id', 'graticule');
    const graticule = d3.geoGraticule();

    g.append('path')
      .datum(graticule)
      .attr('class', 'graticule')
      .attr('d', geoPathGenerator)
      .style('fill', 'none')
      .style('stroke', '#333');
  }

  function createDrag() {
    return drag()
      .on("drag.render", rerender)
      .on("end.render", rerender);
  }

  function createZoom(): d3.ZoomBehavior<Element, unknown> {
    return d3.zoom()
      .on('zoom', (event) => {
        if (event.transform.k > ZOOM_SENSITIVITY) {
          let newScale = initialScale * event.transform.k;
          geoProjection.scale(newScale);
          svg.selectAll('path.graticule').attr('d', geoPathGenerator as any);
          svg.selectAll('circle#globe').attr('d', geoPathGenerator as any);
          svg.selectAll('circle#globe').attr('r', geoProjection.scale());
          drawSystems();
          drawLanes();
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
        const x = d3.mean(t, p => p[0]);
        const y = d3.mean(t, p => p[1]);
        const a = Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0]);
        return [x, y, a];
      }

      return t[0];
    }

    function dragstarted({ x, y }: any) {
      v0 = versor.cartesian(geoProjection.invert!([x, y]));
      q0 = versor(r0 = geoProjection.rotate());
    }

    function dragged(this: any, event: any) {
      const v1 = versor.cartesian(geoProjection.rotate(r0).invert!([event.x, event.y]));
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

    return d3.drag()
      .filter((event) => {
        return (event.button === 1);
      })
      .on("start", dragstarted)
      .on("drag", dragged);
  }
}

export function centerOnSystem(system: System) {
  centerOnCoordinates(system.location);
  geoProjection.scale(initialScale);
}

export function centerOnCoordinates(coords: Coordinates) {
  geoProjection.rotate([-coords[0], -coords[1], 0]);
  rerender();
}

function rerenderUnthrottled() {
  svg.selectAll('path.graticule').attr('d', geoPathGenerator as any);
  svg.selectAll('circle#globe').attr('d', geoPathGenerator as any);
  svg.selectAll('circle#globe').attr('r', geoProjection.scale());

  drawSystems();
  drawLanes();
}

export const rerender = throttle(rerenderUnthrottled, 16);

function drawSystems() {
  const visibleSystems = state.systems.filter(system => system.isRevealed);

  const g = svg.select('g#systems');
  const markers = g.selectAll('.system')
    .data(visibleSystems, d => (d as System).id);

  const enter = markers.enter()
    .append('g')
    .attr('class', 'system')
    .attr('id', d => `system-${d.id}`)
    .attr('title', d => `System ${d.id}`)
    .on('click', (ev: PointerEvent, d: System) => onClickSystem(ev, d))
    .on('contextmenu', (ev: PointerEvent, d: System) => {
      ev.preventDefault();
      onClickSystem(ev, d);
    });

  enter.append('circle')
    .attr('class', 'hit-target')
    .attr('fill', 'transparent')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', SYSTEM_SIZE / 2);

  enter
    .append('circle')
    .attr('class', 'system-icon');

  enter.append('text')
    .attr('text-anchor', 'middle');

  const merge = enter.merge(markers as any);

  merge
    .attr('data-owner', d => d.owner != null ? d.owner.toString() : 'null')
    .classed('selected', d => d === state.selectedSystem)
    .classed('inhabited', d => d.isInhabited === true)
    .attr("transform", d => {
      const p = geoProjection(d.location);
      return `translate(${p![0]},${p![1]})`;
    });

  if (SYSTEM_PROJECTION_HIDING) {
    merge.style('display', d => {
      const gdistance = d3.geoDistance(d.location, geoProjection.invert!(center)!);
      return gdistance > 1.5 ? 'none' : null;
    });
  }

  merge.select('text')
    .attr('y', -10)
    .text(d => {
      const ships = d.ships ? d.ships.toString() : '';
      const home = (d.homeworld && d.owner === d.homeworld) ? '★' : '';
      return home + ships;
    });
}

function drawLanes() {
  const visibleLanes = state.lanes.filter(lane => lane.isRevealed);
  
  const g = d3.select('g#lanes');
  const pathSelection = g.selectAll('.lane')
    .data(visibleLanes, d => (d as Lane).id);

  const enter = pathSelection.enter()
    .append('path')
    .attr('class', 'lane')
    .attr('fill', 'none')
    .attr('stroke-width', 2)
    .attr('stroke', 'orange')
    .attr('id', (_, i) => `lane-${i}`)
    .on('click', (ev: PointerEvent, d: Lane) => onClickLane(ev, d))
    .on('contextmenu', (ev: PointerEvent, d: Lane) => {
      ev.preventDefault();
      onClickLane(ev, d);
    });
 
  const merge = pathSelection.merge(enter as any);

  merge
    .attr('data-owner', d => {
      return (d.from.owner != null && d.from.owner === d.to.owner) ? d.from.owner.toString() : null;
    })
    .attr('d', d => geoPathGenerator({ type: "LineString", coordinates: [d.from.location, d.to.location ] }));

  pathSelection.exit().remove();
}

function throttle<T extends unknown[]>(callback: (...args: T) => void, delay: number) {
  let isWaiting = false;
 
  return (...args: T) => {
    if (isWaiting) return;
 
    callback(...args);
    isWaiting = true;
 
    setTimeout(() => {
      isWaiting = false;
    }, delay);
  };
};
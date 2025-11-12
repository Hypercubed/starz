import * as d3 from 'd3';

import { state } from "./state";

export function createInfoBox() {
  d3.select('#infobox').remove();

  d3.select('#app')
    .append('div')
    .attr('id', 'infobox');
}

export function updateInfoBox() {
  const box = d3.select('#infobox');
  box.html(`Turn: ${~~(state.tick / 2)}${state.tick % 2 === 1 ? '.' : ''}`);
}

export function createLeaderbox() {
  d3.select('#leaderbox').remove();

  d3.select('#app')
    .append('div')
    .attr('id', 'leaderbox');
}


export function updateLeaderbox() {
  const box = d3.select('#leaderbox');

  const stats = [...state.playerStats].sort((a, b) => b.systems - a.systems || b.ships - a.ships);

  let html = '<tr><th>Player</th><th>Systems</th><th>Ships</th></tr>';
  stats.forEach(stat => {
    html += `<tr><td data-owner="${stat.player}">${stat.player}</td><td>${stat.systems}</td><td>${stat.ships}</td></tr>`;
  });
  html = `<table>${html}</table>`;
  
  box.html(html);
}

export function createMessageBox() {
  d3.select('#messagebox').remove();
  
  d3.select('#app')
    .append('div')
    .attr('id', 'messagebox');
}

export function updateMessageBox() {
  const box = d3.select('#messagebox');

  box.selectAll('div').data(state.messages.slice(-5), (d: any) => d.id).join(
    enter => enter.append('div').html(d => d.html),
    update => update.html(d => d.html),
    exit => exit.remove()
  );
}
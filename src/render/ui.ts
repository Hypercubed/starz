import * as d3 from 'd3';

import { state } from '../game/state.ts';

export function updateInfoBox() {
  const div = d3
    .select('#app')
    .selectAll('#infobox')
    .data([null])
    .join((enter) =>
      enter.append('div').attr('id', 'infobox').html('Turn: <span>0</span>')
    );

  div
    .select('span')
    .text(`${~~(state.tick / 2)}${state.tick % 2 === 1 ? '.' : ''}`);
}

export function updateLeaderbox() {
  const table = d3
    .select('#app')
    .selectAll('#leaderbox')
    .data([null])
    .join((enter) => {
      const table = enter.append('table').attr('id', 'leaderbox');
      table.html(
        '<thead><tr><th>Player</th><th>Systems</th><th>Ships</th></tr></thead><tbody></tbody>'
      );
      return table;
    });

  const stats = state.players.sort(
    (a, b) => b.stats.systems - a.stats.systems || b.stats.ships - a.stats.ships
  );

  const row = table
    .select('tbody')
    .selectAll('tr')
    .data(stats)
    .join('tr')
    .style('--owner-color', (d) => {
      return state.playerMap.get(d.id)?.color ?? null;
    })
    .attr('title', (d) => (d.bot ? d.bot.name : 'Human'));

  row
    .selectAll('td')
    .data((d) => [d.name, d.stats.systems, d.stats.ships])
    .join('td')
    .text((d) => d);
}

export function updateMessageBox() {
  const box = d3
    .select('#app')
    .selectAll('#messagebox')
    .data([null])
    .join((enter) => enter.append('div').attr('id', 'messagebox'));

  box
    .selectAll('div')
    .data(state.messages.slice(-5), (d: any) => d.id)
    .join('div')
    .html((d) => d.html);
}

export function setupDialogs() {
  const endDialog = document.getElementById('endDialog') as HTMLDialogElement;

  const restartButton = document.getElementById(
    'restartButton'
  ) as HTMLButtonElement;

  restartButton.addEventListener('click', () => {
    endDialog.close();
    window.gameManager.connect();
  });

  const helpButton = document.getElementById('helpButton') as HTMLButtonElement;
  helpButton.addEventListener('click', showHelp);
}

export function showHelp() {
  const helpDialog = document.getElementById('helpDialog') as HTMLDialogElement;
  helpDialog.showModal();
}

export function showEndGame(message: string) {
  const endDialog = document.getElementById('endDialog') as HTMLDialogElement;
  endDialog.showModal();
  endDialog.querySelector('p#endMessage')!.textContent = message;

  return new Promise<boolean>((resolve) => {
    endDialog.addEventListener('close', () => resolve(true));
    endDialog.addEventListener('cancel', () => resolve(false));
  });
}

export function showStartGame() {
  const startDialog = document.getElementById(
    'startDialog'
  ) as HTMLDialogElement;
  const startButton = document.getElementById(
    'startButton'
  ) as HTMLButtonElement;

  startDialog.showModal();
  startButton.addEventListener('click', () => {
    startDialog.close();
    window.gameManager.startGame();
  });

  return startDialog;
}

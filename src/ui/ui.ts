import * as d3 from 'd3';

export function updateInfoBox() {
  const state = globalThis.gameManager.getState();

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
  const state = globalThis.gameManager.getState();

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
    .attr('title', (d) => (d.bot ? d.bot.name : 'Human'))
    .classed('eliminated', (d) => !d.isAlive);

  row
    .selectAll('td')
    .data((d) => [d.name, d.stats.systems, d.stats.ships])
    .join('td')
    // eslint-disable-next-line no-irregular-whitespace
    .text((d) => ` ${d} `);
}

export function updateMessageBox() {
  const state = globalThis.gameManager.getState();

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
    globalThis.gameManager.connect();
  });

  const optionsButton = document.getElementById(
    'optionsButton'
  ) as HTMLButtonElement;

  optionsButton.addEventListener('click', openOptions);

  const helpButton = document.getElementById('helpButton') as HTMLButtonElement;
  helpButton.addEventListener('click', showHelp);
}

async function openOptions() {
  const ret = await showOptions();
  if (ret) {
    const form = document.getElementById('optionsForm') as HTMLFormElement;
    const formData = new FormData(form);

    const gameManager = globalThis.gameManager;

    gameManager.config.numBots = +formData.get('numBots')!;
    gameManager.config.playerName = formData.get('playerName') as string;
    gameManager.config.fow = formData.get('fow') === 'on';
    gameManager.config.numSystems = +formData.get('numSystems')!;
  }
}

function showOptions() {
  const optionsDialog = document.getElementById(
    'optionsDialog'
  ) as HTMLDialogElement;
  optionsDialog.showModal();

  return new Promise<boolean>((resolve) => {
    optionsDialog.addEventListener('close', () => resolve(true));
    optionsDialog.addEventListener('cancel', () => resolve(false));
  });
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
  startDialog.showModal();

  return new Promise<boolean>((resolve) => {
    startDialog.addEventListener('close', () => resolve(true));
    startDialog.addEventListener('cancel', () => resolve(false));
  });
}

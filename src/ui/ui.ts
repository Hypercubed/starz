import * as d3 from 'd3';

const formatSIInteger = d3.format('.3~s');

export function updateInfoBox() {
  const { C } = globalThis.gameManager.getContext();

  const div = d3
    .select('#app')
    .selectAll('#infobox')
    .data([null])
    .join((enter) =>
      enter.append('div').attr('id', 'infobox').html('Turn: <span>0</span>')
    );

  div.select('span').text(`${~~(C.tick / 2)}${C.tick % 2 === 1 ? '.' : ''}`);
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

  const players = Array.from(state.playerMap.values()); // TODO: optimize?
  const stats = players.sort(
    (a, b) => b.stats.systems - a.stats.systems || b.stats.ships - a.stats.ships
  );

  const row = table
    .select('tbody')
    .selectAll('tr')
    .data(stats, (d: any) => d.id)
    .join('tr')
    .style('--owner-color', (d) => {
      const player = state.playerMap.get(d.id);
      return player ? player.color : null;
    })
    .attr('title', (d) => (d.bot ? d.bot.name : 'Human'))
    .classed('eliminated', (d) => !d.isAlive);

  row
    .selectAll('td')
    .data((d) => [d.name, d.stats.systems, formatSIInteger(d.stats.ships)])
    .join('td')
    // eslint-disable-next-line no-irregular-whitespace
    .text((d) => ` ${d} `);
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

    const numBots = +formData.get('numBots')!;
    const playerName = formData.get('playerName') as string;
    const fow = formData.get('fow') === 'on';
    const numSystems = +formData.get('numSystems')!;

    gameManager.setConfig({
      numBots,
      playerName,
      fow,
      numSystems: 48 * 2 ** numSystems
    });
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

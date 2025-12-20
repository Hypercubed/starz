export function setupDialogs() {
  const optionsButton = document.getElementById(
    'optionsButton'
  ) as HTMLButtonElement;

  optionsButton?.addEventListener('click', openOptions);

  const helpButton = document.getElementById('helpButton') as HTMLButtonElement;
  helpButton.addEventListener('click', showHelp);
}

export async function openOptions() {
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

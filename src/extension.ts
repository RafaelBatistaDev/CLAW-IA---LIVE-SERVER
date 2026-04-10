import * as vscode from 'vscode';
import { LiveServer } from './server';

const liveServer = new LiveServer();
let statusBarItem: vscode.StatusBarItem;

// -------------------------------------------------------
// Lê as configurações em tempo real
// -------------------------------------------------------
function getConfig() {
  const cfg = vscode.workspace.getConfiguration('liveServer.settings');
  return {
    port:                cfg.get<number>('port', 5500),
    host:                cfg.get<string>('host', '127.0.0.1'),
    root:                cfg.get<string>('root', '/'),
    noBrowser:           cfg.get<boolean>('noBrowser', false),
    showStatusBarItem:   cfg.get<boolean>('showStatusBarItem', true),
    statusBarAlignment:  cfg.get<string>('statusBarAlignment', 'right'),
    statusBarPriority:   cfg.get<number>('statusBarPriority', 100),
  };
}

// -------------------------------------------------------
// Cria (ou recria) o item na Status Bar
// -------------------------------------------------------
function createStatusBarItem(context: vscode.ExtensionContext) {
  const { showStatusBarItem, statusBarAlignment, statusBarPriority } = getConfig();

  statusBarItem?.dispose();

  const alignment =
    statusBarAlignment === 'left'
      ? vscode.StatusBarAlignment.Left
      : vscode.StatusBarAlignment.Right;

  statusBarItem = vscode.window.createStatusBarItem(alignment, statusBarPriority);
  statusBarItem.command = 'claw.toggleServer';
  updateStatusBar(false);

  if (showStatusBarItem) {
    statusBarItem.show();
  }

  context.subscriptions.push(statusBarItem);
}

export function activate(context: vscode.ExtensionContext) {

  // 1. Status Bar
  createStatusBarItem(context);

  // 2. Toggle (Iniciar / Parar)
  const toggleServer = vscode.commands.registerCommand('claw.toggleServer', async () => {
    if (liveServer.isRunning()) {
      await liveServer.stop();
    } else {
      const uri = vscode.window.activeTextEditor?.document.uri;
      await liveServer.open(uri);
    }
    updateStatusBar(liveServer.isRunning());
  });

  // 3. Iniciar
  const startCmd = vscode.commands.registerCommand('claw.startServer', async () => {
    const uri = vscode.window.activeTextEditor?.document.uri;
    await liveServer.open(uri);
    updateStatusBar(liveServer.isRunning());
  });

  // 4. Parar
  const stopCmd = vscode.commands.registerCommand('claw.stopServer', async () => {
    await liveServer.stop();
    updateStatusBar(liveServer.isRunning());
  });

  // 5. Abrir no navegador externo
  const openExternal = vscode.commands.registerCommand('claw.openExternal', async () => {
    const uri = vscode.window.activeTextEditor?.document.uri;
    await liveServer.open(uri);
    updateStatusBar(liveServer.isRunning());
  });

  // 6. Mudar workspace (multi-root)
  const changeWorkspace = vscode.commands.registerCommand('claw.changeWorkspace', async () => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length <= 1) {
      vscode.window.showInformationMessage('CLAW: Apenas uma workspace detectada.');
      return;
    }
    const items = folders.map(f => ({ label: f.name, description: f.uri.fsPath, folder: f }));
    const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Selecione a workspace do CLAW' });
    if (picked) {
      await vscode.workspace.getConfiguration('liveServer.settings').update(
        'multiRootWorkspaceName', picked.folder.name, vscode.ConfigurationTarget.Workspace
      );
      vscode.window.showInformationMessage(`CLAW: Workspace definida para "${picked.folder.name}"`);
    }
  });

  // 7. Abrir configurações
  const showSettings = vscode.commands.registerCommand('claw.showSettings', () => {
    vscode.commands.executeCommand(
      'workbench.action.openSettings',
      '@ext:RafaelBatista.claw-ia-live-server'
    );
  });

  // 8. File watcher global para enviar reload ao salvar qualquer arquivo
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
  const notifyReload = async () => {
    if (liveServer.isRunning()) {
      liveServer.broadcastReload();
    }
  };
  fileWatcher.onDidChange(notifyReload);
  fileWatcher.onDidCreate(notifyReload);
  fileWatcher.onDidDelete(notifyReload);

  // 9. Recria a Status Bar se as configurações mudarem
  const onConfigChange = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('liveServer.settings')) {
      createStatusBarItem(context);
      updateStatusBar(liveServer.isRunning());
    }
  });

  context.subscriptions.push(
    toggleServer,
    startCmd,
    stopCmd,
    openExternal,
    changeWorkspace,
    showSettings,
    fileWatcher,
    onConfigChange,
  );
}

// -------------------------------------------------------
// Iniciar servidor
// -------------------------------------------------------
function openInternalPanel(host: string, port: number) {
  const panel = vscode.window.createWebviewPanel(
    'clawPreview',
    'CLAW Preview',
    vscode.ViewColumn.Two,
    { enableScripts: true }
  );

  panel.webview.html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><title>CLAW Preview</title></head>
    <body style="margin:0; padding:0;">
      <iframe
        src="http://${host}:${port}"
        style="width:100%; height:100vh; border:none;">
      </iframe>
    </body>
    </html>
  `;
}

// -------------------------------------------------------
// Atualiza visual da Status Bar
// -------------------------------------------------------
function updateStatusBar(running: boolean) {
  if (!statusBarItem) return;

  if (running) {
    const { host, port } = getConfig();
    statusBarItem.text = `$(primitive-square) CLAW: Stop`;
    statusBarItem.tooltip = `Servidor rodando em http://${host}:${port} — clique para parar`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  } else {
    statusBarItem.text = `$(play) CLAW: Start`;
    statusBarItem.tooltip = 'Clique para iniciar o Live Server';
    statusBarItem.backgroundColor = undefined;
  }
}

export function deactivate() {
  liveServer.stop();
}

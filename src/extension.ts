import * as vscode from 'vscode';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

let server: http.Server | undefined;
let statusBarItem: vscode.StatusBarItem;

// -------------------------------------------------------
// Lê as configurações do package.json em tempo real
// -------------------------------------------------------
function getConfig() {
  const cfg = vscode.workspace.getConfiguration('liveServer.settings');
  return {
    port:               cfg.get<number>('port', 5500),
    host:               cfg.get<string>('host', '127.0.0.1'),
    openBrowser:        cfg.get<boolean>('openBrowser', true),
    showStatusBarItem:  cfg.get<boolean>('showStatusBarItem', true),
    statusBarAlignment: cfg.get<string>('statusBarAlignment', 'right'),
    statusBarPriority:  cfg.get<number>('statusBarPriority', 100),
    root:               cfg.get<string>('root', '/'),
    noBrowser:          cfg.get<boolean>('noBrowser', false),
  };
}

// -------------------------------------------------------
// Cria (ou recria) o item na Status Bar conforme config
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
  const toggleServer = vscode.commands.registerCommand('claw.toggleServer', () => {
    if (server?.listening) {
      stopServer();
    } else {
      startServer();
    }
  });

  // 3. Iniciar diretamente
  const startCmd = vscode.commands.registerCommand('claw.startServer', () => {
    if (!server?.listening) startServer();
    else vscode.window.showInformationMessage('CLAW: Servidor já está rodando.');
  });

  // 4. Parar diretamente
  const stopCmd = vscode.commands.registerCommand('claw.stopServer', () => {
    if (server?.listening) stopServer();
    else vscode.window.showInformationMessage('CLAW: Nenhum servidor ativo.');
  });

  // 5. Abrir no navegador externo
  const openExternal = vscode.commands.registerCommand('claw.openExternal', () => {
    const { host, port } = getConfig();
    vscode.env.openExternal(vscode.Uri.parse(`http://${host}:${port}`));
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

  // 7. Abrir configurações da extensão
  const showSettings = vscode.commands.registerCommand('claw.showSettings', () => {
    vscode.commands.executeCommand(
      'workbench.action.openSettings',
      '@ext:RafaelBatista.claw-ia-live-server'
    );
  });

  // 8. Recria a Status Bar se as configurações mudarem
  const onConfigChange = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('liveServer.settings')) {
      createStatusBarItem(context);
      // Mantém o estado correto após recriar
      updateStatusBar(!!server?.listening);
    }
  });

  context.subscriptions.push(
    toggleServer,
    startCmd,
    stopCmd,
    openExternal,
    changeWorkspace,
    showSettings,
    onConfigChange,
  );
}

// -------------------------------------------------------
// Iniciar servidor
// -------------------------------------------------------
function startServer() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('CLAW: Abra uma pasta para iniciar o servidor.');
    return;
  }

  const { host, port, root, noBrowser } = getConfig();
  const rootPath = path.join(workspaceFolders[0].uri.fsPath, root);

  server = http.createServer((req, res) => {
    const filePath = path.join(rootPath, req.url === '/' ? 'index.html' : req.url!);

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Arquivo não encontrado no CLAW Server');
        return;
      }
      res.writeHead(200);
      res.end(content);
    });
  });

  server.listen(port, host, () => {
    updateStatusBar(true);
    vscode.window.showInformationMessage(`🟢 CLAW ativo em http://${host}:${port}`);

    if (!noBrowser) {
      openInternalPanel(host, port);
    }
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      vscode.window.showErrorMessage(`CLAW: Porta ${port} já está em uso. Mude em Configurações.`);
    } else {
      vscode.window.showErrorMessage(`CLAW: Erro ao iniciar servidor — ${err.message}`);
    }
    server = undefined;
    updateStatusBar(false);
  });
}

// -------------------------------------------------------
// Parar servidor
// -------------------------------------------------------
function stopServer() {
  if (server) {
    server.close(() => {
      vscode.window.showWarningMessage('🔴 Servidor CLAW parado.');
    });
    server = undefined;
    updateStatusBar(false);
  }
}

// -------------------------------------------------------
// Painel interno (Webview)
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
  stopServer();
}
import * as vscode from 'vscode';
import { LiveServer } from './server';
import path from 'path';

const liveServer = new LiveServer();
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

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
    fullReload:          cfg.get<boolean>('fullReload', false),
    cors:                cfg.get<boolean>('cors', false),
    useLocalIp:          cfg.get<boolean>('useLocalIp', false),
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
  // Criar output channel para logs
  outputChannel = vscode.window.createOutputChannel('CLAW IA Live Server');
  liveServer.setLogger(outputChannel);

  log('🚀 CLAW IA Live Server inicializado');
  log('📁 Workspace detectado: ' + (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'Nenhum'));
  log(`✅ Extensão ativa em: ${new Date().toLocaleTimeString()}`);

  // 1. Status Bar
  createStatusBarItem(context);

  // 2. Toggle (Iniciar / Parar)
  const toggleServer = vscode.commands.registerCommand('claw.toggleServer', async () => {
    try {
      if (liveServer.isRunning()) {
        log('⏹️  Parando servidor via toggle...');
        await liveServer.stop();
        // Aguardar pequeño delay para garantir limpeza
        await new Promise(resolve => setTimeout(resolve, 150));

        // Forçar atualização do UI com estado final
        updateStatusBar(false);
        vscode.window.showInformationMessage('⏸️  CLAW Live Server PAUSADO');
      } else {
        log('▶️  Iniciando servidor via toggle...');
        const uri = vscode.window.activeTextEditor?.document.uri;
        await liveServer.start(uri);
        // Aguardar pequeño delay para garantir boot
        await new Promise(resolve => setTimeout(resolve, 150));

        // Forçar atualização do UI com estado final
        updateStatusBar(true);
        vscode.window.showInformationMessage('▶️  CLAW Live Server ATIVO');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`❌ Erro ao alternar servidor: ${message}`);
      // Atualizar status com estado real atual
      updateStatusBar(liveServer.isRunning());
      vscode.window.showErrorMessage(`CLAW: Erro ao alternar - ${message}`);
    }
  });

  // 3. Iniciar (com retry automático em caso de conflito de porta)
  const startCmd = vscode.commands.registerCommand('claw.startServer', async () => {
    try {
      if (liveServer.isRunning()) {
        vscode.window.showWarningMessage('⚠️  CLAW Live Server já está rodando');
        return;
      }

      log('▶️  Iniciando servidor via comando...');
      const uri = vscode.window.activeTextEditor?.document.uri;

      try {
        await liveServer.start(uri);
        // Aguardar pequeño delay para garantir boot
        await new Promise(resolve => setTimeout(resolve, 150));
        updateStatusBar(true);
        vscode.window.showInformationMessage('✅ CLAW Live Server iniciado');
      } catch (err) {
        // Se falhar por conflito de porta, tenta fazer cleanup e retry
        log('⚠️  Tentativa inicial falhou, fazendo cleanup...');
        await liveServer.stop();

        // Aguarda um pouco para a porta ser liberada
        await new Promise(resolve => setTimeout(resolve, 500));

        log('🔄 Tentando iniciar novamente após cleanup...');
        await liveServer.start(uri);
        // Aguardar pequeño delay para garantir boot
        await new Promise(resolve => setTimeout(resolve, 150));
        updateStatusBar(true);
        vscode.window.showInformationMessage('✅ CLAW Live Server iniciado após cleanup');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`❌ Erro ao iniciar servidor: ${message}`);
      updateStatusBar(false);
      vscode.window.showErrorMessage(`CLAW: Erro ao iniciar - ${message}`);
    }
  });

  // 4. Parar
  const stopCmd = vscode.commands.registerCommand('claw.stopServer', async () => {
    try {
      if (liveServer.isRunning()) {
        log('⏹️  Parando servidor via comando...');
        await liveServer.stop();
        updateStatusBar(false);
        vscode.window.showInformationMessage('✅ CLAW Live Server parado');
      } else {
        vscode.window.showWarningMessage('⚠️  CLAW Live Server não está em execução');
        updateStatusBar(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`❌ Erro ao parar servidor: ${message}`);
      updateStatusBar(false);
      vscode.window.showErrorMessage(`CLAW: Erro ao parar - ${message}`);
    }
  });

  // 4.5 Força-reset (emergência)
  const forceStopCmd = vscode.commands.registerCommand('claw.forceStop', async () => {
    try {
      log('🚨 Executando Force Stop...');
      await liveServer.stop();
      // Aguardar para garantir que o cleanup foi completo
      await new Promise(resolve => setTimeout(resolve, 150));
      updateStatusBar(false);
      vscode.window.showInformationMessage('✅ Estado do CLAW resetado com sucesso!');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`❌ Erro em Force Stop: ${message}`);
      updateStatusBar(false);
      vscode.window.showErrorMessage(`CLAW Force Stop: ${message}`);
    }
  });

  // 5. Abrir no navegador externo
  const openExternal = vscode.commands.registerCommand('claw.openExternal', async () => {
    try {
      const uri = vscode.window.activeTextEditor?.document.uri;
      if (!liveServer.isRunning()) {
        await liveServer.start(uri);
      }
      await liveServer.open(uri);
      updateStatusBar(liveServer.isRunning());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`❌ Erro ao abrir navegador: ${message}`);
      vscode.window.showErrorMessage(`CLAW: Erro ao abrir navegador - ${message}`);
    }
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
      log(`📂 Workspace alterada para: ${picked.folder.name}`);
      await vscode.workspace.getConfiguration('liveServer.settings').update(
        'multiRootWorkspaceName', picked.folder.name, vscode.ConfigurationTarget.Workspace
      );
      vscode.window.showInformationMessage(`✅ CLAW: Workspace definida para "${picked.folder.name}"`);
    }
  });

  // 7. Abrir configurações
  const showSettings = vscode.commands.registerCommand('claw.showSettings', () => {
    vscode.commands.executeCommand(
      'workbench.action.openSettings',
      '@ext:RafaelBatista.claw-ia-live-server'
    );
  });

  // 8. Listener para salvamento de documentos (UNIVERSAL - Windows, Mac, Linux)
  // Este é o ÚNICO trigger confiável do VS Code. Mantemos só este.
  const onSaveDoc = vscode.workspace.onDidSaveTextDocument(doc => {
    if (liveServer.isRunning()) {
      const fileName = doc.fileName.split('\\').pop() || doc.fileName;
      const ext = doc.fileName.split('.').pop() || 'unknown';
      log(`💾 Arquivo salvo: ${fileName}`);
      log(`📄 Tipo: .${ext} | Caminho: ${doc.fileName}`);
      log(`🔔 Enviando sinal de reload para navegadores conectados...`);
      liveServer.broadcastReload(ext);
    } else {
      log(`⚠️  Arquivo salvo mas servidor não está rodando: ${doc.fileName}`);
    }
  });

  // 9. Recria a Status Bar se as configurações mudarem
  const onConfigChange = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('liveServer.settings')) {
      createStatusBarItem(context);
      updateStatusBar(liveServer.isRunning());
      log('⚙️  Configurações da extensão atualizadas');
    }
  });

  context.subscriptions.push(
    toggleServer,
    startCmd,
    stopCmd,
    forceStopCmd,
    openExternal,
    changeWorkspace,
    showSettings,
    onConfigChange,
    onSaveDoc,
    outputChannel,
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
// Logger helper
// -------------------------------------------------------
function log(message: string) {
  if (outputChannel) {
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
  }
  console.log(`[CLAW] ${message}`);
}

// -------------------------------------------------------
// Atualiza visual da Status Bar
// -------------------------------------------------------
function updateStatusBar(running: boolean) {
  if (!statusBarItem) return;

  if (running) {
    const { host, port } = getConfig();
    const serverUrl = `${host === '0.0.0.0' || host === 'localhost' ? '127.0.0.1' : host}:${port}`;
    statusBarItem.text = `$(stop-circle) CLAW: Running`;
    statusBarItem.tooltip = `📡 Server: http://${serverUrl} | Click to stop`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  } else {
    statusBarItem.text = `$(broadcast) CLAW: Offline`;
    statusBarItem.tooltip = '▶️  Click to start Live Server | Alt+L Alt+O';
    statusBarItem.backgroundColor = undefined;
  }
}

export function deactivate() {
  if (liveServer.isRunning()) {
    log('🛑 Desativando extensão - parando servidor');
    liveServer.stop();
  }
}

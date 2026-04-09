import * as vscode from 'vscode';
import { LiveServer } from './server';

let statusBarItem: vscode.StatusBarItem;
let currentPanel: vscode.WebviewPanel | undefined = undefined;
let liveServer: LiveServer;

export function activate(context: vscode.ExtensionContext) {
  // Inicializar o servidor
  liveServer = new LiveServer();

  // 1. Criar o item da Status Bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'claw.startServer';
  statusBarItem.text = `$(play) CLAW: Start`;
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 2. Comando para Iniciar Servidor (Webview Interno)
  let startServer = vscode.commands.registerCommand('claw.startServer', async () => {
    // Capturar informações do arquivo atual
    const editor = vscode.window.activeTextEditor;
    const langId = editor?.document.languageId || 'plaintext';
    const fileName = editor?.document.fileName.split('/').pop() || 'Unknown File';

    // Obter configurações do servidor
    const config = vscode.workspace.getConfiguration();
    const port = config.get<number>('liveServerPlusPlus.port', 5500);
    const host = config.get<string>('liveServerPlusPlus.host', 'localhost');
    const protocol = config.get<boolean>('liveServerPlusPlus.useHttps', false) ? 'https' : 'http';
    const serverUrl = `${protocol}://${host}:${port}`;

    // Iniciar o servidor local
    if (!liveServer.isRunning()) {
      await liveServer.start();
    }

    // Abrir ou mostrar o WebviewPanel
    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.Two);
    } else {
      currentPanel = vscode.window.createWebviewPanel(
        'clawPreview',
        `🚀 CLAW Preview: ${langId.toUpperCase()}`,
        vscode.ViewColumn.Two,
        { enableScripts: true }
      );

      // Mostrar o servidor local no iframe
      currentPanel.webview.html = getWebviewContent(serverUrl, langId, fileName);

      // Quando o painel é fechado
      currentPanel.onDidDispose(
        () => {
          currentPanel = undefined;
        },
        null,
        context.subscriptions
      );
    }

    // Atualizar Status Bar para modo "Stop"
    statusBarItem.text = `$(debug-stop) CLAW: Stop`;
    statusBarItem.command = 'claw.stopServer';
    vscode.window.showInformationMessage(`🚀 CLAW Server iniciado em ${serverUrl} | Detectado: ${langId} (${fileName})`);
  });

  // 3. Comando para Parar Servidor
  let stopServer = vscode.commands.registerCommand('claw.stopServer', async () => {
    // Fechar o WebviewPanel
    if (currentPanel) {
      currentPanel.dispose();
      currentPanel = undefined;
    }

    // Parar o servidor
    if (liveServer.isRunning()) {
      await liveServer.stop();
    }

    // Atualizar Status Bar para modo "Start"
    statusBarItem.text = `$(play) CLAW: Start`;
    statusBarItem.command = 'claw.startServer';
    vscode.window.showWarningMessage('⏹️ CLAW Server interrompido.');
  });

  // 4. Comando para Abrir no Navegador Externo
  let openExternal = vscode.commands.registerCommand('claw.openExternal', async () => {
    // Obter configurações do servidor
    const config = vscode.workspace.getConfiguration();
    const port = config.get<number>('liveServerPlusPlus.port', 5500);
    const host = config.get<string>('liveServerPlusPlus.host', 'localhost');
    const protocol = config.get<boolean>('liveServerPlusPlus.useHttps', false) ? 'https' : 'http';
    const url = `${protocol}://${host}:${port}`;

    // Iniciar servidor se não estiver rodando
    if (!liveServer.isRunning()) {
      await liveServer.start();
    }

    // Abrir no navegador padrão do SO
    await vscode.env.openExternal(vscode.Uri.parse(url));
    vscode.window.showInformationMessage(`🌐 Abrindo ${url} no navegador padrão...`);
  });

  context.subscriptions.push(startServer, stopServer, openExternal);
}

export function deactivate() {
  if (liveServer && liveServer.isRunning()) {
    liveServer.stop();
  }
  if (currentPanel) {
    currentPanel.dispose();
  }
}

function getWebviewContent(url: string, lang: string, fileName: string): string {
  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CLAW Local Server</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body, html {
            height: 100%;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            flex-wrap: wrap;
            gap: 12px;
        }
        
        .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .header h2 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
        }
        
        .header-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .header-info {
            font-size: 11px;
            opacity: 0.9;
            white-space: nowrap;
        }
        
        .content {
            flex: 1;
            overflow: hidden;
            background: #f5f5f5;
            position: relative;
        }
        
        iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        }
        
        .loading {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 16px;
            color: #666;
            background: white;
            z-index: 10;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <div>
                    <h2>🚀 CLAW Local Server</h2>
                </div>
                <div class="header-badge">${lang.toUpperCase()}</div>
            </div>
            <div class="header-info">
                <strong>Arquivo:</strong> ${fileName} | <strong>URL:</strong> ${url}
            </div>
        </div>
        <div class="content">
            <div class="loading">
                <div class="spinner"></div>
                <p>Carregando servidor...</p>
            </div>
            <iframe src="${url}" title="CLAW Local Server Preview"></iframe>
        </div>
    </div>
</body>
</html>`;
}

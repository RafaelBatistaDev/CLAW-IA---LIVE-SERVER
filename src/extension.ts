import * as vscode from 'vscode';
import { LiveServer } from './server';

let liveServer = new LiveServer();
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'liveServer.open';
  updateStatusBar();
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand('liveServer.open', async (uri?: vscode.Uri) => {
      await liveServer.open(uri);
      updateStatusBar();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('liveServer.openFile', async (uri?: vscode.Uri) => {
      await liveServer.open(uri);
      updateStatusBar();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('liveServer.start', async () => {
      await liveServer.start();
      updateStatusBar();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('liveServer.stop', async () => {
      await liveServer.stop();
      updateStatusBar();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('liveServer.toggle', async () => {
      if (liveServer.isRunning()) {
        await liveServer.stop();
      } else {
        await liveServer.open();
      }
      updateStatusBar();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('liveServer.openSettings', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'liveServerPlusPlus');
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => updateStatusBar())
  );
}

export function deactivate() {
  liveServer.stop();
}

function updateStatusBar() {
  if (liveServer.isRunning()) {
    statusBarItem.text = '$(rocket) CLAW IA - LIVE SERVER: Running';
    statusBarItem.tooltip = 'Click to open the current file in CLAW IA - LIVE SERVER';
  } else {
    statusBarItem.text = '$(debug-start) CLAW IA - LIVE SERVER';
    statusBarItem.tooltip = 'Click to start CLAW IA - LIVE SERVER';
  }
}

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const server_1 = require("./server");
let liveServer = new server_1.LiveServer();
let statusBarItem;
function activate(context) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'liveServer.open';
    updateStatusBar();
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(vscode.commands.registerCommand('liveServer.open', async (uri) => {
        await liveServer.open(uri);
        updateStatusBar();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('liveServer.openFile', async (uri) => {
        await liveServer.open(uri);
        updateStatusBar();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('liveServer.start', async () => {
        await liveServer.start();
        updateStatusBar();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('liveServer.stop', async () => {
        await liveServer.stop();
        updateStatusBar();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('liveServer.toggle', async () => {
        if (liveServer.isRunning()) {
            await liveServer.stop();
        }
        else {
            await liveServer.open();
        }
        updateStatusBar();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('liveServer.openSettings', async () => {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'liveServerPlusPlus');
    }));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => updateStatusBar()));
}
exports.activate = activate;
function deactivate() {
    liveServer.stop();
}
exports.deactivate = deactivate;
function updateStatusBar() {
    if (liveServer.isRunning()) {
        statusBarItem.text = '$(rocket) CLAW IA - LIVE SERVER: Running';
        statusBarItem.tooltip = 'Click to open the current file in CLAW IA - LIVE SERVER';
    }
    else {
        statusBarItem.text = '$(debug-start) CLAW IA - LIVE SERVER';
        statusBarItem.tooltip = 'Click to start CLAW IA - LIVE SERVER';
    }
}
//# sourceMappingURL=extension.js.map
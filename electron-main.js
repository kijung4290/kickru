const path = require("path");
const { app, BrowserWindow, shell } = require("electron");
const { startServer } = require("./server");

let mainWindow = null;
let httpServer = null;

async function createWindow() {
  const { server, port } = await startServer(0);
  httpServer = server;

  mainWindow = new BrowserWindow({
    width: 1120,
    height: 840,
    minWidth: 420,
    minHeight: 640,
    title: "벤치에서 발롱까지 : 선수 & 감독 에디션",
    icon: path.join(__dirname, "icons", "app.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (httpServer) {
    try {
      httpServer.close();
    } catch {}
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

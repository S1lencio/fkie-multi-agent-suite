import { IShutdownManager, ShutdownManagerEvents } from "@/types";
import { app, BrowserWindow, ipcMain } from "electron";
import log from "electron-log";

/**
 * Class ShutdownManager: Handles termination of the app
 */
class ShutdownManager implements IShutdownManager {
  mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.registerHandlers();
  }

  public registerHandlers: () => void = () => {
    ipcMain.handle(ShutdownManagerEvents.quitGui, this.quitGui);
  };

  public sendTerminateSubprocesses: () => void = () => {
    this.mainWindow?.webContents.send(ShutdownManagerEvents.terminateSubprocesses);
  };

  /**
   * Destroy main window and quit the electron app
   */
  public quitGui = (): void => {
    log.info("Quitting GUI...");
    this.mainWindow?.destroy();
    app.quit();
  };
}

export default ShutdownManager;

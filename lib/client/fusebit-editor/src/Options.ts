/**
 * Editor options that control its presentation and behavior. Default values are represented by the [[EditorOptions]] class.
 *
 * This is the synopsis of the defaults:
 *
 * ```javascript
 * {
 *    actionPanel: {
 *      enableCodeOnlyToggle: true,
 *      enableFullScreen: true,
 *      enableClose: true,
 *    },
 *    editorPanel: {},
 *    logsPanel: {
 *      maxSize: 10 * 1024,
 *    },
 *    navigationPanel: {
 *      hideCode: false,
 *      hideFiles: [],
 *      hideApplicationSettings: false,
 *      hideCronSettings: false,
 *      hideRunnerTool: false
 *    },
 *    statusPanel: {},
 * }
 * ```
 */
export interface IEditorOptions {
  /**
   * Options of the action panel of the editor. If set to `false`, hides the action panel.
   */
  actionPanel?: IActionPanelOptions | boolean;
  /**
   * Options of the panel containing the actual code editor. If set to `false`, hides the editor panel.
   */
  editorPanel?: IEditorPanelOptions | boolean;
  /**
   * Options of the logs panel. If set to `false`, hides the logs panel.
   */
  logsPanel?: ILogsPanelOptions | boolean;
  /**
   * Options of the navigation panel. If set to `false`, hides the navigation panel.
   */
  navigationPanel?: INavigationPanelOptions | boolean;
  /**
   * Options of the status panel. If set to `false`, hides the status panel.
   */
  statusPanel?: IStatusPanelOptions | boolean;
  [property: string]: any;
}

/**
 * Default values for the [[IEditorPanel]].
 */
export class EditorOptions implements IEditorOptions {
  public actionPanel = new ActionPanelOptions();
  public editorPanel = new EditorPanelOptions();
  public logsPanel = new LogsPanelOptions();
  public navigationPanel = new NavigationPanelOptions();
  public statusPanel = new StatusPanelOptions();
  [property: string]: any;
}

/**
 * Options of the action panel of the editor. Default values are represented by the [[ActionPanelOptions]] class.
 */
export interface IActionPanelOptions {
  /**
   * Enables or disables the button that allows the editor to enter the "Zen" mode showing just the code editor.
   */
  enableCodeOnlyToggle?: boolean;
  /**
   * Enables or disables the button that allows the editor to switch to and from the full screen mode.
   */
  enableFullScreen?: boolean;
  /**
   * Enables or disables the "close" button of the editor. The "close" button facilitates the use of the editor in a context of a modal view.
   */
  enableClose?: boolean;
  [property: string]: any;
}

/**
 * Default values for the [[IActionPanelOptions]].
 */
export class ActionPanelOptions implements IActionPanelOptions {
  public enableCodeOnlyToggle: boolean = true;
  public enableFullScreen: boolean = true;
  public enableClose: boolean = true;
  constructor() {
    // do nothing
  }
}

/**
 * Options of the editor panel that hosts the code editor. At present there are none, but check back soon.
 */
export interface IEditorPanelOptions {
  [property: string]: any;
}

/**
 * Default values for the [[IEditorPanelOptions]].
 */
export class EditorPanelOptions implements IEditorPanelOptions {}

/**
 * Options of the logs panel. Default values are represented by the [[LogsPanelOptions]] class.
 */
export interface ILogsPanelOptions {
  /**
   * Maximum number of characters that the logs panel shows. If that nunber is exceededm, older logs are discarded.
   */
  maxSize?: number;
  [property: string]: any;
}

/**
 * Default values for the [[ILogsPanelOptions]].
 */
export class LogsPanelOptions implements ILogsPanelOptions {
  public maxSize: number = 10 * 1024;
  constructor() {
    // do nothing
  }
}

/**
 * Options of the navigation panel. Default values are represented by the [[NavigationPanelOptions]] class.
 */
export interface INavigationPanelOptions {
  /**
   * Hides the node of the navigation that shows the list of files making up the function.
   */
  hideCode?: boolean;
  /**
   * A list of files present in the function specification which should not be shown in the navigation panel.
   */
  hideFiles?: string[];
  /**
   * Not in MVP
   * @ignore
   */
  hideComputeSettings?: boolean;
  /**
   * Hides the Application Settings node.
   */
  hideApplicationSettings?: boolean;
  /**
   * Hides the Scheduler settings node.
   */
  hideCronSettings?: boolean;
  /**
   * Hides the Runner node.
   */
  hideRunnerTool?: boolean;
  [property: string]: any;
}

/**
 * Default values for the [[INavigationPanelOptions]].
 */
export class NavigationPanelOptions implements INavigationPanelOptions {
  public hideCode = false;
  public hideFiles = [];
  /**
   * Not in MVP
   * @ignore
   */
  public hideComputeSettings = true; // hide Compute settings by default
  public hideApplicationSettings = false;
  public hideCronSettings = false;
  public hideRunnerTool = false;
  constructor() {
    // do nothing
  }
}

/**
 * Options of the status panel. At present there are none, but check back soon.
 */
export interface IStatusPanelOptions {
  [property: string]: any;
}

/**
 * Default values for the [[IStatusPanelOptions]].
 */
export class StatusPanelOptions implements IStatusPanelOptions {}
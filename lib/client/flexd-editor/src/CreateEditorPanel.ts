import * as Assert from 'assert';
import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import { Events, FileDeletedEvent } from './Events';
import { IEditorPanelOptions } from './Options';
import { EditorContext } from './EditorContext';

/**
 * Not part of MVP
 * @ignore
 * @param element
 * @param editorContext
 * @param options
 */
export function createEditorPanel(element: HTMLElement, editorContext: EditorContext, options?: IEditorPanelOptions) {
  Monaco.editor.defineTheme('customTheme', {
    base: 'vs', // can also be vs-dark or hc-black
    inherit: true, // can also be false to completely replace the builtin rules
    rules: [],
    colors: {
      // 'editor.background': '#212F3C',
      'scrollbar.shadow': '#ffffff',
      'editor.lineHighlightBackground': '#f7f9f9',
    },
  });

  const monacoOptions = {
    theme: 'customTheme',
    ...options,
    value: editorContext.getSelectedFileContent(),
    language: editorContext.getSelectedFileLanguage(),
    automaticLayout: true,
    minimap: {
      enabled: false,
    },
  };

  const editor = Monaco.editor.create(element, monacoOptions);
  let suppressNextChangeEvent: boolean;
  let activeCategory: Events = Events.FileSelected;

  // When a file is selected in the editor context, update editor content and language
  editorContext.on(Events.FileSelected, () => {
    suppressNextChangeEvent = true;
    activeCategory = Events.FileSelected;
    editor.setValue(editorContext.getSelectedFileContent() || '');
    const model = editor.getModel();
    const language = editorContext.getSelectedFileLanguage();
    if (model && language) {
      Monaco.editor.setModelLanguage(model, language);
    } else {
      Assert.fail('Model or language cannot be determined for the selected file.');
    }
    $(element).show();
  });

  // When the edited file is deleted, hide the editor
  editorContext.on(Events.FileDeleted, (e: FileDeletedEvent) => {
    if (editorContext.selectedFileName === e.fileName) {
      $(element).hide();
    }
  });

  // When runner is selected in the editor context, update editor content and language
  editorContext.on(Events.RunnerSelected, () => {
    suppressNextChangeEvent = true;
    activeCategory = Events.RunnerSelected;
    editor.setValue(editorContext.getRunnerContent());
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'javascript');
    } else {
      Assert.fail('Model cannot be determined the runner script.');
    }
    $(element).show();
  });

  // When compute settings are selected, serialize them and display as INI for editing
  editorContext.on(Events.SettingsComputeSelected, _ => {
    suppressNextChangeEvent = true;
    activeCategory = Events.SettingsComputeSelected;
    editor.setValue(editorContext.getComputeSettings());
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for compute node.');
    }
    $(element).show();
  });

  // When application settings are selected, serialize them and display as INI for editing
  editorContext.on(Events.SettingsApplicationSelected, () => {
    suppressNextChangeEvent = true;
    activeCategory = Events.SettingsApplicationSelected;
    editor.setValue(editorContext.getApplicationSettings());
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for app settings node.');
    }
    $(element).show();
  });

  // When cron settings are selected, serialize them and display as INI for editing
  editorContext.on(Events.SettingsCronSelected, () => {
    suppressNextChangeEvent = true;
    activeCategory = Events.SettingsCronSelected;
    editor.setValue(editorContext.getCronSettings());
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for CRON settings node.');
    }
    $(element).show();
  });

  editor.onDidChangeModelContent(() => {
    if (!suppressNextChangeEvent) {
      switch (activeCategory) {
        case Events.FileSelected:
          editorContext.setSelectedFileContent(editor.getValue());
          break;
        case Events.RunnerSelected:
          editorContext.setRunnerContent(editor.getValue());
          break;
        case Events.SettingsComputeSelected:
          editorContext.setSettingsCompute(editor.getValue());
          break;
        case Events.SettingsApplicationSelected:
          editorContext.setSettingsApplication(editor.getValue());
          break;
        case Events.SettingsCronSelected:
          editorContext.setSettingsCron(editor.getValue());
          break;
      }
    } else {
      suppressNextChangeEvent = false;
    }
  });

  return editorContext;
}
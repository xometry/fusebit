import * as Events from './Events';
import { ILogsPanelOptions, LogsPanelOptions } from './Options';
import { EditorContext } from './EditorContext';

/**
 * Not part of MVP
 * @ignore
 * @param element
 * @param editorContext
 * @param options
 */
export function createLogsPanel(element: HTMLElement, editorContext: EditorContext, options?: ILogsPanelOptions) {
  const id = `fusebit-logs-${Math.floor(99999999 * Math.random()).toString(26)}`;
  $(element).html(
    `<div class="fusebit-logs" id="${id}"><pre class="fusebit-logs-content" id="${id}-content"></pre></div>`
  );
  const $content = $(`#${id}-content`);
  const $container = $(`#${id}`);

  const defaultOptions = new LogsPanelOptions();
  const effectiveOptions = {
    ...defaultOptions,
    ...options,
  };

  editorContext.on(Events.Events.LogsAttached, e => {
    // append('Server logs attached');
  });

  editorContext.on(Events.Events.LogsDetached, (e: Events.LogsDetachedEvent) => {
    // append(e.error ? e.error.message : 'Server logs detached');
    if (e && e.error) {
      append(e.error.message);
    }
  });

  editorContext.on(Events.Events.LogsEntry, (e: Events.LogsEntryEvent) => {
    try {
      const json = JSON.parse(e.data);
      append(`SERVER ${json.level === 30 ? 'STDOUT' : 'STDERR'}: ${json.msg}`);
    } catch (_) {
      // do nothing
    }
  });

  editorContext.on(Events.Events.BuildStarted, (e: Events.BuildStartedEvent) => {
    append(`BUILD: starting build of ${editorContext.boundaryId}/${editorContext.functionId}...`);
  });

  editorContext.on(Events.Events.BuildProgress, (e: Events.BuildProgressEvent) => {
    append(`BUILD ${e.status.id}: progress ${Math.floor((e.status.progress || 0) * 100)}% (${e.status.status})`);
  });

  editorContext.on(Events.Events.BuildFinished, (e: Events.BuildFinishedEvent) => {
    if (e.status.id) {
      append(
        `BUILD ${e.status.id}: progress ${Math.floor((e.status.progress || 0) * 100)}% (${e.status.status}) ${e.status
          .location || JSON.stringify(e.status.error, null, 2)}`
      );
    } else {
      append(`BUILD: success (no changes) ${e.status.location || JSON.stringify(e.status.error, null, 2)}`);
    }
  });

  editorContext.on(Events.Events.BuildError, (e: Events.BuildErrorEvent) => {
    append(`BUILD: error ${e.error.message}`);
  });

  editorContext.on(Events.Events.RunnerStarted, (e: Events.RunnerStartedEvent) => {
    append(`RUN: calling ${e.url}`);
  });

  editorContext.on(Events.Events.RunnerFinished, (e: Events.RunnerFinishedEvent) => {
    let response: any = e.response;

    // Show response immediately if real time logs were disabled, otherwise delay showing response
    // to allow for logs to be pulled.

    let requestUrl = response && response.req && response.req.url;
    let tokens = requestUrl.split('?');
    tokens.shift();
    let requestQuery = tokens.join('?');
    let logsEnabled = requestQuery.indexOf('x-fx-logs') > -1 || response.req.header['x-fx-logs'] !== undefined;
    if (logsEnabled) {
      setTimeout(showResponse, 1500);
    } else {
      showResponse();
    }

    function showResponse() {
      if (e.error) {
        response = response || (e.error as any).response;
        if (!response) {
          return append(`RUN: error ${(e.error as any).stack || e.error}`);
        }
      }
      if (!response) {
        return;
      }
      const lines: string[] = [`RUN: finished`, `HTTP ${response.statusCode}`];
      for (const h in response.headers) {
        if (h !== 'x-fx-logs') {
          lines.push(`${h}: ${response.headers[h]}`);
        }
      }
      if ((response.headers['content-type'] || '').match(/application\/json/)) {
        try {
          response.text = JSON.stringify(JSON.parse(response.text), null, 2);
        } catch (_) {}
      }
      if (response.text) {
        if (response.text.length > 2048) {
          response.text = response.text.substring(0, 2048);
          lines.push(`\n${response.text}...`, `...response body truncated to 2KB`);
        } else {
          lines.push(`\n${response.text}`);
        }
      }
      append(lines.join('\n'));
      const logs = response.headers['x-fx-logs'];
      if (logs) {
        let logsStr: string | undefined = logs.toString();
        try {
          logsStr = atob(logsStr as string);
        } catch (_) {
          logsStr = undefined;
        }
        if (logsStr) {
          if (logsStr.indexOf('\n') > -1) {
            append(`RUN: server logs\n${logsStr}`);
          } else {
            append(`RUN: ${logsStr}`);
          }
        }
      }
      if (!logsEnabled) {
        append(
          'NOTE: logging was disabled for the last request. To enable, add x-fx-logs=1 query parameter to the test request.'
        );
      }
    }
  });

  function append(line: string) {
    const annotatedLine = `[${new Date().toLocaleTimeString()}] ${line}\n`;
    let newContent = $content.text() + annotatedLine;
    if (newContent.length > effectiveOptions.maxSize) {
      newContent = newContent.substring(newContent.length - effectiveOptions.maxSize);
    }
    $content.text(newContent);
    setTimeout(() => ($container[0].scrollTop = $container[0].scrollHeight), 100);
  }
}
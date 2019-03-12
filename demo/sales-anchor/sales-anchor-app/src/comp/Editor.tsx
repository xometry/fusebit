import { createEditor, EditorContext } from 'q5'; // tslint:disable-line
import React, { useContext, useLayoutEffect, useRef } from 'react';
import styled from 'styled-components';
import { ApiContext } from './ApiContext';

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.div`
  display: flex;
  width: 700px;
  background-color: #e5e7e9;
  margin: 0px auto;
  color: #34495e;
  font-family: 'Roboto', san-serif;
  font-size: 14px;
  padding: 10px;
`;

const BackButton = styled.div`
  font-size: 18px;
  &:hover {
    color: white;
    cursor: pointer;
  }
`;

const Title = styled.div`
  flex: 1;
  padding-top: 3px;
  text-align: center;
  margin-left: -10px;
`;

const EditorContainer = styled.div`
  margin-top: -2px;
  width: 700px;
  height: 400px;
  margin: 0px auto;
`;

// --------------
// Exported Types
// --------------

export type EditorProps = {
  eventAction: string;
  onEditorBack: () => void;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Editor({ eventAction, onEditorBack, ...rest }: EditorProps) {
  const editorElement = useRef(null);
  const api = useContext(ApiContext);

  async function loadEditor() {
    const config = await api.getEditorConfig();

    if (editorElement && editorElement.current) {
      createEditor(editorElement.current, config.boundaryId, eventAction, async () => await api.getEditorConfig(), {
        template: {},
        editor: {
          navigationPanel: {
            //   hideFiles: ['index.js'],
          },
        },
        // @ts-ignore
      }).then(editorContext => {
        // editorContext.selectFile('onNewInquiry.js');
        editorContext.on('closed', onEditorBack);
      });
    }
  }

  useLayoutEffect(() => {
    loadEditor();
  }, [eventAction]);

  return (
    <Container {...rest}>
      {/* <TopBar>
        <BackButton onClick={() => onEditorBack()}>
          <TiArrowBack />
        </BackButton>
        <Title>Event: On New Inquiry</Title>
      </TopBar> */}
      <EditorContainer id="editor" ref={editorElement} />;
    </Container>
  );
}

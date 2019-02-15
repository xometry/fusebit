import React, { useState, useLayoutEffect, useRef, MutableRefObject } from 'react';
import styled from 'styled-components';
import { Server, Workspace, createEditor } from 'q5';
import { TiArrowBack } from 'react-icons/ti';

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

  async function loadEditor() {
    const server = Server.create({
      baseUrl: 'http://localhost:3001',
      token: 'p17',
    });

    const options = {
      statusPanel: false,
    };

    const workspace = await server.loadWorkspace('myboundary', 'myfunction', new Workspace(), options);
    if (editorElement && editorElement.current) {
      createEditor(editorElement.current, workspace, server);
      workspace.on('closed', onEditorBack);
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

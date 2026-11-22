import React, { Suspense } from "react";
import { EditorPanel, EditorPanelPlaceholder } from "components/EditorPanel";
import { Header } from "components/Header";
import { useUndoRedoShortcuts } from "hooks/useUndoRedoShortcuts";
import { StyledHomeContainer } from "styles/components/Common";
import { StyledEditorLayout } from "styles/components/StyledEditorLayout";

const LazyEditorCanvas = React.lazy(() => import("container/EditorCanvas"));

export const Home = () => {
  useUndoRedoShortcuts();
  return (
    <StyledHomeContainer>
      <Header />
      <StyledEditorLayout>
        <EditorPanel title="Hierarchy" area="hierarchy">
          <EditorPanelPlaceholder />
        </EditorPanel>
        <EditorPanel title="Scene" area="scene" scrollable={false}>
          <Suspense fallback={<div>ローディング中...</div>}>
            <LazyEditorCanvas />
          </Suspense>
        </EditorPanel>
        <EditorPanel title="Inspector" area="inspector">
          <EditorPanelPlaceholder />
        </EditorPanel>
        <EditorPanel title="Project" area="project">
          <EditorPanelPlaceholder />
        </EditorPanel>
      </StyledEditorLayout>
    </StyledHomeContainer>
  );
};

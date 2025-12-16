import React, { Suspense } from "react";
import { Header } from "../components/Header";
//import { EditorCanvas } from "../container/EditorCanvas";
import { StyledHomeContainer } from "../styles/components/Common";
const LazyEditorCanvas = React.lazy(() => import("../container/EditorCanvas"));

export const Home = () => {
  return (
    <StyledHomeContainer>
      <Header />
      <Suspense fallback={<div>ローディング中...</div>}>
        <LazyEditorCanvas />
      </Suspense>
    </StyledHomeContainer>
  );
};

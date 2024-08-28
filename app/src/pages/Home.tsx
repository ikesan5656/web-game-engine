import { Header } from "../components/Header";
import { EditorCanvas } from "../container/EditorCanvas";
import { StyledHomeContainer } from "../styles/components/Common";

export const Home = () => {
  return (
    <StyledHomeContainer>
      <Header />
      <EditorCanvas />
    </StyledHomeContainer>
  );
};

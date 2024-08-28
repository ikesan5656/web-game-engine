import { StyledHeader } from "../styles/components/StyledHeader";

export const Header = () => {
  return (
    <StyledHeader>
      <nav>
        <ul className="nav-links">
          <li>Home</li>
          <li>Menu</li>
        </ul>
      </nav>
    </StyledHeader>
  );
};

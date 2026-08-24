import NavBar from "./NavBar";

function PageLayout({ children }) {
  return (
    <div>
      <NavBar />
      <main>{children}</main>
    </div>
  );
}

export default PageLayout;
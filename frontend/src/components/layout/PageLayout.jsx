import NavBar from "./NavBar";

function PageLayout({ children, fullWidth = false }) {
  return (
    <div className="app-layout">
      <NavBar />
      <main className={`app-main${fullWidth ? " app-main--full" : ""}`}>
        {children}
      </main>
    </div>
  );
}

export default PageLayout;

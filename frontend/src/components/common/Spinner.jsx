function Spinner({ size }) {
  return <div className={`spinner${size === "sm" ? " spinner--sm" : ""}`} />;
}

export default Spinner;

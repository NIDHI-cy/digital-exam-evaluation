function Badge({ status }) {
  const label = status.replace("_", " ");
  return <span className={`badge badge--${status}`}>{label}</span>;
}

export default Badge;

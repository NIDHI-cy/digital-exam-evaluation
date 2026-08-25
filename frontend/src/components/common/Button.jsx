function Button({ children, variant = "primary", size, className = "", ...props }) {
  const classes = [
    "btn",
    `btn--${variant}`,
    size ? `btn--${size}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

export default Button;

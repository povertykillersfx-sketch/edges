export function Mascot({ live, src, alt }) {
  return (
    <div className={`figure ${live ? "is-live" : ""} ${src ? "" : "is-logo"}`}>
      <img className="portrait" src={src || "/edgex-logo.png"} alt={alt || ""} />
    </div>
  );
}

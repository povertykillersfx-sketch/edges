export function Mascot({ live, src, alt }) {
  return (
    <div className={`figure ${live ? "is-live" : ""}`}>
      <img className="portrait" src={src || "/edgex-robot.jpg"} alt={alt || ""} />
    </div>
  );
}

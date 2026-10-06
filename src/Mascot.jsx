export function Mascot({ live }) {
  return (
    <div className={`figure ${live ? "is-live" : ""}`}>
      <img className="portrait" src="/edgex-robot.jpg" alt="" />
    </div>
  );
}

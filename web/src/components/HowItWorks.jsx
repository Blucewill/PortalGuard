import { CONTRACTS } from "../config.js";

const STEPS = [
  {
    n: "01",
    title: "Cap every permission",
    text: "Instead of an unlimited approval, give each app a fixed amount. A malicious app can never take more than its cap.",
  },
  {
    n: "02",
    title: "Let it expire",
    text: "Every permission has an end date. Forgotten approvals stop working on their own, so nobody can use them weeks later.",
  },
  {
    n: "03",
    title: "Pull the plug",
    text: "One lockdown transaction cancels every permission you have ever given through PortalGuard, instantly.",
  },
];

export default function HowItWorks() {
  const deployed = Boolean(CONTRACTS.safeApprove);
  return (
    <section className="section how" id="how">
      <div className="section-head">
        <p className="eyebrow">How it works</p>
        <h2>Approvals that <span className="fade">protect you.</span></h2>
        <p className="lede">
          Normal token approvals are unlimited and never expire. That is the door drainers walk through.
          PortalGuard's SafeApprove contract closes it.
        </p>
      </div>
      <ol className="steps">
        {STEPS.map((s) => (
          <li key={s.n} className="step">
            <span className="step-n">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
      <p className="deploy-note">
        <i className={deployed ? "dot live" : "dot"} />
        {deployed ? `SafeApprove live on Portaldot at ${CONTRACTS.safeApprove}` : "SafeApprove contract: deploying to Portaldot testnet soon"}
      </p>
    </section>
  );
}

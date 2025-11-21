import { LaunchpadProject } from "@/types";
import { Lock, ShieldCheck } from "lucide-react";
import { FC } from "react";
import { useVerification } from "@/context/VerificationContext";

interface ProjectDetailsProps {
  project: LaunchpadProject;
  isVerified: boolean;
}

export const ProjectDetails: FC<ProjectDetailsProps> = ({ project, isVerified }) => {
  const { openPrompt } = useVerification();

  return (
    <div className="project-details">
      <header>
        <img src={project.logo} alt={project.name} width={72} height={72} />
        <div>
          <p className="eyebrow">{project.category}</p>
          <h2>{project.name}</h2>
          <p>{project.publicInfo.summary}</p>
          <div className="stats">
            <div>
              <span>Target Raise</span>
              <strong>{project.publicInfo.targetRaise}</strong>
            </div>
            <div>
              <span>Chain</span>
              <strong>{project.publicInfo.chain}</strong>
            </div>
          </div>
        </div>
      </header>

      <section className={`intel ${isVerified ? "intel--unlocked" : "intel--locked"}`}>
        <div className="intel__header">
          <ShieldCheck size={20} />
          <span>Alpha Intel</span>
        </div>
        <div className="intel__grid">
          <div>
            <p className="label">Tokenomics</p>
            <p>{project.gatedInfo.tokenomics}</p>
          </div>
          <div>
            <p className="label">Alpha Insight</p>
            <p>{project.gatedInfo.alphaInsight}</p>
          </div>
          <div>
            <p className="label">Lead Investors</p>
            <p>{project.gatedInfo.investors.join(", ")}</p>
          </div>
          <div>
            <p className="label">Roadmap</p>
            <ul>
              {project.gatedInfo.roadmap.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong> — {item.detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {!isVerified && (
          <div className="intel__overlay">
            <Lock size={20} />
            <p>Verify with SUIrify to unveil investor-grade intelligence.</p>
            <button onClick={() => openPrompt()}>Get Verified</button>
          </div>
        )}
      </section>
      <style>{`
        .project-details {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 28px;
          padding: 32px;
        }
        header {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        header img {
          border-radius: 20px;
        }
        h2 {
          margin: 4px 0 8px;
        }
        .eyebrow {
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #38bdf8;
          font-size: 0.75rem;
        }
        .stats {
          margin-top: 12px;
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        .stats span {
          font-size: 0.8rem;
          color: rgba(148, 163, 184, 0.9);
        }
        .intel {
          position: relative;
          margin-top: 32px;
          padding: 24px;
          border-radius: 24px;
          border: 1px solid rgba(56, 189, 248, 0.2);
          overflow: hidden;
        }
        .intel--locked {
          filter: blur(0.5px);
        }
        .intel__header {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.7rem;
          color: #38bdf8;
          margin-bottom: 16px;
        }
        .intel__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .label {
          font-size: 0.8rem;
          color: rgba(148, 163, 184, 0.9);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .intel__overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          justify-content: center;
          background: rgba(2, 6, 23, 0.85);
          text-align: center;
          padding: 20px;
        }
        .intel__overlay button {
          border-radius: 999px;
          padding: 10px 16px;
          border: none;
          background: #38bdf8;
          color: #020617;
          font-weight: 600;
          cursor: pointer;
        }
        ul {
          padding-left: 20px;
          margin: 8px 0 0;
        }
        li {
          margin-bottom: 6px;
        }
      `}</style>
    </div>
  );
};

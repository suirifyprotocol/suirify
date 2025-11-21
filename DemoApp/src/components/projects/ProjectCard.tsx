import type { LaunchpadProject } from "@/types";
import { Lock } from "lucide-react";
import { FC } from "react";

interface ProjectCardProps {
  project: LaunchpadProject;
  selected: boolean;
  isVerified: boolean;
  onSelect: () => void;
}

export const ProjectCard: FC<ProjectCardProps> = ({ project, selected, isVerified, onSelect }) => {
  return (
    <button className={`project-card ${selected ? "project-card--selected" : ""}`} onClick={onSelect}>
      <div className="project-card__header">
        <img src={project.logo} alt={project.name} width={48} height={48} />
        <div>
          <p className="project-card__category">{project.category}</p>
          <h3>{project.name}</h3>
        </div>
      </div>
      <p className="project-card__teaser">{project.teaser}</p>
      <div className="project-card__tags">
        {project.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      {!isVerified && (
        <div className="project-card__lock">
          <Lock size={18} />
          <span>Verify to unlock full access</span>
        </div>
      )}
      <style>{`
        .project-card {
          width: 100%;
          text-align: left;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          padding: 20px;
          color: inherit;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.2s;
        }
        .project-card--selected {
          border-color: #38bdf8;
          box-shadow: 0 20px 40px rgba(56, 189, 248, 0.12);
        }
        .project-card__header {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .project-card__header img {
          border-radius: 12px;
        }
        .project-card__category {
          text-transform: uppercase;
          font-size: 0.7rem;
          color: rgba(248, 250, 252, 0.7);
          letter-spacing: 0.2em;
          margin-bottom: 4px;
        }
        .project-card h3 {
          margin: 0;
          font-size: 1.1rem;
        }
        .project-card__teaser {
          margin: 16px 0;
          color: rgba(226, 232, 240, 0.85);
          min-height: 48px;
        }
        .project-card__tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .project-card__tags span {
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 0.75rem;
          background: rgba(30, 64, 175, 0.35);
        }
        .project-card__lock {
          margin-top: 16px;
          display: inline-flex;
          gap: 8px;
          align-items: center;
          font-size: 0.85rem;
          color: #fcd34d;
        }
      `}</style>
    </button>
  );
};

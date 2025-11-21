import { useMemo, useState } from "react";
import { projects } from "@/data/projects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectDetails } from "@/components/projects/ProjectDetails";
import { InteractionPanel } from "@/components/interactions/InteractionPanel";
import { useVerification } from "@/context/VerificationContext";
import { joinAllowlist, submitVote, submitComment, claimTokens } from "@/lib/suirifyApi";
import { useGatedAction } from "@/hooks/useGatedAction";
import type { ProjectComment } from "@/types";

const statusCopy: Record<string, string> = {
  idle: "Connect your Sui wallet to begin",
  loading: "Checking SUIrify attestation...",
  verified: "Verified - ready to build",
  unverified: "Not verified yet",
  error: "Unable to reach SUIrify"
};

const VERIFY_URL = "https://devnet.suirify.com";

const HomePage = () => {
  const { status, isVerified, walletAddress, refresh, openPrompt } = useVerification();
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? "");

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedId) ?? projects[0];
  }, [selectedId]);

  const [allowlistState, setAllowlistState] = useState<Record<string, boolean>>({});
  const [voteState, setVoteState] = useState<Record<string, "support" | "pass" | null>>({});
  const [claimState, setClaimState] = useState<Record<string, string | null>>({});
  const [commentState, setCommentState] = useState<Record<string, ProjectComment[]>>({});

  const allowlistAction = useGatedAction(joinAllowlist);
  const voteAction = useGatedAction(submitVote);
  const commentAction = useGatedAction(submitComment);
  const claimAction = useGatedAction(claimTokens);

  const handleAllowlisted = () => {
    if (!selectedProject) return;
    setAllowlistState((prev) => ({ ...prev, [selectedProject.id]: true }));
  };

  const handleVoted = (choice: "support" | "pass") => {
    if (!selectedProject) return;
    setVoteState((prev) => ({ ...prev, [selectedProject.id]: choice }));
  };

  const handleComment = (body: string, id?: string) => {
    if (!selectedProject || !walletAddress) return;
    const newEntry: ProjectComment = {
      id: id ?? crypto.randomUUID(),
      author: walletAddress,
      body,
      timestamp: new Date().toISOString()
    };
    setCommentState((prev) => ({
      ...prev,
      [selectedProject.id]: [newEntry, ...(prev[selectedProject.id] ?? [])]
    }));
  };

  const handleClaimed = (hash: string) => {
    if (!selectedProject) return;
    setClaimState((prev) => ({ ...prev, [selectedProject.id]: hash }));
  };

  if (!selectedProject) {
    return (
      <div className="empty-state">
        <p>No projects configured.</p>
      </div>
    );
  }

  const comments = commentState[selectedProject.id] ?? [];

  return (
    <div className="home">
      <section className="hero">
        <div>
          <p className="hero__eyebrow">Compliance-Ready Deal Flow</p>
          <h2>Launch verified-only rounds in minutes.</h2>
          <p>
            Use SUIrify attestations to unlock pre-launch data rooms, allowlists, and token claims. Investors verify once
            and access everything.
          </p>
          <div className="hero__actions">
            <button onClick={() => openPrompt("Get verified with SUIrify to unlock the launchpad.")}>Get Verified</button>
            <button className="ghost" onClick={() => refresh()}>
              Re-check Status
            </button>
          </div>
          <p className="hero__hint">Tip: wallets ending in 777 or address 0xVerifiedLaunchpad pass the mock verifier.</p>
        </div>
        <div className="hero__status">
          <p>Verification Status</p>
          <strong>{statusCopy[status] ?? status}</strong>
          {status === "unverified" && (
            <a href={VERIFY_URL} target="_blank" rel="noreferrer">
              Go to SUIrify Portal
            </a>
          )}
        </div>
      </section>

      <section className="projects">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            selected={project.id === selectedProject.id}
            isVerified={isVerified}
            onSelect={() => setSelectedId(project.id)}
          />
        ))}
      </section>

      <section className="detail-grid">
        <ProjectDetails project={selectedProject} isVerified={isVerified} />
        <InteractionPanel
          projectId={selectedProject.id}
          allowlisted={!!allowlistState[selectedProject.id]}
          allowlistAction={allowlistAction}
          onAllowlisted={handleAllowlisted}
          voteChoice={voteState[selectedProject.id] ?? null}
          voteAction={voteAction}
          onVoted={handleVoted}
          comments={comments}
          commentAction={commentAction}
          onCommentSubmitted={handleComment}
          claimHash={claimState[selectedProject.id] ?? null}
          claimAction={claimAction}
          onClaimed={handleClaimed}
          isVerified={isVerified}
        />
      </section>

      <style>{`
        .home {
          display: flex;
          flex-direction: column;
          gap: 32px;
          margin-top: 32px;
        }
        .hero {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(56, 189, 248, 0.2);
          border-radius: 32px;
          padding: 32px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
        }
        .hero__eyebrow {
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #38bdf8;
          font-size: 0.75rem;
        }
        .hero__actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 16px;
        }
        .hero__actions button {
          border-radius: 999px;
          border: none;
          padding: 12px 20px;
          font-weight: 600;
          cursor: pointer;
        }
        .hero__actions button:first-of-type {
          background: linear-gradient(90deg, #22d3ee, #3b82f6);
          color: #020617;
        }
        .hero__actions .ghost {
          background: transparent;
          border: 1px solid rgba(148, 163, 184, 0.4);
          color: #e2e8f0;
        }
        .hero__status {
          border-radius: 24px;
          background: rgba(2, 6, 23, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.2);
          padding: 24px;
        }
        .hero__status strong {
          display: block;
          margin-top: 8px;
          font-size: 1.2rem;
        }
        .hero__status a {
          display: inline-flex;
          margin-top: 16px;
          color: #38bdf8;
          text-decoration: none;
        }
        .hero__hint {
          font-size: 0.85rem;
          color: rgba(148, 163, 184, 0.9);
          margin-top: 12px;
        }
        .projects {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1.2fr);
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;

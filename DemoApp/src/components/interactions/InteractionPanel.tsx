import { GatedActionState } from "@/hooks/useGatedAction";
import { ProjectComment } from "@/types";
import { CheckCircle2, MessageCircle, ThumbsDown, ThumbsUp, Trophy, Users } from "lucide-react";
import { FC, useState } from "react";

interface InteractionPanelProps {
  projectId: string;
  allowlisted: boolean;
  allowlistAction: GatedActionState<{ success: boolean }>;
  onAllowlisted: () => void;
  voteChoice: "support" | "pass" | null;
  voteAction: GatedActionState<{ success: boolean }>;
  onVoted: (choice: "support" | "pass") => void;
  comments: ProjectComment[];
  commentAction: GatedActionState<{ success: boolean; id: string }>; // id used for UI only
  onCommentSubmitted: (comment: string, id?: string) => void;
  claimHash: string | null;
  claimAction: GatedActionState<{ success: boolean; txHash: string }>;
  onClaimed: (hash: string) => void;
  isVerified: boolean;
}

export const InteractionPanel: FC<InteractionPanelProps> = ({
  projectId,
  allowlisted,
  allowlistAction,
  onAllowlisted,
  voteChoice,
  voteAction,
  onVoted,
  comments,
  commentAction,
  onCommentSubmitted,
  claimHash,
  claimAction,
  onClaimed,
  isVerified
}) => {
  const [commentInput, setCommentInput] = useState("");

  const handleAllowlist = async () => {
    const res = await allowlistAction.run(projectId);
    if (res?.success) onAllowlisted();
  };

  const handleVote = async (choice: "support" | "pass") => {
    const res = await voteAction.run(projectId, choice);
    if (res?.success) onVoted(choice);
  };

  const handleComment = async () => {
    if (!commentInput.trim()) return;
    const res = await commentAction.run(projectId, commentInput.trim());
    if (res?.success) {
      onCommentSubmitted(commentInput.trim(), res.id);
      setCommentInput("");
    }
  };

  const handleClaim = async () => {
    const res = await claimAction.run(projectId);
    if (res?.success && res.txHash) {
      onClaimed(res.txHash);
    }
  };

  return (
    <div className="interaction-panel">
      <section>
        <header>
          <Users size={18} />
          <div>
            <h4>Join Allowlist</h4>
            <p>Reserved for SUIrify verified wallets.</p>
          </div>
        </header>
        <button disabled={allowlisted || allowlistAction.isLoading} onClick={handleAllowlist}>
          {allowlisted ? "Allowlist Joined" : allowlistAction.isLoading ? "Joining..." : "Join Allowlist"}
        </button>
        {allowlistAction.error && <p className="error">{allowlistAction.error}</p>}
      </section>

      <section>
        <header>
          <ThumbsUp size={18} />
          <div>
            <h4>Vote</h4>
            <p>Signal support or pass.</p>
          </div>
        </header>
        <div className="vote-buttons">
          <button
            className={voteChoice === "support" ? "active" : ""}
            onClick={() => handleVote("support")}
            disabled={voteAction.isLoading}
          >
            <ThumbsUp size={16} /> Support
          </button>
          <button
            className={voteChoice === "pass" ? "active" : ""}
            onClick={() => handleVote("pass")}
            disabled={voteAction.isLoading}
          >
            <ThumbsDown size={16} /> Not Interested
          </button>
        </div>
        {voteAction.error && <p className="error">{voteAction.error}</p>}
      </section>

      <section>
        <header>
          <MessageCircle size={18} />
          <div>
            <h4>Comments</h4>
            <p>Only verified wallets can contribute.</p>
          </div>
        </header>
        <textarea
          placeholder={isVerified ? "Share your thoughts" : "Connect & verify to comment"}
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          disabled={commentAction.isLoading}
        />
        <button onClick={handleComment} disabled={commentAction.isLoading}>
          {commentAction.isLoading ? "Submitting..." : "Submit Comment"}
        </button>
        {commentAction.error && <p className="error">{commentAction.error}</p>}
        <div className="comment-list">
          {comments.length === 0 ? (
            <p className="empty">No comments yet.</p>
          ) : (
            comments.map((comment) => {
              const shortAuthor =
                comment.author.length > 12
                  ? `${comment.author.slice(0, 6)}...${comment.author.slice(-4)}`
                  : comment.author;
              return (
                <div key={comment.id} className="comment">
                  <div className="comment__meta">
                    <strong>{shortAuthor}</strong>
                    <span>{new Date(comment.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p>{comment.body}</p>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section>
        <header>
          <Trophy size={18} />
          <div>
            <h4>Claim Tokens (Simulated)</h4>
            <p>Requires verification; no on-chain write.</p>
          </div>
        </header>
        <button onClick={handleClaim} disabled={claimAction.isLoading}>
          {claimAction.isLoading ? "Processing..." : "Claim"}
        </button>
        {claimAction.error && <p className="error">{claimAction.error}</p>}
        {claimHash && (
          <p className="success">
            <CheckCircle2 size={16} /> Claim simulated with tx hash {claimHash}
          </p>
        )}
      </section>

      <style>{`
        .interaction-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        section {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 24px;
          padding: 20px;
        }
        header {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
        }
        h4 {
          margin: 0;
        }
        button {
          border-radius: 999px;
          padding: 10px 16px;
          border: none;
          background: linear-gradient(90deg, #0ea5e9, #6366f1);
          color: white;
          font-weight: 600;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        textarea {
          width: 100%;
          min-height: 90px;
          margin-bottom: 12px;
          background: rgba(2, 6, 23, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          padding: 12px;
          color: inherit;
          resize: vertical;
          font-family: inherit;
        }
        .vote-buttons {
          display: flex;
          gap: 12px;
        }
        .vote-buttons button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid transparent;
        }
        .vote-buttons button.active {
          border-color: #22d3ee;
        }
        .error {
          color: #fca5a5;
          font-size: 0.85rem;
          margin-top: 8px;
        }
        .success {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          color: #4ade80;
          font-size: 0.85rem;
          margin-top: 10px;
        }
        .comment-list {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .comment {
          padding: 12px;
          border-radius: 16px;
          background: rgba(2, 6, 23, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }
        .comment__meta {
          display: flex;
          gap: 8px;
          align-items: baseline;
        }
        .comment__meta strong {
          font-size: 0.9rem;
        }
        .comment__meta span {
          font-size: 0.7rem;
          color: rgba(148, 163, 184, 0.8);
        }
        .comment p {
          margin: 8px 0 0;
        }
        .empty {
          font-size: 0.85rem;
          color: rgba(148, 163, 184, 0.8);
        }
      `}</style>
    </div>
  );
};

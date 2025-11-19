import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ConnectButton, useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import LoadingSpinner from "../ui/LoadingSpinner";
import { STRUCT_ATTESTATION, explorer } from "@/lib/config";
import { fetchAttestation, type AttestationSummary } from "@/lib/apiService";
import type { AttestationLike } from "@/types/attestation";
import { calculateDaysUntilExpiry } from "@/lib/identityUtils";
import { useVerificationUI } from "@/modules/verification/context/VerificationUIContext";
import suiLogo from "@/assets/suilogo.png";
import "./dashboard.css";
import backgroundImage from "@/assets/attestationbg.png";
import homeIcon from "@/assets/home.png";
import upgradeIcon from "@/assets/upgrade.png";
import renewIcon from "@/assets/renew.png";
import consentIcon from "@/assets/manage.png";
import NoAttestation from "@/modules/verification/dashboard/NoAttestation";
import { useNavigate } from "react-router-dom";

const getInitialWidth = () => (typeof window !== "undefined" ? window.innerWidth : 1440);

const formatDate = (ms?: string | number | null) => {
  if (ms === undefined || ms === null) return "—";
  const value = typeof ms === "string" ? parseInt(ms, 10) : Number(ms);
  if (Number.isNaN(value)) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
};

const truncate = (value?: string, lead = 6, tail = 4) => {
  if (!value) return "—";
  if (value.length <= lead + tail + 3) return value;
  return `${value.slice(0, lead)}...${value.slice(-tail)}`;
};

const STATUS_CODE_TO_LABEL: Record<number, string> = {
  1: "Active",
  2: "Expired",
  3: "Revoked",
};

const normalizeStatusLabel = (value: unknown): string => {
  if (value === null || value === undefined) return "Active";
  if (typeof value === "number") {
    return STATUS_CODE_TO_LABEL[value] || `Code ${value}`;
  }
  const str = String(value).trim();
  if (!str) return "Active";
  const upper = str.toUpperCase();
  if (upper === "ACTIVE") return "Active";
  if (upper === "EXPIRED") return "Expired";
  if (upper === "REVOKED") return "Revoked";
  return str;
};

const Dashboard: React.FC = () => {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { setImmersive } = useVerificationUI();
  const navigate = useNavigate();
  const [attestation, setAttestation] = useState<AttestationLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(getInitialWidth);

  const sidebarActions = [
    { label: "Upgrade to L2", action: () => (window.location.href = "/upgrade"), icon: upgradeIcon },
    { label: "Renew Verification", action: () => (window.location.href = "/renew"), icon: renewIcon },
    { label: "Manage Consent", action: () => (window.location.href = "/consent"), icon: consentIcon },
  ];

  const isDesktop = viewportWidth >= 1024;

  const handleMainInteraction = useCallback(() => {
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [sidebarOpen]);

  const shouldShowNoAttestation = useMemo(() => !account?.address || !attestation, [account?.address, attestation]);

  useEffect(() => {
    if (shouldShowNoAttestation) {
      return () => undefined;
    }

    const body = typeof document !== "undefined" ? document.body : null;
    if (!body) return;

    body.classList.add("dashboard-body");
    setImmersive(true);

    return () => {
      body.classList.remove("dashboard-body");
      setImmersive(false);
    };
  }, [setImmersive, shouldShowNoAttestation]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isDesktop && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isDesktop, sidebarOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (!isDesktop && sidebarOpen) {
      body.style.overflow = "hidden";
    } else if (body.style.overflow === "hidden") {
      body.style.overflow = "";
    }
    return () => {
      if (body.style.overflow === "hidden") {
        body.style.overflow = "";
      }
    };
  }, [isDesktop, sidebarOpen]);

  useEffect(() => {
    const mapBackendAttestation = (data: AttestationSummary | null): AttestationLike | null => {
      if (!data) return null;
      const issueMs = data.issueDate ? Date.parse(data.issueDate) : null;
      const expiryMs = data.expiryDate ? Date.parse(data.expiryDate) : null;
      return {
        data: {
          objectId: data.objectId,
          content: {
            fields: {
              verification_level: data.verificationLevel,
              issue_time_ms: issueMs ?? null,
              expiry_time_ms: expiryMs ?? null,
              status: (data.status || "ACTIVE").toUpperCase(),
              is_human_verified: true,
              is_over_18: true,
            },
          },
        },
      };
    };

    const run = async () => {
      if (!account?.address) {
        setAttestation(null);
        setLoading(false);
        return;
      }

      let backendHasAttestation = false;

      try {
        const fallback = await fetchAttestation(account.address);
        if (fallback.hasAttestation && fallback.data) {
          setAttestation(mapBackendAttestation(fallback.data));
          backendHasAttestation = true;
          setLoading(false);
        }
      } catch {
        // Backend lookup is best-effort; defer to chain data next.
      }

      try {
        const attestations = await client.getOwnedObjects({
          owner: account.address,
          filter: { StructType: STRUCT_ATTESTATION },
          options: { showContent: true },
        });

        if (attestations.data.length > 0) {
          const first = attestations.data[0];
          if (first && !first.error) {
            setAttestation(first as AttestationLike);
            backendHasAttestation = true;
            setLoading(false);
          } else if (!backendHasAttestation) {
            setAttestation(null);
          }
        } else if (!backendHasAttestation) {
          setAttestation(null);
        }
      } catch {
        if (!backendHasAttestation) {
          try {
            const fallback = await fetchAttestation(account.address);
            if (fallback.hasAttestation && fallback.data) {
              setAttestation(mapBackendAttestation(fallback.data));
              backendHasAttestation = true;
              setLoading(false);
            } else {
              setAttestation(null);
            }
          } catch {
            setAttestation(null);
          }
        }
      } finally {
        if (!backendHasAttestation) {
          setLoading(false);
        }
      }
    };

    run();
  }, [account?.address, client]);

  if (loading) {
    return (
      <div className="sd-loading">
        <LoadingSpinner message="Loading your dashboard..." />
      </div>
    );
  }

  if (shouldShowNoAttestation) {
    return <NoAttestation onVerify={() => navigate("/verify")} />;
  }

  const fields = attestation?.data?.content?.fields || attestation?.content?.fields || {};
  const status = normalizeStatusLabel(fields.status || "ACTIVE").toUpperCase();
  const level = fields.verification_level ?? 1;
  const issueDate = formatDate(fields.issue_time_ms);
  const expiryDays = fields.expiry_time_ms ? calculateDaysUntilExpiry(fields.expiry_time_ms) : null;
  const expiryText = typeof expiryDays === "number" ? `${expiryDays} Days` : "—";
  const objectId = attestation?.data?.objectId || attestation?.objectId || "";
  const attestationLink = objectId ? explorer.object(objectId) : null;
  const isHuman = fields.is_human_verified !== false;
  const isAdult = fields.is_over_18 === true;

  const shellClassName = ["sd-shell", sidebarOpen && isDesktop ? "sd-shell--sidebar-open" : ""].filter(Boolean).join(" ");
  const sidebarClassName = ["sd-sidebar", sidebarOpen ? "sd-sidebar--open" : ""].join(" ");
  const showOverlay = sidebarOpen && !isDesktop;

  return (
    <div className={shellClassName} style={{ backgroundImage: `url(${backgroundImage})` }}>
      <aside className={sidebarClassName}>
        <div className="sd-sidebar-inner">
          <nav className="sd-sidebar-list sd-sidebar-list--home">
            <button
              className="sd-sidebar-link"
              onClick={() => {
                setSidebarOpen(false);
                window.location.href = "/";
              }}
              aria-label="Return to dashboard home"
            >
              <span className="sd-sidebar-link__content">
                <img src={homeIcon} alt="" aria-hidden="true" className="sd-sidebar-icon" />
                <span>Home</span>
              </span>
            </button>
          </nav>

          <div className="sd-sidebar-section">
            <p className="sd-sidebar-title">Quick Actions</p>
            <nav className="sd-sidebar-list">
              {sidebarActions.map((item) => (
                <button
                  key={item.label}
                  className="sd-sidebar-link"
                  onClick={() => {
                    setSidebarOpen(false);
                    item.action();
                  }}
                >
                  <span className="sd-sidebar-link__content">
                    <img src={item.icon} alt="" aria-hidden="true" className="sd-sidebar-icon" />
                    <span>{item.label}</span>
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      {showOverlay && <div className="sd-sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      <main className="sd-main" onClickCapture={handleMainInteraction}>
        <div className="sd-top-bar">
          <button
            className="sd-hamburger"
            onClick={(event) => {
              event.stopPropagation();
              setSidebarOpen((prev) => !prev);
            }}
            aria-label="Toggle quick actions menu"
            aria-expanded={sidebarOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <img src={suiLogo} alt="Suirify" className="sd-logo" />

          <ConnectButton
            className="sd-connect-btn"
            connectText="Connect wallet"
            style={{
              backgroundColor: "hsla(166, 100%, 93%, 1)",
              color: "hsla(229, 19%, 22%, 1)",
            }}
          />
        </div>

        <section className="sd-status-banner">
          <p className="sd-eyebrow">Your digital identity is</p>
          <h1>
            <span className="sd-status-label">{status}</span>
          </h1>
          <p className="sd-address">{truncate(account?.address)}</p>
        </section>

        <section className="sd-card-grid">
          <article className="sd-card sd-card--expires">
            <p className="sd-card-label">Expires in</p>
            <div className="sd-exp-circle">
              <span>{expiryText}</span>
            </div>
          </article>

          <article className="sd-card">
            <p className="sd-card-label">Issued date</p>
            <h3 className="sd-card-value">{issueDate}</h3>
          </article>

          <article className="sd-card sd-card--badge">
            <p className="sd-card-label">Human verified</p>
            <div className={`sd-badge ${isHuman ? "sd-badge--success" : "sd-badge--danger"}`}>
              <span aria-hidden="true">{isHuman ? "✔" : "✕"}</span>
            </div>
          </article>

          <article className="sd-card">
            <p className="sd-card-label">Verification level</p>
            <h3 className="sd-card-value sd-card-value--xl">L{level}</h3>
          </article>

          <article className="sd-card">
            <p className="sd-card-label">Attestation ID</p>
            <h3 className="sd-card-value">
              {attestationLink ? (
                <a
                  href={attestationLink}
                  target="_blank"
                  rel="noreferrer"
                  className="sd-card-link"
                  title="View attestation on Sui Explorer"
                >
                  {truncate(objectId, 6, 6)}
                  <span aria-hidden="true" className="sd-card-link__icon">
                    ↗
                  </span>
                </a>
              ) : (
                truncate(objectId, 6, 6)
              )}
            </h3>
          </article>

          <article className="sd-card sd-card--badge">
            <p className="sd-card-label">Above 18 years old</p>
            <div className={`sd-badge ${isAdult ? "sd-badge--success" : "sd-badge--danger"}`}>
              <span aria-hidden="true">{isAdult ? "✔" : "!"}</span>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;

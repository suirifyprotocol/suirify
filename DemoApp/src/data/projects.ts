import type { LaunchpadProject } from "@/types";

export const projects: LaunchpadProject[] = [
  {
    id: "nova-defi",
    name: "Nova DeFi Network",
    teaser: "Cross-chain liquidity routing for institutional desks",
    category: "DeFi",
    logo: "https://dummyimage.com/80x80/1d4ed8/ffffff&text=N",
    tags: ["DeFi", "Liquidity", "Institutional"],
    publicInfo: {
      summary:
        "Nova routes liquidity across multiple Sui-native venues, offering enterprise-grade compliance hooks and real-time monitoring.",
      targetRaise: "$12M",
      chain: "Sui"
    },
    gatedInfo: {
      tokenomics: "Initial FDV $120M, 20% public sale, 1 year cliff",
      alphaInsight: "Strategic partnership with two major Sui validators.",
      investors: ["Jump Trading", "Hashed"],
      roadmap: [
        { title: "Phase 1", detail: "DEX aggregator MVP + compliance rules" },
        { title: "Phase 2", detail: "Liquidity incentives + cross-chain bridge" }
      ]
    }
  },
  {
    id: "aurora-ai",
    name: "Aurora AI Markets",
    teaser: "AI-powered quant strategies with verifiable on-chain proofs",
    category: "AI",
    logo: "https://dummyimage.com/80x80/9333ea/ffffff&text=A",
    tags: ["AI", "Quant", "Analytics"],
    publicInfo: {
      summary: "Aurora trains AI models on public orderbooks and provides strategy signals via zk-proofs.",
      targetRaise: "$8M",
      chain: "Sui"
    },
    gatedInfo: {
      tokenomics: "Supply 1B, emissions curve front-loaded for research mining",
      alphaInsight: "Early pilot live with three prop funds.",
      investors: ["a16z crypto", "Multicoin"],
      roadmap: [
        { title: "Phase 1", detail: "Research marketplace" },
        { title: "Phase 2", detail: "Permissioned strategy vaults" }
      ]
    }
  },
  {
    id: "origin-l2",
    name: "Origin Layer-2",
    teaser: "Composable rollups for regulated markets",
    category: "L2",
    logo: "https://dummyimage.com/80x80/0ea5e9/ffffff&text=O",
    tags: ["L2", "Compliance", "Payments"],
    publicInfo: {
      summary: "Origin provides rollup-as-a-service with identity-aware sequencers.",
      targetRaise: "$20M",
      chain: "Sui + Celestia"
    },
    gatedInfo: {
      tokenomics: "Dual token model with staking/backstop pools",
      alphaInsight: "Pilot with fintech partners in Europe",
      investors: ["Sequoia", "Lightspeed"],
      roadmap: [
        { title: "Phase 1", detail: "Regulatory sandbox" },
        { title: "Phase 2", detail: "Cross-border settlement rails" }
      ]
    }
  }
];

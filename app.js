import { configurePreview, readPreview, renderResourcePreview } from "./preview.js";
const state = {
  overview: null,
  release: null,
  currentGene: null,
  tissues: [],
  selectedTissue: null,
  analysis: null,
  downloads: [],
  tools: null,
  goPayload: null,
  resources: {
    markers: null,
    fig2Summary: null,
    enhanced: null,
    goNetwork: null,
    activity: null,
    crossSpecies: null,
    subgenome: null,
    cfmsSummary: null,
    cfmsProfiles: null,
    cfmsNetwork: null,
    cfmsCommunities: null,
    cfmsHomoeologs: null,
    cfmsQuartets: null,
  },
  fig2: {
    activeTab: "markers",
    activeResource: "fig2",
    enhancedClass: "",
    goClass: "",
    goNodeType: "all",
    goQuery: "",
    goMinGenes: 0,
    goIncludeIsolates: "0",
    enhancedLimit: "30",
    activityGroup: "tf",
    activityMetric: "direct",
    cy: null,
    goLayout: null,
    goTermCache: new Map(),
    goTermRequestToken: 0,
  },
  fig3: {
    clusterGroup: "Conserved",
    clusterView: "line",
    tablePage: 1,
    tablePageSize: 10,
    selectedOgs: new Set(),
    showOrthologs: true,
  },
  ab: {
    activeTab: "overview",
    quadrant: "all",
    pattern: "all",
    pairId: "",
    page: 1,
  },
  cfms: {
    activeTab: "overview",
    homoeologView: "similarity",
    profilePage: 1,
    networkPage: 1,
    communityPage: 1,
    homoeologPage: 1,
    quartetPage: 1,
    selectedGene: "",
    selectedCommunity: "",
    selectedPair: "",
    selectedFamily: "",
    cy: null,
  },
  browse: {
    query: "",
    omics: "all",
    tissue: "",
    sort: "gene_id",
    page: 1,
    pageSize: 24,
    total: 0,
    pageCount: 0,
  },
  mode: "log2",
  suggestionTimer: null,
  activeRoute: "home",
  loaded: {
    entries: false,
    tissueDetail: false,
    downloads: false,
    tools: false,
  },
  pending: {},
};

const GO_LAYOUT_OPTIONS = { name: "preset", animate: false, fit: true, padding: 24 };

const FIG2_GO_CLASS_COLORS = {
  class1: "#2F714F",
  class2: "#D6CAB0",
  class3: "#644A84",
  class4: "#B57461",
  class5: "#B4C5B6",
  class6: "#7C8798",
};

const RESOURCE_ROUTE_SLUGS = {
  fig2: "tissue-specific-proteins",
  fig3: "cross-species-conservation",
  fig4: "ab-subgenome-explorer",
  fig5: "cfms-protein-associations",
};

const RESOURCE_LABELS = {
  fig2: "Tissue-specific Protein Programs",
  fig3: "Cross-species Conservation",
  fig4: "A/B Subgenome Explorer",
  fig5: "CF-MS Protein Association Explorer",
};

const DEFAULT_DOCUMENT_TITLE = "Quinoa Life-cycle Omics Atlas | Transcriptome and Proteome Resource";
const ROUTE_METADATA = {
  home: [DEFAULT_DOCUMENT_TITLE, "Tissue-resolved transcript and protein abundance across 28 Chenopodium quinoa tissues."],
  detail: ["Gene Record | Quinoa Life-cycle Omics Atlas", "Gene annotation and matched transcript and protein abundance profiles across the quinoa life cycle."],
  browse: ["Gene Search | Quinoa Life-cycle Omics Atlas", "Search Cq_V4 gene records by identifier, homolog, annotation and omics evidence."],
  tissues: ["Tissue Browser | Quinoa Life-cycle Omics Atlas", "Browse transcriptome and proteome evidence for 28 Chenopodium quinoa tissues."],
  tools: ["Analysis Tools | Quinoa Life-cycle Omics Atlas", "Batch lookup, expression heatmap, GO enrichment, sequence retrieval and local BLAST."],
  downloads: ["Metadata and Data Access | Quinoa Life-cycle Omics Atlas", "Release metadata, checksums and repository-managed access for QLOA data."],
  about: ["Documentation | Quinoa Life-cycle Omics Atlas", "QLOA data scope, methods, evidence interpretation, release information and citation guidance."],
};

const TOOL_EXAMPLE_GENES = [
  "Cqu9BG305340", "Cqu5BG169390", "Cqu7AG497670", "Cqu9AG553930",
  "Cqu9BG322180", "Cqu6AG428010", "Cqu2BG052190", "Cqu4BG134130",
  "Cqu5AG466090", "Cqu7BG155350", "Cqu3AG408040", "Cqu6BG241690",
  "Cqu1BG018860", "Cqu8AG526010", "Cqu5BG175260", "Cqu6BG254700",
  "Cqu2BG048900", "Cqu3BG074570", "Cqu8AG520130", "Cqu3AG398060",
];

const HOME_LIFECYCLE_GROUPS = [
  { key: "Seedling", codes: ["ST", "CT", "HY", "RUZ", "RT"], image: "seedling.webp", accent: "#9aae70", description: "Shoot apex, cotyledon, hypocotyl and seedling root zones." },
  { key: "Seed", codes: ["s7", "PL", "EM", "PS", "SDC", "SDIMB", "FR", "s13"], image: "seed.webp", accent: "#c7a14f", description: "Seed and fruit development from early seed to imbibition." },
  { key: "Flower", codes: ["FL", "FLPD", "P", "SP", "FM", "OV", "CP"], image: "flower.webp", accent: "#bb8876", description: "Whole flower and reproductive tissues including pollen, ovule and carpel." },
  { key: "Leaf", codes: ["SCLF", "FLF", "CLLF", "LFPT"], image: "leaf.webp", accent: "#71966c", description: "Leaf types and petiole representing photosynthetic and senescence programs." },
  { key: "Stem", codes: ["ND", "IND"], image: "stem.webp", accent: "#a58d52", description: "Axial tissues represented by node and internode samples." },
  { key: "Root", codes: ["R"], image: "root.webp", accent: "#a99f8d", description: "Mature root complementing seedling root-tip and upper-zone samples." },
  { key: "EBC", codes: ["EBC"], image: null, accent: "#68a6a3", description: "Epidermal bladder cells retained as a specialized cell type." },
];

let homeLifecycleTissueMap = new Map();

const RESOURCE_KEYS_BY_SLUG = Object.fromEntries(
  Object.entries(RESOURCE_ROUTE_SLUGS).map(([key, slug]) => [slug, key]),
);

const elements = {
  heroSearchForm: document.querySelector("#hero-search-form"),
  heroSearchInput: document.querySelector("#hero-search-input"),
  heroSuggestions: document.querySelector("#hero-suggestions"),
  heroStats: document.querySelector("#hero-stats"),
  datasetList: document.querySelector("#dataset-release-list"),
  entryMeta: document.querySelector("#entry-meta"),
  entryAnnotation: document.querySelector("#entry-annotation"),
  transcriptPanel: document.querySelector("#transcript-panel"),
  proteinPanel: document.querySelector("#protein-panel"),
  modeLog2: document.querySelector("#mode-log2"),
  modeZscore: document.querySelector("#mode-zscore"),
  browseQuery: document.querySelector("#browse-query"),
  browseOmics: document.querySelector("#browse-omics"),
  browseTissue: document.querySelector("#browse-tissue"),
  browseSort: document.querySelector("#browse-sort"),
  browseStatus: document.querySelector("#browse-status"),
  browsePrev: document.querySelector("#browse-prev"),
  browseNext: document.querySelector("#browse-next"),
  browsePage: document.querySelector("#browse-page"),
  entryGrid: document.querySelector("#entry-grid"),
  tissueGrid: document.querySelector("#tissue-grid"),
  tissueDetail: document.querySelector("#tissue-detail"),
  correlationBars: document.querySelector("#correlation-bars"),
  topCorrelationList: document.querySelector("#top-correlation-list"),
  discordantList: document.querySelector("#discordant-list"),
  transcriptSpecificList: document.querySelector("#transcript-specific-list"),
  proteinSpecificList: document.querySelector("#protein-specific-list"),
  supportedMarkerList: document.querySelector("#supported-marker-list"),
  downloadGrid: document.querySelector("#download-grid"),
  releaseManuscriptSummary: document.querySelector("#release-manuscript-summary"),
  releaseReuseSummary: document.querySelector("#release-reuse-summary"),
  releaseReadinessList: document.querySelector("#release-readiness-list"),
  releaseCitationCopy: document.querySelector("#release-citation-copy"),
  releaseAccessCopy: document.querySelector("#release-access-copy"),
  releaseLicenseCopy: document.querySelector("#release-license-copy"),
  releasePrivacyCopy: document.querySelector("#release-privacy-copy"),
  toolStatusChip: document.querySelector("#tool-status-chip"),
  toolStatus: document.querySelector("#tool-status"),
  batchInput: document.querySelector("#batch-input"),
  batchRun: document.querySelector("#batch-run"),
  batchResults: document.querySelector("#batch-results"),
  heatmapInput: document.querySelector("#heatmap-input"),
  heatmapLayer: document.querySelector("#heatmap-layer"),
  heatmapRun: document.querySelector("#heatmap-run"),
  heatmapResults: document.querySelector("#heatmap-results"),
  goInput: document.querySelector("#go-input"),
  goDisplayScope: document.querySelector("#go-display-scope"),
  goRun: document.querySelector("#go-run"),
  goResults: document.querySelector("#go-results"),
  sequenceGene: document.querySelector("#sequence-gene"),
  sequenceType: document.querySelector("#sequence-type"),
  sequenceRun: document.querySelector("#sequence-run"),
  sequenceResults: document.querySelector("#sequence-results"),
  blastProgram: document.querySelector("#blast-program"),
  blastDb: document.querySelector("#blast-db"),
  blastQuery: document.querySelector("#blast-query"),
  blastRun: document.querySelector("#blast-run"),
  blastResults: document.querySelector("#blast-results"),
  routePages: document.querySelectorAll(".route-page"),
  homeOnly: document.querySelectorAll(".home-only"),
  navLinks: document.querySelectorAll(".topnav a, .brand, .hero-actions a, .portal-card, .text-link"),
  homeLifecycleGraphic: document.querySelector("#home-lifecycle-graphic"),
  homeDataChart: document.querySelector("#home-data-chart"),
  homeTissueMap: document.querySelector("#home-tissue-map"),
  homeToolFlow: document.querySelector("#home-tool-flow"),
  homeCategoryChart: document.querySelector("#home-category-chart"),
  homeCorrelationPreview: document.querySelector("#home-correlation-preview"),
  homeFeatureCounts: document.querySelector("#home-feature-counts"),
  homeLifecycleGroups: document.querySelector("#home-lifecycle-groups"),
  homeLifecycleDetail: document.querySelector("#home-lifecycle-detail"),
  analysisBubble: document.querySelector("#analysis-bubble"),
  analysisLayerDiagram: document.querySelector("#analysis-layer-diagram"),
  analysisSpecificityTiles: document.querySelector("#analysis-specificity-tiles"),
  fig2SummaryCards: document.querySelector("#fig2-summary-cards"),
  fig2Tabs: document.querySelectorAll("[data-fig2-tab]"),
  fig2Panels: document.querySelectorAll("[data-fig2-panel]"),
  markerTissue: document.querySelector("#marker-tissue"),
  markerSupport: document.querySelector("#marker-support"),
  markerQuery: document.querySelector("#marker-query"),
  markerQueryRun: document.querySelector("#marker-query-run"),
  markerMinFc: document.querySelector("#marker-min-fc"),
  markerCountChart: document.querySelector("#marker-count-chart"),
  markerSupportChart: document.querySelector("#marker-support-chart"),
  markerProteinHeatmap: document.querySelector("#marker-protein-heatmap"),
  markerRnaHeatmap: document.querySelector("#marker-rna-heatmap"),
  enhancedClassChart: document.querySelector("#enhanced-class-chart"),
  enhancedClassSelect: document.querySelector("#enhanced-class-select"),
  enhancedRowLimit: document.querySelector("#enhanced-row-limit"),
  enhancedClassSummary: document.querySelector("#enhanced-class-summary"),
  enhancedHeatmap: document.querySelector("#enhanced-heatmap"),
  goClassSelect: document.querySelector("#go-class-select"),
  goNodeType: document.querySelector("#go-node-type"),
  goIncludeIsolates: document.querySelector("#go-include-isolates"),
  goNetworkQuery: document.querySelector("#go-network-query"),
  goMinGenes: document.querySelector("#go-min-genes"),
  goNetwork: document.querySelector("#go-network"),
  goNetworkTooltip: document.querySelector("#go-network-tooltip"),
  goNetworkLegend: document.querySelector("#go-network-legend"),
  goTermDetail: document.querySelector("#go-term-detail"),
  activityGroup: document.querySelector("#activity-group"),
  activityMetric: document.querySelector("#activity-metric"),
  activityHeatmaps: document.querySelector("#activity-heatmaps"),
  activityGeneDetail: document.querySelector("#activity-gene-detail"),
  tfTranslationHeatmap: document.querySelector("#tf-translation-heatmap"),
  markerFocusPanel: document.querySelector("#marker-focus-panel"),
  markerTable: document.querySelector("#marker-table"),
  ogGroup: document.querySelector("#og-group"),
  ogLineage: document.querySelector("#og-lineage"),
  ogGeneQuery: document.querySelector("#og-gene-query"),
  ogMinR: document.querySelector("#og-min-r"),
  ogMinRValue: document.querySelector("#og-min-r-value"),
  ogMinConservation: document.querySelector("#og-min-conservation"),
  ogMinConservationValue: document.querySelector("#og-min-conservation-value"),
  resourceModuleSelect: document.querySelector("#resource-module-select"),
  resourceBreadcrumbCurrent: document.querySelector("#resource-breadcrumb-current"),
  resourceWorkspaces: document.querySelectorAll("[data-resource-module]"),
  fig3SummaryCards: document.querySelector("#fig3-summary-cards"),
  fig3MainFigure: document.querySelector("#fig3-main-figure"),
  ogClusterGallery: document.querySelector("#og-cluster-gallery"),
  ogGeneList: document.querySelector("#og-gene-list"),
  ogScatterDetail: document.querySelector("#og-scatter-detail"),
  ogScatter: document.querySelector("#og-scatter"),
  ogLineageChart: document.querySelector("#og-lineage-chart"),
  ogClassChart: document.querySelector("#og-class-chart"),
  ogTable: document.querySelector("#og-table"),
  abTissueFilter: document.querySelector("#ab-tissue-filter"),
  abLayerFilter: document.querySelector("#ab-layer-filter"),
  abDirectionFilter: document.querySelector("#ab-direction-filter"),
  abBehaviorFilter: document.querySelector("#ab-behavior-filter"),
  abQueryFilter: document.querySelector("#ab-query-filter"),
  abSummaryCards: document.querySelector("#ab-summary-cards"),
  abMethodsSummary: document.querySelector("#ab-methods-summary"),
  abGlobalBalance: document.querySelector("#ab-global-balance"),
  abBehaviorSummary: document.querySelector("#ab-behavior-summary"),
  abQuadrantOverview: document.querySelector("#ab-quadrant-overview"),
  abTissueTitle: document.querySelector("#ab-tissue-title"),
  abTissueCorrelation: document.querySelector("#ab-tissue-correlation"),
  abTissueGrid: document.querySelector("#ab-tissue-grid"),
  abTissueBiasBars: document.querySelector("#ab-tissue-bias-bars"),
  abTissueScatter: document.querySelector("#ab-tissue-scatter"),
  abTissueDetail: document.querySelector("#ab-tissue-detail"),
  abPairResultCount: document.querySelector("#ab-pair-result-count"),
  abPairTable: document.querySelector("#ab-pair-table"),
  abPairPagination: document.querySelector("#ab-pair-pagination"),
  abPairDetail: document.querySelector("#ab-pair-detail"),
  abPatternSummary: document.querySelector("#ab-pattern-summary"),
  abPatternHeatmap: document.querySelector("#ab-pattern-heatmap"),
  abGoChart: document.querySelector("#ab-go-chart"),
  abGoDetail: document.querySelector("#ab-go-detail"),
  cfmsMethodsSummary: document.querySelector("#cfms-methods-summary"),
  cfmsSummaryCards: document.querySelector("#cfms-summary-cards"),
  cfmsTabs: document.querySelectorAll("[data-cfms-tab]"),
  cfmsPanels: document.querySelectorAll("[data-cfms-panel]"),
  cfmsGlobalElution: document.querySelector("#cfms-global-elution"),
  cfmsNetworkComposition: document.querySelector("#cfms-network-composition"),
  cfmsReplaceabilityOverview: document.querySelector("#cfms-replaceability-overview"),
  cfmsResourceGuide: document.querySelector("#cfms-resource-guide"),
  cfmsProfileQuery: document.querySelector("#cfms-profile-query"),
  cfmsProfileSubgenome: document.querySelector("#cfms-profile-subgenome"),
  cfmsProfileHeatmap: document.querySelector("#cfms-profile-heatmap"),
  cfmsProfileDetail: document.querySelector("#cfms-profile-detail"),
  cfmsProfileResultCount: document.querySelector("#cfms-profile-result-count"),
  cfmsProfileTable: document.querySelector("#cfms-profile-table"),
  cfmsProfilePagination: document.querySelector("#cfms-profile-pagination"),
  cfmsNetworkContext: document.querySelector("#cfms-network-context"),
  cfmsNetworkQuery: document.querySelector("#cfms-network-query"),
  cfmsNetworkStage: document.querySelector("#cfms-network-stage"),
  cfmsNetworkLegend: document.querySelector("#cfms-network-legend"),
  cfmsNetworkDetail: document.querySelector("#cfms-network-detail"),
  cfmsNetworkVisualCount: document.querySelector("#cfms-network-visual-count"),
  cfmsNetworkResultCount: document.querySelector("#cfms-network-result-count"),
  cfmsNetworkTable: document.querySelector("#cfms-network-table"),
  cfmsNetworkPagination: document.querySelector("#cfms-network-pagination"),
  cfmsCommunityQuery: document.querySelector("#cfms-community-query"),
  cfmsCommunityGrid: document.querySelector("#cfms-community-grid"),
  cfmsCommunityDetail: document.querySelector("#cfms-community-detail"),
  cfmsCommunityResultCount: document.querySelector("#cfms-community-result-count"),
  cfmsCommunityPagination: document.querySelector("#cfms-community-pagination"),
  cfmsHomoeologViews: document.querySelectorAll("[data-cfms-homoeolog-view]"),
  cfmsHomoeologPanels: document.querySelectorAll("[data-cfms-homoeolog-panel]"),
  cfmsHomoeologQuery: document.querySelector("#cfms-homoeolog-query"),
  cfmsSimilarityClass: document.querySelector("#cfms-similarity-class"),
  cfmsSimilarityHistogram: document.querySelector("#cfms-similarity-histogram"),
  cfmsHomoeologTable: document.querySelector("#cfms-homoeolog-table"),
  cfmsHomoeologDetail: document.querySelector("#cfms-homoeolog-detail"),
  cfmsHomoeologPagination: document.querySelector("#cfms-homoeolog-pagination"),
  cfmsQuartetQuery: document.querySelector("#cfms-quartet-query"),
  cfmsQuartetClass: document.querySelector("#cfms-quartet-class"),
  cfmsQuartetClassChart: document.querySelector("#cfms-quartet-class-chart"),
  cfmsQuartetTable: document.querySelector("#cfms-quartet-table"),
  cfmsQuartetDetail: document.querySelector("#cfms-quartet-detail"),
  cfmsQuartetResultCount: document.querySelector("#cfms-quartet-result-count"),
  cfmsQuartetPagination: document.querySelector("#cfms-quartet-pagination"),
};

const PALETTES = {
  transcriptome: ["#f4f6f7", "#8fb3b5", "#4f7c8a"],
  proteome: ["#f7f7f2", "#b56b82", "#6b3fa0"],
};

async function fetchJSON(path) {
  return readPreview(path);
}

async function postJSON() {
  throw new Error("This analysis requires the database server.");
}

function loadScriptOnce(src, globalName) {
  if (window[globalName]) {
    return Promise.resolve(window[globalName]);
  }
  if (state.pending[`script:${src}`]) {
    return state.pending[`script:${src}`];
  }
  state.pending[`script:${src}`] = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => resolve(window[globalName]));
    script.addEventListener("error", () => reject(new Error(`Could not load ${src}`)));
    document.head.appendChild(script);
  }).finally(() => {
    delete state.pending[`script:${src}`];
  });
  return state.pending[`script:${src}`];
}

function runOnce(key, task) {
  if (state.pending[key]) {
    return state.pending[key];
  }
  state.pending[key] = Promise.resolve()
    .then(task)
    .finally(() => {
      delete state.pending[key];
    });
  return state.pending[key];
}

function formatInt(value) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function formatValue(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "NA";
  }
  return Number(value).toFixed(digits);
}

function formatRaw(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "NA";
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return Number(value).toFixed(2);
}

function clipText(text, limit = 420) {
  if (!text) {
    return "";
  }
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setDocumentMetadata(title, description) {
  document.title = title;
  ["meta[name='description']", "meta[property='og:description']", "meta[name='twitter:description']"].forEach((selector) => {
    document.querySelector(selector)?.setAttribute("content", description);
  });
  ["meta[property='og:title']", "meta[name='twitter:title']"].forEach((selector) => {
    document.querySelector(selector)?.setAttribute("content", title);
  });
}

function setRouteDocumentMetadata(route) {
  if (route === "detail" && state.currentGene) {
    const displayGene = geneLabel(state.currentGene);
    setDocumentMetadata(
      `${displayGene} | Gene Record | Quinoa Life-cycle Omics Atlas`,
      `${displayGene}: transcript and protein abundance, tissue specificity and homology-based annotation in Chenopodium quinoa.`,
    );
    return;
  }
  if (route === "tissues" && state.selectedTissue) {
    const tissue = state.tissues.find((item) => item.code === state.selectedTissue);
    if (tissue) {
      setDocumentMetadata(
        `${tissue.code} - ${tissue.full_name} | Tissue Browser | Quinoa Life-cycle Omics Atlas`,
        `${tissue.full_name} (${tissue.code}) transcriptome, proteome, RNA-protein concordance and tissue-enriched protein evidence in Chenopodium quinoa.`,
      );
      return;
    }
  }
  if (route === "analysis") {
    const selected = elements.resourceModuleSelect?.value || state.fig2.activeResource || "fig2";
    const label = RESOURCE_LABELS[selected] || "Data Resource";
    setDocumentMetadata(`${label} | Quinoa Life-cycle Omics Atlas`, `${label}: an interactive, release-versioned data resource for Chenopodium quinoa.`);
    return;
  }
  const metadata = ROUTE_METADATA[route];
  if (metadata) setDocumentMetadata(metadata[0], metadata[1]);
}

function geneLabel(item) {
  if (!item) {
    return "";
  }
  if (typeof item === "string") {
    return item;
  }
  return item.display_label
    || item.gene_label
    || item.annotation?.display_label
    || item.gene_id
    || item.GeneID
    || "";
}

function buildEmpty(message) {
  return `<div class="empty-block"><p>${escapeHTML(message)}</p></div>`;
}

function setActiveModeButtons() {
  elements.modeLog2.classList.toggle("active", state.mode === "log2");
  elements.modeZscore.classList.toggle("active", state.mode === "zscore");
}

function getDisplayValue(tissue) {
  return state.mode === "zscore" ? tissue.zscore : tissue.log2_value;
}

function normalize(values) {
  const present = values.filter((value) => value !== null && value !== undefined && !Number.isNaN(value));
  if (!present.length) {
    return values.map(() => null);
  }
  const min = Math.min(...present);
  const max = Math.max(...present);
  if (min === max) {
    return values.map((value) => (value === null || value === undefined ? null : 0.6));
  }
  return values.map((value) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return null;
    }
    return (value - min) / (max - min);
  });
}

function hexToRgb(hex) {
  return hex.match(/\w\w/g).map((part) => Number.parseInt(part, 16));
}

function blend(startHex, endHex, factor) {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  const mixed = start.map((channel, index) => Math.round(channel + (end[index] - channel) * factor));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function gradientColor(palette, factor) {
  if (factor <= 0.5) {
    return blend(palette[0], palette[1], factor * 2);
  }
  return blend(palette[1], palette[2], (factor - 0.5) * 2);
}

function rampColor(value, stops, colors) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "#eef1eb";
  }
  const numeric = Number(value);
  if (numeric <= stops[0]) {
    return colors[0];
  }
  if (numeric >= stops[stops.length - 1]) {
    return colors[colors.length - 1];
  }
  for (let index = 0; index < stops.length - 1; index += 1) {
    const left = stops[index];
    const right = stops[index + 1];
    if (numeric >= left && numeric <= right) {
      return blend(colors[index], colors[index + 1], (numeric - left) / (right - left));
    }
  }
  return colors[1];
}

function renderShape(tissue, fill) {
  const title = escapeHTML(`${tissue.code} | ${tissue.full_name} | raw=${formatRaw(tissue.raw_value)} | log2=${formatValue(tissue.log2_value, 3)} | z=${formatValue(tissue.zscore, 3)}`);
  const x = tissue.x;
  const y = tissue.y;
  const width = tissue.width;
  const height = tissue.height;

  if (tissue.shape === "circle") {
    return `
      <g class="tissue-node">
        <title>${title}</title>
        <circle class="tissue-shape" cx="${x}" cy="${y}" r="${width / 2}" fill="${fill}"></circle>
        <text class="tissue-label" x="${x}" y="${y}">${escapeHTML(tissue.label)}</text>
      </g>
    `;
  }

  if (tissue.shape === "pill") {
    return `
      <g class="tissue-node">
        <title>${title}</title>
        <rect class="tissue-shape" x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" rx="${height / 2}" fill="${fill}"></rect>
        <text class="tissue-label" x="${x}" y="${y}">${escapeHTML(tissue.label)}</text>
      </g>
    `;
  }

  return `
    <g class="tissue-node">
      <title>${title}</title>
      <ellipse class="tissue-shape" cx="${x}" cy="${y}" rx="${width / 2}" ry="${height / 2}" fill="${fill}"></ellipse>
      <text class="tissue-label" x="${x}" y="${y}">${escapeHTML(tissue.label)}</text>
    </g>
  `;
}

function renderAtlasSvg(tissues, palette) {
  const normalized = normalize(tissues.map((item) => getDisplayValue(item)));
  const shapes = tissues.map((tissue, index) => {
    const factor = normalized[index];
    const fill = factor === null ? "#ece6dc" : gradientColor(palette, factor);
    return renderShape(tissue, fill);
  });

  return `
    <svg class="atlas-svg" viewBox="0 0 760 920" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="plant-skeleton" d="M380 115 C378 190 378 285 380 382 C380 505 380 642 383 835" stroke-width="10"></path>
      <path class="plant-skeleton" d="M380 210 C332 215 289 244 246 292" stroke-width="8"></path>
      <path class="plant-skeleton" d="M380 210 C426 220 487 250 547 302" stroke-width="8"></path>
      <path class="plant-skeleton" d="M380 382 C324 388 258 404 138 394" stroke-width="8"></path>
      <path class="plant-skeleton" d="M380 450 C328 482 240 548 185 614" stroke-width="8"></path>
      <path class="plant-skeleton" d="M383 620 C448 610 570 590 666 575" stroke-width="8"></path>
      <path class="plant-skeleton" d="M383 720 C350 728 303 700 270 672" stroke-width="8"></path>
      <path class="plant-skeleton" d="M383 150 C336 145 320 150 302 155" stroke-width="6"></path>
      <path class="plant-skeleton" d="M383 150 C435 145 455 145 474 150" stroke-width="6"></path>
      <text class="group-label" x="88" y="240">Vegetative</text>
      <text class="group-label" x="580" y="118">Floral</text>
      <text class="group-label" x="618" y="300">Seed / embryo</text>
      <text class="group-label" x="236" y="818">Root / specialized</text>
      ${shapes.join("")}
    </svg>
  `;
}

function renderScale(tissues, palette) {
  const values = tissues.map((item) => getDisplayValue(item)).filter((value) => value !== null && value !== undefined);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  return `
    <div class="scale-block">
      <div class="scale-bar" style="background: linear-gradient(90deg, ${palette[0]} 0%, ${palette[1]} 50%, ${palette[2]} 100%);"></div>
      <div class="scale-range">
        <span>${formatValue(min, 2)}</span>
        <span>${state.mode === "zscore" ? "z-score" : "log2(mean + 1)"}</span>
        <span>${formatValue(max, 2)}</span>
      </div>
    </div>
  `;
}

function renderTopTissues(items) {
  return items
    .map(
      (item) => `
        <div class="mini-card">
          <div class="mini-meta">
            <strong>${escapeHTML(item.code)}</strong>
            <span>${formatRaw(item.raw_value)}</span>
          </div>
          <p>${escapeHTML(item.full_name)}</p>
          <p>log2=${formatValue(item.log2_value, 2)} | z=${formatValue(item.zscore, 2)}</p>
        </div>
      `
    )
    .join("");
}

function renderFullTissueMatrix(items) {
  return items
    .map(
      (item) => `
        <div class="mini-card">
          <div class="mini-meta">
            <strong>${escapeHTML(item.code)}</strong>
            <span>${escapeHTML(item.category || "")}</span>
          </div>
          <p>${escapeHTML(item.full_name)}</p>
          <p>raw=${formatRaw(item.raw_value)} | log2=${formatValue(item.log2_value, 2)} | z=${formatValue(item.zscore, 2)}</p>
        </div>
      `
    )
    .join("");
}

function renderOmicsPanel(target, title, data, paletteKey) {
  if (!data) {
    target.innerHTML = buildEmpty(`No ${title.toLowerCase()} profile is available for this gene.`);
    return;
  }

  const palette = PALETTES[paletteKey];
  target.innerHTML = `
    <div class="atlas-head">
      <div>
        <p class="eyebrow">${title}</p>
        <h4>Peak tissue: ${escapeHTML(data.max_tissue || "NA")}</h4>
      </div>
      <span class="annotation-badge">Tau ${formatValue(data.tau, 3)}</span>
    </div>
    ${renderScale(data.tissues, palette)}
    <div class="atlas-figure">${renderAtlasSvg(data.tissues, palette)}</div>
    <div>
      <p class="eyebrow">Top Tissues</p>
      <div class="top-tissues">${renderTopTissues(data.top_tissues)}</div>
    </div>
    <div>
      <p class="eyebrow">All 28 Tissues</p>
      <div class="tissue-matrix">${renderFullTissueMatrix(data.tissues)}</div>
    </div>
  `;
}

function renderOverview(overview) {
  const cards = [
    { label: "Tissues", value: formatInt(overview.tissues.length), hint: "Life-cycle samples" },
    { label: "Gene records", value: formatInt(overview.counts.all_genes), hint: "Cq_V4 identifiers" },
    { label: "Transcript profiles", value: formatInt(overview.counts.transcript_genes), hint: "RNA abundance" },
    { label: "Protein profiles", value: formatInt(overview.counts.protein_genes), hint: "Protein abundance" },
  ];

  elements.heroStats.innerHTML = cards
    .map(
      (item) => `
        <article class="stat-card">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
          <span>${item.hint}</span>
        </article>
      `
    )
    .join("");

  elements.datasetList.innerHTML = (overview.datasets || [])
    .map(
      (dataset) => `
        <div class="source-item">
          <div>
            <strong>${escapeHTML(dataset.label)}</strong>
            <span>${escapeHTML(dataset.measurement)}</span>
          </div>
          <span>${escapeHTML(dataset.scope)} · ${escapeHTML(dataset.evidence)}</span>
        </div>
      `
    )
    .join("");

  if (elements.homeFeatureCounts) {
    elements.homeFeatureCounts.innerHTML = `
      <div class="home-omics-overlap" aria-label="${formatInt(overview.counts.shared_genes)} genes detected in both omics layers">
        <svg viewBox="0 0 176 144" role="img" aria-hidden="true">
          <circle class="rna-circle" cx="66" cy="69" r="47"></circle>
          <circle class="protein-circle" cx="108" cy="69" r="41"></circle>
          <text class="omics-layer-label rna-label" x="42" y="47">RNA</text>
          <text class="omics-layer-label protein-label" x="128" y="47">Protein</text>
          <text class="omics-overlap-value" x="87" y="76">${formatInt(overview.counts.shared_genes)}</text>
          <text class="omics-overlap-caption" x="87" y="94">matched genes</text>
        </svg>
      </div>
      <dl>
        <div><dt>Annotated genes</dt><dd>${formatInt(overview.counts.annotated_genes)}</dd></div>
        <div><dt>RNA evidence</dt><dd>${formatInt(overview.counts.transcript_genes)}</dd></div>
        <div><dt>Protein evidence</dt><dd>${formatInt(overview.counts.protein_genes)}</dd></div>
        <div class="matched-feature-row"><dt>Matched evidence</dt><dd>${formatInt(overview.counts.shared_genes)}</dd></div>
      </dl>
    `;
  }

  elements.browseTissue.innerHTML = [
    `<option value="">All tissues</option>`,
    ...overview.tissues.map((tissue) => `<option value="${escapeHTML(tissue.code)}">${escapeHTML(tissue.code)} · ${escapeHTML(tissue.full_name)}</option>`),
  ].join("");

  renderHomeVisuals(overview);
}

function renderReleaseMetadata(payload) {
  const manuscript = payload.manuscript || {};
  const repositories = payload.data_repositories || {};
  const licenses = payload.licenses || {};
  const production = payload.production || {};
  const readiness = payload.readiness || {};
  const resource = payload.resource || {};
  const releasePrefix = readiness.publication_ready ? "Release" : "Release candidate";
  const releaseVersion = resource.release || "1.0";
  const releaseDate = resource.release_date
    ? new Date(`${resource.release_date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : "date pending";
  const transcriptRecords = repositories.transcriptome?.records || [];
  const proteinRecords = repositories.proteome?.records || [];
  const repositoryText = (records, pending) => records.length
    ? records.map((record) => record.accession).join(", ")
    : pending;
  const citation = manuscript.citation
    ? manuscript.citation
    : `${manuscript.title || "Associated quinoa proteome atlas manuscript"}. Manuscript in preparation; do not cite it as a published article.`;
  const dataLicence = licenses.data?.spdx_id || "Not yet assigned";
  const softwareLicence = licenses.software?.spdx_id || "Not yet assigned";

  document.querySelectorAll("[data-release-label]").forEach((element) => {
    const suffix = element.dataset.releaseSuffix || (element.hasAttribute("data-release-date") ? ` · ${releaseDate}` : "");
    element.textContent = `${releasePrefix} ${releaseVersion}${suffix}`;
  });
  const releaseStateLabel = document.querySelector("#release-state-label");
  const releaseVersionDate = document.querySelector("#release-version-date");
  if (releaseStateLabel) releaseStateLabel.textContent = releasePrefix;
  if (releaseVersionDate) releaseVersionDate.textContent = `${releaseVersion} · ${releaseDate}`;

  if (elements.releaseManuscriptSummary) {
    elements.releaseManuscriptSummary.textContent = manuscript.citation
      ? `Associated manuscript: ${manuscript.citation}`
      : "Associated manuscript: in preparation; final citation and DOI not yet assigned";
  }
  if (elements.releaseReuseSummary) {
    elements.releaseReuseSummary.textContent = licenses.data?.spdx_id && licenses.software?.spdx_id
      ? `Reuse terms: data ${dataLicence}; software ${softwareLicence}`
      : "Reuse status: data and software licences have not yet been assigned";
  }
  if (elements.releaseCitationCopy) {
    elements.releaseCitationCopy.innerHTML = `<cite>${escapeHTML(citation)}</cite> For pre-release use, cite the atlas name, release 1.0, source repository and access date.`;
  }
  if (elements.releaseAccessCopy) {
    const transcript = repositoryText(transcriptRecords, "no verified public accession");
    const protein = repositoryText(proteinRecords, "no verified public accession");
    elements.releaseAccessCopy.innerHTML = `<strong>Repository records:</strong> transcriptome — ${escapeHTML(transcript)}; proteome — ${escapeHTML(protein)}.`;
  }
  if (elements.releaseLicenseCopy) {
    elements.releaseLicenseCopy.textContent = licenses.data?.spdx_id && licenses.software?.spdx_id
      ? `Reuse is governed by the data licence (${dataLicence}) and software licence (${softwareLicence}).`
      : "Data and software licences are not yet assigned. Public visibility or download availability must not be interpreted as permission for unrestricted reuse.";
  }
  if (elements.releasePrivacyCopy) {
    elements.releasePrivacyCopy.textContent = production.privacy_policy_url && production.retention_summary
      ? production.retention_summary
      : "The standalone application does not retain submitted gene lists or sequences. Infrastructure-level logging and retention terms remain the responsibility of the production host and must be published before release.";
  }
  if (elements.releaseReadinessList) {
    const row = (label, value) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`;
    elements.releaseReadinessList.innerHTML = [
      row("Publication state", readiness.publication_ready ? "Publication ready" : "Pre-release metadata incomplete"),
      row("Manuscript", manuscript.citation || "In preparation; citation and DOI pending"),
      row("Transcriptome repository", repositoryText(transcriptRecords, "Verified accession pending")),
      row("Proteome repository", repositoryText(proteinRecords, "Verified accession pending")),
      row("Data licence", dataLicence),
      row("Software licence", softwareLicence),
    ].join("");
  }
}

function renderHomeVisuals(overview) {
  if (elements.homeLifecycleGraphic) renderHomeLifecycle(overview.tissues);
  if (elements.homeDataChart) renderHomeDataChart(overview.counts);
  if (elements.homeTissueMap) renderHomeTissueMap(overview.tissues);
}

function renderHomeLifecycle(tissues) {
  const categoryColors = {
    vegetative: "#8fb3b5",
    floral: "#b56b82",
    seed: "#c79a4a",
    root: "#7da169",
    special: "#6b3fa0",
  };
  elements.homeLifecycleGraphic.innerHTML = `
    <svg viewBox="0 0 420 170" class="mini-life-svg" aria-hidden="true">
      <path d="M38 108 C92 42 151 42 202 95 C249 145 324 125 382 52" class="mini-life-line"></path>
      ${tissues.map((tissue, index) => {
        const angle = (index / Math.max(tissues.length - 1, 1)) * Math.PI;
        const x = 28 + index * (364 / Math.max(tissues.length - 1, 1));
        const y = 92 - Math.sin(angle * 2.4) * 42 + Math.cos(angle * 1.1) * 16;
        const color = categoryColors[tissue.category] || "#8fb3b5";
        return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${color}"><title>${escapeHTML(tissue.code)} · ${escapeHTML(tissue.full_name)}</title></circle><text x="${x.toFixed(1)}" y="${(y + 22).toFixed(1)}">${escapeHTML(tissue.code)}</text></g>`;
      }).join("")}
    </svg>
  `;
}

function renderHomeDataChart(counts) {
  const transcript = counts.transcript_genes || 0;
  const protein = counts.protein_genes || 0;
  const shared = counts.shared_genes || 0;
  const all = counts.all_genes || 1;
  const values = [
    { label: "Transcript", value: transcript, color: "#4f7c8a" },
    { label: "Protein", value: protein, color: "#6b3fa0" },
    { label: "Shared", value: shared, color: "#b56b82" },
  ];
  elements.homeDataChart.innerHTML = `
    <div class="mini-donut" style="--rna:${(transcript / all) * 100}%; --protein:${(protein / all) * 100}%; --shared:${(shared / all) * 100}%;">
      <strong>${formatInt(shared)}</strong>
      <span>matched</span>
    </div>
    <div class="mini-legend">
      ${values.map((item) => `<span><i style="background:${item.color}"></i>${item.label}: ${formatInt(item.value)}</span>`).join("")}
    </div>
  `;
}

function renderHomeTissueMap(tissues) {
  const grouped = tissues.reduce((acc, tissue) => {
    acc[tissue.category] = (acc[tissue.category] || 0) + 1;
    return acc;
  }, {});
  const order = ["vegetative", "floral", "seed", "root", "special"];
  elements.homeTissueMap.innerHTML = `
    <div class="mini-category-bars">
      ${order.filter((category) => grouped[category]).map((category) => `
        <div>
          <span>${escapeHTML(category)}</span>
          <i style="width:${Math.max(12, grouped[category] * 10)}%"></i>
          <strong>${grouped[category]}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function renderHomeLifecycleDetail(groupKey) {
  const group = HOME_LIFECYCLE_GROUPS.find((item) => item.key === groupKey) || HOME_LIFECYCLE_GROUPS[0];
  const tissues = group.codes.map((code) => homeLifecycleTissueMap.get(code)).filter(Boolean);
  const transcriptMedian = median(tissues.map((tissue) => tissue.transcript_detected || 0));
  const proteinMedian = median(tissues.map((tissue) => tissue.protein_detected || 0));
  const maxDetected = Math.max(...Array.from(homeLifecycleTissueMap.values(), (tissue) => Math.max(tissue.transcript_detected || 0, tissue.protein_detected || 0)), 1);

  document.querySelectorAll("[data-home-life-group]").forEach((button) => {
    button.classList.toggle("active", button.dataset.homeLifeGroup === group.key);
  });
  elements.homeLifecycleDetail.innerHTML = `
    <div><span>Selected class</span><strong>${escapeHTML(group.key === "EBC" ? "Epidermal bladder cell" : group.key)}</strong><p>${escapeHTML(group.description)}</p></div>
    <div><span>Tissues</span><div class="home-life-tissue-list">${tissues.map((tissue) => `<button type="button" data-home-tissue="${escapeHTML(tissue.code)}" title="${escapeHTML(tissue.full_name)}">${escapeHTML(tissue.code)} · ${escapeHTML(tissue.full_name)}</button>`).join("")}</div></div>
    <div class="home-life-metrics"><span>Median detected genes</span><div><small>RNA</small><strong>${formatInt(transcriptMedian)}</strong><i style="--value:${(transcriptMedian / maxDetected) * 100}%"></i></div><div><small>Protein</small><strong>${formatInt(proteinMedian)}</strong><i style="--value:${(proteinMedian / maxDetected) * 100}%"></i></div><p>Botanical illustrations represent the sampled organ classes.</p></div>
  `;
}

function renderHomeLifecycleNavigator(tissues) {
  if (!elements.homeLifecycleGroups || !elements.homeLifecycleDetail) return;
  homeLifecycleTissueMap = new Map(tissues.map((tissue) => [tissue.code, tissue]));
  elements.homeLifecycleGroups.innerHTML = HOME_LIFECYCLE_GROUPS.filter((group) => group.key !== "EBC")
    .map((group) => {
      const available = group.codes.map((code) => homeLifecycleTissueMap.get(code)).filter(Boolean);
      return `
        <button class="home-organ-card ${escapeHTML(group.key.toLowerCase())}" type="button" data-home-life-group="${escapeHTML(group.key)}" style="--organ-accent:${group.accent}">
          <span class="home-organ-image"><img src="./assets/lifecycle/${escapeHTML(group.image)}" alt="${escapeHTML(group.key)} tissue illustrations"></span>
          <span class="home-organ-meta"><strong>${escapeHTML(group.key)}</strong><small>${available.map((tissue) => tissue.code).join(" · ")}</small></span>
          <b>${available.length}</b>
        </button>
      `;
    })
    .join("");
  renderHomeLifecycleDetail("Seedling");
}

function renderHomeCategoryChart(tissues, analysis) {
  if (!elements.homeCategoryChart) return;
  const grouped = tissues.reduce((acc, tissue) => {
    acc[tissue.category] = acc[tissue.category] || { count: 0, transcript: 0, protein: 0 };
    acc[tissue.category].count += 1;
    acc[tissue.category].transcript += tissue.transcript_detected || 0;
    acc[tissue.category].protein += tissue.protein_detected || 0;
    return acc;
  }, {});
  const categoryOrder = ["vegetative", "root", "seed", "floral", "special"];
  const categoryLabels = { vegetative: "Vegetative", root: "Root", seed: "Seed", floral: "Floral", special: "Specialized" };
  const maxCount = Math.max(...Object.values(grouped).map((item) => item.count), 1);
  elements.homeCategoryChart.innerHTML = categoryOrder
    .filter((category) => grouped[category])
    .map((category) => {
      const item = grouped[category];
      return `
        <div class="home-context-row">
          <strong>${escapeHTML(categoryLabels[category])}</strong>
          <span>${item.count} tissues</span>
          <div><i style="width:${(item.count / maxCount) * 100}%"></i></div>
        </div>
      `;
    })
    .join("");

  if (elements.homeCorrelationPreview) {
    const correlations = analysis?.tissue_correlations || [];
    const topItems = correlations.slice(0, 10);
    const maxCorrelation = Math.max(...topItems.map((item) => item.r_all || 0), 0.1);
    elements.homeCorrelationPreview.innerHTML = topItems.map((item) => `<div class="spark-row"><span>${escapeHTML(item.tissue_code)}</span><i style="width:${((item.r_all || 0) / maxCorrelation) * 100}%"></i><strong>${formatValue(item.r_all, 2)}</strong></div>`).join("");
  }
}

function renderHomeResourceSummary(summary) {
  const markerTotal = summary?.tissue_programs?.marker_total;
  const groups = summary?.cross_species?.group_counts || {};
  const markerLink = document.querySelector("#home-marker-total");
  if (markerLink && Number.isFinite(markerTotal)) markerLink.textContent = `${formatInt(markerTotal)} marker proteins →`;
  const countTargets = {
    "#home-conserved-count": groups.Conserved,
    "#home-divergent-count": groups.Divergent,
    "#home-shifted-count": groups.Lineage_shifted,
  };
  Object.entries(countTargets).forEach(([selector, value]) => {
    const target = document.querySelector(selector);
    if (target && Number.isFinite(value)) target.textContent = formatInt(value);
  });
}

function renderSuggestions(items) {
  if (!items.length) {
    elements.heroSuggestions.innerHTML = "";
    return;
  }
  elements.heroSuggestions.innerHTML = items
    .map(
      (item) => `
        <button class="suggestion-card" type="button" data-gene="${escapeHTML(item.gene_id)}">
          <div>
            <strong>${escapeHTML(geneLabel(item))}</strong>
            <p>${escapeHTML(item.title)}</p>
          </div>
          <span>${escapeHTML(item.best_at_hit || "Gene")}</span>
        </button>
      `
    )
    .join("");

  elements.heroSuggestions.querySelectorAll(".suggestion-card").forEach((button) => {
    button.addEventListener("click", async () => {
      elements.heroSearchInput.value = button.dataset.gene;
      await loadGene(button.dataset.gene);
    });
  });
}

function renderGene(payload) {
  state.currentGene = payload;
  setRouteDocumentMetadata("detail");

  elements.entryMeta.innerHTML = `
    <p class="eyebrow">Gene record</p>
    <div class="record-heading-row">
      <h3>${escapeHTML(payload.title)}</h3>
      <a class="text-link record-permalink" href="#detail/gene/${encodeURIComponent(payload.gene_id)}">Permalink</a>
    </div>
    <div class="entry-badges">
      <span class="entry-chip">${escapeHTML(geneLabel(payload))}</span>
      ${payload.best_at_hit ? `<span class="entry-chip">Arabidopsis: ${escapeHTML(payload.best_at_hit)}</span>` : ""}
      ${payload.partner_gene_id ? `<span class="entry-chip">Homoeolog: ${escapeHTML(payload.partner_gene_id)}</span>` : ""}
    </div>
    <p class="entry-note">${escapeHTML(payload.short_description || payload.ptr_annotated || payload.ath_annotated || "No functional description is currently available.")}</p>
    <div class="meta-line">
      <span class="annotation-badge">Transcript profile: ${payload.has_transcriptome ? "available" : "not detected"}</span>
      <span class="annotation-badge">Protein profile: ${payload.has_proteome ? "available" : "not detected"}</span>
      <span class="annotation-badge">RNA-protein r: ${formatValue(payload.cross_omics_correlation, 3)}</span>
      <span class="annotation-badge">Transcript Tau: ${formatValue(payload.transcript_tau, 3)}</span>
      <span class="annotation-badge">Protein Tau: ${formatValue(payload.protein_tau, 3)}</span>
    </div>
  `;

  const annotationCards = [];
  annotationCards.push(`
    <article class="annotation-card">
      <p class="eyebrow">Identifiers</p>
      <div class="annotation-badges">
        ${payload.chosen_transcript ? `<span class="annotation-badge">Representative transcript: ${escapeHTML(payload.chosen_transcript)}</span>` : ""}
        ${payload.source_protein_group ? `<span class="annotation-badge">Quantified protein group: ${escapeHTML(payload.source_protein_group)}</span>` : ""}
      </div>
      ${payload.synonyms ? `<p><strong>Homolog synonyms</strong><br>${escapeHTML(payload.synonyms)}</p>` : ""}
    </article>
  `);

  annotationCards.push(`
    <article class="annotation-card">
      <p class="eyebrow">Homology-based annotation</p>
      ${payload.best_at_hit ? `<p><strong>Best Arabidopsis homolog</strong><br>${escapeHTML(payload.best_at_hit)}</p>` : ""}
      ${payload.ptr_best_hit ? `<p><strong>Best Populus homolog</strong><br>${escapeHTML(payload.ptr_best_hit)}</p>` : ""}
      ${payload.ath_annotated ? `<p><strong>Arabidopsis functional evidence</strong><br>${escapeHTML(clipText(payload.ath_annotated))}</p>` : ""}
      ${payload.ptr_annotated ? `<p><strong>Populus description</strong><br>${escapeHTML(clipText(payload.ptr_annotated))}</p>` : ""}
      ${payload.curator_summary ? `<p><strong>Homolog annotation summary</strong><br>${escapeHTML(clipText(payload.curator_summary))}</p>` : ""}
      <p class="annotation-note">Descriptions are transferred from homologous plant genes and do not constitute direct experimental validation in quinoa.</p>
    </article>
  `);

  if (payload.marker_support) {
    annotationCards.push(`
      <article class="annotation-card">
        <p class="eyebrow">Tissue-enriched protein</p>
        <p><strong>Enriched tissue</strong><br>${escapeHTML(payload.marker_support.enriched_tissue || "NA")}</p>
        <p><strong>Protein FC vs second</strong><br>${formatValue(payload.marker_support.enriched_fc, 3)}</p>
        <p><strong>RNA enriched tissue</strong><br>${escapeHTML(payload.marker_support.rna_enriched_tissue || "NA")}</p>
        <p><strong>Matched RNA support</strong><br>${escapeHTML(payload.marker_support.same_tissue_supported || "NA")}</p>
      </article>
    `);
  }

  if (payload.computational_description) {
    annotationCards.push(`
      <article class="annotation-card">
        <p class="eyebrow">Computational Description</p>
        <p>${escapeHTML(clipText(payload.computational_description, 650))}</p>
      </article>
    `);
  }

  elements.entryAnnotation.innerHTML = annotationCards.join("");

  renderOmicsPanel(elements.transcriptPanel, "Transcriptome", payload.transcriptome, "transcriptome");
  renderOmicsPanel(elements.proteinPanel, "Proteome", payload.proteome, "proteome");
}

function renderEntries(payload) {
  state.browse.total = payload.total;
  state.browse.pageCount = payload.page_count;
  elements.browseStatus.textContent = `${formatInt(payload.total)} records · page ${payload.page}`;
  elements.browsePage.textContent = `${payload.page} / ${payload.page_count || 1}`;
  elements.browsePrev.disabled = payload.page <= 1;
  elements.browseNext.disabled = payload.page >= payload.page_count;

  if (!payload.items.length) {
    elements.entryGrid.innerHTML = buildEmpty("No records match the current filters.");
    return;
  }

  elements.entryGrid.innerHTML = payload.items
    .map(
      (item) => `
        <article class="entry-card" data-gene="${escapeHTML(item.gene_id)}">
          <div class="entry-title">
            <div>
              <span class="annotation-badge">${escapeHTML(geneLabel(item))}</span>
              <h4>${escapeHTML(item.title)}</h4>
            </div>
            <span class="entry-chip">${escapeHTML(item.best_at_hit || "No homolog")}</span>
          </div>
          <p>${escapeHTML(item.model_name || "No model name available")}</p>
          <div class="meta-line">
            <span class="annotation-badge">RNA max: ${item.transcript_max_tissue || "NA"}</span>
            <span class="annotation-badge">Protein max: ${item.protein_max_tissue || "NA"}</span>
          </div>
          <div class="meta-line">
            <span class="annotation-badge">R Tau ${formatValue(item.transcript_tau, 3)}</span>
            <span class="annotation-badge">P Tau ${formatValue(item.protein_tau, 3)}</span>
            <span class="annotation-badge">Corr ${formatValue(item.cross_omics_correlation, 3)}</span>
          </div>
        </article>
      `
    )
    .join("");

  elements.entryGrid.querySelectorAll(".entry-card").forEach((card) => {
    card.addEventListener("click", async () => {
      await loadGene(card.dataset.gene);
    });
  });
}

function renderTissues(items) {
  state.tissues = items;
  elements.tissueGrid.innerHTML = items
    .map(
      (item) => `
        <article class="tissue-card ${state.selectedTissue === item.code ? "active" : ""}" data-tissue="${escapeHTML(item.code)}">
          <div class="mini-meta">
            <strong>${escapeHTML(item.code)}</strong>
            <span class="tissue-badge">${escapeHTML(item.category || "")}</span>
          </div>
          <p>${escapeHTML(item.full_name)}</p>
          <p>RNA-detected genes: ${formatInt(item.transcript_detected)}</p>
          <p>Protein-detected genes: ${formatInt(item.protein_detected)}</p>
          <p>RNA-protein r: ${formatValue(item.correlation?.r_all, 3)}</p>
        </article>
      `
    )
    .join("");

  elements.tissueGrid.querySelectorAll(".tissue-card").forEach((card) => {
    card.addEventListener("click", async () => {
      await loadTissue(card.dataset.tissue);
    });
  });
}

function renderMiniGeneList(items, valueLabel, digits = 2) {
  if (!items.length) {
    return buildEmpty("No data available.");
  }
  return items
    .map(
      (item) => `
        <div class="mini-card">
          <div class="mini-meta">
            <button class="mini-gene-link" type="button" data-gene="${escapeHTML(item.gene_id)}" aria-label="Open gene report for ${escapeHTML(item.gene_id)}">${escapeHTML(geneLabel(item))}</button>
            <span>${formatValue(item[valueLabel], digits)}</span>
          </div>
          <p>${escapeHTML(item.short_description || item.model_name || item.best_at_hit || "No functional annotation available")}</p>
        </div>
      `
    )
    .join("");
}

function renderTissueDetail(payload) {
  state.selectedTissue = payload.tissue.code;
  renderTissues(state.tissues);
  setRouteDocumentMetadata("tissues");

  elements.tissueDetail.innerHTML = `
    <article class="tissue-detail-card">
      <p class="eyebrow">Selected Tissue</p>
      <div class="record-heading-row">
        <h4>${escapeHTML(payload.tissue.code)} · ${escapeHTML(payload.tissue.full_name)}</h4>
        <a class="text-link record-permalink" href="#tissues/${encodeURIComponent(payload.tissue.code)}">Permalink</a>
      </div>
      <p>${escapeHTML(payload.tissue.category)} tissue group</p>
      <div class="meta-line">
        <span class="annotation-badge">Tissue-enriched proteins: ${formatInt(payload.protein_enriched_count)}</span>
        <span class="annotation-badge">All genes r: ${formatValue(payload.correlation?.r_all, 3)}</span>
        <span class="annotation-badge">Enriched genes r: ${formatValue(payload.correlation?.r_enriched, 3)}</span>
      </div>
    </article>
    <article class="tissue-detail-card">
      <p class="eyebrow">Top Transcripts</p>
      <div class="mini-list">${renderMiniGeneList(payload.top_transcripts.slice(0, 8), "value", 2)}</div>
    </article>
    <article class="tissue-detail-card">
      <p class="eyebrow">Top Proteins</p>
      <div class="mini-list">${renderMiniGeneList(payload.top_proteins.slice(0, 8), "value", 2)}</div>
    </article>
    <article class="tissue-detail-card">
      <p class="eyebrow">RNA-Supported Markers</p>
      <div class="mini-list">
        ${
          payload.supported_markers.length
            ? payload.supported_markers.slice(0, 8).map((item) => `
                <div class="mini-card">
                  <div class="mini-meta">
                    <button class="mini-gene-link" type="button" data-gene="${escapeHTML(item.gene_id)}" aria-label="Open gene report for ${escapeHTML(item.gene_id)}">${escapeHTML(geneLabel(item))}</button>
                    <span>FC ${formatValue(item.enriched_fc, 2)}</span>
                  </div>
                  <p>${escapeHTML(item.short_description || item.model_name || item.best_at_hit || "No functional annotation available")}</p>
                  <p>Matched RNA support: ${escapeHTML(item.same_tissue_supported)}</p>
                </div>
              `).join("")
            : buildEmpty("No RNA-supported tissue-enriched proteins are available for this tissue.")
        }
      </div>
    </article>
  `;
}

function renderCorrelationBars(items) {
  if (!elements.correlationBars) {
    return;
  }
  const maxValue = Math.max(...items.map((item) => item.r_all || 0), 0.1);
  elements.correlationBars.innerHTML = items
    .map(
      (item) => `
        <div class="bar-row">
          <div class="bar-meta">
            <span>${item.tissue_code}</span>
            <strong>${formatValue(item.r_all, 3)}</strong>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${(item.r_all / maxValue) * 100}%"></div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderAnalysisList(target, items, valueField, label) {
  if (!target) {
    return;
  }
  target.innerHTML = items
    .map(
      (item) => `
        <div class="mini-card">
          <div class="mini-meta">
            <strong>${escapeHTML(item.gene_id)}</strong>
            <span>${label} ${formatValue(item[valueField], 3)}</span>
          </div>
          <p>${escapeHTML(item.short_description || item.model_name || item.best_at_hit || "No functional annotation available")}</p>
        </div>
      `
    )
    .join("");
}

function renderSupportedMarkers(items) {
  if (!elements.supportedMarkerList) {
    return;
  }
  elements.supportedMarkerList.innerHTML = items
    .slice(0, 12)
    .map(
      (item) => `
        <div class="mini-card">
          <div class="mini-meta">
            <strong>${escapeHTML(item.gene_id)}</strong>
            <span>${escapeHTML(item.enriched_tissue)} · FC ${formatValue(item.enriched_fc, 2)}</span>
          </div>
          <p>${escapeHTML(item.short_description || item.model_name || item.best_at_hit || "No functional annotation available")}</p>
        </div>
      `
    )
    .join("");
}

function renderAnalysis(payload) {
  state.analysis = payload;
  renderAnalysisVisuals(payload);
  renderCorrelationBars(payload.tissue_correlations);
  renderAnalysisList(elements.topCorrelationList, payload.top_correlated, "cross_omics_correlation", "R");
  renderAnalysisList(elements.discordantList, payload.discordant, "cross_omics_correlation", "R");

  if (elements.transcriptSpecificList) {
    elements.transcriptSpecificList.innerHTML = payload.transcript_specific
      .map(
        (item) => `
          <div class="mini-card">
            <div class="mini-meta">
              <strong>${escapeHTML(item.gene_id)}</strong>
              <span>${escapeHTML(item.transcript_max_tissue)} · Tau ${formatValue(item.transcript_tau, 3)}</span>
            </div>
            <p>${escapeHTML(item.short_description || item.model_name || item.best_at_hit || "No functional annotation available")}</p>
          </div>
        `
      )
      .join("");
  }

  if (elements.proteinSpecificList) {
    elements.proteinSpecificList.innerHTML = payload.protein_specific
      .map(
        (item) => `
          <div class="mini-card">
            <div class="mini-meta">
              <strong>${escapeHTML(item.gene_id)}</strong>
              <span>${escapeHTML(item.protein_max_tissue)} · Tau ${formatValue(item.protein_tau, 3)}</span>
            </div>
            <p>${escapeHTML(item.short_description || item.model_name || item.best_at_hit || "No functional annotation available")}</p>
          </div>
        `
      )
      .join("");
  }

  renderSupportedMarkers(payload.supported_markers);
}

function renderAnalysisVisuals(payload) {
  const items = payload.tissue_correlations || [];
  const width = 520;
  const height = 230;
  const maxCount = Math.max(...items.map((item) => item.gene_count || 0), 1);
  const maxSqrtCount = Math.sqrt(maxCount);
  const maxR = Math.max(...items.map((item) => item.r_all || 0), 0.1);
  if (elements.analysisBubble) {
    elements.analysisBubble.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="bubble-svg" aria-hidden="true">
        <line x1="38" y1="188" x2="500" y2="188" class="axis-line"></line>
        <line x1="38" y1="28" x2="38" y2="188" class="axis-line"></line>
        <text x="270" y="216" class="axis-label axis-label-center">sqrt(tissue-enriched proteins)</text>
        <text x="8" y="35" class="axis-label rotate-label">RNA-protein r</text>
        ${items.map((item, index) => {
          const x = 48 + (Math.sqrt(item.gene_count || 0) / maxSqrtCount) * 430;
          const y = 188 - ((item.r_all || 0) / maxR) * 145;
          const radius = 5 + Math.sqrt(item.n_all || 1) / 55;
          const color = index % 2 ? "#6b3fa0" : "#4f7c8a";
          return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(1)}" fill="${color}" opacity="0.78"><title>${escapeHTML(item.tissue_code)} · r=${formatValue(item.r_all, 3)} · enriched=${formatInt(item.gene_count)}</title></circle><text x="${x.toFixed(1)}" y="${(y - radius - 4).toFixed(1)}">${escapeHTML(item.tissue_code)}</text></g>`;
        }).join("")}
      </svg>
    `;
  }

  if (elements.analysisLayerDiagram) {
    elements.analysisLayerDiagram.innerHTML = `
      <div class="layer-node protein-layer">Protein tissue-enriched candidates</div>
      <div class="layer-edge"></div>
      <div class="layer-node transcript-layer">Same-tissue transcript support</div>
      <div class="layer-edge"></div>
      <div class="layer-node function-layer">Functional activity categories</div>
      <div class="layer-outputs">
        <span>Marker candidates</span>
        <span>Tissue-enhanced classes</span>
        <span>TF family activity</span>
        <span>Translation categories</span>
      </div>
    `;
  }

  const tiles = [
    { label: "Concordant genes", value: payload.top_correlated.length, href: "#analysis" },
    { label: "Discordant genes", value: payload.discordant.length, href: "#analysis" },
    { label: "Transcript-preferential", value: payload.transcript_specific.length, href: "#analysis" },
    { label: "Protein-preferential", value: payload.protein_specific.length, href: "#analysis" },
    { label: "RNA-supported proteins", value: payload.supported_markers.length, href: "#analysis" },
  ];
  if (elements.analysisSpecificityTiles) {
    elements.analysisSpecificityTiles.innerHTML = tiles
      .map((tile) => `
        <a href="${tile.href}" class="specificity-tile">
          <strong>${formatInt(tile.value)}</strong>
          <span>${escapeHTML(tile.label)}</span>
        </a>
      `)
      .join("");
  }
}

function renderDownloads(items) {
  state.downloads = items;
  elements.downloadGrid.innerHTML = items
    .map(
      (item) => {
        const action = item.available
          ? `<a class="download-link" href="${item.href}">Download</a>`
          : `<span class="download-link unavailable">Unavailable</span>`;
        return `
          <article class="download-card">
            <p class="eyebrow">Download</p>
            <h4>${escapeHTML(item.label)}</h4>
            <p>${escapeHTML(item.description)}</p>
            <p>${escapeHTML(item.file_name)}</p>
            <p>${escapeHTML(item.size)} · updated ${escapeHTML(item.updated_at)}</p>
            ${item.sha256 ? `<p class="download-checksum" title="${escapeHTML(item.sha256)}"><strong>SHA-256</strong> <code>${escapeHTML(item.sha256.slice(0, 16))}…</code></p>` : ""}
            ${action}
          </article>
        `;
      }
    )
    .join("");
}

function renderToolStatus(payload) {
  state.tools = payload;
  const built = { ...(payload.blast?.databases || {}), ...(payload.blast?.wsl_databases || {}) };
  const commands = payload.blast?.wsl_commands || payload.blast?.commands || {};
  const builtCount = Object.values(built).filter(Boolean).length;
  elements.toolStatusChip.textContent = builtCount ? `BLAST ready · ${builtCount} databases` : "BLAST unavailable in this deployment";
  const sequenceFiles = payload.sequence_files || {};
  elements.toolStatus.innerHTML = `
    <article>
      <strong>Genome release</strong>
      <span>${escapeHTML(payload.genome_version || "Cq_V4")}</span>
    </article>
    <article>
      <strong>Sequence files</strong>
      <span>${Object.values(sequenceFiles).filter((item) => item.available).length} available</span>
    </article>
    <article>
      <strong>GO background</strong>
      <span>${sequenceFiles.go_gene2go?.available ? "Ready" : "Missing"}</span>
    </article>
    <article>
      <strong>BLAST databases</strong>
      <span>${Object.entries(built).map(([key, value]) => `${key}:${value ? "ready" : "missing"}`).join(" · ")}</span>
    </article>
    <article>
      <strong>BLAST commands</strong>
      <span>${Object.entries(commands).filter(([, value]) => value).map(([key]) => key).join(" · ") || "Not detected"}</span>
    </article>
  `;
}

function setToolBusy(target, message = "Running...") {
  target.innerHTML = `<div class="empty-block"><p>${escapeHTML(message)}</p></div>`;
}

function renderSimpleTable(items, columns) {
  if (!items.length) {
    return buildEmpty("No records were returned.");
  }
  return `
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr>${columns.map((column) => `<th>${escapeHTML(column.label)}</th>`).join("")}</tr></thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              ${columns.map((column) => `<td>${escapeHTML(column.format ? column.format(item[column.key], item) : item[column.key])}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderBatchResults(payload) {
  const columns = [
    { key: "gene_id", label: "Gene ID" },
    { key: "title", label: "Annotation" },
    { key: "transcript_max_tissue", label: "RNA peak" },
    { key: "protein_max_tissue", label: "Protein peak" },
    { key: "cross_omics_correlation", label: "RNA-protein r", format: (value) => formatValue(value, 3) },
  ];
  elements.batchResults.innerHTML = `
    <p class="tool-note">${formatInt(payload.found_count)} of ${formatInt(payload.input_count)} IDs found${payload.missing.length ? `; missing: ${escapeHTML(payload.missing.slice(0, 8).join(", "))}` : ""}</p>
    ${renderSimpleTable(payload.items, columns)}
  `;
}

function renderHeatmap(payload) {
  const tissues = payload.tissues || [];
  const tissueLabels = tissues.map((tissue) => tissue.code);
  const layers = payload.layers || [];
  if (!layers.some((layer) => layer.matrix.length)) {
    elements.heatmapResults.innerHTML = buildEmpty("No expression profiles were found for this gene list.");
    return;
  }
  elements.heatmapResults.innerHTML = layers
    .map((layer) => `
      <div class="heatmap-block">
        <div class="mini-meta">
          <strong>${escapeHTML(layer.name)}</strong>
          <span>z-score by gene</span>
        </div>
        <div class="heatmap-wrap">
          <div class="heatmap-header" style="grid-template-columns: 9rem repeat(${tissueLabels.length}, 1.55rem);">
            <span></span>
            ${tissueLabels.map((label) => `<span>${escapeHTML(label)}</span>`).join("")}
          </div>
          ${layer.matrix.map((row) => `
            <div class="heatmap-row" style="grid-template-columns: 9rem repeat(${tissueLabels.length}, 1.55rem);">
              <strong>${escapeHTML(row.gene_id)}</strong>
              ${row.zscores.map((value) => {
                const factor = value === null || value === undefined ? null : Math.max(0, Math.min(1, (value + 2.5) / 5));
                const color = factor === null ? "#edf0ee" : gradientColor(PALETTES[layer.name], factor);
                return `<span title="${escapeHTML(row.gene_id)} ${formatValue(value, 3)}" style="background:${color}"></span>`;
              }).join("")}
            </div>
          `).join("")}
        </div>
      </div>
    `)
    .join("");
}

function renderGOTable(terms) {
  if (!terms.length) {
    return buildEmpty("No GO terms were returned.");
  }
  return `
    <div class="table-scroll go-table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>GO ID</th>
            <th>Term</th>
            <th>Namespace</th>
            <th>Overlap</th>
            <th>Gene ratio</th>
            <th>BH q</th>
            <th>Significance</th>
          </tr>
        </thead>
        <tbody>
          ${terms.map((term) => `
            <tr>
              <td>${escapeHTML(term.go_id)}</td>
              <td>
                ${escapeHTML(term.name)}
                ${term.context_note ? `<small class="go-context-note">${escapeHTML(term.context_note)}</small>` : ""}
              </td>
              <td>${escapeHTML(term.namespace)}</td>
              <td>${formatInt(term.overlap)}</td>
              <td>${formatValue(term.gene_ratio, 3)}</td>
              <td>${formatValue(term.q_value, 4)}</td>
              <td><span class="go-badge ${term.is_significant ? "significant" : ""}">${term.is_significant ? "Significant" : "Not significant"}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderGO(payload) {
  const allTerms = payload.terms || [];
  const plantFocused = elements.goDisplayScope?.value !== "all";
  const terms = plantFocused ? allTerms.filter((term) => term.default_visible !== false) : allTerms;
  const hiddenContextTerms = allTerms.filter((term) => term.default_visible === false).length;
  const countItems = `
    <span>${formatInt(payload.query_gene_count ?? payload.annotated_input_count)} valid input genes</span>
    <span>${formatInt(payload.annotated_input_count)} with GO annotation</span>
    <span>${formatInt(payload.background_count)} atlas background genes</span>
    <span>${formatInt(payload.annotated_background_count ?? payload.background_count)} background genes with GO</span>
    <span>${formatInt(payload.missing_annotation?.length || 0)} without GO annotation</span>
    <span>${formatInt(payload.unknown_genes?.length || 0)} unknown IDs</span>
  `;
  const countSummary = `<div class="go-summary">${countItems}</div>`;
  const scopeNote = plantFocused
    ? `Plant-focused view hides ${formatInt(hiddenContextTerms)} cross-kingdom or allergen-context terms from this result set. BH correction still uses the complete tested term set.`
    : "Complete view includes cross-kingdom ancestor and allergen-context GO terms; contextual labels identify terms that may sound non-plant-specific.";
  if (!terms.length) {
    const message = plantFocused && allTerms.length
      ? "No plant-focused terms remain in the current result set. Select All GO terms to inspect the complete result."
      : "No enriched GO terms were detected for the submitted genes.";
    elements.goResults.innerHTML = `${countSummary}<p class="tool-note go-scope-note">${escapeHTML(scopeNote)}</p>${buildEmpty(message)}`;
    return;
  }
  const significantTerms = terms.filter((term) => term.is_significant);
  const hasSignificant = significantTerms.length > 0;
  const displayTerms = hasSignificant ? terms : terms.slice(0, 10);
  const topTerms = displayTerms.slice(0, 20);
  const maxRatio = Math.max(...topTerms.map((term) => term.gene_ratio || 0), 0.01);
  const minQ = Math.min(...topTerms.map((term) => term.q_value || 1), 1);
  const maxQ = Math.max(...topTerms.map((term) => term.q_value || 1), minQ + 0.0001);
  const dotplot = `
    <div class="go-dotplot">
      ${topTerms.map((term) => {
        const ratio = (term.gene_ratio || 0) / maxRatio;
        const qFactor = 1 - Math.min(1, Math.max(0, ((term.q_value || 1) - minQ) / (maxQ - minQ)));
        const color = gradientColor(["#eceff1", "#8fb3b5", "#6b3fa0"], qFactor);
        const size = 0.7 + Math.min(1.4, Math.sqrt(term.overlap || 1) * 0.28);
        return `
          <div class="go-dot-row${term.default_visible === false ? " context-term" : ""}">
            <span>${escapeHTML(term.name)}</span>
            <i style="left:${Math.max(2, ratio * 94)}%; width:${size}rem; height:${size}rem; background:${color}" title="${escapeHTML(term.go_id)} · overlap ${term.overlap} · q=${formatValue(term.q_value, 4)}${term.context_note ? ` · ${escapeHTML(term.context_note)}` : ""}"></i>
          </div>
        `;
      }).join("")}
    </div>
  `;
  const summaryText = hasSignificant
    ? `${formatInt(significantTerms.length)} significant GO terms at q < ${formatValue(payload.significance_threshold ?? 0.05, 2)}`
    : "No GO terms passed q < 0.05; showing the top 10 by BH q-value.";
  elements.goResults.innerHTML = `
    <div class="go-summary">
      <strong>${escapeHTML(summaryText)}</strong>
      ${countItems}
    </div>
    <p class="tool-note go-scope-note">${escapeHTML(scopeNote)}</p>
    ${dotplot}
    ${renderGOTable(displayTerms.slice(0, hasSignificant ? 40 : 10))}
  `;
}

function tissueLabel(code) {
  const tissue = state.overview?.tissues?.find((item) => item.code === code);
  return tissue ? `${tissue.code} · ${tissue.full_name}` : code;
}

function renderResearchResources(markers, enhanced = null, goNetwork = null, activity = null, summary = null) {
  state.resources.markers = markers;
  state.resources.enhanced = enhanced;
  state.resources.goNetwork = goNetwork;
  state.resources.activity = activity;
  state.resources.fig2Summary = summary;
  if (summary) {
    renderFig2Summary(summary, markers);
  }
  renderMarkerResource(markers);
  if (enhanced) {
    renderEnhancedResource(enhanced);
  }
  if (goNetwork) {
    renderGoNetworkResource(goNetwork);
  }
  if (activity && elements.activityHeatmaps) {
    renderActivityResource(activity);
  }
}

function renderFig2Summary(summary, markers = null) {
  if (!elements.fig2SummaryCards) {
    return;
  }
  const filtered = markers?.filtered_total ?? summary.marker_total;
  elements.fig2SummaryCards.innerHTML = `
    <article><span>Protein marker candidates</span><strong>${formatInt(summary.marker_total)}</strong><small>threshold-defined tissue-enriched entries</small></article>
    <article><span>Current marker selection</span><strong>${formatInt(filtered)}</strong><small>entries matching active filters</small></article>
    <article><span>RNA-supported enriched proteins</span><strong>${formatInt(summary.rna_supported_total)}</strong><small>${formatInt(summary.protein_only_total)} protein-only entries</small></article>
    <article><span>Enhanced protein classes</span><strong>${formatInt(summary.enhanced_class_total)}</strong><small>${formatInt(summary.go_term_total)} GO terms in enhanced network</small></article>
  `;
}

function applyResourceModule() {
  const selected = elements.resourceModuleSelect?.value || state.fig2.activeResource || "fig2";
  state.fig2.activeResource = selected;
  if (elements.resourceBreadcrumbCurrent) {
    elements.resourceBreadcrumbCurrent.textContent = RESOURCE_LABELS[selected] || "Data Resource";
  }
  if (state.activeRoute === "analysis") {
    setRouteDocumentMetadata("analysis");
  }
  document.body.classList.toggle("fig3-resource-mode", selected === "fig3" && state.activeRoute === "analysis");
  elements.resourceWorkspaces?.forEach((workspace) => {
    workspace.classList.toggle("active", workspace.dataset.resourceModule === selected);
  });
  if (selected === "fig2" && state.fig2.activeTab === "enhanced" && state.resources.goNetwork) {
    scheduleGoNetworkLayout();
  }
  if (state.activeRoute === "analysis") {
    ensureResourceModuleLoaded(selected).catch(console.error);
  }
}

function renderFig2GeneHeatmap(container, heatmap, options = {}) {
  if (!container) {
    return;
  }
  if (container.heatmapCleanup) {
    container.heatmapCleanup();
    container.heatmapCleanup = null;
  }
  const columns = heatmap?.columns || [];
  const rows = heatmap?.rows || [];
  const title = options.title || "Gene heatmap";
  const subtitle = options.subtitle || "Row z-score of tissue mean values";
  const palette = options.palette || "protein";
  const rawLabel = options.rawLabel || "mean";
  if (!rows.length || !columns.length) {
    container.innerHTML = buildEmpty("No heatmap rows are available.");
    return;
  }
  const labelWidth = 220;
  const cellWidth = 25;
  const rowHeight = 22;
  const headerHeight = 34;
  const virtualWidth = labelWidth + columns.length * cellWidth;
  const virtualHeight = headerHeight + rows.length * rowHeight;
  container.innerHTML = `
    <div class="heatmap-card-head">
      <div>
        <div class="chart-title">${escapeHTML(title)}</div>
        <p>${escapeHTML(subtitle)}</p>
      </div>
      <span>${formatInt(rows.length)} genes</span>
    </div>
    <div class="canvas-heatmap-scroll large-heatmap-scroll" tabindex="0" aria-label="${escapeHTML(title)}. Scroll to inspect genes; click a row or cell to open the gene report.">
      <div class="canvas-heatmap-content" style="width:${virtualWidth}px;height:${virtualHeight}px">
        <canvas class="canvas-heatmap"></canvas>
      </div>
    </div>
    <div class="canvas-heatmap-tooltip" role="tooltip" hidden></div>
  `;
  const scroll = container.querySelector(".canvas-heatmap-scroll");
  const canvas = container.querySelector(".canvas-heatmap");
  const tooltip = container.querySelector(".canvas-heatmap-tooltip");
  const context = canvas.getContext("2d", { alpha: false });
  let frame = 0;

  const fitText = (text, maxWidth) => {
    if (context.measureText(text).width <= maxWidth) return text;
    let clipped = text;
    while (clipped.length > 4 && context.measureText(`${clipped}…`).width > maxWidth) clipped = clipped.slice(0, -1);
    return `${clipped}…`;
  };

  const draw = () => {
    frame = 0;
    const width = Math.max(1, scroll.clientWidth);
    const height = Math.max(1, scroll.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#f7f8f3";
    context.fillRect(0, 0, width, height);
    context.font = '600 11px "Segoe UI", Arial, sans-serif';
    context.textBaseline = "middle";

    const startRow = Math.max(0, Math.floor((scroll.scrollTop - headerHeight) / rowHeight));
    const endRow = Math.min(rows.length, Math.ceil((scroll.scrollTop + height) / rowHeight) + 1);
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex += 1) {
      const row = rows[rowIndex];
      const y = headerHeight + rowIndex * rowHeight - scroll.scrollTop;
      context.fillStyle = rowIndex % 2 ? "#f4f6f1" : "#fafbf7";
      context.fillRect(0, y, width, rowHeight - 1);
      for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
        const x = labelWidth + columnIndex * cellWidth - scroll.scrollLeft;
        if (x + cellWidth < labelWidth || x > width) continue;
        context.fillStyle = heatmapColor(row.zscores?.[columns[columnIndex]], palette);
        context.fillRect(x + 1, y + 2, cellWidth - 2, rowHeight - 4);
        context.strokeStyle = "rgba(24,48,40,0.08)";
        context.strokeRect(x + 1.5, y + 2.5, cellWidth - 3, rowHeight - 5);
      }
      context.fillStyle = rowIndex % 2 ? "#f4f6f1" : "#fafbf7";
      context.fillRect(0, y, labelWidth, rowHeight - 1);
      if (row.class_id) {
        context.fillStyle = FIG2_GO_CLASS_COLORS[`class${row.class_id}`] || "#ccd2ca";
        context.beginPath();
        context.arc(9, y + rowHeight / 2, 3.5, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = "#263d33";
      context.fillText(fitText(geneLabel(row), labelWidth - (row.class_id ? 24 : 12)), row.class_id ? 17 : 7, y + rowHeight / 2);
    }

    context.fillStyle = "#f0f3ed";
    context.fillRect(0, 0, width, headerHeight);
    context.fillStyle = "#536157";
    context.font = '700 10px "Segoe UI", Arial, sans-serif';
    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      const x = labelWidth + columnIndex * cellWidth - scroll.scrollLeft;
      if (x + cellWidth < labelWidth || x > width) continue;
      context.save();
      context.translate(x + cellWidth / 2, headerHeight - 4);
      context.rotate(-Math.PI / 2);
      context.textAlign = "left";
      context.fillText(columns[columnIndex], 0, 0);
      context.restore();
    }
    context.fillStyle = "#f0f3ed";
    context.fillRect(0, 0, labelWidth, headerHeight);
    context.fillStyle = "#263d33";
    context.textAlign = "left";
    context.fillText("Gene", 7, headerHeight / 2);
    context.strokeStyle = "#dfe5dc";
    context.beginPath();
    context.moveTo(labelWidth + 0.5, 0);
    context.lineTo(labelWidth + 0.5, height);
    context.moveTo(0, headerHeight + 0.5);
    context.lineTo(width, headerHeight + 0.5);
    context.stroke();
  };
  const scheduleDraw = () => {
    if (!frame) frame = requestAnimationFrame(draw);
  };
  const hitAt = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (y < headerHeight) return null;
    const rowIndex = Math.floor((y + scroll.scrollTop - headerHeight) / rowHeight);
    if (rowIndex < 0 || rowIndex >= rows.length) return null;
    const columnIndex = x < labelWidth ? -1 : Math.floor((x + scroll.scrollLeft - labelWidth) / cellWidth);
    if (columnIndex >= columns.length) return null;
    return { row: rows[rowIndex], column: columnIndex >= 0 ? columns[columnIndex] : null };
  };
  canvas.addEventListener("mousemove", (event) => {
    const hit = hitAt(event);
    if (!hit) {
      tooltip.hidden = true;
      return;
    }
    const row = hit.row;
    const details = [geneLabel(row), row.gene_id, row.class_id ? `Class ${row.class_id}` : ""];
    if (hit.column) {
      details.push(`Tissue: ${hit.column}`);
      details.push(`${rawLabel}: ${formatRaw(row.raw_values?.[hit.column])}`);
      details.push(`row z-score: ${formatValue(row.zscores?.[hit.column], 3)}`);
    }
    if (row.enriched_tissue) details.push(`Marker tissue: ${row.enriched_tissue}`);
    if (row.enhanced_tissue) details.push(`Enhanced tissue: ${row.enhanced_tissue}`);
    if (row.rna_support) details.push(`RNA support: ${row.rna_support}`);
    if (row.fc) details.push(`FC: ${formatValue(row.fc, 2)}`);
    tooltip.textContent = details.filter(Boolean).join(" · ");
    tooltip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - 330)}px`;
    tooltip.style.top = `${Math.min(event.clientY + 14, window.innerHeight - 90)}px`;
    tooltip.hidden = false;
  });
  canvas.addEventListener("mouseleave", () => { tooltip.hidden = true; });
  canvas.addEventListener("click", (event) => {
    const hit = hitAt(event);
    if (hit?.row?.gene_id) loadGene(hit.row.gene_id).catch(console.error);
  });
  scroll.addEventListener("scroll", scheduleDraw, { passive: true });
  const observer = new ResizeObserver(scheduleDraw);
  observer.observe(scroll);
  container.heatmapCleanup = () => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
  };
  draw();
}

function renderMarkerResource(payload) {
  const counts = payload.counts || [];
  const supportRows = payload.rna_support_counts || [];
  const filters = payload.filters || {};
  const selectedTissue = filters.tissue || elements.markerTissue.value || "";
  renderFig2Summary(state.resources.fig2Summary || {}, payload);

  const supportByTissue = {};
  supportRows.forEach((row) => {
    const tissue = row.Enriched_Tissue;
    supportByTissue[tissue] ||= { yes: 0, no: 0 };
    if (row.RNA_same_tissue_supported === "Yes") {
      supportByTissue[tissue].yes += row.N_genes || 0;
    } else {
      supportByTissue[tissue].no += row.N_genes || 0;
    }
  });
  const maxCount = Math.max(...counts.map((item) => item.N_genes || 0), 1);
  elements.markerCountChart.innerHTML = `
    <div class="chart-title">Protein tissue-enhanced counts · ≥4× other-tissue mean</div>
    <p class="chart-method-note">Independent count summary; definition differs from the 2× second-highest marker table.</p>
    <div class="marker-bar-list">
      ${counts.map((item) => {
        const support = supportByTissue[item.Enriched_Tissue] || { yes: 0, no: 0 };
        const supportTotal = support.yes + support.no || 1;
        return `
          <button type="button" class="marker-bar-row ${item.Enriched_Tissue === selectedTissue ? "active" : ""}" data-tissue="${escapeHTML(item.Enriched_Tissue)}" title="${escapeHTML(tissueLabel(item.Enriched_Tissue))}">
            <span>${escapeHTML(tissueLabel(item.Enriched_Tissue))}</span>
            <p><i style="width:${((item.N_genes || 0) / maxCount) * 100}%"></i></p>
            <strong>${formatInt(item.N_genes)}</strong>
            <em><b style="width:${(support.yes / supportTotal) * 100}%"></b><b class="protein-only" style="width:${(support.no / supportTotal) * 100}%"></b></em>
            <small>${formatInt(support.yes)} / ${formatInt(supportTotal)} RNA-supported</small>
          </button>
        `;
      }).join("")}
    </div>
  `;
  elements.markerCountChart.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      elements.markerTissue.value = button.dataset.tissue;
      loadMarkerResource().catch(console.error);
    });
  });

  renderMarkerSupportChart(supportRows, selectedTissue);
  renderMarkerFocusPanel(payload.markers || []);
  renderFig2GeneHeatmap(elements.markerProteinHeatmap, payload.heatmaps?.protein_markers, {
    title: "Protein marker heatmap",
    subtitle: "Top tissue-enriched marker proteins per tissue, shown as log2(mean + 1) row z-scores.",
    palette: "protein",
    rawLabel: "protein mean",
  });
  renderFig2GeneHeatmap(elements.markerRnaHeatmap, payload.heatmaps?.rna_supported_markers, {
    title: "Matched transcript heatmap",
    subtitle: "The same marker protein genes displayed with transcript TPM tissue means, log2(mean + 1) row z-score.",
    palette: "rna",
    rawLabel: "TPM mean",
  });
  renderMarkerTable(payload);
}

function renderMarkerSupportChart(rows, selectedTissue = "") {
  if (!elements.markerSupportChart) {
    return;
  }
  const tissues = [...new Set(rows.map((item) => item.Enriched_Tissue))];
  const maxTotal = Math.max(
    ...tissues.map((tissue) => rows.filter((item) => item.Enriched_Tissue === tissue).reduce((sum, item) => sum + (item.N_genes || 0), 0)),
    1
  );
  elements.markerSupportChart.innerHTML = `
    <div class="support-legend">
      <span><i class="support-yes"></i>Same-tissue RNA</span>
      <span><i class="support-no"></i>Protein only</span>
    </div>
    <div class="support-stack-list">
      ${tissues.map((tissue) => {
        const yes = rows.find((item) => item.Enriched_Tissue === tissue && item.RNA_same_tissue_supported === "Yes")?.N_genes || 0;
        const no = rows.find((item) => item.Enriched_Tissue === tissue && item.RNA_same_tissue_supported === "No")?.N_genes || 0;
        const total = yes + no || 1;
        return `
          <button type="button" class="${tissue === selectedTissue ? "active" : ""}" data-tissue="${escapeHTML(tissue)}" title="Show RNA-supported ${escapeHTML(tissue)} markers">
            <span>${escapeHTML(tissueLabel(tissue))}</span>
            <p style="width:${Math.max(5, (total / maxTotal) * 100)}%">
              <i class="support-yes" style="width:${(yes / total) * 100}%"></i>
              <i class="support-no" style="width:${(no / total) * 100}%"></i>
            </p>
            <strong>${formatInt(yes)} / ${formatInt(total)}</strong>
          </button>
        `;
      }).join("")}
    </div>
  `;
  elements.markerSupportChart.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      elements.markerTissue.value = button.dataset.tissue;
      elements.markerSupport.value = "yes";
      loadMarkerResource().catch(console.error);
    });
  });
}

function renderMarkerFocusPanel(markers) {
  const top = [...markers].sort((a, b) => (b.Enriched_FC_vs_second || 0) - (a.Enriched_FC_vs_second || 0))[0];
  if (!top) {
    elements.markerFocusPanel.innerHTML = `
      <p class="eyebrow">Focus candidate</p>
      ${buildEmpty("No marker candidate is available for the current filters. Try another Gene ID, symbol or tissue.")}
    `;
    return;
  }
  elements.markerFocusPanel.innerHTML = `
    <p class="eyebrow">Focus candidate</p>
    <h4>${escapeHTML(geneLabel(top))}</h4>
    <p class="focus-basis">Selected as the highest protein fold-change marker within the current filters.</p>
    <div class="focus-metrics">
      <span><strong>${escapeHTML(top.Enriched_Tissue)}</strong> protein tissue</span>
      <span><strong>${formatValue(top.Enriched_FC_vs_second, 2)}</strong> protein FC</span>
      <span><strong>${formatRaw(top.Enriched_Mean)}</strong> protein mean</span>
      <span><strong>${escapeHTML(top.RNA_Enriched_Tissue || "NA")}</strong> RNA tissue</span>
      <span><strong>${formatValue(top.RNA_Enriched_FC_vs_second, 2)}</strong> RNA FC</span>
      <span><strong>${escapeHTML(top.RNA_same_tissue_supported || "No")}</strong> matched support</span>
    </div>
    <button type="button" class="focus-gene-button" data-gene="${escapeHTML(top.GeneID)}">Open gene report</button>
  `;
  elements.markerFocusPanel.querySelector(".focus-gene-button").addEventListener("click", () => {
    loadGene(top.GeneID).catch(console.error);
  });
}

function renderMarkerTable(payload) {
  const markers = payload.markers || [];
  const filteredTotal = payload.filtered_total ?? markers.length;
  if (!markers.length) {
    elements.markerTable.innerHTML = buildEmpty("No marker rows match the current filters.");
    return;
  }
  elements.markerTable.innerHTML = `
    <p class="tool-note">${formatInt(markers.length)} rows shown from ${formatInt(filteredTotal)} matching marker entries; the complete marker resource contains ${formatInt(payload.marker_total)} entries.</p>
    <div class="table-scroll">
      <table class="data-table marker-table">
        <thead>
          <tr>
            <th>Gene ID</th>
            <th>Protein tissue</th>
            <th>Protein FC</th>
            <th>Protein mean</th>
            <th>RNA tissue</th>
            <th>RNA FC</th>
            <th>Same-tissue support</th>
          </tr>
        </thead>
        <tbody>
          ${markers.map((item) => `
            <tr>
              <td><button type="button" class="marker-gene-link" data-gene="${escapeHTML(item.GeneID)}">${escapeHTML(geneLabel(item))}</button></td>
              <td>${escapeHTML(item.Enriched_Tissue)}</td>
              <td>${formatValue(item.Enriched_FC_vs_second, 2)}</td>
              <td>${formatRaw(item.Enriched_Mean)}</td>
              <td>${escapeHTML(item.RNA_Enriched_Tissue || "NA")}</td>
              <td>${formatValue(item.RNA_Enriched_FC_vs_second, 2)}</td>
              <td><span class="support-pill ${item.RNA_same_tissue_supported === "Yes" ? "yes" : "no"}">${escapeHTML(item.RNA_same_tissue_supported || "No")}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
  elements.markerTable.querySelectorAll(".marker-gene-link").forEach((button) => {
    button.addEventListener("click", () => {
      loadGene(button.dataset.gene).catch(console.error);
    });
  });
}

function renderTinyHeatmap(rows, columns, labelKey, className = "") {
  if (!rows.length || !columns.length) {
    return buildEmpty("No heatmap data available.");
  }
  return `
    <div class="tiny-heatmap ${className}">
      <div class="tiny-heatmap-header" style="grid-template-columns: 8rem repeat(${columns.length}, 1fr);">
        <span></span>${columns.map((column) => `<span>${escapeHTML(column)}</span>`).join("")}
      </div>
      ${rows.map((row) => `
        <div class="tiny-heatmap-row" style="grid-template-columns: 8rem repeat(${columns.length}, 1fr);">
          <strong>${escapeHTML(row[labelKey])}</strong>
          ${columns.map((column) => {
            const value = row.values[column];
            const factor = value === null || value === undefined ? null : Math.max(0, Math.min(1, (value + 2.2) / 4.4));
            const color = factor === null ? "#edf0ee" : gradientColor(["#f4f6f7", "#8fb3b5", "#6b3fa0"], factor);
            return `<i style="background:${color}" title="${escapeHTML(row[labelKey])} ${escapeHTML(column)} ${formatValue(value, 2)}"></i>`;
          }).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function renderEnhancedResource(payload) {
  state.resources.enhanced = payload;
  const classes = payload.class_summary || [];
  if (elements.enhancedClassSelect && !elements.enhancedClassSelect.options.length) {
    elements.enhancedClassSelect.innerHTML = [
      `<option value="">All classes</option>`,
      ...classes.map((item) => `<option value="${escapeHTML(item.ClassID)}">Class ${escapeHTML(item.ClassID)} · ${escapeHTML(item.DisplayTissues || item.PeakTissue)} · ${formatInt(item.N_genes)}</option>`),
    ]
      .join("");
  }
  if (elements.enhancedClassSelect) {
    elements.enhancedClassSelect.value = payload.class_id;
  }
  if (elements.enhancedRowLimit) {
    elements.enhancedRowLimit.value = state.fig2.enhancedLimit;
  }
  const selected = classes.find((item) => String(item.ClassID) === String(payload.class_id));
  if (selected) {
    elements.enhancedClassSummary.innerHTML = `
      <p class="eyebrow">Selected class</p>
      <h4>${escapeHTML(selected.Class || `Class ${payload.class_id}`)}</h4>
      <div class="side-metrics">
        <span><strong>${escapeHTML(selected.PrimaryTissue || "NA")}</strong> primary tissue</span>
        <span><strong>${formatInt(selected.N_genes)}</strong> proteins</span>
      </div>
      <p>${escapeHTML(selected.DisplayTissues || selected.TopEnhancedTissues || "")}</p>
      <div class="gene-chip-list">
        ${(selected.representative_gene_labels || []).map((gene) => `<button type="button" data-gene="${escapeHTML(gene.gene_id)}">${escapeHTML(gene.display_label || gene.gene_id)}</button>`).join("")}
      </div>
    `;
  } else {
    elements.enhancedClassSummary.innerHTML = `
      <p class="eyebrow">Enhanced classes</p>
      <h4>All tissue-enhanced classes</h4>
      <div class="class-summary-list">
        ${classes.map((item) => `
          <button type="button" data-class-id="${escapeHTML(item.ClassID)}">
            <i style="background:${FIG2_GO_CLASS_COLORS[`class${item.ClassID}`] || "#ccd2ca"}"></i>
            <span>Class ${escapeHTML(item.ClassID)}</span>
            <strong>${escapeHTML(item.DisplayTissues || item.PrimaryTissue || "NA")}</strong>
            <em>${formatInt(item.N_genes)} proteins</em>
          </button>
        `).join("")}
      </div>
    `;
  }
  elements.enhancedClassSummary.querySelectorAll("[data-gene]").forEach((button) => {
    button.addEventListener("click", () => loadGene(button.dataset.gene).catch(console.error));
  });
  elements.enhancedClassSummary.querySelectorAll("[data-class-id]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.enhancedClassSelect.value = button.dataset.classId;
      loadEnhancedResource().catch(console.error);
    });
  });
  renderEnhancedHeatmap(payload);
}

function heatmapColor(value, palette = "protein") {
  if (palette === "rna") {
    return rampColor(value, [-2.5, 1, 2.2], ["#DCE3EE", "#FAF8F5", "#B22222"]);
  }
  if (palette === "enhanced") {
    return rampColor(value, [-3, 0.6, 2.2], ["#DCE9D5", "#F8F7F4", "#5B2A86"]);
  }
  return rampColor(value, [-2.5, 1, 2.2], ["#DCE9D5", "#F8F7F4", "#5B2A86"]);
}

function matrixHeatmapColor(value, palette, min, max) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "#eef1eb";
  }
  const span = max - min || 1;
  const factor = Math.max(0, Math.min(1, (Number(value) - min) / span));
  const colors = palette === "rna" ? ["#f8f0e6", "#dcb299", "#9f6653"] : ["#f4f0f4", "#baa9c8", "#705d83"];
  return gradientColor(colors, factor);
}

function renderEnhancedHeatmap(payload) {
  const selectedText = payload.class_id ? `Class ${payload.class_id}` : "all classes";
  renderFig2GeneHeatmap(elements.enhancedHeatmap, payload.heatmap || payload, {
    title: `Enhanced protein heatmap · ${selectedText}`,
    subtitle: "Top tissue-enhanced proteins per tissue, shown as QRILC protein-abundance row z-scores.",
    palette: "enhanced",
    rawLabel: "QRILC mean",
  });
}

function goNetworkPositions(nodes, layoutPayload) {
  const source = layoutPayload?.positions || {};
  const positioned = nodes.filter((node) => source[node.id]);
  const fallback = nodes.filter((node) => !source[node.id]).sort((a, b) => a.id.localeCompare(b.id));
  const xs = positioned.map((node) => Number(source[node.id].x));
  const ys = positioned.map((node) => Number(source[node.id].y));
  const centerX = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
  const centerY = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0;
  const span = Math.max(xs.length ? Math.max(...xs) - Math.min(...xs) : 0, ys.length ? Math.max(...ys) - Math.min(...ys) : 0, 500);
  const radius = span * 0.58 + 180;
  const positions = Object.fromEntries(positioned.map((node) => [node.id, source[node.id]]));
  fallback.forEach((node, index) => {
    if (nodes.length <= 2) {
      positions[node.id] = { x: centerX + index * 80, y: centerY };
      return;
    }
    const angle = (Math.PI * 2 * index) / Math.max(1, fallback.length) - Math.PI / 2;
    positions[node.id] = { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
  });
  return positions;
}

function renderGoNetworkResource(payload, layoutPayload = state.fig2.goLayout) {
  state.resources.goNetwork = payload;
  state.fig2.goLayout = layoutPayload;
  if (!elements.goNetwork) {
    return;
  }
  if (elements.goClassSelect && elements.goClassSelect.options.length <= 1) {
    elements.goClassSelect.innerHTML = [
      `<option value="">All classes</option>`,
      ...(payload.legend || []).map((item) => `<option value="${escapeHTML(item.class_key.replace("class", ""))}">${escapeHTML(item.label)}</option>`),
    ].join("");
  }
  elements.goClassSelect.value = state.fig2.goClass;
  elements.goNodeType.value = state.fig2.goNodeType;
  if (elements.goIncludeIsolates) {
    elements.goIncludeIsolates.value = state.fig2.goIncludeIsolates;
  }
  elements.goNetworkQuery.value = state.fig2.goQuery;
  elements.goMinGenes.value = state.fig2.goMinGenes || 0;
  elements.goNetworkLegend.innerHTML = (payload.legend || [])
    .map((item) => `<span><i style="background:${escapeHTML(item.color)}"></i>${escapeHTML(item.label)}</span>`)
    .join("");
  renderGoTermDetail(null, payload);

  if (!window.cytoscape) {
    elements.goNetwork.innerHTML = buildEmpty("Cytoscape.js could not be loaded.");
    return;
  }
  if (state.fig2.cy) {
    state.fig2.cy.destroy();
  }
  elements.goNetwork.replaceChildren();
  elements.goNetwork._qloaCy = null;
  if (!payload.nodes.length) {
    elements.goNetwork.innerHTML = buildEmpty("No GO terms match the active filters.");
    delete elements.goNetwork.dataset.layout;
    elements.goNetwork.dataset.nodeCount = "0";
    elements.goNetwork.dataset.edgeCount = "0";
    return;
  }
  const positions = goNetworkPositions(payload.nodes, layoutPayload);
  const elementsForCy = [
    ...payload.nodes.map((node) => ({
      position: positions[node.id],
      data: {
        id: node.id,
        label: node.name,
        go_id: node.go_id,
        name: node.name,
        classes: node.classes.join(", "),
        gene_count: node.gene_count,
        color: node.color,
        pie1: node.class_pie?.class1 || "0%",
        pie2: node.class_pie?.class2 || "0%",
        pie3: node.class_pie?.class3 || "0%",
        pie4: node.class_pie?.class4 || "0%",
        pie5: node.class_pie?.class5 || "0%",
        pie6: node.class_pie?.class6 || "0%",
        size: Math.max(15, Math.min(52, 10 + Math.sqrt(node.gene_count || 1) * 2.2)),
      },
    })),
    ...payload.edges.map((edge) => ({ data: { id: edge.id, source: edge.source, target: edge.target } })),
  ];
  state.fig2.cy = window.cytoscape({
    container: elements.goNetwork,
    elements: elementsForCy,
    style: [
      {
        selector: "node",
        style: {
          "background-color": "data(color)",
          "pie-size": "94%",
          "pie-1-background-color": FIG2_GO_CLASS_COLORS.class1,
          "pie-1-background-size": "data(pie1)",
          "pie-2-background-color": FIG2_GO_CLASS_COLORS.class2,
          "pie-2-background-size": "data(pie2)",
          "pie-3-background-color": FIG2_GO_CLASS_COLORS.class3,
          "pie-3-background-size": "data(pie3)",
          "pie-4-background-color": FIG2_GO_CLASS_COLORS.class4,
          "pie-4-background-size": "data(pie4)",
          "pie-5-background-color": FIG2_GO_CLASS_COLORS.class5,
          "pie-5-background-size": "data(pie5)",
          "pie-6-background-color": FIG2_GO_CLASS_COLORS.class6,
          "pie-6-background-size": "data(pie6)",
          width: "data(size)",
          height: "data(size)",
          "border-width": 1,
          "border-color": "#f7f8f4",
          label: "",
          "overlay-opacity": 0,
        },
      },
      { selector: "edge", style: { width: 0.55, "line-color": "#c9cec7", opacity: 0.42, "curve-style": "haystack" } },
      { selector: "node:selected", style: { "border-width": 4, "border-color": "#183028" } },
    ],
    layout: GO_LAYOUT_OPTIONS,
    wheelSensitivity: 0.22,
  });
  elements.goNetwork._qloaCy = state.fig2.cy;
  elements.goNetwork.dataset.layout = "cytoscape-preset";
  elements.goNetwork.dataset.nodeCount = String(payload.nodes.length);
  elements.goNetwork.dataset.edgeCount = String(payload.edges.length);
  state.fig2.cy.on("mouseover", "node", (event) => {
    const data = event.target.data();
    const tooltipText = `${data.go_id} · ${data.name} · ${data.classes} · ${formatInt(data.gene_count)} genes`;
    elements.goNetwork.title = tooltipText;
    if (elements.goNetworkTooltip) {
      const point = event.target.renderedPosition();
      elements.goNetworkTooltip.textContent = tooltipText;
      elements.goNetworkTooltip.style.left = `${elements.goNetwork.offsetLeft + point.x}px`;
      elements.goNetworkTooltip.style.top = `${elements.goNetwork.offsetTop + point.y}px`;
      elements.goNetworkTooltip.hidden = false;
    }
  });
  state.fig2.cy.on("mouseout", "node", () => {
    if (elements.goNetworkTooltip) elements.goNetworkTooltip.hidden = true;
  });
  state.fig2.cy.on("tap", "node", (event) => {
    loadGoTerm(event.target.data("go_id")).catch(console.error);
  });
  if (payload.nodes[0]) {
    loadGoTerm(payload.nodes[0].go_id).catch(console.error);
  }
  if (state.fig2.activeTab === "enhanced") {
    scheduleGoNetworkLayout();
  }
}

function scheduleGoNetworkLayout() {
  if (!state.fig2.cy) {
    return;
  }
  setTimeout(() => {
    state.fig2.cy.resize();
    state.fig2.cy.fit(undefined, 24);
  }, 120);
}

function renderGoTermDetail(payload, networkPayload = null) {
  if (!payload) {
    elements.goTermDetail.innerHTML = `
      <p class="eyebrow">GO term detail</p>
      <h4>${formatInt(networkPayload?.nodes?.length || 0)} GO function nodes</h4>
      <p>Each node represents a GO term. Select a node to inspect enriched genes and open gene reports.</p>
      <p class="tool-note">${formatInt(networkPayload?.edges?.length || 0)} links shown; ${formatInt(networkPayload?.isolated_count || 0)} isolated GO terms are hidden unless enabled or searched.</p>
    `;
    return;
  }
  elements.goTermDetail.innerHTML = `
    <p class="eyebrow">GO term detail</p>
    <h4>${escapeHTML(payload.go_id)}</h4>
    <p>${escapeHTML(payload.go_name || "")}</p>
    <div class="class-badges">${payload.classes.map((item) => `<span>${escapeHTML(item.replace("class", "Class "))}</span>`).join("")}</div>
    <p class="tool-note">${formatInt(payload.gene_count)} genes are associated with this GO term in the selected enhanced class data.</p>
    <div class="gene-chip-list scrollable">
      ${payload.genes.slice(0, 220).map((gene) => `<button type="button" data-gene="${escapeHTML(gene.gene_id)}" title="${escapeHTML(gene.title || gene.gene_id)}">${escapeHTML(geneLabel(gene))}</button>`).join("")}
    </div>
  `;
  elements.goTermDetail.querySelectorAll("[data-gene]").forEach((button) => {
    button.addEventListener("click", () => loadGene(button.dataset.gene).catch(console.error));
  });
}

async function loadGoTerm(goId) {
  const cacheKey = `${state.fig2.goClass || "all"}:${goId}`;
  const cached = state.fig2.goTermCache.get(cacheKey);
  if (cached) {
    renderGoTermDetail(cached);
    return;
  }
  const requestToken = ++state.fig2.goTermRequestToken;
  elements.goTermDetail.innerHTML = `<p class="eyebrow">GO term detail</p><h4>${escapeHTML(goId)}</h4><p class="tool-note">Loading associated genes...</p>`;
  const params = new URLSearchParams({ go_id: goId, class_id: state.fig2.goClass });
  try {
    const payload = await fetchJSON(`/api/resources/fig2/go-term?${params.toString()}`);
    state.fig2.goTermCache.set(cacheKey, payload);
    if (requestToken === state.fig2.goTermRequestToken) renderGoTermDetail(payload);
  } catch (error) {
    if (requestToken === state.fig2.goTermRequestToken) {
      elements.goTermDetail.innerHTML = `<p class="eyebrow">GO term detail</p><h4>${escapeHTML(goId)}</h4><p class="error">Associated genes could not be loaded. Select the node to retry.</p>`;
    }
    throw error;
  }
}

function renderActivityResource(payload) {
  state.resources.activity = payload;
  elements.activityGroup.value = state.fig2.activityGroup;
  elements.activityMetric.value = state.fig2.activityMetric;
  const label = payload.group === "tf" ? "TF family" : "Translation category";
  elements.activityHeatmaps.innerHTML = `
    <div class="dual-heatmap">
      <div class="fig2-chart">
        <div class="chart-title">${label} · proteomics</div>
        ${renderActivityMatrix(payload.protein, payload, "protein")}
      </div>
      <div class="fig2-chart">
        <div class="chart-title">${label} · RNA-seq</div>
        ${renderActivityMatrix(payload.rna, payload, "rna")}
      </div>
    </div>
  `;
  elements.activityHeatmaps.querySelectorAll(".activity-cell").forEach((button) => {
    button.addEventListener("click", () => {
      loadActivityGenes(button.dataset.tissue, button.dataset.category).catch(console.error);
    });
  });
  renderActivityGeneDetail(null, payload);
}

function renderActivityMatrix(matrix, payload, layer) {
  const columns = matrix.columns || [];
  const rows = matrix.rows || [];
  const labelKey = payload.label_key || "category";
  const countsByCategory = Object.fromEntries((payload.counts || []).map((row) => [row.Category, row.N_detected_genes]));
  if (!rows.length) {
    return buildEmpty("No activity matrix is available.");
  }
  const values = rows.flatMap((row) => columns.map((column) => Number(row.values[column])).filter((value) => !Number.isNaN(value)));
  const min = Math.min(...values);
  const max = Math.max(...values);
  return `
    <div class="matrix-scroll">
      <div class="activity-matrix" style="grid-template-columns: 8.2rem repeat(${columns.length}, 1.15rem);">
        <span class="matrix-corner">${escapeHTML(labelKey)}</span>
        ${columns.map((column) => `<span class="matrix-col">${escapeHTML(column)}</span>`).join("")}
        ${rows.map((row) => `
          <strong class="matrix-row-text">${escapeHTML(row[labelKey])}</strong>
          ${columns.map((column) => {
            const value = row.values[column];
            const title = `${row[labelKey]} | ${column} | ${layer}=${formatValue(value, 3)} | detected genes=${formatInt(countsByCategory[row[labelKey]] || 0)}`;
            return `<button type="button" class="matrix-cell activity-cell" data-category="${escapeHTML(row[labelKey])}" data-tissue="${escapeHTML(column)}" style="background:${matrixHeatmapColor(value, layer, min, max)}" title="${escapeHTML(title)}"></button>`;
          }).join("")}
        `).join("")}
      </div>
    </div>
  `;
}

function renderActivityGeneDetail(payload, matrixPayload = null) {
  if (!payload) {
    elements.activityGeneDetail.innerHTML = `
      <p class="eyebrow">Gene detail</p>
      <h4>${matrixPayload?.group === "translation" ? "Translation-related factors" : "Transcription factors"}</h4>
      <p>Click a heatmap cell to list genes in that tissue and family/category.</p>
    `;
    return;
  }
  elements.activityGeneDetail.innerHTML = `
    <p class="eyebrow">${escapeHTML(payload.tissue)} · ${escapeHTML(payload.category)}</p>
    <h4>${formatInt(payload.total)} genes</h4>
    <div class="activity-gene-list">
      ${payload.items.length ? payload.items.map((item) => `
        <button type="button" data-gene="${escapeHTML(item.gene_id)}">
          <strong>${escapeHTML(geneLabel(item))}</strong>
          <span>${escapeHTML(item.short_description || item.model_name || item.best_at_hit || item.annotation?.title || "No annotation")}</span>
        </button>
      `).join("") : buildEmpty("No genes were found for this matrix cell.")}
    </div>
  `;
  elements.activityGeneDetail.querySelectorAll("[data-gene]").forEach((button) => {
    button.addEventListener("click", () => loadGene(button.dataset.gene).catch(console.error));
  });
}

async function loadActivityGenes(tissue, category) {
  const params = new URLSearchParams({ group: state.fig2.activityGroup, tissue, category });
  const payload = await fetchJSON(`/api/resources/fig2/activity-genes?${params.toString()}`);
  renderActivityGeneDetail(payload);
}

function renderCrossSpeciesResourceLegacy(payload) {
  const scatter = payload.scatter || [];
  const fig3GeneLabels = new Map();
  (payload.group_sets || []).forEach((group) => {
    (group.genes || []).forEach((gene) => fig3GeneLabels.set(gene.gene_id, geneLabel(gene)));
  });
  const width = 640;
  const height = 330;
  const colors = {
    Conserved: "#4683B4",
    "Lineage-shifted": "#67B3AD",
    "Broadly divergent": "#F3AF44",
    "Broadly divergent + Lineage-shifted": "#9A7BB7",
  };
  const labels = {
    Conserved: "Conserved",
    "Broadly divergent": "Divergent",
    "Lineage-shifted": "Lineage shifted",
    "Broadly divergent + Lineage-shifted": "Divergent + lineage shifted",
  };
  if (elements.ogGroup && elements.ogGroup.options.length <= 1) {
    elements.ogGroup.innerHTML = [
      `<option value="">All classes</option>`,
      ...(payload.group_sets || []).map((item) => `<option value="${escapeHTML(item.key)}">${escapeHTML(item.label)} · ${formatInt(item.n_ogs)} OGs</option>`),
    ].join("");
  }
  if (elements.ogLineage && elements.ogLineage.options.length <= 1) {
    elements.ogLineage.innerHTML = [
      `<option value="">All lineages</option>`,
      ...(payload.lineage_options || []).map((item) => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`),
    ].join("");
  }
  if (elements.ogGroup) {
    elements.ogGroup.value = payload.filters?.group || "";
  }
  if (elements.ogLineage) {
    elements.ogLineage.value = payload.filters?.lineage || "";
  }
  if (elements.fig3SummaryCards) {
    elements.fig3SummaryCards.innerHTML = (payload.group_sets || []).map((item) => `
      <article>
        <span>${escapeHTML(item.label)}</span>
        <strong>${formatInt(item.n_ogs)}</strong>
        <small>${formatInt(item.n_genes)} quinoa genes available for GO enrichment</small>
      </article>
    `).join("");
  }
  if (elements.fig3MainFigure) {
    elements.fig3MainFigure.innerHTML = `<img src="${escapeHTML(payload.assets?.fig3a || "")}" alt="Species relationship used in the cross-species analysis">`;
  }
  elements.ogScatter.innerHTML = `
    <div class="heatmap-card-head">
      <div>
        <div class="chart-title">Orthogroup conservation scatter</div>
        <p>Each point is an orthogroup; hover to inspect class, mean conservation and lineage variance.</p>
      </div>
      <span>${formatInt(scatter.length)} OGs</span>
    </div>
    <svg viewBox="0 0 ${width} ${height}" class="og-scatter-svg" aria-hidden="true">
      <line x1="55" y1="285" x2="600" y2="285" class="axis-line"></line>
      <line x1="55" y1="35" x2="55" y2="285" class="axis-line"></line>
      <text x="320" y="318" class="axis-label">mean cross-lineage correlation</text>
      <text x="14" y="44" class="axis-label rotate-label">correlation SD</text>
      ${scatter.map((item) => {
        const x = 55 + Math.max(0, Math.min(1, item.mean_cor || 0)) * 535;
        const y = 285 - Math.max(0, Math.min(0.45, item.sd_cor || 0)) / 0.45 * 235;
        const group = item.group_name || "Other";
        return `<circle class="og-point" data-og="${escapeHTML(item.Orthogroup)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="${colors[group] || "#7da169"}" opacity="0.68"><title>${escapeHTML(item.Orthogroup)} · ${escapeHTML(labels[group] || group)} · mean=${formatValue(item.mean_cor, 3)} · sd=${formatValue(item.sd_cor, 3)} · CquA=${escapeHTML(item.Cqu_A_genes || "")} · CquB=${escapeHTML(item.Cqu_B_genes || "")}</title></circle>`;
      }).join("")}
    </svg>
  `;
  const renderOgDetail = (item = scatter[0]) => {
    if (!elements.ogScatterDetail || !item) return;
    const cquGenes = [...String(item.Cqu_A_genes || "").split(","), ...String(item.Cqu_B_genes || "").split(",")]
      .map((gene) => gene.trim()).filter(Boolean);
    elements.ogScatterDetail.innerHTML = `
      <p class="eyebrow">Selected orthogroup</p>
      <h4>${escapeHTML(item.Orthogroup)}</h4>
      <div class="focus-metrics">
        <span><strong>${escapeHTML(labels[item.group_name] || item.group_name || "Other")}</strong> class</span>
        <span><strong>${formatValue(item.mean_cor, 3)}</strong> mean correlation</span>
        <span><strong>${formatValue(item.sd_cor, 3)}</strong> correlation SD</span>
        <span><strong>${formatInt(item.member_total)}</strong> members</span>
      </div>
      <p class="tool-note">Arabidopsis: ${escapeHTML(item.At_genes || "NA")} · Rice: ${escapeHTML(item.Os_genes || "NA")}</p>
      <div class="gene-chip-list scrollable">
        ${cquGenes.map((gene) => `<button type="button" data-gene="${escapeHTML(gene)}">${escapeHTML(fig3GeneLabels.get(gene) || gene)}</button>`).join("")}
      </div>
    `;
    elements.ogScatterDetail.querySelectorAll("[data-gene]").forEach((button) => {
      button.addEventListener("click", () => loadGene(button.dataset.gene).catch(console.error));
    });
  };
  renderOgDetail();
  elements.ogScatter.querySelectorAll("[data-og]").forEach((point) => {
    point.addEventListener("click", () => {
      const item = scatter.find((row) => row.Orthogroup === point.dataset.og);
      renderOgDetail(item);
    });
  });

  const means = payload.lineage_mean || [];
  elements.ogLineageChart.innerHTML = `
    <div class="chart-title">RNA-protein mean correlation by lineage</div>
    <div class="lineage-bars">
      ${means.map((item) => `
        <div>
          <span>${escapeHTML(item.set_name)} · ${escapeHTML(item.Lineage)}</span>
          <i style="width:${Math.max(2, (item.mean_r || 0) * 100)}%"></i>
          <strong>${formatValue(item.mean_r, 2)}</strong>
        </div>
      `).join("")}
    </div>
  `;

  elements.ogClassChart.innerHTML = `
    <div class="chart-title">OG conservation classes</div>
    <div class="class-count-grid og-class-grid">
      ${(payload.group_sets || []).map((item) => `
        <button type="button" data-og-group="${escapeHTML(item.key)}">
          <strong>${formatInt(item.n_ogs)}</strong>
          <span>${escapeHTML(item.label)}</span>
          <small>${formatInt(item.n_genes)} genes</small>
        </button>
      `).join("")}
    </div>
  `;
  elements.ogClassChart.querySelectorAll("[data-og-group]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.ogGroup.value = button.dataset.ogGroup;
      loadCrossSpeciesResource().catch(console.error);
    });
  });

  if (elements.ogClusterGallery) {
    elements.ogClusterGallery.innerHTML = `
      <div class="heatmap-card-head">
        <div>
          <div class="chart-title">Protein-defined OG clusters</div>
          <p>Original clustered heatmaps are embedded as reference panels; gene sets below are queryable and GO-ready.</p>
        </div>
      </div>
      <div class="cluster-pdf-grid">
        ${(payload.group_sets || []).map((item) => `
          <article>
            <div class="cluster-card-head">
              <strong>${escapeHTML(item.label)}</strong>
              <button type="button" data-go-group="${escapeHTML(item.key)}">GO enrichment</button>
            </div>
            <iframe src="${escapeHTML(payload.assets?.[item.key] || "")}" title="${escapeHTML(item.label)} heatmap"></iframe>
            <div class="gene-chip-list scrollable">
              ${item.genes.map((gene) => `<button type="button" data-gene="${escapeHTML(gene.gene_id)}" title="${escapeHTML(gene.title || gene.gene_id)}">${escapeHTML(geneLabel(gene))}</button>`).join("")}
            </div>
          </article>
        `).join("")}
      </div>
    `;
    elements.ogClusterGallery.querySelectorAll("[data-gene]").forEach((button) => {
      button.addEventListener("click", () => loadGene(button.dataset.gene).catch(console.error));
    });
    elements.ogClusterGallery.querySelectorAll("[data-go-group]").forEach((button) => {
      button.addEventListener("click", () => runCrossSpeciesGO(button.dataset.goGroup).catch(console.error));
    });
  }
  renderCrossSpeciesGeneList(payload);

  const columns = [
    { key: "Orthogroup", label: "OG" },
    { key: "set_name", label: "Class" },
    { key: "Lineage", label: "Lineage" },
    { key: "pearson_r", label: "RNA-protein r", format: (value) => formatValue(value, 3) },
    { key: "cor_class", label: "Correlation class" },
  ];
  elements.ogTable.innerHTML = renderSimpleTable((payload.rna_protein_correlation || []).slice(0, 220), columns);
}

function renderCrossSpeciesGeneList(payload = state.resources.crossSpecies) {
  if (!elements.ogGeneList || !payload) {
    return;
  }
  const query = (elements.ogGeneQuery?.value || "").trim().toLowerCase();
  const selectedGroup = elements.ogGroup?.value || "";
  const groups = (payload.group_sets || []).filter((item) => !selectedGroup || item.key === selectedGroup);
  elements.ogGeneList.innerHTML = `
    <div class="heatmap-card-head">
      <div>
        <div class="chart-title">Quinoa genes in selected OG classes</div>
        <p>Search within category gene sets; click a gene to open its report, or run GO enrichment for the whole class.</p>
      </div>
    </div>
    <div class="fig3-gene-blocks">
      ${groups.map((group) => {
        const genes = (group.genes || []).filter((gene) => {
          const text = `${gene.gene_id || ""} ${gene.display_label || ""} ${gene.title || ""}`.toLowerCase();
          return !query || text.includes(query);
        });
        return `
          <article>
            <div class="cluster-card-head">
              <strong>${escapeHTML(group.label)} <small>${formatInt(genes.length)} / ${formatInt(group.n_genes)}</small></strong>
              <button type="button" data-go-group="${escapeHTML(group.key)}">GO enrichment</button>
            </div>
            <div class="gene-chip-list scrollable">
              ${genes.slice(0, 240).map((gene) => `<button type="button" data-gene="${escapeHTML(gene.gene_id)}" title="${escapeHTML(gene.title || gene.gene_id)}">${escapeHTML(geneLabel(gene))}</button>`).join("")}
            </div>
            ${genes.length > 240 ? `<p class="tool-note">Showing first 240 matching genes. Narrow the search to inspect more specific genes.</p>` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
  elements.ogGeneList.querySelectorAll("[data-gene]").forEach((button) => {
    button.addEventListener("click", () => loadGene(button.dataset.gene).catch(console.error));
  });
  elements.ogGeneList.querySelectorAll("[data-go-group]").forEach((button) => {
    button.addEventListener("click", () => runCrossSpeciesGO(button.dataset.goGroup).catch(console.error));
  });
}

async function runCrossSpeciesGO(groupKey) {
  const groupSet = (state.resources.crossSpecies?.group_sets || []).find((item) => item.key === groupKey);
  if (!groupSet || !groupSet.all_gene_ids?.length) {
    return;
  }
  await runCrossSpeciesGOForGenes(groupSet.all_gene_ids);
}

async function runClusterGO(token) {
  const { cluster } = findClusterByToken(token);
  if (!cluster?.genes?.length) return;
  await runCrossSpeciesGOForGenes(cluster.genes);
}

async function runCrossSpeciesGOForGenes(genes) {
  elements.goInput.value = genes.join("\n");
  window.location.hash = "#tools";
  await runGO();
}

function renderCrossSpeciesResourceV2(payload) {
  state.resources.crossSpecies = payload;
  const groupColors = { Conserved: "#2f7f62", Divergent: "#d97920", Lineage_shifted: "#18998d", Other: "#aeb6ad", "Broadly divergent + Lineage-shifted": "#7659a6" };
  const sourceColors = { Conserved: "#2f7f62", "Broadly divergent": "#d97920", "Lineage-shifted": "#18998d", "Broadly divergent + Lineage-shifted": "#7659a6", Other: "#aeb6ad" };
  const sourceLabels = { Conserved: "Conserved", "Broadly divergent": "Divergent", "Lineage-shifted": "Lineage-shifted", "Broadly divergent + Lineage-shifted": "Divergent + shifted", Other: "Other" };
  if (elements.ogGroup) {
    elements.ogGroup.innerHTML = [`<option value="">All · ${formatInt(payload.total_ogs)} OGs</option>`, ...(payload.group_sets || []).map((g) => `<option value="${escapeHTML(g.key)}">${escapeHTML(g.label)} · ${formatInt(g.n_ogs)} OGs</option>`)].join("");
  }
  if (elements.ogLineage && elements.ogLineage.options.length <= 1) {
    elements.ogLineage.innerHTML = [`<option value="">Mean across lineages</option>`, ...(payload.lineage_options || []).map((x) => `<option value="${escapeHTML(x)}">${escapeHTML(x)}</option>`)].join("");
  }
  elements.ogGroup.value = payload.filters?.group || "";
  elements.ogLineage.value = payload.filters?.lineage || "";
  if (elements.ogGeneQuery && payload.filters?.q !== undefined) {
    elements.ogGeneQuery.value = payload.filters.q || "";
  }
  if (elements.ogMinR) {
    elements.ogMinR.value = String(payload.filters?.min_r ?? -1);
    elements.ogMinRValue.textContent = Number(elements.ogMinR.value).toFixed(2);
  }
  if (elements.ogMinConservation) {
    elements.ogMinConservation.value = String(payload.filters?.min_conservation ?? -1);
    elements.ogMinConservationValue.textContent = Number(elements.ogMinConservation.value).toFixed(2);
  }
  if (elements.fig3SummaryCards) {
    elements.fig3SummaryCards.innerHTML = (payload.group_sets || []).map((g) => `
      <div class="metric panel" style="--accent:${groupColors[g.key] || "#2f7f62"}" data-og-group="${escapeHTML(g.key)}">
        <div><div class="name">${escapeHTML(g.label)}</div><div><span class="num">${formatInt(g.n_ogs)}</span><small>orthogroups</small></div><p>${formatInt(g.n_genes)} quinoa genes</p></div>
        <div class="iconcircle">${g.key === "Conserved" ? "🛡" : g.key === "Divergent" ? "⑂" : "⇄"}</div>
      </div>
    `).join("");
    elements.fig3SummaryCards.querySelectorAll("[data-og-group]").forEach((card) => card.addEventListener("click", () => {
      elements.ogGroup.value = card.dataset.ogGroup;
      loadCrossSpeciesResource().catch(console.error);
    }));
  }
  renderConservationScatter(payload, sourceColors, sourceLabels);
  renderCrossSpeciesCoupling(payload);
  renderClusterExplorer(payload);
  renderCrossSpeciesGeneList(payload);
  renderOrthogroupTable(payload);
}

function renderConservationScatter(payload, colors, labels) {
  const scatter = payload.scatter || [];
  elements.ogScatter.innerHTML = `
    <div id="og-scatter-plot" class="og-scatter-plot"></div>
  `;
  const showDetail = (og = scatter[0]?.Orthogroup) => {
    const d = scatter.find((x) => x.Orthogroup === og);
    if (!d) return;
    renderOrthogroupDetail(d);
  };
  showDetail();
  const plot = document.querySelector("#og-scatter-plot");
  if (plot && window.Plotly) {
    const formatHoverGenes = (value = "") => splitInlineGenes(value).map(fig3GeneLabel).join(", ") || "-";
    const traces = (payload.scatter_plot?.traces || []).map((trace) => ({
      ...trace,
      customdata: (trace.customdata || []).map((row) => {
        const updated = [...row];
        updated[4] = formatHoverGenes(row[4]);
        updated[5] = formatHoverGenes(row[5]);
        return updated;
      }),
    }));
    const layout = {
      autosize: true,
      height: 430,
      paper_bgcolor: "#fffefa",
      plot_bgcolor: "#fffefa",
      margin: { l: 64, r: 18, t: 12, b: 58 },
      showlegend: true,
      legend: { orientation: "h", x: 0, y: -0.2, font: { size: 10, color: "#4e6158" } },
      xaxis: {
        title: { text: "Variance of six pairwise correlations", font: { size: 11 } },
        showgrid: false,
        zeroline: false,
        linecolor: "#cfd8ce",
        tickfont: { size: 10, color: "#65766e" },
      },
      yaxis: {
        title: { text: "Mean of six pairwise correlations", font: { size: 11 } },
        showgrid: false,
        zeroline: false,
        linecolor: "#cfd8ce",
        tickfont: { size: 10, color: "#65766e" },
      },
      shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, yref: "y", y0: 0, y1: 0, line: { color: "rgba(170,170,170,0.9)", width: 1, dash: "dot" } }],
      font: { family: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif", color: "#17382f" },
    };
    window.Plotly.newPlot(plot, traces, layout, { responsive: true, displayModeBar: false });
    plot.on("plotly_click", (event) => {
      const og = event?.points?.[0]?.customdata?.[0];
      if (og) showDetail(og);
    });
  } else if (plot) {
    plot.innerHTML = buildEmpty("Plotly is not available.");
  }
}

function renderOrthogroupDetail(d) {
  if (!elements.ogScatterDetail || !d) return;
  const cqu = [...String(d.Cqu_A_genes || "").split(","), ...String(d.Cqu_B_genes || "").split(",")].map((x) => x.trim()).filter(Boolean);
  elements.ogScatterDetail.innerHTML = `<p class="eyebrow">Selected orthogroup</p><h4>${escapeHTML(d.Orthogroup)}</h4>
    <div class="focus-metrics"><span><strong>${escapeHTML(sourceDisplayName(d.group_name))}</strong> class</span><span><strong>${formatValue(d.mean_cor, 3)}</strong> mean</span><span><strong>${formatValue(d.var_cor, 3)}</strong> variance</span><span><strong>${formatInt(d.member_total)}</strong> members</span></div>
    <p class="tool-note">Arabidopsis: ${escapeHTML(d.At_genes || "NA")} · Rice: ${escapeHTML(d.Os_genes || "NA")}</p>
    <div class="gene-chip-list scrollable">${cqu.map((g) => `<button type="button" data-gene="${escapeHTML(g)}">${escapeHTML(fig3GeneLabel(g))}</button>`).join("")}</div>`;
  elements.ogScatterDetail.querySelectorAll("[data-gene]").forEach((b) => b.addEventListener("click", () => loadGene(b.dataset.gene).catch(console.error)));
}

function renderCrossSpeciesCoupling(payload) {
  const means = payload.lineage_mean || [];
  const rows = ["QA", "QB", "At", "Os"].map((lin) => means.find((x) => x.Lineage === lin) || { Lineage: lin, mean_r: null, n_ogs: 0 });
  const names = { QA: "CqA", QB: "CqB", At: "Arabidopsis", Os: "Rice" };
  const cols = { QA: "#356aa0", QB: "#7659a6", At: "#5f8f54", Os: "#e48616" };
  elements.ogLineageChart.innerHTML = `<div class="cardhead"><div><h3>RNA-protein coupling</h3><p class="sub">Mean Pearson correlation for orthogroups in the current result set.</p></div></div>
    ${rows.map((r) => `<div class="coupling-row"><span>${names[r.Lineage] || r.Lineage}</span><span class="barbase"><i style="--w:${r.mean_r === null ? 0 : Math.max(2, (Number(r.mean_r) + 1) * 50)}%;--c:${cols[r.Lineage] || "#789"}"></i></span><span title="${formatInt(r.n_ogs)} orthogroups">${r.mean_r === null ? "NA" : formatValue(r.mean_r, 2)}</span></div>`).join("")}
    <div class="key">
      <b style="color:#5f8f54">Positive r</b><span>coordinated RNA and protein changes</span>
      <b style="color:#7659a6">Negative r</b><span>inverse RNA-protein relationship</span>
      <b style="color:#8a958e">Near zero</b><span>weak or no coupling</span>
    </div>
    <div class="tissues"><label>Tissues (8)</label><div class="tissueicons">
      <div class="tissue"><b>⌇</b>Root tip</div><div class="tissue"><b>⋔</b>Root</div><div class="tissue"><b>▌</b>Stem</div><div class="tissue"><b>♣</b>Leaf</div>
      <div class="tissue"><b>✿</b>Flower</div><div class="tissue"><b>♙</b>Pistil</div><div class="tissue"><b>◗</b>Pollen</div><div class="tissue"><b>◉</b>Seed</div>
    </div></div>`;
}

function renderClusterExplorer(payload) {
  const active = state.fig3.clusterGroup;
  const group = (payload.cluster_groups || []).find((g) => g.key === active) || payload.cluster_groups?.[0];
  document.querySelectorAll("[data-cluster-class]").forEach((b) => b.classList.toggle("active", b.dataset.clusterClass === group?.key));
  document.querySelectorAll("[data-cluster-class]").forEach((button) => {
    const match = (payload.cluster_groups || []).find((g) => g.key === button.dataset.clusterClass);
    if (match) {
      const base = match.label === "Lineage-shifted" ? "Lineage-shifted clusters" : `${match.label} clusters`;
      button.textContent = `${base} (${formatInt(match.n_clusters)})`;
    }
  });
  if (state.fig3.clusterView === "heatmap") {
    elements.ogClusterGallery.innerHTML = `<div class="fig3-cluster-heatmap"><iframe src="${escapeHTML(group?.heatmap || "")}" title="${escapeHTML(group?.label || "")} clustered heatmap"></iframe></div>`;
    return;
  }
  elements.ogClusterGallery.innerHTML = (group?.clusters || []).map((c) => `<article class="cluster-card">
    <h4>Cluster ${escapeHTML(c.cluster)} <span>(n=${formatInt(c.n)})</span></h4>
    <p class="tagline">${formatInt(c.n_genes)} quinoa genes · representative OGs: ${escapeHTML((c.ogs || []).join(", "))}</p>
    ${renderClusterProfileSvg(c, payload.style || {})}
    <p>${clusterSummaryText(c)}</p>
    <div class="chips">${(c.genes || []).slice(0, 6).map((g) => `<button class="chip" type="button" data-gene="${escapeHTML(g)}">${escapeHTML(fig3GeneLabel(g))}</button>`).join("")}</div>
    <div class="cardactions"><button class="outline" type="button" data-cluster-genes="${escapeHTML(group.key)}:${escapeHTML(c.cluster)}">View genes</button><button class="outline" type="button" data-go-cluster="${escapeHTML(group.key)}:${escapeHTML(c.cluster)}">GO enrichment</button><button class="outline" type="button" data-export-cluster="${escapeHTML(group.key)}:${escapeHTML(c.cluster)}">Export</button></div>
  </article>`).join("");
  elements.ogClusterGallery.querySelectorAll("[data-gene]").forEach((b) => b.addEventListener("click", () => loadGene(b.dataset.gene).catch(console.error)));
  elements.ogClusterGallery.querySelectorAll("[data-go-cluster]").forEach((b) => b.addEventListener("click", () => runClusterGO(b.dataset.goCluster).catch(console.error)));
  elements.ogClusterGallery.querySelectorAll("[data-cluster-genes]").forEach((b) => b.addEventListener("click", () => showClusterGenes(b.dataset.clusterGenes)));
  elements.ogClusterGallery.querySelectorAll("[data-export-cluster]").forEach((b) => b.addEventListener("click", () => exportClusterGenes(b.dataset.exportCluster)));
}

function renderClusterProfileSvg(cluster, style) {
  const points = cluster.profile || [];
  const lineageOrder = style.lineage_order || ["QA", "QB", "At", "Os"];
  const lineageColors = style.lineage_colors || { QA: "#4683B4", QB: "#67B3AD", At: "#F3AF44", Os: "#8E6BBE" };
  const tissueOrder = style.tissue_order || ["Root_tip", "Root", "Stem", "Leaf", "Flower", "Pistil", "Pollen", "Seed"];
  const values = points.flatMap((p) => [Number(p.mean_z || 0) - Number(p.se_z || 0), Number(p.mean_z || 0) + Number(p.se_z || 0)]);
  const minY = Math.min(-2, ...values);
  const maxY = Math.max(2, ...values);
  const width = 300;
  const height = 122;
  const left = 28;
  const right = 10;
  const top = 12;
  const bottom = 24;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const x = (index) => left + ((index - 1) / (tissueOrder.length - 1)) * plotW;
  const y = (value) => top + (maxY - value) / (maxY - minY || 1) * plotH;
  const groupBg = style.tissue_group_bg || {};
  const bgRects = tissueOrder.map((tissue, index) => {
    const group = style.tissue_group_map?.[tissue] || "";
    return `<rect x="${x(index + 1) - plotW / 14}" y="${top}" width="${plotW / 7}" height="${plotH}" fill="${escapeHTML(groupBg[group] || "#fbfcf9")}" opacity="0.8"></rect>`;
  }).join("");
  const lines = lineageOrder.map((lineage) => {
    const row = points.filter((p) => p.lineage === lineage);
    const d = row.map((p, i) => `${i ? "L" : "M"} ${x(p.x).toFixed(1)} ${y(Number(p.mean_z || 0)).toFixed(1)}`).join(" ");
    const seBars = row.map((p) => {
      const cx = x(p.x);
      const y1 = y(Number(p.mean_z || 0) - Number(p.se_z || 0));
      const y2 = y(Number(p.mean_z || 0) + Number(p.se_z || 0));
      return `<line x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${y1.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${lineageColors[lineage]}" stroke-opacity="0.28"></line>`;
    }).join("");
    const circles = row.map((p) => `<circle cx="${x(p.x).toFixed(1)}" cy="${y(Number(p.mean_z || 0)).toFixed(1)}" r="2.2" fill="${lineageColors[lineage]}"><title>${escapeHTML(lineage)} · ${escapeHTML(p.tissue)} · z=${formatValue(p.mean_z, 2)}</title></circle>`).join("");
    return `${seBars}<path d="${d}" fill="none" stroke="${lineageColors[lineage]}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>${circles}`;
  }).join("");
  const labels = tissueOrder.map((tissue, index) => `<text x="${x(index + 1).toFixed(1)}" y="${height - 5}" text-anchor="middle">${escapeHTML(tissue.replace("_", " "))}</text>`).join("");
  const legend = lineageOrder.map((lineage) => `<span><i class="linemark" style="--c:${lineageColors[lineage]}"></i>${escapeHTML(lineage)}</span>`).join("");
  return `<div class="profile"><div class="profile-title"><span>Mean lineage protein profile</span><span>z-score</span></div><svg viewBox="0 0 ${width} ${height}" aria-label="Cluster ${escapeHTML(cluster.cluster)} profile">${bgRects}<line x1="${left}" x2="${width - right}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="#cfd8ce" stroke-dasharray="3 3"></line>${lines}<g class="profile-axis">${labels}</g></svg><div class="linelegend">${legend}</div></div>`;
}

function clusterSummaryText(cluster) {
  const genes = (cluster.genes || []).slice(0, 3).map(fig3GeneLabel).join(", ");
  return genes ? `Representative quinoa genes include ${genes}.` : "Representative profile from clustered orthogroups.";
}

function findClusterByToken(token) {
  const [groupKey, clusterId] = String(token || "").split(":");
  const group = (state.resources.crossSpecies?.cluster_groups || []).find((item) => item.key === groupKey);
  const cluster = group?.clusters?.find((item) => String(item.cluster) === String(clusterId));
  return { group, cluster };
}

function showClusterGenes(token) {
  const { group, cluster } = findClusterByToken(token);
  if (!cluster || !elements.ogScatterDetail) return;
  elements.ogScatterDetail.innerHTML = `<p class="eyebrow">${escapeHTML(group.label)} cluster</p><h4>Cluster ${escapeHTML(cluster.cluster)}</h4><p class="tool-note">${formatInt(cluster.n)} orthogroups · ${formatInt(cluster.n_genes)} quinoa genes</p><div class="gene-chip-list scrollable">${(cluster.genes || []).map((gene) => `<button type="button" data-gene="${escapeHTML(gene)}">${escapeHTML(fig3GeneLabel(gene))}</button>`).join("")}</div>`;
  elements.ogScatterDetail.querySelectorAll("[data-gene]").forEach((b) => b.addEventListener("click", () => loadGene(b.dataset.gene).catch(console.error)));
  elements.ogScatterDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function exportClusterGenes(token) {
  const { group, cluster } = findClusterByToken(token);
  if (!cluster) return;
  downloadTextFile(`qloa_${group.key}_cluster_${cluster.cluster}_genes.tsv`, ["gene_id", ...(cluster.genes || [])].join("\n"));
}

function renderOrthogroupTable(payload) {
  const loadedRows = payload.scatter || [];
  const pageCount = Math.max(1, Math.ceil(loadedRows.length / state.fig3.tablePageSize));
  state.fig3.tablePage = Math.min(Math.max(1, state.fig3.tablePage), pageCount);
  const start = (state.fig3.tablePage - 1) * state.fig3.tablePageSize;
  const rows = loadedRows.slice(start, start + state.fig3.tablePageSize);
  const badgeClass = (name = "") => name === "Conserved" ? "b-con" : name.includes("Lineage") ? "b-shift" : name.includes("divergent") || name === "Divergent" ? "b-div" : "";
  const geneButtons = (genes = "") => String(genes || "").split(",").map((g) => g.trim()).filter(Boolean).slice(0, 3).map((g) => `<button class="gene-link" type="button" data-gene="${escapeHTML(g)}">${escapeHTML(fig3GeneLabel(g))}</button>`).join("");
  const correlationMap = new Map();
  (payload.rna_protein_correlation || []).forEach((row) => {
    const value = Number(row.pearson_r);
    if (!Number.isFinite(value)) return;
    const values = correlationMap.get(row.Orthogroup) || [];
    values.push(value);
    correlationMap.set(row.Orthogroup, values);
  });
  const pageNumbers = [...new Set([1, state.fig3.tablePage - 1, state.fig3.tablePage, state.fig3.tablePage + 1, pageCount])]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
  const pageButtons = pageNumbers.map((page, index) => {
    const previous = pageNumbers[index - 1];
    const gap = previous && page - previous > 1 ? "<span>…</span>" : "";
    return `${gap}<button class="${page === state.fig3.tablePage ? "active" : ""}" type="button" data-fig3-page="${page}">${page}</button>`;
  }).join("");
  const allPageSelected = rows.length > 0 && rows.every((row) => state.fig3.selectedOgs.has(row.Orthogroup));
  elements.ogTable.innerHTML = `<div class="tablewrap ${state.fig3.showOrthologs ? "" : "hide-orthologs"}"><table><thead><tr><th><input id="fig3-select-page" type="checkbox" aria-label="Select this page" ${allPageSelected ? "checked" : ""}></th><th>OG ID</th><th>Class</th><th>RNA-protein r</th><th>CqA gene</th><th>CqB gene</th><th class="ortholog-column">Arabidopsis ortholog</th><th class="ortholog-column">Rice ortholog</th><th>Mean conservation</th><th>Variance</th><th>Actions</th></tr></thead><tbody>${rows.map((r) => {
    const correlations = correlationMap.get(r.Orthogroup) || [];
    const meanR = correlations.length ? correlations.reduce((sum, value) => sum + value, 0) / correlations.length : null;
    return `<tr><td><input type="checkbox" data-og-select="${escapeHTML(r.Orthogroup)}" aria-label="Select ${escapeHTML(r.Orthogroup)}" ${state.fig3.selectedOgs.has(r.Orthogroup) ? "checked" : ""}></td><td class="gene">${escapeHTML(r.Orthogroup)}</td><td><span class="badge ${badgeClass(r.group_name)}">${escapeHTML(sourceDisplayName(r.group_name))}</span></td><td class="score" title="${escapeHTML(payload.filters?.lineage || "Mean across available lineages")}">${meanR === null ? "NA" : formatValue(meanR, 3)}</td><td class="gene">${geneButtons(r.Cqu_A_genes)}</td><td class="gene">${geneButtons(r.Cqu_B_genes)}</td><td class="gene ortholog-column">${escapeHTML(r.At_genes || "")}</td><td class="gene ortholog-column">${escapeHTML(r.Os_genes || "")}</td><td class="score">${formatValue(r.mean_cor, 3)}</td><td class="score">${formatValue(r.var_cor, 3)}</td><td><button class="ghost tinybtn" type="button" data-og-focus="${escapeHTML(r.Orthogroup)}">View</button></td></tr>`;
  }).join("")}</tbody></table></div><div class="pager"><span>Page size <b>${formatInt(state.fig3.tablePageSize)}</b></span><span>Showing ${rows.length ? formatInt(start + 1) : "0"} to ${formatInt(start + rows.length)} of ${formatInt(loadedRows.length)} results</span><span class="pages">${pageButtons}</span></div>`;
  elements.ogTable.querySelectorAll("[data-gene]").forEach((button) => {
    button.addEventListener("click", () => loadGene(button.dataset.gene).catch(console.error));
  });
  elements.ogTable.querySelectorAll("[data-og-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.fig3.selectedOgs.add(checkbox.dataset.ogSelect);
      else state.fig3.selectedOgs.delete(checkbox.dataset.ogSelect);
      renderOrthogroupTable(payload);
    });
  });
  elements.ogTable.querySelector("#fig3-select-page")?.addEventListener("change", (event) => {
    rows.forEach((row) => {
      if (event.target.checked) state.fig3.selectedOgs.add(row.Orthogroup);
      else state.fig3.selectedOgs.delete(row.Orthogroup);
    });
    renderOrthogroupTable(payload);
  });
  elements.ogTable.querySelectorAll("[data-fig3-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.fig3.tablePage = Number(button.dataset.fig3Page);
      renderOrthogroupTable(payload);
    });
  });
  elements.ogTable.querySelectorAll("[data-og-focus]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = (state.resources.crossSpecies?.scatter || []).find((item) => item.Orthogroup === button.dataset.ogFocus);
      renderOrthogroupDetail(row);
      elements.ogScatterDetail?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
  const exportSelected = document.querySelector("#fig3-export-selected");
  if (exportSelected) {
    exportSelected.disabled = state.fig3.selectedOgs.size === 0;
    exportSelected.textContent = state.fig3.selectedOgs.size ? `⇩ Export selected (${state.fig3.selectedOgs.size})` : "⇩ Export selected";
  }
}

function sourceDisplayName(name = "") {
  if (name === "Broadly divergent") return "Divergent";
  if (name === "Lineage-shifted") return "Lineage-shifted";
  if (name === "Broadly divergent + Lineage-shifted") return "Divergent + shifted";
  return name || "Other";
}

function fig3GeneLabel(geneId = "") {
  return state.resources.crossSpecies?.gene_labels?.[geneId] || geneId;
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/tab-separated-values;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function exportCrossSpeciesTable(rows = state.resources.crossSpecies?.scatter || [], filename = "qloa_cross_species_orthogroups.tsv") {
  const columns = [
    ["Orthogroup", "Orthogroup"],
    ["Class", "group_name"],
    ["Cqu_A_genes", "Cqu_A_genes"],
    ["Cqu_B_genes", "Cqu_B_genes"],
    ["At_genes", "At_genes"],
    ["Os_genes", "Os_genes"],
    ["mean_cor", "mean_cor"],
    ["var_cor", "var_cor"],
    ["member_total", "member_total"],
  ];
  const body = rows.map((row) => columns.map(([, key]) => String(row[key] ?? "").replaceAll("\t", " ").replaceAll("\n", " ")).join("\t"));
  downloadTextFile(filename, [columns.map(([label]) => label).join("\t"), ...body].join("\n"));
}

function exportSelectedCrossSpeciesRows() {
  const rows = (state.resources.crossSpecies?.scatter || []).filter((row) => state.fig3.selectedOgs.has(row.Orthogroup));
  if (!rows.length) return;
  exportCrossSpeciesTable(rows, "qloa_selected_orthogroups.tsv");
}

function splitInlineGenes(value = "") {
  return String(value || "").split(",").map((gene) => gene.trim()).filter(Boolean);
}

function abGeneLabel(annotation, fallback) {
  return annotation?.display_label || fallback || "Unknown gene";
}

function setAbTab(tab) {
  state.ab.activeTab = tab;
  document.querySelectorAll("[data-ab-tab]").forEach((button) => button.classList.toggle("active", button.dataset.abTab === tab));
  document.querySelectorAll("[data-ab-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.abPanel === tab));
  if (tab === "tissue" && state.resources.subgenome) {
    requestAnimationFrame(() => renderAbScatter(state.resources.subgenome));
  }
}

function renderAbSummary(payload) {
  const summary = payload.summary || {};
  elements.abSummaryCards.innerHTML = `
    <article style="--accent:#2f7f62"><span>Matched tissues</span><strong>${formatInt(summary.tissue_count)}</strong><small>RNA and APQ atlas</small><b>28</b></article>
    <article style="--accent:#8d7b42"><span>Homoeolog pairs</span><strong>${formatInt(summary.homoeolog_pair_count)}</strong><small>pair records per tissue</small><b>A|B</b></article>
    <article style="--accent:#547f9f"><span>Broad A-higher</span><strong>${formatInt(summary.broad_aa_count)}</strong><small>persistent AA pairs</small><b>AA</b></article>
    <article style="--accent:#b56f55"><span>Broad B-higher</span><strong>${formatInt(summary.broad_bb_count)}</strong><small>persistent BB pairs</small><b>BB</b></article>
  `;
}

function renderAbGlobalBalance(payload) {
  const direction = payload.direction_summary || [];
  const summary = payload.summary || {};
  elements.abGlobalBalance.innerHTML = `
    <div class="ab-balance-list">
      ${["RNA", "APQ"].map((omics) => {
        const rows = direction.filter((row) => row.omics === omics);
        const a = +(rows.find((row) => row.direction === "A_higher")?.prop || 0);
        const b = +(rows.find((row) => row.direction === "B_higher")?.prop || 0);
        const label = omics === "APQ" ? "Protein" : "RNA";
        return `<div class="ab-balance-row"><strong>${label}</strong><div class="ab-dualbar"><i class="a" style="width:${a * 100}%">A ${formatValue(a * 100, 1)}%</i><i class="b" style="width:${b * 100}%">${formatValue(b * 100, 1)}% B</i></div><div class="ab-fcbox"><span>Mean log2FC(A−B)</span><b>${formatValue(summary.global_log2fc_a_minus_b?.[omics], 3)}</b><small>p = ${Number(summary.global_p_value?.[omics]).toExponential(1)}</small></div></div>`;
      }).join("")}
    </div>
    <div class="ab-balance-scale" aria-hidden="true"><div class="a"></div><i></i><div class="b"></div><span>RNA: narrower A/B difference</span><span>Protein: broader A/B difference</span></div>
  `;
}

function renderAbBehavior(payload) {
  const rows = payload.behavior_summary || [];
  const total = rows.reduce((sum, row) => sum + (+row.n_pairs || 0), 0) || 1;
  elements.abBehaviorSummary.innerHTML = `
    <div class="ab-behavior-bar">${rows.map((row) => `<i class="${String(row.change_status).toLowerCase()}" style="width:${(+row.prop || 0) * 100}%" title="${escapeHTML(row.change_status)}: ${formatInt(row.n_pairs)} pairs"></i>`).join("")}</div>
    <div class="ab-behavior-cards">${rows.map((row) => `<button type="button" data-ab-behavior="${escapeHTML(row.change_status)}"><span>${escapeHTML(row.change_status)}</span><strong>${formatInt(row.n_pairs)}</strong><small>${formatValue((+row.n_pairs / total) * 100, 1)}% of classified pairs</small></button>`).join("")}</div>
    <p class="ab-inline-note">Behavior classes compare the magnitude of RNA and APQ rank differences in the matched s7 dataset.</p>
  `;
}

function renderAbQuadrantOverview(payload) {
  const colors = payload.style?.quadrant_colors || {};
  const tissues = payload.tissues || [];
  const counts = Object.fromEntries(["AA", "AB", "BA", "BB"].map((key) => [key, tissues.filter((tissue) => tissue.density_mode === key).length]));
  const descriptions = { AA: "RNA:A · Protein:A", AB: "RNA:A · Protein:B", BA: "RNA:B · Protein:A", BB: "RNA:B · Protein:B" };
  elements.abQuadrantOverview.innerHTML = `<div class="ab-quadrant-grid">${["AA", "AB", "BA", "BB"].map((key) => `<button type="button" data-ab-quadrant="${key}" style="--qcolor:${colors[key]}"><span>${key}</span><small>${descriptions[key]}</small><strong>${formatInt(counts[key])}</strong><em>tissue density modes</em></button>`).join("")}</div><div class="ab-quadrant-legend">${["AA", "AB", "BA", "BB"].map((key) => `<span><i style="background:${colors[key]}"></i>${descriptions[key]}</span>`).join("")}</div>`;
}

function renderAbTissue(payload) {
  const selected = (payload.tissues || []).find((item) => item.code === payload.selected_tissue) || payload.tissues?.[0];
  if (!selected) return;
  elements.abTissueTitle.textContent = `${selected.full_name} (${selected.code})`;
  elements.abTissueCorrelation.textContent = `RNA–protein r = ${formatValue(selected.rna_protein_r, 2)} · n = ${formatInt(selected.pair_count)} finite pairs`;
  elements.abTissueGrid.innerHTML = (payload.tissues || []).map((tissue) => `<button class="${tissue.code === selected.code ? "active" : ""}" type="button" data-ab-tissue="${escapeHTML(tissue.code)}" title="${escapeHTML(tissue.full_name)}">${escapeHTML(tissue.code)}</button>`).join("");
  const stack = (name, values) => `<div class="ab-stack-row"><strong>${name}</strong><div class="ab-stack"><i class="a" style="width:${(+values.A_higher || 0) * 100}%" title="A higher ${formatValue((+values.A_higher || 0) * 100, 1)}%"></i><i class="balanced" style="width:${(+values.Balanced || 0) * 100}%" title="Balanced ${formatValue((+values.Balanced || 0) * 100, 1)}%"></i><i class="b" style="width:${(+values.B_higher || 0) * 100}%" title="B higher ${formatValue((+values.B_higher || 0) * 100, 1)}%"></i></div><span>${formatInt(payload.summary?.homoeolog_pair_count)} tested pairs</span></div>`;
  elements.abTissueBiasBars.innerHTML = `${stack("RNA", selected.rna)}${stack("Protein", selected.protein)}<div class="ab-stack-legend"><span class="a">A higher</span><span class="balanced">Balanced</span><span class="b">B higher</span><small>Bias calls use BH q ≤ 0.05</small></div>`;
  const colors = payload.style?.quadrant_colors || {};
  elements.abTissueDetail.innerHTML = `<p class="eyebrow">Selected tissue summary</p><div class="ab-tissue-quadrants">${["AA", "AB", "BA", "BB"].map((key) => { const item = selected.quadrants?.[key] || {}; return `<button type="button" data-ab-quadrant="${key}" style="--qcolor:${colors[key]}"><span>${key}</span><strong>${formatValue((+item.proportion || 0) * 100, 1)}%</strong><small>${formatInt(item.count)} pairs</small></button>`; }).join("")}</div><div class="ab-selected-filter">${state.ab.quadrant === "all" ? "All directional quadrants are shown." : `Filtered to ${escapeHTML(state.ab.quadrant)} pairs.`}</div>`;
  renderAbScatter(payload);
}

function renderAbScatter(payload) {
  if (!elements.abTissueScatter || !window.Plotly || state.ab.activeTab !== "tissue") return;
  const rows = payload.scatter || [];
  const colors = payload.style?.quadrant_colors || {};
  const traces = ["AA", "AB", "BA", "BB"].map((quadrant) => {
    const values = rows.filter((row) => row.quadrant === quadrant);
    return { type: "scattergl", mode: "markers", name: quadrant, x: values.map((row) => row.rna_logfc_ba), y: values.map((row) => row.protein_logfc_ba), customdata: values.map((row) => [row.pair_id, row.behavior, row.rna_q, row.protein_q, row.label_a, row.label_b]), marker: { color: colors[quadrant], size: 6, opacity: 0.55 }, hovertemplate: "<b>%{customdata[4]}</b><br><b>%{customdata[5]}</b><br>RNA log2FC(B−A): %{x:.2f}<br>Protein log2FC(B−A): %{y:.2f}<br>%{customdata[1]}<br>RNA q: %{customdata[2]:.2g}<br>Protein q: %{customdata[3]:.2g}<extra>" + quadrant + "</extra>" };
  });
  const layout = { margin: { l: 52, r: 14, t: 12, b: 48 }, height: 390, paper_bgcolor: "transparent", plot_bgcolor: "#fff", font: { family: "Inter, Arial, sans-serif", size: 11, color: "#53675f" }, xaxis: { title: "RNA log2FC(B−A)", zeroline: true, zerolinecolor: "#95a39d", gridcolor: "#edf0eb" }, yaxis: { title: "Protein log2FC(B−A)", zeroline: true, zerolinecolor: "#95a39d", gridcolor: "#edf0eb" }, legend: { orientation: "h", y: -0.22 }, hovermode: "closest" };
  Plotly.react(elements.abTissueScatter, traces, layout, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] });
  elements.abTissueScatter.removeAllListeners?.("plotly_click");
  elements.abTissueScatter.on("plotly_click", (event) => {
    const pairId = event.points?.[0]?.customdata?.[0];
    if (!pairId) return;
    state.ab.pairId = pairId;
    setAbTab("pairs");
    loadSubgenomeResource({ pairId }).catch(console.error);
  });
}

function renderAbPairTable(payload) {
  const rows = payload.pair_table || [];
  const pagination = payload.pagination || {};
  elements.abPairResultCount.textContent = `${formatInt(pagination.total)} matching pairs`;
  elements.abPairTable.innerHTML = rows.length ? `<div class="ab-table-wrap"><table><thead><tr><th>Pair</th><th>Selected tissue</th><th>RNA log2FC</th><th>Protein log2FC</th><th>RNA call</th><th>Protein call</th><th>Behavior</th><th>Pattern</th></tr></thead><tbody>${rows.map((row) => `<tr data-ab-pair="${escapeHTML(row.pair_id)}"><td><button type="button"><strong>${escapeHTML(abGeneLabel(row.annotation_a, row.gene_a))}</strong><small>${escapeHTML(abGeneLabel(row.annotation_b, row.gene_b))}</small></button></td><td>${escapeHTML(row.tissue)}</td><td>${formatValue(row.rna_logfc_ba, 2)}<small>q ${formatValue(row.rna_q, 2)}</small></td><td>${formatValue(row.protein_logfc_ba, 2)}<small>q ${formatValue(row.protein_q, 2)}</small></td><td><span class="ab-call ${String(row.rna_bias).toLowerCase()}">${escapeHTML(String(row.rna_bias).replace("_", " "))}</span></td><td><span class="ab-call ${String(row.protein_bias).toLowerCase()}">${escapeHTML(String(row.protein_bias).replace("_", " "))}</span></td><td><span class="ab-behavior ${String(row.behavior).toLowerCase()}">${escapeHTML(row.behavior)}</span></td><td>${escapeHTML(row.broad_pattern)}</td></tr>`).join("")}</tbody></table></div>` : buildEmpty("No homoeolog pairs match the current filters.");
  elements.abPairPagination.innerHTML = `<span>Page ${formatInt(pagination.page)} of ${formatInt(pagination.page_count)}</span><div><button type="button" data-ab-page="${Math.max(1, pagination.page - 1)}" ${pagination.page <= 1 ? "disabled" : ""}>Previous</button><button type="button" data-ab-page="${Math.min(pagination.page_count, pagination.page + 1)}" ${pagination.page >= pagination.page_count ? "disabled" : ""}>Next</button></div>`;
}

function renderAbProfileChart(profile, layer, title) {
  const tissues = profile.tissues || [];
  const valuesA = (profile[layer]?.A || []).map((value) => value == null ? null : Math.log2(+value + 1));
  const valuesB = (profile[layer]?.B || []).map((value) => value == null ? null : Math.log2(+value + 1));
  const allValues = [...valuesA, ...valuesB].filter((value) => Number.isFinite(value));
  const max = Math.max(...allValues, 1);
  const W = 560, H = 220, left = 38, right = 12, top = 18, bottom = 42;
  const x = (index) => left + index * (W - left - right) / Math.max(1, tissues.length - 1);
  const y = (value) => top + (1 - (value || 0) / max) * (H - top - bottom);
  const path = (values) => values.map((value, index) => value == null ? null : `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).filter(Boolean).join(" ");
  return `<div class="ab-profile-chart"><h4>${title}</h4><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHTML(title)} across 28 tissues"><line x1="${left}" y1="${H - bottom}" x2="${W - right}" y2="${H - bottom}" class="axis"></line><path d="${path(valuesA)}" class="line-a"></path><path d="${path(valuesB)}" class="line-b"></path>${valuesA.map((value, index) => value == null ? "" : `<circle cx="${x(index)}" cy="${y(value)}" r="2.4" class="point-a"><title>${escapeHTML(tissues[index].code)} · A ${formatValue(value, 2)}</title></circle>`).join("")}${valuesB.map((value, index) => value == null ? "" : `<circle cx="${x(index)}" cy="${y(value)}" r="2.4" class="point-b"><title>${escapeHTML(tissues[index].code)} · B ${formatValue(value, 2)}</title></circle>`).join("")}${tissues.map((tissue, index) => index % 2 ? "" : `<text x="${x(index)}" y="${H - 16}" text-anchor="middle">${escapeHTML(tissue.code)}</text>`).join("")}</svg><div class="ab-line-legend"><span class="a">A copy</span><span class="b">B copy</span></div></div>`;
}

function renderAbPairDetail(payload) {
  const profile = payload.selected_pair;
  if (!profile) {
    elements.abPairDetail.innerHTML = buildEmpty("Select a homoeolog pair to inspect its 28-tissue profiles.");
    return;
  }
  const geneA = profile.gene_a || {};
  const geneB = profile.gene_b || {};
  const colors = payload.style?.quadrant_colors || {};
  elements.abPairDetail.innerHTML = `
    <div class="ab-pair-detail-head"><div><p class="eyebrow">Selected homoeolog pair</p><h3>${escapeHTML(profile.pair_id)}</h3><p>${escapeHTML(geneA.title || "No functional annotation")} · ${escapeHTML(geneB.title || "No functional annotation")}</p></div><div><span class="ab-behavior ${String(profile.behavior).toLowerCase()}">${escapeHTML(profile.behavior)}</span><span class="ab-pattern-badge">${escapeHTML(profile.pattern)}</span></div></div>
    <div class="ab-gene-pair-cards"><button type="button" data-gene="${escapeHTML(geneA.gene_id)}"><span>A-subgenome</span><strong>${escapeHTML(abGeneLabel(geneA, geneA.gene_id))}</strong><small>${escapeHTML(geneA.title || "Open gene report")}</small></button><i aria-hidden="true">↔</i><button type="button" data-gene="${escapeHTML(geneB.gene_id)}"><span>B-subgenome</span><strong>${escapeHTML(abGeneLabel(geneB, geneB.gene_id))}</strong><small>${escapeHTML(geneB.title || "Open gene report")}</small></button></div>
    <div class="ab-profile-grid">${renderAbProfileChart(profile, "transcriptome", "RNA abundance · log2(TPM + 1)")}${renderAbProfileChart(profile, "proteome", "Protein abundance · log2(APQ + 1)")}</div>
    <div class="ab-pair-bias-strip"><div><strong>Cross-tissue directional states</strong><span>Hover a cell for pair-level logFC and q values.</span></div><div>${(profile.bias || []).map((item) => `<i style="background:${colors[item.quadrant] || "#e6e9e5"}" title="${escapeHTML(item.tissue)} · ${escapeHTML(item.quadrant || "NA")} · RNA ${formatValue(item.rna_logfc_ba, 2)} (q ${formatValue(item.rna_q, 2)}) · Protein ${formatValue(item.protein_logfc_ba, 2)} (q ${formatValue(item.protein_q, 2)})"></i>`).join("")}</div><small>${(profile.bias || []).map((item) => `<span>${escapeHTML(item.tissue)}</span>`).join("")}</small></div>
  `;
}

function renderAbPatternHeatmap(payload) {
  const matrix = payload.pattern_matrix || { columns: [], rows: [] };
  const colors = payload.style?.quadrant_colors || {};
  elements.abPatternSummary.innerHTML = `<div class="ab-broad-cards"><button type="button" data-ab-pattern="broad_aa"><span>Persistent A-higher</span><strong>${formatInt(payload.summary?.broad_aa_count)}</strong><small>Broad AA homoeolog pairs</small></button><button type="button" data-ab-pattern="broad_bb"><span>Persistent B-higher</span><strong>${formatInt(payload.summary?.broad_bb_count)}</strong><small>Broad BB homoeolog pairs</small></button></div>`;
  elements.abPatternHeatmap.innerHTML = matrix.rows?.length ? `<div class="ab-heatmap-legend">${["AA", "AB", "BA", "BB"].map((key) => `<span><i style="background:${colors[key]}"></i>${key}</span>`).join("")}<small>Showing ${formatInt(matrix.rows.length)} of ${formatInt(matrix.filtered_total)} persistent pairs</small></div><div class="ab-pattern-heatmap"><div class="ab-heatmap-header" style="grid-template-columns:220px repeat(${matrix.columns.length}, 18px)"><span></span>${matrix.columns.map((column) => `<b>${escapeHTML(column)}</b>`).join("")}</div>${matrix.rows.map((row) => `<div class="ab-heatmap-row" style="grid-template-columns:220px repeat(${matrix.columns.length}, 18px)"><button type="button" data-ab-pair="${escapeHTML(row.pair_id)}" title="${escapeHTML(row.display_label)} · open pair profile">${escapeHTML(row.display_label)}</button>${matrix.columns.map((column) => `<i style="background:${colors[row.values?.[column]] || "#e8ebe7"}" title="${escapeHTML(row.display_label)} · ${escapeHTML(column)} · ${escapeHTML(row.values?.[column] || "NA")}"></i>`).join("")}</div>`).join("")}</div>` : buildEmpty("No persistent A/B pattern rows match this selection.");
}

function renderAbGo(payload) {
  const groups = payload.go_terms || {};
  const terms = [...(groups["Broad AA"] || []), ...(groups["Broad BB"] || [])];
  const maxCount = Math.max(...terms.map((term) => +term.gene_count || 0), 1);
  elements.abGoChart.innerHTML = `<div class="ab-go-columns">${["Broad AA", "Broad BB"].map((group) => `<div><h4>${group}</h4>${(groups[group] || []).slice(0, 10).map((term, index) => `<button type="button" data-ab-go-group="${group}" data-ab-go-index="${index}"><span>${escapeHTML(term.name)}</span><i style="--score:${Math.min(100, (+term.minus_log10_q || 0) * 2)}%;--size:${8 + Math.sqrt((+term.gene_count || 0) / maxCount) * 13}px"></i><small>${formatInt(term.gene_count)}</small></button>`).join("")}</div>`).join("")}</div>`;
  const firstGroup = groups["Broad AA"]?.length ? "Broad AA" : "Broad BB";
  renderAbGoDetail(payload, firstGroup, 0);
}

function renderAbGoDetail(payload, group, index) {
  const term = payload.go_terms?.[group]?.[index];
  if (!term) {
    elements.abGoDetail.innerHTML = buildEmpty("Select a GO term to inspect its genes.");
    return;
  }
  elements.abGoDetail.innerHTML = `<div><span>${escapeHTML(group)}</span><strong>${escapeHTML(term.name)}</strong><small>${escapeHTML(term.go_id)} · BH q ${Number(term.q_value).toExponential(2)} · ${formatInt(term.gene_count)} genes</small></div><div class="ab-go-genes">${(term.gene_items || []).map((gene) => `<button type="button" data-gene="${escapeHTML(gene.gene_id)}">${escapeHTML(gene.display_label)}</button>`).join("")}</div>`;
}

function renderSubgenomeResource(payload) {
  renderAbSummary(payload);
  renderAbGlobalBalance(payload);
  renderAbBehavior(payload);
  renderAbQuadrantOverview(payload);
  renderAbTissue(payload);
  renderAbPairTable(payload);
  renderAbPairDetail(payload);
  renderAbPatternHeatmap(payload);
  renderAbGo(payload);
  elements.abMethodsSummary.innerHTML = Object.entries(payload.methods || {}).map(([key, value]) => `<p><strong>${escapeHTML(key.replaceAll("_", " "))}</strong>${escapeHTML(value)}</p>`).join("");
  document.querySelectorAll("[data-ab-pattern]").forEach((button) => button.classList.toggle("active", button.dataset.abPattern === state.ab.pattern));
}

const CFMS_COLORS = {
  A: "#557f9f",
  B: "#b56f55",
  association: "#3f7b68",
  gold: "#c39448",
  Nonreplaceable: "#c45f57",
  "Low replaceable": "#d89a4d",
  "High replaceable": "#3f8a76",
  "Fully replaceable": "#557f9f",
  High: "#3f8a76",
  Moderate: "#557f9f",
  Low: "#b88b38",
  Divergent: "#c45f57",
};

function cfmsPaginationHTML(pagination, kind) {
  const page = +pagination?.page || 1;
  const pageCount = +pagination?.page_count || 1;
  return `<span>Page ${formatInt(page)} of ${formatInt(pageCount)}</span><div><button type="button" data-cfms-page-kind="${kind}" data-cfms-page="${Math.max(1, page - 1)}" ${page <= 1 ? "disabled" : ""}>Previous</button><button type="button" data-cfms-page-kind="${kind}" data-cfms-page="${Math.min(pageCount, page + 1)}" ${page >= pageCount ? "disabled" : ""}>Next</button></div>`;
}

function cfmsLineChart(fractions = [], series = [], options = {}) {
  const width = options.width || 760;
  const height = options.height || 245;
  const left = 42;
  const right = 18;
  const top = 18;
  const bottom = 44;
  const x = (index) => left + (index * (width - left - right)) / Math.max(1, fractions.length - 1);
  const normalizedSeries = series.map((item) => ({ ...item, normalized: options.sharedScale ? item.values : normalize(item.values || []).map((value) => value ?? 0) }));
  const allValues = options.sharedScale ? normalizedSeries.flatMap((item) => item.normalized || []).filter(Number.isFinite) : [0, 1];
  const minimum = options.min ?? Math.min(...allValues, 0);
  const maximum = options.max ?? Math.max(...allValues, 1);
  const y = (value) => top + (1 - ((value - minimum) / Math.max(maximum - minimum, 1e-9))) * (height - top - bottom);
  const paths = normalizedSeries.map((item) => {
    const points = (item.normalized || []).map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(Number(value) || 0).toFixed(1)}`).join(" ");
    const circles = (item.normalized || []).map((value, index) => `<circle cx="${x(index).toFixed(1)}" cy="${y(Number(value) || 0).toFixed(1)}" r="2.2" fill="${item.color}"><title>${escapeHTML(fractions[index])} · ${escapeHTML(item.label)}: ${formatValue(item.values?.[index], item.digits ?? 3)}</title></circle>`).join("");
    const area = item.area ? `<path d="${points} L${x(fractions.length - 1).toFixed(1)},${height - bottom} L${left},${height - bottom} Z" fill="${item.color}" opacity="0.08"></path>` : "";
    return `${area}<path d="${points}" fill="none" stroke="${item.color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"></path>${circles}`;
  }).join("");
  const ticks = fractions.map((fraction, index) => (index % 10 === 0 || index === fractions.length - 1) ? `<text x="${x(index).toFixed(1)}" y="${height - 16}" text-anchor="middle">${escapeHTML(String(fraction).replace("IEX_", ""))}</text>` : "").join("");
  const grid = [0, 0.25, 0.5, 0.75, 1].map((factor) => `<line x1="${left}" x2="${width - right}" y1="${(top + factor * (height - top - bottom)).toFixed(1)}" y2="${(top + factor * (height - top - bottom)).toFixed(1)}"></line>`).join("");
  const legend = normalizedSeries.map((item) => `<span><i style="background:${item.color}"></i>${escapeHTML(item.label)}</span>`).join("");
  return `<div class="cfms-line-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHTML(options.ariaLabel || "CF-MS elution profile")}"><g class="cfms-chart-grid">${grid}</g><line class="cfms-chart-axis" x1="${left}" x2="${width - right}" y1="${height - bottom}" y2="${height - bottom}"></line>${paths}<g class="cfms-chart-labels">${ticks}</g></svg><div class="cfms-line-legend">${legend}<small>Fraction</small></div></div>`;
}

function cfmsSparkline(values = [], color = CFMS_COLORS.association) {
  const width = 150;
  const height = 38;
  const points = (values || []).map((value, index) => `${(index * width / Math.max(1, values.length - 1)).toFixed(1)},${(height - 3 - (+value || 0) * (height - 6)).toFixed(1)}`).join(" ");
  return `<svg class="cfms-sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"></polyline></svg>`;
}

function cfmsHeatmap(rows = [], fractions = [], options = {}) {
  if (!rows.length) return buildEmpty("No profiles match the current filters.");
  const labelKey = options.labelKey || "display_label";
  const idKey = options.idKey || "gene_id";
  const valuesKey = options.valuesKey || "values";
  const rowAction = options.rowAction || "profile";
  const columns = Math.max(fractions.length, 1);
  const header = fractions.map((fraction, index) => `<b title="${escapeHTML(fraction)}">${index % 5 === 0 ? escapeHTML(String(fraction).replace("IEX_", "")) : ""}</b>`).join("");
  return `<div class="cfms-heatmap-shell"><div class="cfms-heatmap" style="--cfms-cols:${columns}"><div class="cfms-heatmap-header"><span>Protein</span>${header}</div>${rows.map((row) => {
    const values = row[valuesKey] || row.profile || [];
    const id = row[idKey] || row.gene_id || "";
    const label = row[labelKey] || row.display_label || id;
    return `<div class="cfms-heatmap-row"><button type="button" data-cfms-${rowAction}="${escapeHTML(id)}" title="${escapeHTML(label)}">${escapeHTML(label)}</button>${fractions.map((fraction, index) => `<i style="background:${rampColor(+values[index] || 0, [0, 0.45, 1], ["#f4f1e8", "#9eb7ae", "#285f56"])}"><span>${escapeHTML(label)}<br>${escapeHTML(fraction)} · ${formatValue(values[index], 3)}</span></i>`).join("")}</div>`;
  }).join("")}</div><div class="cfms-heatmap-scale"><span>row-normalized signal</span><i></i><b>0</b><b>1</b></div></div>`;
}

function renderCfmsSummary(payload) {
  const summary = payload.summary || {};
  elements.cfmsSummaryCards.innerHTML = `
    <article style="--accent:#557f9f"><div><span>Elution resolution</span><strong>${formatInt(summary.fraction_count)}</strong><small>IEX fractions</small><p>Fraction-resolved protein abundance profiles.</p></div><b>IEX</b></article>
    <article style="--accent:#3f7b68"><div><span>Callable profiles</span><strong>${formatInt(summary.profile_count)}</strong><small>proteins</small><p>Proteins retained for profile and quartet analysis.</p></div><b>Pr</b></article>
    <article style="--accent:#b56f55"><div><span>Association network</span><strong>${formatInt(summary.edge_count)}</strong><small>edges · ≈90% precision</small><p>${formatInt(summary.network_gene_count)} proteins in the final network.</p></div><b>Ed</b></article>
    <article style="--accent:#c39448"><div><span>Callable quartets</span><strong>${formatInt(summary.callable_family_count)}</strong><small>homoeolog families</small><p>${formatInt(summary.community_count)} graph-derived communities.</p></div><b>A/B</b></article>
  `;
  elements.cfmsMethodsSummary.innerHTML = Object.entries(payload.methods || {}).map(([key, value]) => `<p><strong>${escapeHTML(key.replaceAll("_", " "))}</strong>${escapeHTML(value)}</p>`).join("");
  renderCfmsOverview(payload);
}

function renderCfmsOverview(payload) {
  const fractions = payload.fractions || [];
  const global = payload.global_elution || {};
  elements.cfmsGlobalElution.innerHTML = cfmsLineChart(fractions, [
    { label: "Mean normalized profile", values: global.mean_profile || [], color: CFMS_COLORS.association, area: true },
    { label: "Detected proteins", values: global.detected_counts || [], color: CFMS_COLORS.gold, digits: 0 },
  ], { ariaLabel: "Global mean CF-MS signal and protein detection across IEX fractions" });
  const composition = payload.network?.edge_composition || [];
  const total = composition.reduce((sum, item) => sum + (+item.N || 0), 0) || 1;
  elements.cfmsNetworkComposition.innerHTML = `<div class="cfms-edge-stack">${composition.map((item) => `<button type="button" data-cfms-network-context="${escapeHTML(item.EdgeType)}" style="width:${(+item.N / total) * 100}%;--edge-color:${item.EdgeType === "AA" ? CFMS_COLORS.A : item.EdgeType === "BB" ? CFMS_COLORS.B : CFMS_COLORS.association}" title="Open ${escapeHTML(item.EdgeType)} associations"><strong>${escapeHTML(item.EdgeType)}</strong><span>${formatValue((+item.N / total) * 100, 1)}%</span></button>`).join("")}</div><div class="cfms-composition-list">${composition.map((item) => `<button type="button" data-cfms-network-context="${escapeHTML(item.EdgeType)}"><i class="${escapeHTML(String(item.EdgeType).toLowerCase())}"></i><span>${escapeHTML(item.EdgeType)} associations</span><strong>${formatInt(item.N)}</strong><small>${formatValue((+item.N / total) * 100, 1)}%</small></button>`).join("")}</div><div class="cfms-inline-stat"><span>Mean degree <b>${formatValue(payload.network?.metrics?.Mean_degree, 1)}</b></span><span>Largest component <b>${formatInt(payload.network?.metrics?.Largest_component_size)}</b></span><span>Maximum degree <b>${formatInt(payload.network?.metrics?.Max_degree)}</b></span></div>`;
  const replaceability = payload.replaceability || [];
  const familyTotal = replaceability.reduce((sum, row) => sum + (+row.N || 0), 0) || 1;
  elements.cfmsReplaceabilityOverview.innerHTML = `<div class="cfms-replaceability-stack">${replaceability.map((row) => `<button type="button" data-cfms-quartet-class="${escapeHTML(row.ReplaceabilityClass)}" style="width:${(+row.N / familyTotal) * 100}%;background:${CFMS_COLORS[row.ReplaceabilityClass]}" title="${escapeHTML(row.ReplaceabilityClass)} · ${formatInt(row.N)} families"></button>`).join("")}</div><div class="cfms-replaceability-list">${replaceability.map((row) => `<button type="button" data-cfms-quartet-class="${escapeHTML(row.ReplaceabilityClass)}"><i style="background:${CFMS_COLORS[row.ReplaceabilityClass]}"></i><span>${escapeHTML(row.ReplaceabilityClass)}</span><strong>${formatInt(row.N)}</strong><small>${formatValue((+row.N / familyTotal) * 100, 1)}%</small></button>`).join("")}</div><p class="cfms-inline-note">Replaceability summarizes which of four candidate A/B associations are observed for each callable homoeolog quartet.</p>`;
  const guide = [
    ["profiles", "Elution profiles", "Inspect 59-fraction traces, peak fractions and network partners."],
    ["network", "Association network", "Search the full edge resource and explore local protein neighborhoods."],
    ["communities", "Communities", "Browse graph-derived modules and their member profiles."],
    ["homoeologs", "Homoeologs", "Compare A/B profile similarity with quartet replaceability."],
  ];
  elements.cfmsResourceGuide.innerHTML = `<div class="cfms-guide-list">${guide.map(([tab, title, text], index) => `<button type="button" data-cfms-open-tab="${tab}"><b>${index + 1}</b><span><strong>${title}</strong><small>${text}</small></span><i>›</i></button>`).join("")}</div><div class="cfms-evidence-note"><strong>Evidence scope</strong><p>${escapeHTML(payload.methods?.limitation || "Co-fractionation supports association evidence but does not establish direct physical binding.")}</p></div>`;
}

function renderCfmsProfiles(payload) {
  const pagination = payload.pagination || {};
  const rows = payload.table || [];
  elements.cfmsProfileResultCount.textContent = `${formatInt(pagination.total)} matching profiles`;
  elements.cfmsProfileHeatmap.innerHTML = cfmsHeatmap(payload.heatmap || [], payload.fractions || [], { rowAction: "profile" });
  elements.cfmsProfileTable.innerHTML = rows.length ? `<div class="cfms-table-wrap"><table><thead><tr><th>Protein</th><th>Subgenome</th><th>Detected fractions</th><th>Peak fraction</th><th>Total intensity</th><th>Degree</th><th>Community</th></tr></thead><tbody>${rows.map((row) => `<tr data-cfms-profile="${escapeHTML(row.gene_id)}"><td><button type="button"><strong>${escapeHTML(row.display_label)}</strong><small>${escapeHTML(row.title || "No functional annotation")}</small></button></td><td><span class="cfms-subgenome ${String(row.subgenome).toLowerCase()}">${escapeHTML(row.subgenome)}</span></td><td>${formatInt(row.detected_fractions)} / ${formatInt(payload.fractions?.length)}</td><td>${escapeHTML(row.peak_fraction)}</td><td>${formatRaw(+row.total_intensity || 0)}</td><td>${formatInt(row.degree)}</td><td>${escapeHTML(row.community || "Not assigned")}</td></tr>`).join("")}</tbody></table></div>` : buildEmpty("No callable profiles match the current filters.");
  elements.cfmsProfilePagination.innerHTML = cfmsPaginationHTML(pagination, "profile");
  renderCfmsProfileDetail(payload.selected, payload.fractions || []);
}

function renderCfmsProfileDetail(selected, fractions) {
  if (!selected) {
    elements.cfmsProfileDetail.innerHTML = buildEmpty("Select a protein to inspect its elution profile.");
    return;
  }
  elements.cfmsProfileDetail.innerHTML = `<div class="cfms-detail-head"><p class="eyebrow">Selected protein</p><h3>${escapeHTML(selected.display_label)}</h3><p>${escapeHTML(selected.title || "No functional annotation available")}</p><button type="button" data-gene="${escapeHTML(selected.gene_id)}">Open gene report</button></div>${cfmsLineChart(fractions, [{ label: "Normalized elution", values: selected.values || [], color: selected.subgenome === "B" ? CFMS_COLORS.B : CFMS_COLORS.A, area: true }], { height: 205, sharedScale: true, min: 0, max: 1, ariaLabel: `${selected.display_label} CF-MS elution profile` })}<div class="cfms-detail-metrics"><span><small>Subgenome</small><strong>${escapeHTML(selected.subgenome)}</strong></span><span><small>Peak</small><strong>${escapeHTML(selected.peak_fraction)}</strong></span><span><small>Detected</small><strong>${formatInt(selected.detected_fractions)} / ${formatInt(fractions.length)}</strong></span><span><small>Degree</small><strong>${formatInt(selected.degree)}</strong></span><span><small>Community</small><strong>${escapeHTML(selected.community || "NA")}</strong></span></div><div class="cfms-neighbor-list"><h4>Top network partners</h4>${(selected.neighbors || []).length ? selected.neighbors.map((neighbor) => `<button type="button" data-cfms-profile="${escapeHTML(neighbor.gene_id)}"><span>${escapeHTML(neighbor.display_label)}</span><small>degree ${formatInt(neighbor.degree)}</small></button>`).join("") : `<p>No final-network neighbors were found.</p>`}</div>`;
}

function renderCfmsNetwork(payload) {
  const pagination = payload.pagination || {};
  elements.cfmsNetworkResultCount.textContent = `${formatInt(pagination.total)} matching associations`;
  elements.cfmsNetworkVisualCount.textContent = `${formatInt(payload.nodes?.length)} nodes · ${formatInt(payload.edges?.length)} visible edges`;
  elements.cfmsNetworkLegend.innerHTML = `<span><i class="a"></i>A-subgenome protein</span><span><i class="b"></i>B-subgenome protein</span><span><i class="aa"></i>A–A edge</span><span><i class="ab"></i>A–B edge</span><span><i class="bb"></i>B–B edge</span>`;
  const rows = payload.table || [];
  elements.cfmsNetworkTable.innerHTML = rows.length ? `<div class="cfms-table-wrap"><table><thead><tr><th>Protein 1</th><th>Protein 2</th><th>Edge type</th><th>Context</th></tr></thead><tbody>${rows.map((row) => `<tr data-cfms-edge-row="${escapeHTML(row.Gene1)}__${escapeHTML(row.Gene2)}"><td><button type="button" data-gene="${escapeHTML(row.Gene1)}">${escapeHTML(row.Gene1_label)}</button></td><td><button type="button" data-gene="${escapeHTML(row.Gene2)}">${escapeHTML(row.Gene2_label)}</button></td><td><span class="cfms-edge-type ${String(row.EdgeType).toLowerCase()}">${escapeHTML(row.EdgeType)}</span></td><td>${escapeHTML(row.SameOrCross)}</td></tr>`).join("")}</tbody></table></div>` : buildEmpty("No association edges match the current filters.");
  elements.cfmsNetworkPagination.innerHTML = cfmsPaginationHTML(pagination, "network");
  elements.cfmsNetworkDetail.innerHTML = `<div class="cfms-detail-head"><p class="eyebrow">Network selection</p><h3>Choose a protein or edge</h3><p>Node size reflects degree in the final network. Search for a symbol or gene ID to open a protein-centred neighborhood.</p></div><div class="cfms-network-summary"><span><small>Filtered edges</small><strong>${formatInt(pagination.total)}</strong></span><span><small>Visible nodes</small><strong>${formatInt(payload.nodes?.length)}</strong></span><span><small>Precision target</small><strong>≈ 90%</strong></span></div>`;
  renderCfmsNetworkGraph(payload);
}

function renderCfmsNetworkGraph(payload) {
  if (!window.cytoscape || !elements.cfmsNetworkStage) return;
  if (state.cfms.cy) {
    state.cfms.cy.destroy();
    state.cfms.cy = null;
  }
  elements.cfmsNetworkStage.replaceChildren();
  const xs = (payload.nodes || []).map((node) => +node.x || 0);
  const ys = (payload.nodes || []).map((node) => +node.y || 0);
  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 1;
  const yMin = ys.length ? Math.min(...ys) : 0;
  const yMax = ys.length ? Math.max(...ys) : 1;
  const nodeElements = (payload.nodes || []).map((node) => ({
    data: node,
    position: {
      x: 40 + (((+node.x || 0) - xMin) / Math.max(xMax - xMin, 1e-9)) * 820,
      y: 40 + (((+node.y || 0) - yMin) / Math.max(yMax - yMin, 1e-9)) * 540,
    },
  }));
  const edgeElements = (payload.edges || []).map((edge) => ({ data: edge }));
  state.cfms.cy = cytoscape({
    container: elements.cfmsNetworkStage,
    elements: [...nodeElements, ...edgeElements],
    layout: { name: "preset", fit: true, padding: 35 },
    minZoom: 0.25,
    maxZoom: 4,
    wheelSensitivity: 0.25,
    style: [
      { selector: "node", style: { width: "mapData(degree, 0, 190, 7, 25)", height: "mapData(degree, 0, 190, 7, 25)", "background-color": "#557f9f", "border-width": 1, "border-color": "#fffef9", label: "", opacity: 0.9 } },
      { selector: "node[subgenome = 'B']", style: { "background-color": "#b56f55" } },
      { selector: "edge", style: { width: 0.65, opacity: 0.22, "line-color": "#729889", "curve-style": "haystack" } },
      { selector: "edge[edge_type = 'AA']", style: { "line-color": "#557f9f" } },
      { selector: "edge[edge_type = 'BB']", style: { "line-color": "#b56f55" } },
      { selector: ":selected", style: { "border-width": 3, "border-color": "#d5a04b", opacity: 1, "z-index": 20 } },
      { selector: ".faded", style: { opacity: 0.07 } },
      { selector: ".focus", style: { opacity: 1, "z-index": 30 } },
    ],
  });
  state.cfms.cy.on("tap", "node", (event) => {
    const node = event.target;
    const data = node.data();
    state.cfms.cy.elements().addClass("faded");
    node.closedNeighborhood().removeClass("faded").addClass("focus");
    elements.cfmsNetworkDetail.innerHTML = `<div class="cfms-detail-head"><p class="eyebrow">Selected protein</p><h3>${escapeHTML(data.display_label)}</h3><p>${escapeHTML(data.title || "No functional annotation available")}</p><button type="button" data-gene="${escapeHTML(data.id)}">Open gene report</button></div><div class="cfms-detail-metrics"><span><small>Subgenome</small><strong>${escapeHTML(data.subgenome)}</strong></span><span><small>Network degree</small><strong>${formatInt(data.degree)}</strong></span><span><small>Community</small><strong>${escapeHTML(data.community || "NA")}</strong></span><span><small>Visible partners</small><strong>${formatInt(node.neighborhood("node").length)}</strong></span></div><button class="cfms-wide-action" type="button" data-cfms-open-profile="${escapeHTML(data.id)}">Inspect 59-fraction profile</button>`;
  });
  state.cfms.cy.on("tap", "edge", (event) => {
    const edge = event.target.data();
    const source = state.cfms.cy.getElementById(edge.source).data();
    const target = state.cfms.cy.getElementById(edge.target).data();
    elements.cfmsNetworkDetail.innerHTML = `<div class="cfms-detail-head"><p class="eyebrow">Selected association</p><h3>${escapeHTML(edge.edge_type)} evidence</h3><p>${escapeHTML(edge.context)} association retained in the final precision-filtered network.</p></div><div class="cfms-edge-pair"><button type="button" data-gene="${escapeHTML(source.id)}"><span>${escapeHTML(source.display_label)}</span><small>A/B class ${escapeHTML(source.subgenome)}</small></button><i></i><button type="button" data-gene="${escapeHTML(target.id)}"><span>${escapeHTML(target.display_label)}</span><small>A/B class ${escapeHTML(target.subgenome)}</small></button></div><div class="cfms-evidence-note"><strong>Interpretation</strong><p>This edge is CF-MS co-fractionation evidence and does not, on its own, establish direct physical binding.</p></div>`;
  });
  state.cfms.cy.on("tap", (event) => {
    if (event.target !== state.cfms.cy) return;
    state.cfms.cy.elements().removeClass("faded focus");
  });
}

function renderCfmsCommunities(payload) {
  const pagination = payload.pagination || {};
  elements.cfmsCommunityResultCount.textContent = `${formatInt(pagination.total)} matching communities`;
  elements.cfmsCommunityGrid.innerHTML = (payload.communities || []).length ? `<div class="cfms-community-cards">${payload.communities.map((community) => `<button type="button" class="${String(community.fine_cluster) === String(payload.selected?.summary?.fine_cluster) ? "active" : ""}" data-cfms-community="${escapeHTML(community.fine_cluster)}"><span><strong>Community ${escapeHTML(community.fine_cluster)}</strong><small>${escapeHTML(community.super_cluster)} · ${escapeHTML(community.mid_cluster)}</small></span>${cfmsSparkline(community.mean_profile || [])}<div><b>${formatInt(community.n_nodes)} proteins</b><small>A ${formatInt(community.N_A)} · B ${formatInt(community.N_B)} · mean degree ${formatValue(community.mean_degree, 1)}</small></div></button>`).join("")}</div>` : buildEmpty("No association communities match the current search.");
  elements.cfmsCommunityPagination.innerHTML = cfmsPaginationHTML(pagination, "community");
  renderCfmsCommunityDetail(payload.selected, payload.fractions || []);
}

function renderCfmsCommunityDetail(selected, fractions) {
  const summary = selected?.summary || {};
  const members = selected?.members || [];
  if (!summary.fine_cluster) {
    elements.cfmsCommunityDetail.innerHTML = buildEmpty("Select a community to inspect its proteins.");
    return;
  }
  elements.cfmsCommunityDetail.innerHTML = `<div class="cfms-detail-head"><p class="eyebrow">Selected association community</p><h3>Community ${escapeHTML(summary.fine_cluster)}</h3><p>${formatInt(summary.n_nodes)} proteins in ${escapeHTML(summary.mid_cluster)} / ${escapeHTML(summary.super_cluster)}.</p><button type="button" data-cfms-network-community="${escapeHTML(summary.fine_cluster)}">Open internal network</button></div>${cfmsLineChart(fractions, [{ label: "Community mean profile", values: selected.mean_profile || [], color: CFMS_COLORS.association, area: true }], { height: 185, sharedScale: true, min: 0, max: 1 })}<div class="cfms-detail-metrics"><span><small>A proteins</small><strong>${formatInt(summary.N_A)}</strong></span><span><small>B proteins</small><strong>${formatInt(summary.N_B)}</strong></span><span><small>Mean degree</small><strong>${formatValue(summary.mean_degree, 1)}</strong></span><span><small>Maximum degree</small><strong>${formatInt(summary.max_degree)}</strong></span></div><h4 class="cfms-member-title">Member profiles</h4>${cfmsHeatmap(members, fractions, { valuesKey: "profile", rowAction: "profile" })}<div class="cfms-member-list">${members.map((member) => `<button type="button" data-gene="${escapeHTML(member.gene_id)}"><span>${escapeHTML(member.display_label)}</span><small>${escapeHTML(member.title || "No annotation")} · degree ${formatInt(member.degree)}</small></button>`).join("")}</div>`;
}

function renderCfmsHomoeologs(payload) {
  const pagination = payload.pagination || {};
  const classes = payload.class_summary || [];
  const maximum = Math.max(...(payload.histogram || []).map((bin) => +bin.count || 0), 1);
  elements.cfmsSimilarityHistogram.innerHTML = `<div class="cfms-histogram"><div class="cfms-hist-bars">${(payload.histogram || []).map((bin) => `<i style="height:${Math.max(2, (+bin.count / maximum) * 100)}%" title="r ${formatValue(bin.low, 1)} to ${formatValue(bin.high, 1)} · ${formatInt(bin.count)} pairs"></i>`).join("")}</div><div class="cfms-hist-axis"><span>−1.0</span><span>0</span><span>1.0</span></div></div><div class="cfms-similarity-cards">${classes.map((item) => `<button type="button" data-cfms-similarity-class="${escapeHTML(item.SimilarityClass)}" style="--class-color:${CFMS_COLORS[item.SimilarityClass]}"><span>${escapeHTML(item.SimilarityClass)}</span><strong>${formatInt(item.N)}</strong><small>median r ${formatValue(item.MedianCorr, 2)}</small></button>`).join("")}</div><p class="cfms-inline-note">Similarity is Pearson correlation between row-normalized log-transformed elution profiles. It is complementary to, but distinct from, network replaceability.</p>`;
  const rows = payload.table || [];
  elements.cfmsHomoeologTable.innerHTML = rows.length ? `<div class="cfms-table-wrap compact"><table><thead><tr><th>A homoeolog</th><th>B homoeolog</th><th>Correlation</th><th>Class</th><th>Direct A–B edge</th></tr></thead><tbody>${rows.map((row) => `<tr data-cfms-pair="${escapeHTML(row.pair_id)}"><td><button type="button">${escapeHTML(row.label_a)}</button></td><td>${escapeHTML(row.label_b)}</td><td><strong>${formatValue(row.correlation, 3)}</strong></td><td><span class="cfms-similarity-class" style="--class-color:${CFMS_COLORS[row.similarity_class]}">${escapeHTML(row.similarity_class)}</span></td><td>${row.direct_edge ? `<span class="cfms-direct-edge yes">Observed</span>` : `<span class="cfms-direct-edge">Not observed</span>`}</td></tr>`).join("")}</tbody></table></div>` : buildEmpty("No comparable A/B pairs match the current filters.");
  elements.cfmsHomoeologPagination.innerHTML = cfmsPaginationHTML(pagination, "homoeolog");
  renderCfmsHomoeologDetail(payload.selected, payload.fractions || []);
}

function renderCfmsHomoeologDetail(selected, fractions) {
  if (!selected) {
    elements.cfmsHomoeologDetail.innerHTML = buildEmpty("Select an A/B pair to compare its elution profiles.");
    return;
  }
  elements.cfmsHomoeologDetail.innerHTML = `<div class="cfms-detail-head"><p class="eyebrow">Selected homoeolog pair</p><h3>${escapeHTML(selected.similarity_class)} profile similarity</h3><p>r = ${formatValue(selected.correlation, 3)} · ${selected.direct_edge ? "A direct A/B association is retained in the final network." : "No direct A/B association is retained in the final network."}</p></div><div class="cfms-ab-pair"><button type="button" data-gene="${escapeHTML(selected.gene_a)}"><span>A subgenome</span><strong>${escapeHTML(selected.label_a)}</strong><small>${escapeHTML(selected.annotation_a?.title || "Open gene report")}</small></button><i></i><button type="button" data-gene="${escapeHTML(selected.gene_b)}"><span>B subgenome</span><strong>${escapeHTML(selected.label_b)}</strong><small>${escapeHTML(selected.annotation_b?.title || "Open gene report")}</small></button></div>${cfmsLineChart(fractions, [{ label: selected.label_a, values: selected.profile_a || [], color: CFMS_COLORS.A }, { label: selected.label_b, values: selected.profile_b || [], color: CFMS_COLORS.B }], { height: 220, sharedScale: true, min: 0, max: 1, ariaLabel: "A and B homoeolog CF-MS profiles" })}<div class="cfms-detail-metrics"><span><small>A detected</small><strong>${formatInt(selected.a_detected)} / ${formatInt(fractions.length)}</strong></span><span><small>B detected</small><strong>${formatInt(selected.b_detected)} / ${formatInt(fractions.length)}</strong></span><span><small>Correlation</small><strong>${formatValue(selected.correlation, 3)}</strong></span><span><small>Direct edge</small><strong>${selected.direct_edge ? "Observed" : "Not observed"}</strong></span></div>`;
}

function renderCfmsQuartets(payload) {
  const pagination = payload.pagination || {};
  const classCounts = payload.class_counts || [];
  const total = classCounts.reduce((sum, row) => sum + (+row.N || 0), 0) || 1;
  elements.cfmsQuartetResultCount.textContent = `${formatInt(pagination.total)} matching callable families`;
  elements.cfmsQuartetClassChart.innerHTML = `<div class="cfms-quartet-class-stack">${classCounts.map((row) => `<button type="button" data-cfms-quartet-class="${escapeHTML(row.ReplaceabilityClass)}" style="width:${(+row.N / total) * 100}%;background:${CFMS_COLORS[row.ReplaceabilityClass]}" title="${escapeHTML(row.ReplaceabilityClass)} · ${formatInt(row.N)} families"></button>`).join("")}</div><div class="cfms-quartet-class-list">${classCounts.map((row) => `<button type="button" data-cfms-quartet-class="${escapeHTML(row.ReplaceabilityClass)}"><i style="background:${CFMS_COLORS[row.ReplaceabilityClass]}"></i><span>${escapeHTML(row.ReplaceabilityClass)}</span><strong>${formatInt(row.N)}</strong><small>${formatValue((+row.N / total) * 100, 1)}%</small></button>`).join("")}</div>`;
  const rows = payload.table || [];
  elements.cfmsQuartetTable.innerHTML = rows.length ? `<div class="cfms-table-wrap compact"><table><thead><tr><th>Family</th><th>Observed alternatives</th><th>Pattern</th><th>Preference</th><th>Replaceability</th></tr></thead><tbody>${rows.map((row) => `<tr data-cfms-family="${escapeHTML(row.FamilyID)}"><td><button type="button"><strong>${escapeHTML(row.FamilyID)}</strong><small>${escapeHTML(row.labels?.Ai)} · ${escapeHTML(row.labels?.Aj)}</small></button></td><td>${formatInt(row.NumPresent)} / 4</td><td>${escapeHTML(row.PatternPretty || "None")}</td><td>${escapeHTML(row.Preference || "NA")}</td><td><span class="cfms-replaceability-class" style="--class-color:${CFMS_COLORS[row.ReplaceabilityClass]}">${escapeHTML(row.ReplaceabilityClass)}</span></td></tr>`).join("")}</tbody></table></div>` : buildEmpty("No callable homoeolog quartets match the current filters.");
  elements.cfmsQuartetPagination.innerHTML = cfmsPaginationHTML(pagination, "quartet");
  renderCfmsQuartetDetail(payload.selected);
}

function renderCfmsQuartetDetail(selected) {
  if (!selected) {
    elements.cfmsQuartetDetail.innerHTML = buildEmpty("Select a callable family to inspect its four association alternatives.");
    return;
  }
  const positions = { Ai: [75, 55], Bi: [75, 175], Aj: [365, 55], Bj: [365, 175] };
  const candidates = [["Ai", "Aj", "Ai_Aj"], ["Ai", "Bj", "Ai_Bj"], ["Bi", "Aj", "Bi_Aj"], ["Bi", "Bj", "Bi_Bj"]];
  const edges = candidates.map(([from, to, key]) => {
    const active = +selected[key] === 1;
    return `<line x1="${positions[from][0]}" y1="${positions[from][1]}" x2="${positions[to][0]}" y2="${positions[to][1]}" class="${active ? "observed" : "absent"}"><title>${from}–${to}: ${active ? "observed" : "not observed"}</title></line>`;
  }).join("");
  const nodes = Object.entries(positions).map(([key, [x, y]]) => `<g class="${key.startsWith("A") ? "a" : "b"}"><circle cx="${x}" cy="${y}" r="24"></circle><text x="${x}" y="${y + 5}" text-anchor="middle">${key}</text><title>${escapeHTML(selected.labels?.[key] || selected[key])}</title></g>`).join("");
  elements.cfmsQuartetDetail.innerHTML = `<div class="cfms-detail-head"><p class="eyebrow">Selected callable quartet</p><h3>${escapeHTML(selected.ReplaceabilityClass)}</h3><p>${escapeHTML(selected.FamilyID)} · ${formatInt(selected.NumPresent)} of 4 candidate associations observed.</p></div><div class="cfms-quartet-diagram"><svg viewBox="0 0 440 230" role="img" aria-label="Observed association alternatives for ${escapeHTML(selected.FamilyID)}">${edges}${nodes}</svg><div><span><i class="observed"></i>Observed association</span><span><i class="absent"></i>Not observed</span></div></div><div class="cfms-quartet-genes">${["Ai", "Bi", "Aj", "Bj"].map((key) => `<button type="button" data-gene="${escapeHTML(selected[key])}"><b>${key}</b><span>${escapeHTML(selected.labels?.[key] || selected[key])}</span><small>${escapeHTML(selected.annotations?.[key]?.title || "Open gene report")}</small></button>`).join("")}</div><div class="cfms-detail-metrics"><span><small>Pattern</small><strong>${escapeHTML(selected.PatternPretty || "None")}</strong></span><span><small>Preference</small><strong>${escapeHTML(selected.Preference || "NA")}</strong></span><span><small>Observed</small><strong>${formatInt(selected.NumPresent)} / 4</strong></span></div><div class="cfms-evidence-note"><strong>Definition</strong><p>Ai/Bi and Aj/Bj are two homoeolog pairs. The class is assigned from the observed Ai–Aj, Ai–Bj, Bi–Aj and Bi–Bj network associations.</p></div>`;
}

function setCfmsTab(tab, shouldLoad = true) {
  state.cfms.activeTab = tab;
  elements.cfmsTabs.forEach((button) => button.classList.toggle("active", button.dataset.cfmsTab === tab));
  elements.cfmsPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.cfmsPanel === tab));
  if (shouldLoad) ensureCfmsTabLoaded(tab).catch(console.error);
}

function setCfmsHomoeologView(view, shouldLoad = true) {
  state.cfms.homoeologView = view;
  elements.cfmsHomoeologViews.forEach((button) => button.classList.toggle("active", button.dataset.cfmsHomoeologView === view));
  elements.cfmsHomoeologPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.cfmsHomoeologPanel === view));
  if (shouldLoad && view === "quartets" && !state.resources.cfmsQuartets) loadCfmsQuartets().catch(console.error);
  if (shouldLoad && view === "similarity" && !state.resources.cfmsHomoeologs) loadCfmsHomoeologs().catch(console.error);
}

function exportCfmsRows(filename, rows, columns) {
  if (!rows?.length) return;
  const body = rows.map((row) => columns.map(([, key]) => String(row[key] ?? "").replaceAll("\t", " ").replaceAll("\n", " ")).join("\t"));
  downloadTextFile(filename, [columns.map(([label]) => label).join("\t"), ...body].join("\n"));
}

async function loadCfmsSummary() {
  elements.cfmsSummaryCards.innerHTML = `<article class="cfms-loading">Loading the CF-MS resource summary...</article>`;
  const payload = await fetchJSON("/api/resources/cfms/summary");
  state.resources.cfmsSummary = payload;
  renderCfmsSummary(payload);
}

async function loadCfmsProfiles(options = {}) {
  if (!elements.cfmsProfileQuery) return;
  const params = new URLSearchParams({ q: elements.cfmsProfileQuery.value.trim(), subgenome: elements.cfmsProfileSubgenome.value, page: String(options.page || state.cfms.profilePage), page_size: "20" });
  if (options.gene || state.cfms.selectedGene) params.set("gene", options.gene || state.cfms.selectedGene);
  elements.cfmsProfileTable.innerHTML = buildEmpty("Loading callable protein profiles...");
  const payload = await fetchJSON(`/api/resources/cfms/proteins?${params.toString()}`);
  state.resources.cfmsProfiles = payload;
  state.cfms.profilePage = payload.pagination?.page || 1;
  state.cfms.selectedGene = payload.selected?.gene_id || "";
  renderCfmsProfiles(payload);
}

async function loadCfmsNetwork(options = {}) {
  if (!elements.cfmsNetworkQuery) return;
  const params = new URLSearchParams({ q: options.query ?? elements.cfmsNetworkQuery.value.trim(), context: options.context || elements.cfmsNetworkContext.value, community: options.community || "", page: String(options.page || state.cfms.networkPage), page_size: "20" });
  elements.cfmsNetworkStage.innerHTML = buildEmpty("Loading the association neighborhood...");
  const [payload] = await Promise.all([fetchJSON(`/api/resources/cfms/network?${params.toString()}`), loadScriptOnce("/vendor/cytoscape.min.js", "cytoscape")]);
  state.resources.cfmsNetwork = payload;
  state.cfms.networkPage = payload.pagination?.page || 1;
  renderCfmsNetwork(payload);
}

async function loadCfmsCommunities(options = {}) {
  if (!elements.cfmsCommunityQuery) return;
  const params = new URLSearchParams({ q: elements.cfmsCommunityQuery.value.trim(), community: options.community || state.cfms.selectedCommunity, page: String(options.page || state.cfms.communityPage), page_size: "12" });
  elements.cfmsCommunityGrid.innerHTML = buildEmpty("Loading association communities...");
  const payload = await fetchJSON(`/api/resources/cfms/communities?${params.toString()}`);
  state.resources.cfmsCommunities = payload;
  state.cfms.communityPage = payload.pagination?.page || 1;
  state.cfms.selectedCommunity = String(payload.selected?.summary?.fine_cluster || "");
  renderCfmsCommunities(payload);
}

async function loadCfmsHomoeologs(options = {}) {
  if (!elements.cfmsHomoeologQuery) return;
  const params = new URLSearchParams({ q: elements.cfmsHomoeologQuery.value.trim(), similarity_class: elements.cfmsSimilarityClass.value, pair: options.pair || state.cfms.selectedPair, page: String(options.page || state.cfms.homoeologPage), page_size: "20" });
  elements.cfmsHomoeologTable.innerHTML = buildEmpty("Loading comparable A/B profiles...");
  const payload = await fetchJSON(`/api/resources/cfms/homoeologs?${params.toString()}`);
  state.resources.cfmsHomoeologs = payload;
  state.cfms.homoeologPage = payload.pagination?.page || 1;
  state.cfms.selectedPair = payload.selected?.pair_id || "";
  renderCfmsHomoeologs(payload);
}

async function loadCfmsQuartets(options = {}) {
  if (!elements.cfmsQuartetQuery) return;
  const params = new URLSearchParams({ q: elements.cfmsQuartetQuery.value.trim(), replaceability_class: elements.cfmsQuartetClass.value, family: options.family || state.cfms.selectedFamily, page: String(options.page || state.cfms.quartetPage), page_size: "20" });
  elements.cfmsQuartetTable.innerHTML = buildEmpty("Loading callable homoeolog quartets...");
  const payload = await fetchJSON(`/api/resources/cfms/quartets?${params.toString()}`);
  state.resources.cfmsQuartets = payload;
  state.cfms.quartetPage = payload.pagination?.page || 1;
  state.cfms.selectedFamily = payload.selected?.FamilyID || "";
  renderCfmsQuartets(payload);
}

async function ensureCfmsTabLoaded(tab = state.cfms.activeTab) {
  if (!state.resources.cfmsSummary) await runOnce("resource:cfms-summary", loadCfmsSummary);
  if (tab === "profiles" && !state.resources.cfmsProfiles) await runOnce("resource:cfms-profiles", loadCfmsProfiles);
  if (tab === "network" && !state.resources.cfmsNetwork) await runOnce("resource:cfms-network", loadCfmsNetwork);
  if (tab === "communities" && !state.resources.cfmsCommunities) await runOnce("resource:cfms-communities", loadCfmsCommunities);
  if (tab === "homoeologs") {
    if (state.cfms.homoeologView === "quartets" && !state.resources.cfmsQuartets) await runOnce("resource:cfms-quartets", loadCfmsQuartets);
    if (state.cfms.homoeologView === "similarity" && !state.resources.cfmsHomoeologs) await runOnce("resource:cfms-homoeologs", loadCfmsHomoeologs);
  }
}

async function loadMarkerResource() {
  const params = new URLSearchParams({
    q: elements.markerQuery?.value.trim() || "",
    tissue: elements.markerTissue.value,
    support: elements.markerSupport.value,
    min_fc: elements.markerMinFc.value || "0",
    limit: "220",
  });
  const payload = await fetchJSON(`/api/resources/fig2/markers?${params.toString()}`);
  state.resources.markers = payload;
  renderMarkerResource(payload);
}

async function loadEnhancedResource() {
  state.fig2.enhancedClass = elements.enhancedClassSelect.value || "";
  state.fig2.enhancedLimit = elements.enhancedRowLimit?.value || "30";
  const params = new URLSearchParams({ class_id: state.fig2.enhancedClass, limit: state.fig2.enhancedLimit });
  const payload = await fetchJSON(`/api/resources/fig2/enhanced?${params.toString()}`);
  renderEnhancedResource(payload);
}

async function loadGoNetworkResource() {
  state.fig2.goClass = elements.goClassSelect.value;
  state.fig2.goNodeType = elements.goNodeType.value;
  state.fig2.goIncludeIsolates = elements.goIncludeIsolates?.value || "0";
  state.fig2.goQuery = elements.goNetworkQuery.value.trim();
  state.fig2.goMinGenes = Number(elements.goMinGenes.value || 0);
  const params = new URLSearchParams({
    class_id: state.fig2.goClass,
    node_type: state.fig2.goNodeType,
    q: state.fig2.goQuery,
    min_gene_count: String(state.fig2.goMinGenes),
    include_isolates: state.fig2.goIncludeIsolates,
  });
  elements.goNetwork.innerHTML = buildEmpty("Loading GO function network...");
  const [payload, layoutPayload] = await Promise.all([
    fetchJSON(`/api/resources/fig2/go-network?${params.toString()}`),
    state.fig2.goLayout || fetchJSON("/data/enhanced-go-layout.json"),
    loadScriptOnce("/vendor/cytoscape.min.js", "cytoscape"),
  ]);
  renderGoNetworkResource(payload, layoutPayload);
}

async function loadActivityResource() {
  if (!elements.activityGroup || !elements.activityMetric) {
    return;
  }
  state.fig2.activityGroup = elements.activityGroup.value;
  state.fig2.activityMetric = elements.activityMetric.value;
  const params = new URLSearchParams({
    group: state.fig2.activityGroup,
    metric: state.fig2.activityMetric,
  });
  const payload = await fetchJSON(`/api/resources/fig2/activity?${params.toString()}`);
  renderActivityResource(payload);
}

async function loadCrossSpeciesResource() {
  const params = new URLSearchParams({
    group: elements.ogGroup.value,
    lineage: elements.ogLineage.value,
    q: elements.ogGeneQuery?.value.trim() || "",
    min_r: elements.ogMinR?.value || "-1",
    min_conservation: elements.ogMinConservation?.value || "-1",
  });
  const [payload] = await Promise.all([
    fetchJSON(`/api/resources/cross-species?${params.toString()}`),
    loadScriptOnce("/vendor/plotly.min.js", "Plotly"),
  ]);
  state.fig3.tablePage = 1;
  state.fig3.selectedOgs.clear();
  state.resources.crossSpecies = payload;
  renderCrossSpeciesResourceV2(payload);
}

async function ensureFig2BaseLoaded() {
  if (state.resources.markers && state.resources.fig2Summary) return;
  return runOnce("resource:fig2-base", async () => {
    elements.fig2SummaryCards.innerHTML = buildEmpty("Loading tissue-specific protein summary...");
    elements.markerProteinHeatmap.innerHTML = buildEmpty("Loading marker protein heatmap...");
    elements.markerRnaHeatmap.innerHTML = buildEmpty("Loading matched transcript heatmap...");
    const [summary, markers] = await Promise.all([
      fetchJSON("/api/resources/fig2/summary"),
      fetchJSON("/api/resources/fig2/markers?limit=220"),
    ]);
    renderResearchResources(markers, null, null, null, summary);
  });
}

async function ensureEnhancedResourcesLoaded() {
  const tasks = [];
  if (!state.resources.enhanced) {
    elements.enhancedHeatmap.innerHTML = buildEmpty("Loading enhanced protein heatmap...");
    tasks.push(runOnce("resource:fig2-enhanced", loadEnhancedResource));
  }
  if (!state.resources.goNetwork) {
    elements.goNetwork.innerHTML = buildEmpty("Loading GO function network...");
    tasks.push(runOnce("resource:fig2-go", loadGoNetworkResource));
  }
  await Promise.all(tasks);
}

async function ensureResourceModuleLoaded(selected = state.fig2.activeResource) {
  renderResourcePreview(selected);
}

async function loadSubgenomeResource(options = {}) {
  if (!elements.abTissueFilter) return;
  const pairId = options.pairId ?? state.ab.pairId;
  const params = new URLSearchParams({
    tissue: elements.abTissueFilter.value || "ST",
    layer: elements.abLayerFilter.value || "both",
    direction: elements.abDirectionFilter.value || "all",
    behavior: elements.abBehaviorFilter.value || "all",
    quadrant: state.ab.quadrant,
    pattern: state.ab.pattern,
    q: elements.abQueryFilter.value.trim(),
    page: String(state.ab.page),
    page_size: "20",
  });
  if (pairId) params.set("pair", pairId);
  elements.abSummaryCards.innerHTML = `<article class="ab-loading">Loading the A/B homoeolog resource...</article>`;
  const payload = await fetchJSON(`/api/resources/subgenome?${params.toString()}`);
  state.resources.subgenome = payload;
  state.ab.pairId = payload.selected_pair?.pair_id || "";
  if (!elements.abTissueFilter.options.length) {
    elements.abTissueFilter.innerHTML = (payload.tissues || []).map((tissue) => `<option value="${escapeHTML(tissue.code)}">${escapeHTML(tissue.code)} · ${escapeHTML(tissue.full_name)}</option>`).join("");
  }
  elements.abTissueFilter.value = payload.selected_tissue;
  renderSubgenomeResource(payload);
}

function renderBlast(payload) {
  if (!payload.available) {
    elements.blastResults.innerHTML = buildEmpty(payload.error || "BLAST is unavailable in this deployment.");
    return;
  }
  const columns = [
    { key: "qseqid", label: "Query" },
    { key: "sseqid", label: "Subject" },
    { key: "gene_id", label: "Gene ID" },
    { key: "pident", label: "% identity" },
    { key: "length", label: "Length" },
    { key: "evalue", label: "E-value" },
    { key: "bitscore", label: "Bit score" },
  ];
  elements.blastResults.innerHTML = renderSimpleTable(payload.items, columns);
}

async function loadToolStatus() {
  const payload = await fetchJSON("/api/tools/status");
  renderToolStatus(payload);
}

async function runBatchLookup() {
  setToolBusy(elements.batchResults);
  const payload = await postJSON("/api/tools/batch", { text: elements.batchInput.value });
  renderBatchResults(payload);
}

async function runHeatmap() {
  setToolBusy(elements.heatmapResults, "Drawing heatmap...");
  const payload = await postJSON("/api/tools/heatmap", {
    text: elements.heatmapInput.value,
    layer: elements.heatmapLayer.value,
  });
  renderHeatmap(payload);
}

async function runGO() {
  setToolBusy(elements.goResults, "Testing GO terms...");
  const payload = await postJSON("/api/tools/go?limit=500", { text: elements.goInput.value });
  state.goPayload = payload;
  renderGO(payload);
}

async function runSequenceFetch() {
  elements.sequenceResults.textContent = "Fetching sequence...";
  try {
    const params = new URLSearchParams({
      gene_id: elements.sequenceGene.value.trim(),
      sequence_type: elements.sequenceType.value,
    });
    const payload = await fetchJSON(`/api/tools/sequence?${params.toString()}`);
    elements.sequenceResults.textContent = payload.fasta;
  } catch (error) {
    elements.sequenceResults.textContent = error.message;
  }
}

async function runBlastSearch() {
  setToolBusy(elements.blastResults, "Running BLAST...");
  const payload = await postJSON(`/api/tools/blast?max_hits=25`, {
    query: elements.blastQuery.value,
    program: elements.blastProgram.value,
    database: elements.blastDb.value,
  });
  renderBlast(payload);
}

async function loadToolExample(tool) {
  const geneText = TOOL_EXAMPLE_GENES.join("\n");
  if (tool === "batch") {
    elements.batchInput.value = TOOL_EXAMPLE_GENES.slice(0, 8).join("\n");
    await runBatchLookup();
    return;
  }
  if (tool === "heatmap") {
    elements.heatmapInput.value = TOOL_EXAMPLE_GENES.slice(0, 12).join("\n");
    elements.heatmapLayer.value = "both";
    await runHeatmap();
    return;
  }
  if (tool === "go") {
    elements.goInput.value = geneText;
    await runGO();
    return;
  }
  if (tool === "sequence") {
    elements.sequenceGene.value = TOOL_EXAMPLE_GENES[0];
    elements.sequenceType.value = "protein";
    await runSequenceFetch();
    return;
  }
  if (tool === "blast") {
    elements.blastProgram.value = "blastp";
    elements.blastDb.value = "protein";
    elements.blastResults.innerHTML = buildEmpty("Loading an example protein sequence...");
    const params = new URLSearchParams({ gene_id: TOOL_EXAMPLE_GENES[0], sequence_type: "protein" });
    const payload = await fetchJSON(`/api/tools/sequence?${params.toString()}`);
    elements.blastQuery.value = payload.fasta;
    elements.blastResults.innerHTML = buildEmpty("Example loaded. Select Run BLAST to search the local protein database.");
  }
}

async function loadSuggestions(query = "") {
  if (!query.trim()) {
    elements.heroSuggestions.innerHTML = "";
    return;
  }
  const payload = await fetchJSON(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
  renderSuggestions(payload.items);
}

function routeFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || hash === "home") {
    return { route: "home", gene: null, tissue: null, resource: null };
  }
  if (hash.startsWith("gene=")) {
    return { route: "detail", gene: decodeURIComponent(hash.slice(5)), tissue: null, resource: null };
  }
  if (hash.startsWith("detail/gene/")) {
    return { route: "detail", gene: decodeURIComponent(hash.slice("detail/gene/".length)), tissue: null, resource: null };
  }
  const parts = hash.split("?")[0].split("/");
  const route = parts[0];
  const allowed = new Set(["detail", "browse", "tissues", "analysis", "tools", "downloads", "about"]);
  const tissue = route === "tissues" && parts[1] ? decodeURIComponent(parts[1]) : null;
  const resource = route === "analysis" ? RESOURCE_KEYS_BY_SLUG[parts[1]] || null : null;
  return { route: allowed.has(route) ? route : "home", gene: null, tissue, resource };
}

function setActiveRoute(route, scrollToTop = true) {
  state.activeRoute = route;
  elements.routePages.forEach((section) => {
    section.classList.toggle("active-page", section.id === route);
  });
  elements.homeOnly.forEach((section) => {
    section.classList.toggle("active-page", route === "home");
  });
  document.body.dataset.route = route;
  setRouteDocumentMetadata(route);
  document.body.classList.toggle(
    "fig3-resource-mode",
    route === "analysis" && (elements.resourceModuleSelect?.value || state.fig2.activeResource) === "fig3",
  );
  document.querySelectorAll(".topnav a").forEach((link) => {
    const target = link.getAttribute("href")?.replace("#", "");
    link.classList.toggle("active", target === route);
  });
  if (scrollToTop) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

async function applyRouteFromHash(scrollToTop = true) {
  const { route, gene, tissue, resource } = routeFromHash();
  setActiveRoute(route, scrollToTop);
  if (route === "analysis" && resource && elements.resourceModuleSelect?.value !== resource) {
    elements.resourceModuleSelect.value = resource;
    state.fig2.activeResource = resource;
    localStorage.setItem("qlcoa_resource_module", resource);
    applyResourceModule();
  }
  if (route === "analysis") {
    const activeResource = resource || elements.resourceModuleSelect?.value || state.fig2.activeResource;
    const slug = RESOURCE_ROUTE_SLUGS[activeResource];
    if (slug && !window.location.hash.startsWith(`#analysis/${slug}`)) {
      window.history.replaceState(null, "", `#analysis/${slug}`);
    }
  }
  if (route === "detail") {
    const targetGene = gene || state.currentGene?.gene_id || state.overview?.default_gene;
    if (targetGene && targetGene !== state.currentGene?.gene_id) {
      elements.heroSearchInput.value = targetGene;
      elements.sequenceGene.value = targetGene;
      await loadGene(targetGene, false, false);
    }
  } else if (route === "browse" && !state.loaded.entries) {
    await runOnce("route:browse", async () => {
      await loadEntries();
      state.loaded.entries = true;
    });
  } else if (route === "tissues" && state.tissues[0]) {
    const targetTissue = state.tissues.some((item) => item.code === tissue) ? tissue : (state.selectedTissue || state.tissues[0].code);
    if (!state.loaded.tissueDetail || targetTissue !== state.selectedTissue) await runOnce(`route:tissues:${targetTissue}`, async () => {
      await loadTissue(targetTissue, false);
      state.loaded.tissueDetail = true;
    });
    const canonicalHash = `#tissues/${encodeURIComponent(targetTissue)}`;
    if (window.location.hash !== canonicalHash) window.history.replaceState(null, "", canonicalHash);
  } else if (route === "analysis") {
    await ensureResourceModuleLoaded();
  } else if (route === "downloads" && !state.loaded.downloads) {
    await runOnce("route:downloads", async () => {
      const payload = await fetchJSON("/api/downloads");
      renderDownloads(payload.items);
      state.loaded.downloads = true;
    });
  } else if (route === "tools" && !state.loaded.tools) {
    await runOnce("route:tools", async () => {
      const payload = await fetchJSON("/api/tools/status");
      renderToolStatus(payload);
      state.loaded.tools = true;
    });
  }
}

async function loadGene(geneId, scrollToReport = true, updateHash = true) {
  try {
    const payload = await fetchJSON(`/api/genes/${encodeURIComponent(geneId)}`);
    renderGene(payload);
    setActiveRoute("detail", scrollToReport);
    if (updateHash) {
      window.location.hash = `detail/gene/${encodeURIComponent(geneId)}`;
    }
  } catch (error) {
    elements.entryMeta.innerHTML = buildEmpty(`This gene is outside the example records in the static preview.`);
    elements.entryAnnotation.innerHTML = "";
    elements.transcriptPanel.innerHTML = "";
    elements.proteinPanel.innerHTML = "";
    console.error(error);
    return false;
  }
  return true;
}

async function loadEntries() {
  const params = new URLSearchParams({
    q: state.browse.query,
    omics: state.browse.omics,
    tissue: state.browse.tissue,
    sort: state.browse.sort,
    page: String(state.browse.page),
    page_size: String(state.browse.pageSize),
  });
  const payload = await fetchJSON(`/api/entries?${params.toString()}`);
  renderEntries(payload);
}

async function loadTissue(tissueCode, updateHash = true) {
  const payload = await fetchJSON(`/api/tissues/${encodeURIComponent(tissueCode)}`);
  renderTissueDetail(payload);
  state.loaded.tissueDetail = true;
  if (updateHash) window.location.hash = `tissues/${encodeURIComponent(tissueCode)}`;
}

function bindEvents() {
  document.querySelectorAll("[data-home-life-group]").forEach((button) => {
    button.addEventListener("click", () => {
      renderHomeLifecycleDetail(button.dataset.homeLifeGroup);
      if (button.closest(".home-query-section")) {
        document.querySelector(".home-lifecycle-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  elements.homeLifecycleDetail?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-home-tissue]");
    if (!button) return;
    window.location.hash = `#tissues/${encodeURIComponent(button.dataset.homeTissue)}`;
  });

  elements.tissueDetail?.addEventListener("click", (event) => {
    const geneButton = event.target.closest("[data-gene]");
    if (geneButton) loadGene(geneButton.dataset.gene).catch(console.error);
  });

  document.querySelectorAll("[data-home-gene]").forEach((button) => {
    button.addEventListener("click", () => loadGene(button.dataset.homeGene).catch(console.error));
  });

  document.querySelectorAll("[data-home-search]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.browseQuery.value = button.dataset.homeSearch;
      state.browse.query = button.dataset.homeSearch;
      state.browse.page = 1;
      window.location.hash = "#browse";
      loadEntries().catch(console.error);
    });
  });

  document.querySelectorAll("[data-home-og]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.ogGeneQuery.value = button.dataset.homeOg;
      elements.resourceModuleSelect.value = "fig3";
      state.fig2.activeResource = "fig3";
      localStorage.setItem("qlcoa_resource_module", "fig3");
      window.location.hash = `#analysis/${RESOURCE_ROUTE_SLUGS.fig3}`;
      applyResourceModule();
    });
  });

  document.querySelectorAll("[data-home-marker-tissue]").forEach((link) => {
    link.addEventListener("click", () => {
      elements.markerTissue.value = link.dataset.homeMarkerTissue;
      elements.resourceModuleSelect.value = "fig2";
      state.fig2.activeResource = "fig2";
      localStorage.setItem("qlcoa_resource_module", "fig2");
      applyResourceModule();
    });
  });

  if (elements.resourceModuleSelect) {
    elements.resourceModuleSelect.addEventListener("change", () => {
      localStorage.setItem("qlcoa_resource_module", elements.resourceModuleSelect.value);
      applyResourceModule();
      if (state.activeRoute === "analysis") {
        const slug = RESOURCE_ROUTE_SLUGS[elements.resourceModuleSelect.value];
        if (slug) {
          window.history.replaceState(null, "", `#analysis/${slug}`);
        }
      }
    });
  }

  elements.heroSearchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const geneId = elements.heroSearchInput.value.trim();
    if (!geneId) {
      return;
    }
    await loadGene(geneId);
  });

  elements.heroSearchInput.addEventListener("input", () => {
    clearTimeout(state.suggestionTimer);
    state.suggestionTimer = setTimeout(() => {
      loadSuggestions(elements.heroSearchInput.value.trim()).catch(console.error);
    }, 180);
  });

  elements.modeLog2.addEventListener("click", () => {
    state.mode = "log2";
    setActiveModeButtons();
    if (state.currentGene) {
      renderGene(state.currentGene);
    }
  });

  elements.modeZscore.addEventListener("click", () => {
    state.mode = "zscore";
    setActiveModeButtons();
    if (state.currentGene) {
      renderGene(state.currentGene);
    }
  });

  elements.browseQuery.addEventListener("input", () => {
    state.browse.query = elements.browseQuery.value.trim();
    state.browse.page = 1;
    loadEntries().catch(console.error);
  });

  elements.browseOmics.addEventListener("change", () => {
    state.browse.omics = elements.browseOmics.value;
    state.browse.page = 1;
    loadEntries().catch(console.error);
  });

  elements.browseTissue.addEventListener("change", () => {
    state.browse.tissue = elements.browseTissue.value;
    state.browse.page = 1;
    loadEntries().catch(console.error);
  });

  elements.browseSort.addEventListener("change", () => {
    state.browse.sort = elements.browseSort.value;
    state.browse.page = 1;
    loadEntries().catch(console.error);
  });

  elements.browsePrev.addEventListener("click", () => {
    if (state.browse.page > 1) {
      state.browse.page -= 1;
      loadEntries().catch(console.error);
    }
  });

  elements.browseNext.addEventListener("click", () => {
    if (state.browse.page < state.browse.pageCount) {
      state.browse.page += 1;
      loadEntries().catch(console.error);
    }
  });

  elements.batchRun.addEventListener("click", () => {
    runBatchLookup().catch((error) => {
      elements.batchResults.innerHTML = buildEmpty(error.message);
    });
  });

  elements.heatmapRun.addEventListener("click", () => {
    runHeatmap().catch((error) => {
      elements.heatmapResults.innerHTML = buildEmpty(error.message);
    });
  });

  elements.goRun.addEventListener("click", () => {
    runGO().catch((error) => {
      elements.goResults.innerHTML = buildEmpty(error.message);
    });
  });

  elements.goDisplayScope?.addEventListener("change", () => {
    if (state.goPayload) renderGO(state.goPayload);
  });

  elements.sequenceRun.addEventListener("click", () => {
    runSequenceFetch().catch((error) => {
      elements.sequenceResults.textContent = error.message;
    });
  });

  elements.blastRun.addEventListener("click", () => {
    runBlastSearch().catch((error) => {
      elements.blastResults.innerHTML = buildEmpty(error.message);
    });
  });

  document.querySelectorAll("[data-tool-example]").forEach((button) => {
    button.addEventListener("click", () => {
      loadToolExample(button.dataset.toolExample).catch((error) => {
        console.error(error);
        const target = button.dataset.toolExample === "blast" ? elements.blastResults : elements.toolStatus;
        target.innerHTML = buildEmpty(`The example could not be loaded: ${error.message}`);
      });
    });
  });

  elements.markerTissue.addEventListener("change", () => {
    loadMarkerResource().catch(console.error);
  });

  elements.markerSupport.addEventListener("change", () => {
    loadMarkerResource().catch(console.error);
  });

  elements.markerMinFc.addEventListener("change", () => {
    loadMarkerResource().catch(console.error);
  });

  if (elements.markerQuery) {
    elements.markerQuery.addEventListener("input", () => {
      clearTimeout(state.suggestionTimer);
      state.suggestionTimer = setTimeout(() => {
        loadMarkerResource().catch(console.error);
      }, 260);
    });
    elements.markerQuery.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        loadMarkerResource().catch(console.error);
      }
    });
  }

  if (elements.markerQueryRun) {
    elements.markerQueryRun.addEventListener("click", () => {
      loadMarkerResource().catch(console.error);
    });
  }

  elements.fig2Tabs.forEach((button) => {
    button.addEventListener("click", () => {
      state.fig2.activeTab = button.dataset.fig2Tab;
      elements.fig2Tabs.forEach((tab) => tab.classList.toggle("active", tab === button));
      elements.fig2Panels.forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.fig2Panel === state.fig2.activeTab);
      });
      if (state.fig2.activeTab === "enhanced") {
        ensureEnhancedResourcesLoaded().then(scheduleGoNetworkLayout).catch(console.error);
      }
    });
  });

  elements.enhancedClassSelect.addEventListener("change", () => {
    loadEnhancedResource().catch(console.error);
  });

  elements.enhancedRowLimit.addEventListener("change", () => {
    loadEnhancedResource().catch(console.error);
  });

  elements.goClassSelect.addEventListener("change", () => {
    loadGoNetworkResource().catch(console.error);
  });

  elements.goNodeType.addEventListener("change", () => {
    loadGoNetworkResource().catch(console.error);
  });

  if (elements.goIncludeIsolates) {
    elements.goIncludeIsolates.addEventListener("change", () => {
      loadGoNetworkResource().catch(console.error);
    });
  }

  elements.goMinGenes.addEventListener("change", () => {
    loadGoNetworkResource().catch(console.error);
  });

  elements.goNetworkQuery.addEventListener("input", () => {
    clearTimeout(state.suggestionTimer);
    state.suggestionTimer = setTimeout(() => {
      loadGoNetworkResource().catch(console.error);
    }, 260);
  });

  if (elements.activityGroup && elements.activityMetric) {
    elements.activityGroup.addEventListener("change", () => {
      loadActivityResource().catch(console.error);
    });

    elements.activityMetric.addEventListener("change", () => {
      loadActivityResource().catch(console.error);
    });
  }

  if (elements.ogGroup && elements.ogLineage) {
    elements.ogGroup.addEventListener("change", () => {
      loadCrossSpeciesResource().catch(console.error);
    });

    elements.ogLineage.addEventListener("change", () => {
      loadCrossSpeciesResource().catch(console.error);
    });

    if (elements.ogGeneQuery) {
      elements.ogGeneQuery.addEventListener("input", () => {
        renderCrossSpeciesGeneList();
      });
    }
    elements.ogMinR?.addEventListener("input", () => {
      elements.ogMinRValue.textContent = Number(elements.ogMinR.value).toFixed(2);
    });
    elements.ogMinConservation?.addEventListener("input", () => {
      elements.ogMinConservationValue.textContent = Number(elements.ogMinConservation.value).toFixed(2);
    });
    document.querySelector("#fig3-apply")?.addEventListener("click", () => loadCrossSpeciesResource().catch(console.error));
    document.querySelector("#fig3-reset")?.addEventListener("click", () => {
      elements.ogGroup.value = "";
      elements.ogLineage.value = "";
      if (elements.ogGeneQuery) elements.ogGeneQuery.value = "";
      if (elements.ogMinR) elements.ogMinR.value = "-1";
      if (elements.ogMinConservation) elements.ogMinConservation.value = "-1";
      loadCrossSpeciesResource().catch(console.error);
    });
    document.querySelector("#fig3-export-table")?.addEventListener("click", () => {
      const rows = state.resources.crossSpecies?.scatter || [];
      const start = (state.fig3.tablePage - 1) * state.fig3.tablePageSize;
      exportCrossSpeciesTable(rows.slice(start, start + state.fig3.tablePageSize), "qloa_visible_orthogroups.tsv");
    });
    document.querySelector("#fig3-export-selected")?.addEventListener("click", exportSelectedCrossSpeciesRows);
    document.querySelector("#fig3-toggle-columns")?.addEventListener("click", () => {
      state.fig3.showOrthologs = !state.fig3.showOrthologs;
      renderOrthogroupTable(state.resources.crossSpecies);
    });
    document.querySelector("#fig3-line-view")?.addEventListener("click", () => {
      state.fig3.clusterView = "line";
      document.querySelector("#fig3-line-view")?.classList.add("active");
      document.querySelector("#fig3-heatmap-view")?.classList.remove("active");
      renderClusterExplorer(state.resources.crossSpecies);
    });
    document.querySelector("#fig3-heatmap-view")?.addEventListener("click", () => {
      state.fig3.clusterView = "heatmap";
      document.querySelector("#fig3-line-view")?.classList.remove("active");
      document.querySelector("#fig3-heatmap-view")?.classList.add("active");
      renderClusterExplorer(state.resources.crossSpecies);
    });
    document.querySelectorAll("[data-cluster-class]").forEach((button) => {
      button.addEventListener("click", () => {
        state.fig3.clusterGroup = button.dataset.clusterClass;
        renderClusterExplorer(state.resources.crossSpecies);
      });
    });
  }

  if (elements.abTissueFilter) {
    document.querySelectorAll("[data-ab-tab]").forEach((button) => button.addEventListener("click", () => setAbTab(button.dataset.abTab)));

    const applyAbFilters = () => {
      state.ab.page = 1;
      state.ab.pairId = "";
      loadSubgenomeResource().catch(console.error);
    };
    document.querySelector("#ab-apply-filters").addEventListener("click", applyAbFilters);
    elements.abTissueFilter.addEventListener("change", applyAbFilters);
    elements.abLayerFilter.addEventListener("change", applyAbFilters);
    elements.abDirectionFilter.addEventListener("change", applyAbFilters);
    elements.abBehaviorFilter.addEventListener("change", applyAbFilters);
    elements.abQueryFilter.addEventListener("keydown", (event) => {
      if (event.key === "Enter") applyAbFilters();
    });
    document.querySelector("#ab-reset-filters").addEventListener("click", () => {
      elements.abTissueFilter.value = "ST";
      elements.abLayerFilter.value = "both";
      elements.abDirectionFilter.value = "all";
      elements.abBehaviorFilter.value = "all";
      elements.abQueryFilter.value = "";
      state.ab.quadrant = "all";
      state.ab.pattern = "all";
      state.ab.pairId = "";
      state.ab.page = 1;
      loadSubgenomeResource().catch(console.error);
    });
    document.querySelector("#ab-export-current").addEventListener("click", () => {
      const rows = state.resources.subgenome?.scatter || [];
      if (!rows.length) return;
      const keys = ["pair_id", "gene_a", "gene_b", "tissue", "rna_logfc_ba", "protein_logfc_ba", "rna_q", "protein_q", "rna_bias", "protein_bias", "quadrant", "behavior", "broad_pattern"];
      const body = rows.map((row) => keys.map((key) => String(row[key] ?? "").replaceAll("\t", " ")).join("\t"));
      downloadTextFile(`quinoa_ab_pairs_${state.resources.subgenome.selected_tissue}.tsv`, [keys.join("\t"), ...body].join("\n"));
    });

    document.querySelector(".subgenome-explorer").addEventListener("click", (event) => {
      const tissueButton = event.target.closest("[data-ab-tissue]");
      if (tissueButton) {
        elements.abTissueFilter.value = tissueButton.dataset.abTissue;
        state.ab.page = 1;
        state.ab.pairId = "";
        loadSubgenomeResource().catch(console.error);
        return;
      }
      const behaviorButton = event.target.closest("[data-ab-behavior]");
      if (behaviorButton) {
        elements.abBehaviorFilter.value = behaviorButton.dataset.abBehavior;
        state.ab.page = 1;
        loadSubgenomeResource().catch(console.error);
        return;
      }
      const quadrantButton = event.target.closest("[data-ab-quadrant]");
      if (quadrantButton) {
        state.ab.quadrant = state.ab.quadrant === quadrantButton.dataset.abQuadrant ? "all" : quadrantButton.dataset.abQuadrant;
        state.ab.page = 1;
        setAbTab("tissue");
        loadSubgenomeResource().catch(console.error);
        return;
      }
      const patternButton = event.target.closest("[data-ab-pattern]");
      if (patternButton) {
        state.ab.pattern = patternButton.dataset.abPattern;
        state.ab.page = 1;
        loadSubgenomeResource().catch(console.error);
        return;
      }
      const pairButton = event.target.closest("[data-ab-pair]");
      if (pairButton) {
        state.ab.pairId = pairButton.dataset.abPair;
        setAbTab("pairs");
        loadSubgenomeResource({ pairId: state.ab.pairId }).catch(console.error);
        return;
      }
      const pageButton = event.target.closest("[data-ab-page]");
      if (pageButton && !pageButton.disabled) {
        state.ab.page = +pageButton.dataset.abPage;
        loadSubgenomeResource().catch(console.error);
        return;
      }
      const goButton = event.target.closest("[data-ab-go-group]");
      if (goButton) {
        renderAbGoDetail(state.resources.subgenome, goButton.dataset.abGoGroup, +goButton.dataset.abGoIndex);
        return;
      }
      const geneButton = event.target.closest("[data-gene]");
      if (geneButton) loadGene(geneButton.dataset.gene).catch(console.error);
    });
  }

  if (elements.cfmsSummaryCards) {
    elements.cfmsTabs.forEach((button) => button.addEventListener("click", () => setCfmsTab(button.dataset.cfmsTab)));
    elements.cfmsHomoeologViews.forEach((button) => button.addEventListener("click", () => setCfmsHomoeologView(button.dataset.cfmsHomoeologView)));

    const enterToRun = (input, action) => input?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      action();
    });
    const profileApply = () => { state.cfms.profilePage = 1; state.cfms.selectedGene = ""; loadCfmsProfiles().catch(console.error); };
    const networkApply = () => { state.cfms.networkPage = 1; loadCfmsNetwork().catch(console.error); };
    const communityApply = () => { state.cfms.communityPage = 1; state.cfms.selectedCommunity = ""; loadCfmsCommunities().catch(console.error); };
    const homoeologApply = () => { state.cfms.homoeologPage = 1; state.cfms.selectedPair = ""; loadCfmsHomoeologs().catch(console.error); };
    const quartetApply = () => { state.cfms.quartetPage = 1; state.cfms.selectedFamily = ""; loadCfmsQuartets().catch(console.error); };

    document.querySelector("#cfms-profile-apply")?.addEventListener("click", profileApply);
    document.querySelector("#cfms-network-apply")?.addEventListener("click", networkApply);
    document.querySelector("#cfms-community-apply")?.addEventListener("click", communityApply);
    document.querySelector("#cfms-homoeolog-apply")?.addEventListener("click", homoeologApply);
    document.querySelector("#cfms-quartet-apply")?.addEventListener("click", quartetApply);
    enterToRun(elements.cfmsProfileQuery, profileApply);
    enterToRun(elements.cfmsNetworkQuery, networkApply);
    enterToRun(elements.cfmsCommunityQuery, communityApply);
    enterToRun(elements.cfmsHomoeologQuery, homoeologApply);
    enterToRun(elements.cfmsQuartetQuery, quartetApply);

    document.querySelector("#cfms-profile-reset")?.addEventListener("click", () => {
      elements.cfmsProfileQuery.value = "";
      elements.cfmsProfileSubgenome.value = "all";
      profileApply();
    });
    document.querySelector("#cfms-network-reset")?.addEventListener("click", () => {
      elements.cfmsNetworkQuery.value = "";
      elements.cfmsNetworkContext.value = "all";
      state.cfms.networkPage = 1;
      loadCfmsNetwork().catch(console.error);
    });
    document.querySelector("#cfms-community-reset")?.addEventListener("click", () => {
      elements.cfmsCommunityQuery.value = "";
      communityApply();
    });
    document.querySelector("#cfms-homoeolog-reset")?.addEventListener("click", () => {
      elements.cfmsHomoeologQuery.value = "";
      elements.cfmsSimilarityClass.value = "all";
      homoeologApply();
    });
    document.querySelector("#cfms-quartet-reset")?.addEventListener("click", () => {
      elements.cfmsQuartetQuery.value = "";
      elements.cfmsQuartetClass.value = "all";
      quartetApply();
    });

    document.querySelector("#cfms-profile-export")?.addEventListener("click", () => exportCfmsRows("cfms_callable_profiles_current_page.tsv", state.resources.cfmsProfiles?.table, [["Gene ID", "gene_id"], ["Display label", "display_label"], ["Subgenome", "subgenome"], ["Detected fractions", "detected_fractions"], ["Peak fraction", "peak_fraction"], ["Total intensity", "total_intensity"], ["Degree", "degree"], ["Community", "community"]]));
    document.querySelector("#cfms-network-export")?.addEventListener("click", () => exportCfmsRows("cfms_associations_current_page.tsv", state.resources.cfmsNetwork?.table, [["Gene 1", "Gene1"], ["Gene 2", "Gene2"], ["Edge type", "EdgeType"], ["Context", "SameOrCross"]]));
    document.querySelector("#cfms-homoeolog-export")?.addEventListener("click", () => exportCfmsRows("cfms_homoeolog_profiles_current_page.tsv", state.resources.cfmsHomoeologs?.table, [["Pair ID", "pair_id"], ["A gene", "gene_a"], ["B gene", "gene_b"], ["Correlation", "correlation"], ["Similarity class", "similarity_class"], ["Direct edge", "direct_edge"]]));
    document.querySelector("#cfms-quartet-export")?.addEventListener("click", () => exportCfmsRows("cfms_replaceability_quartets_current_page.tsv", state.resources.cfmsQuartets?.table, [["Family ID", "FamilyID"], ["Ai", "Ai"], ["Bi", "Bi"], ["Aj", "Aj"], ["Bj", "Bj"], ["Ai-Aj", "Ai_Aj"], ["Ai-Bj", "Ai_Bj"], ["Bi-Aj", "Bi_Aj"], ["Bi-Bj", "Bi_Bj"], ["Observed", "NumPresent"], ["Replaceability", "ReplaceabilityClass"]]));

    document.querySelector(".cfms-explorer")?.addEventListener("click", (event) => {
      const openTab = event.target.closest("[data-cfms-open-tab]");
      if (openTab) { setCfmsTab(openTab.dataset.cfmsOpenTab); return; }
      const contextButton = event.target.closest("[data-cfms-network-context]");
      if (contextButton) {
        elements.cfmsNetworkContext.value = contextButton.dataset.cfmsNetworkContext;
        state.cfms.networkPage = 1;
        setCfmsTab("network", false);
        loadCfmsNetwork({ context: contextButton.dataset.cfmsNetworkContext }).catch(console.error);
        return;
      }
      const profileButton = event.target.closest("[data-cfms-profile], [data-cfms-open-profile]");
      if (profileButton) {
        const gene = profileButton.dataset.cfmsProfile || profileButton.dataset.cfmsOpenProfile;
        state.cfms.selectedGene = gene;
        if (state.cfms.activeTab !== "profiles") setCfmsTab("profiles", false);
        loadCfmsProfiles({ gene }).catch(console.error);
        return;
      }
      const communityButton = event.target.closest("[data-cfms-community]");
      if (communityButton) {
        state.cfms.selectedCommunity = communityButton.dataset.cfmsCommunity;
        loadCfmsCommunities({ community: state.cfms.selectedCommunity }).catch(console.error);
        return;
      }
      const networkCommunity = event.target.closest("[data-cfms-network-community]");
      if (networkCommunity) {
        setCfmsTab("network", false);
        loadCfmsNetwork({ community: networkCommunity.dataset.cfmsNetworkCommunity }).catch(console.error);
        return;
      }
      const similarityButton = event.target.closest("[data-cfms-similarity-class]");
      if (similarityButton) {
        elements.cfmsSimilarityClass.value = similarityButton.dataset.cfmsSimilarityClass;
        homoeologApply();
        return;
      }
      const pairButton = event.target.closest("[data-cfms-pair]");
      if (pairButton) {
        state.cfms.selectedPair = pairButton.dataset.cfmsPair;
        loadCfmsHomoeologs({ pair: state.cfms.selectedPair }).catch(console.error);
        return;
      }
      const quartetClassButton = event.target.closest("[data-cfms-quartet-class]");
      if (quartetClassButton) {
        setCfmsTab("homoeologs", false);
        setCfmsHomoeologView("quartets", false);
        elements.cfmsQuartetClass.value = quartetClassButton.dataset.cfmsQuartetClass;
        quartetApply();
        return;
      }
      const familyButton = event.target.closest("[data-cfms-family]");
      if (familyButton) {
        state.cfms.selectedFamily = familyButton.dataset.cfmsFamily;
        loadCfmsQuartets({ family: state.cfms.selectedFamily }).catch(console.error);
        return;
      }
      const pageButton = event.target.closest("[data-cfms-page-kind]");
      if (pageButton && !pageButton.disabled) {
        const page = +pageButton.dataset.cfmsPage;
        if (pageButton.dataset.cfmsPageKind === "profile") loadCfmsProfiles({ page }).catch(console.error);
        if (pageButton.dataset.cfmsPageKind === "network") loadCfmsNetwork({ page }).catch(console.error);
        if (pageButton.dataset.cfmsPageKind === "community") loadCfmsCommunities({ page }).catch(console.error);
        if (pageButton.dataset.cfmsPageKind === "homoeolog") loadCfmsHomoeologs({ page }).catch(console.error);
        if (pageButton.dataset.cfmsPageKind === "quartet") loadCfmsQuartets({ page }).catch(console.error);
        return;
      }
      const geneButton = event.target.closest("[data-gene]");
      if (geneButton) loadGene(geneButton.dataset.gene).catch(console.error);
    });
  }

  window.addEventListener("hashchange", () => {
    applyRouteFromHash(true).catch(console.error);
  });
}

async function init() {
  const initialRoute = routeFromHash();
  if (initialRoute.resource && elements.resourceModuleSelect?.querySelector(`option[value="${CSS.escape(initialRoute.resource)}"]`)) {
    elements.resourceModuleSelect.value = initialRoute.resource;
    state.fig2.activeResource = initialRoute.resource;
    elements.resourceWorkspaces.forEach((workspace) => {
      workspace.classList.toggle("active", workspace.dataset.resourceModule === initialRoute.resource);
    });
  }
  setActiveRoute(initialRoute.route, false);
  const [overview, tissues, analysis, homeSummary, release] = await Promise.all([
    fetchJSON("/api/overview"),
    fetchJSON("/api/tissues"),
    fetchJSON("/api/analysis"),
    fetchJSON("/api/home/summary"),
    fetchJSON("/api/release"),
  ]);

  state.overview = overview;
  state.release = release;
  renderOverview(overview);
  renderReleaseMetadata(release);
  renderTissues(tissues.items);
  renderAnalysis(analysis);
  renderHomeCategoryChart(tissues.items, analysis);
  renderHomeLifecycleNavigator(tissues.items);
  renderHomeResourceSummary(homeSummary);
  elements.markerTissue.innerHTML = [
    `<option value="">All tissues</option>`,
    ...overview.tissues.map((tissue) => `<option value="${escapeHTML(tissue.code)}">${escapeHTML(tissue.code)} · ${escapeHTML(tissue.full_name)}</option>`),
  ].join("");
  setActiveModeButtons();
  bindEvents();
  const savedResourceModule = localStorage.getItem("qlcoa_resource_module");
  if (initialRoute.resource && elements.resourceModuleSelect?.querySelector(`option[value="${CSS.escape(initialRoute.resource)}"]`)) {
    elements.resourceModuleSelect.value = initialRoute.resource;
  } else if (savedResourceModule && elements.resourceModuleSelect?.querySelector(`option[value="${CSS.escape(savedResourceModule)}"]`)) {
    elements.resourceModuleSelect.value = savedResourceModule;
  }
  applyResourceModule();

  const hash = window.location.hash.replace(/^#/, "");
  const initialGene = hash.startsWith("gene=") ? decodeURIComponent(hash.slice(5)) : overview.default_gene;
  elements.heroSearchInput.value = initialGene;
  elements.sequenceGene.value = initialGene;
  elements.batchInput.value = `${initialGene}\nCqu1BG000010`;
  elements.heatmapInput.value = `${initialGene}\nCqu1BG000010`;
  elements.goInput.value = `${initialGene}\nCqu1BG000010`;
  await applyRouteFromHash(false);
}

init().then(configurePreview).catch((error) => {
  console.error(error);
  elements.entryMeta.innerHTML = buildEmpty("The atlas could not be initialized. Please verify that the data service is available.");
});

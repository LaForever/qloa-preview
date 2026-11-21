import data from "./preview-data.js";

const pages = {
  "/api/overview": data.overview,
  "/api/tissues": { items: data.tissues },
  "/api/analysis": data.analysis,
  "/api/home/summary": data.home,
  "/api/release": data.release,
  "/api/downloads": { items: data.downloads },
  "/api/tools/status": { genome_version: data.release.resource.genome_assembly },
};

export function readPreview(path) {
  const url = new URL(path, window.location.href);
  const { pathname, searchParams: query } = url;
  if (Object.hasOwn(pages, pathname)) return pages[pathname];
  if (pathname.startsWith("/api/tissues/")) {
    const tissue = data.tissueDetails[decodeURIComponent(pathname.split("/").at(-1))];
    if (tissue) return tissue;
  }
  if (pathname.startsWith("/api/genes/")) {
    const id = decodeURIComponent(pathname.split("/").at(-1)).toLowerCase();
    const gene = data.genes.find((item) => item.gene_id.toLowerCase() === id);
    if (gene) return gene;
  }
  if (pathname === "/api/search" || pathname === "/api/entries") {
    const text = (query.get("q") || "").toLowerCase().trim();
    const items = data.genes.filter((gene) => text.split(/\s+/).every((word) =>
      [gene.gene_id, gene.title, gene.best_at_hit, gene.synonyms, gene.model_name].some((value) => String(value ?? "").toLowerCase().includes(word))));
    if (pathname === "/api/search") return { items: text ? items.slice(0, 8) : [] };
    const tissue = query.get("tissue");
    const omics = query.get("omics");
    const rows = items.filter((gene) => (!tissue || gene.transcript_max_tissue === tissue || gene.protein_max_tissue === tissue)
      && (omics !== "shared" || (gene.has_transcriptome && gene.has_proteome))
      && (omics !== "transcriptome" || gene.has_transcriptome)
      && (omics !== "proteome" || gene.has_proteome));
    const sortField = { corr: "cross_omics_correlation", transcript_tau: "transcript_tau", protein_tau: "protein_tau", transcript_value: "transcript_max_value", protein_value: "protein_max_value" }[query.get("sort")];
    rows.sort((a, b) => sortField ? (b[sortField] ?? -Infinity) - (a[sortField] ?? -Infinity) : a.gene_id.localeCompare(b.gene_id));
    return { items: rows, total: rows.length, page: 1, page_count: 1 };
  }
  throw new Error("This record or tool is outside the static preview.");
}

function addNotice(container, message) {
  const element = document.createElement("p");
  element.className = "tool-note pages-preview-notice";
  element.textContent = message;
  container.prepend(element);
}

export function configurePreview() {
  const tools = document.querySelector("#tools");
  addNotice(tools, "GO enrichment, expression heatmaps, batch lookup, sequence retrieval and BLAST require the live database.");
  tools.querySelectorAll(".tool-card button, .tool-card textarea, .tool-card input, .tool-card select").forEach((control) => { control.disabled = true; });
  addNotice(document.querySelector("#browse"), `This preview searches ${data.genes.length} example records.`);
}

export function renderResourcePreview(selected) {
  const workspace = Array.from(document.querySelectorAll("[data-resource-module]")).find((node) => node.dataset.resourceModule === selected);
  if (!workspace || workspace.dataset.previewReady) return;
  workspace.dataset.previewReady = "true";
  addNotice(workspace, "Resource preview. Detailed filters and interactive results require the live database.");
  workspace.querySelectorAll("button, input, select, textarea").forEach((control) => { control.disabled = true; });
  if (selected === "fig3") {
    const figure = document.createElement("img");
    figure.className = "pages-preview-plot";
    figure.src = "./analysis-assets/fig3/scatter.png";
    figure.alt = "Conservation landscape of orthogroups across quinoa, Arabidopsis and rice";
    workspace.querySelector(".pages-preview-notice").after(figure);
  }
}

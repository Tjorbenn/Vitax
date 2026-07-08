import * as d3 from "d3";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import * as NeverApi from "../api/Never/NeverClient";
import { getOrCreateTaxonModal } from "../components/Metadata/MetadataModal/MetadataModal";
import * as Orchestrator from "../core/Orchestrator";
import * as Router from "../core/Routing";
import * as State from "../core/State";
import { Status, TaxonomyType } from "../types/Application";
import type { Taxon } from "../types/Taxonomy";
import { optionalElement } from "../utility/Dom";
import "./Tutorial.css";

type CanvasWithActionMenu = HTMLElement & {
  hideActionMenu?: () => void;
};

/**
 * Start the interactive application tutorial using driver.js.
 * It automatically fetches and visualizes Clunio as an example tree.
 * @returns A promise that resolves when the tutorial starts.
 */
export async function startTutorial(): Promise<void> {
  const isMobile = window.innerWidth <= 768;

  /**
   * Helper to check if an element exists and is currently visible.
   * @param selector - The CSS selector to query.
   * @returns True if the element exists and is visible in the viewport.
   */
  function isVisible(selector: string): boolean {
    const el = optionalElement(document, selector);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  try {
    State.setStatus(Status.Loading);
    const taxon = await NeverApi.getFullTaxonByName("Clunio");
    State.setQuery([taxon]);
    State.setTree(undefined);
    State.setTaxonomyType(TaxonomyType.Descendants);
    await Orchestrator.resolveTree();
    Router.updateUrl();
    // Wait for rendering and animations to complete
    await new Promise((resolve) => setTimeout(resolve, 600));
  } catch (err) {
    console.error("Failed to load example Clunio taxon for tutorial:", err);
    State.setStatus(Status.Error);
  }

  const hasTree = isVisible('g[data-layer="content"]');
  const hasUproot = isVisible('g[data-name="Uproot"]');

  const legendSelector = isMobile
    ? "#mobile-controls-column vitax-legend"
    : "#menu-footer vitax-legend";
  const hasLegend = isVisible(legendSelector);

  const steps: DriveStep[] = [];

  // 1. Vitax Logo / Reset
  if (!isMobile && isVisible("vitax-title")) {
    steps.push({
      element: "vitax-title",
      popover: {
        title: "Vitax Logo",
        description:
          "This is the Vitax logo. You can click on it to reset the visualization at any time.",
        side: "right",
        align: "end",
      },
    });
  }

  // 2. Search Bar
  if (isVisible("vitax-search")) {
    steps.push({
      element: "vitax-search",
      popover: {
        title: "Search Bar",
        description:
          "This is the search bar. You can use it to search taxa, select the type of taxonomic relationship, and initiate the visualization. For this tutorial, we have automatically preloaded the marine midge genus <b>Clunio</b> as an example.",
        side: "bottom",
        align: "center",
      },
    });
  }

  // 3. Taxonomy Type Selector
  if (isVisible("#taxonomy-type-select")) {
    steps.push({
      element: "#taxonomy-type-select",
      popover: {
        title: "Taxonomy Type Selector",
        description:
          "This dropdown menu allows you to select the type of taxonomic relationship to display. We selected <b>Descendants</b> to visualize the Clunio genus along with all of its species.",
        side: isMobile ? "bottom" : "left",
        align: isMobile ? "center" : "end",
      },
    });
  }

  // 4. Search Input
  if (isVisible("#search-input-label")) {
    steps.push({
      element: "#search-input-label",
      popover: {
        title: "Search Input",
        description:
          "This is the search input field. You can use it to search for any taxon. As soon as you start typing, suggestions will appear. You can add a taxon to your selection by pressing <i>Enter</i> when the input matches a name, or by clicking on one of the displayed suggestions.",
        side: "bottom",
        align: "center",
      },
    });
  }

  // 5. Selected Taxa Badges
  if (isVisible("vitax-selection")) {
    steps.push({
      element: "vitax-selection",
      popover: {
        title: "Selection Badges",
        description:
          "Your current selection contains <b>Clunio</b>. If you click on a taxon badge, you can remove it from your selection.",
        side: "bottom",
        align: "center",
      },
    });
  }

  // 6. Visualize Button
  if (isVisible("#visualize-button")) {
    steps.push({
      element: "#visualize-button",
      popover: {
        title: "Visualize",
        description:
          "Click this button to trigger the NCBI query and update the visual canvas with the chosen taxonomy.",
        side: isMobile ? "bottom" : "right",
        align: isMobile ? "center" : "end",
      },
    });
  }

  // 7. Canvas & Node Interactions
  if (isVisible("vitax-canvas")) {
    steps.push({
      element: "vitax-canvas",
      popover: {
        title: "Interactive Canvas",
        description:
          "This is the main canvas where the taxonomy tree is rendered. Drag the background to pan, and scroll or pinch to zoom in and out. <b>Right-click</b> (or <b>long-press</b> on mobile) any node to open its action menu, where you can <i>Fetch Parent</i> to expand upwards, <i>Fetch Children</i> to expand downwards, or open the detailed report shown in the next step.",
        side: "top",
        align: "center",
      },
    });
  }

  // 8. Detailed Taxon Report Modal
  if (hasTree) {
    steps.push({
      element: "vitax-taxon-modal .modal-box",
      popover: {
        title: "Detailed Taxon Report",
        description:
          "This detailed report is shown here for <b>Clunio marinus</b>. Use the <b>Genomes</b> tab to view NCBI assemblies and export accession lists (CSV/TSV) or FASTA downloads, the <b>Publications</b> tab for related literature from Semantic Scholar, and the <b>Links</b> tab for quick access to external databases.",
        side: isMobile ? "top" : "bottom",
        align: "center",
      },
      onHighlightStarted: () => {
        const tree = State.getTree();
        if (tree) {
          const clunioMarinus =
            tree.root.children.find((child) => child.name === "Clunio marinus") ?? tree.root;
          const modal = getOrCreateTaxonModal();
          const rootNode = d3.hierarchy<Taxon>(tree.root);
          const node =
            rootNode.descendants().find((desc) => desc.data.id === clunioMarinus.id) ??
            d3.hierarchy<Taxon>(clunioMarinus);

          modal.setNode(node);
          const dialog = optionalElement<HTMLDialogElement>(modal, "dialog.modal");
          if (dialog && !dialog.open) {
            dialog.show();
          }
        }
      },
      onDeselected: () => {
        const modal = getOrCreateTaxonModal();
        modal.hide();
      },
    });
  }

  // 10. Uproot
  if (hasTree && hasUproot) {
    steps.push({
      element: 'g[data-name="Uproot"]',
      popover: {
        title: "Uproot",
        description:
          "By left-clicking on this node, you can expand the tree upwards by one level (until you reach the true root of life).",
        side: isMobile ? "bottom" : "left",
        align: "center",
      },
    });
  }

  // 11. Taxon List Drawer
  if (hasTree) {
    const listBtnSelector = isMobile ? "#drawer-button-mobile" : "#drawer-button";
    if (isVisible(listBtnSelector)) {
      steps.push({
        element: listBtnSelector,
        popover: {
          title: "Taxon List Drawer",
          description:
            "This button opens a drawer containing an expandable, hierarchical list view of the taxa in the currently displayed tree. From the list view, you can also access the detailed taxon report as well as jump to the taxon in the visualization.",
          side: isMobile ? "left" : "right",
          align: "center",
        },
      });
    }
  }

  // 12. Visualization Type Selector
  if (isVisible("vitax-visualization-type")) {
    steps.push({
      element: "vitax-visualization-type",
      popover: {
        title: "Visualization Type Selector",
        description:
          "These tabs allow you to switch quickly between the different visualization types. Vitax currently supports a tree, graph, and pack visualization. The right-click interaction is the same for all visualization types. In the graph visualization, you can drag taxa around using left-click and hold. In the pack visualization, you can zoom in and out of a subtree by left-clicking on a taxon to zoom in and left-clicking outside of it to zoom out.",
        side: "top",
        align: "center",
      },
    });
  }

  // 13. Accession Filter
  const filterSelector = isMobile
    ? "#mobile-controls-column vitax-accession-filter"
    : "#menu-footer vitax-accession-filter";
  if (isVisible(filterSelector)) {
    steps.push({
      element: filterSelector,
      popover: {
        title: "Accession Filter",
        description:
          "This toggle allows you to filter the taxa in the visualization based on whether they have associated genomic accessions or not. When enabled, only taxa with associated accessions will be displayed in the visualization. This can help to clean up larger trees and focus on taxa with available genomic data for further analysis.",
        side: isMobile ? "left" : "right",
        align: isMobile ? "center" : "start",
      },
    });
  }

  // 14. Legend
  if (hasLegend) {
    steps.push({
      element: legendSelector,
      popover: {
        title: "Legend",
        description:
          "The Legend explains the visual styling applied to the current visualization. It shows what different node colors, sizes, and outline thicknesses represent (such as taxonomic ranks or genomic accession availability).",
        side: isMobile ? "left" : "top",
        align: "center",
      },
    });
  }

  // 15. Image Export
  const imageSelector = isMobile
    ? "#mobile-controls-column vitax-image-button"
    : "header vitax-image-button";
  if (isVisible(imageSelector)) {
    steps.push({
      element: imageSelector,
      popover: {
        title: "Export Image",
        description:
          "This button opens the export dialog, where you can download the visualization as a scalable <b>SVG</b>. You can choose to export the <b>full tree</b> or just the <b>current view</b>.",
        side: "left",
        align: "center",
      },
    });
  }

  // 16. Settings Button
  const settingsSelector = isMobile
    ? "#mobile-controls-column vitax-settings-button"
    : "header vitax-settings-button";
  if (isVisible(settingsSelector)) {
    steps.push({
      element: settingsSelector,
      popover: {
        title: "Settings",
        description:
          "This button opens the settings menu. Here you can change the application theme, restart this tutorial, or reset all application data.",
        side: "left",
        align: isMobile ? "center" : "end",
      },
    });
  }

  const driverObj = driver({
    disableActiveInteraction: true,
    smoothScroll: !isMobile,
    showProgress: true,
    steps,
    onDestroyed: () => {
      const canvas = optionalElement<CanvasWithActionMenu>(document, "vitax-canvas");
      if (canvas && typeof canvas.hideActionMenu === "function") {
        canvas.hideActionMenu();
      }

      const modal = getOrCreateTaxonModal();
      modal.hide();
    },
  });

  driverObj.drive();
}

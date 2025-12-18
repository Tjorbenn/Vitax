import { driver } from "driver.js";
import "driver.js/dist/driver.css";

/**
 * Start the interactive application tutorial using driver.js.
 */
export function startTutorial() {
  const driverObj = driver({
    disableActiveInteraction: true,
    smoothScroll: true,
    showProgress: true,
    steps: [
      {
        element: "vitax-title",
        popover: {
          title: "Vitax Logo",
          description:
            "This is the Vitax logo. You can click on it to reset the visualization at any time.",
          side: "right",
          align: "end",
        },
      },
      {
        element: "vitax-search",
        popover: {
          title: "Search Bar",
          description:
            "This is the search bar. You can use it to search taxa, select the type of taxonomic information to display and visualize the chosen taxonomic information from the selected taxa.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "vitax-taxonomy-type",
        popover: {
          title: "Taxonomy Type Selector",
          description:
            "This dropdown menu allows you to select the type of taxonomic information to display. You can choose between displaying just a specific <b>Taxon</b>, the <b>Descendants</b> of a taxon, the taxonomic <b>Neighbors</b> of one or more taxa, or the most recent common ancestor (<b>MRCA</b>) of the selected taxa.",
          side: "left",
          align: "end",
        },
      },
      {
        element: "#search-input-label",
        popover: {
          title: "Search Input",
          description:
            "This is the search input field. You can use it to search for a taxon. As soon as you start typing, suggestions will appear below. You can either select a taxon directly from the search bar by pressing <i>Enter</i> when the input matches the name of a taxon in the database or by clicking on one of the displayed suggestions. You can add multiple taxa to your selection, even from multiple searches.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "vitax-selection",
        popover: {
          title: "Selection",
          description:
            "Your selected taxa are displayed here. If you click on a taxon, you can remove it from your selection.",
          side: "bottom",
          align: "center",
          onNextClick: () => {
            driverObj.moveNext();
          },
        },
      },
      {
        element: "#visualize-button",
        popover: {
          title: "Visualize",
          description:
            "Click this button to visualize the selected taxonomic information based on your selected taxa.",
          side: "right",
          align: "end",
        },
      },
      {
        element: "vitax-canvas",
        popover: {
          title: "Canvas",
          description:
            "Here you can see the visualization of your requested taxonomic information.",
          side: "top",
          align: "center",
        },
      },
      {
        element: 'g[data-layer="content"]',
        popover: {
          title: "Visualization",
          description:
            "Taxa whose children are loaded into the visualization are displayed with their name on the left side of the node, while taxa that do not have children in the visualization are displayed with their name on the right side of the node. You can expand / collapse the children of a taxon by left-clicking on the taxon. If you right-click on a taxon in the visualization, you have access to quick actions such as fetching the parent or child taxa, or viewing a detailed report about the taxon. This report includes links to external resources, access to associated accessions, publications and more.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: 'g[data-name="Uproot"]',
        popover: {
          title: "Uproot",
          description:
            "By left-clicking on this node, you can always expand the tree upwards by one level (until you reach the true root).",
          side: "left",
          align: "center",
        },
      },
      {
        element: "vitax-list",
        popover: {
          title: "Taxon List Drawer",
          description:
            "This button opens a drawer containing a expandable, hierarchical list view of the taxa in the currently displayed tree. From the list view, you can also access the detailed taxon report as well as jump to the taxon in the visualization.",
          side: "right",
          align: "center",
        },
      },
      {
        element: "vitax-visualization-type",
        popover: {
          title: "Visualization Type Selector",
          description:
            "These tabs allow you to switch quickly between the different visualization types. Vitax currently supports a tree, graph, and pack visualization. The right-click interaction is the same for all visualization types. In the graph visualization, you can drag taxa around using left-click and hold. In the pack visualization, you can zoom in and out of a subtree by left-clicking on a taxon to zoom in and left-clicking outside of it to zoom out.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "vitax-accession-filter",
        popover: {
          title: "Accession Filter",
          description:
            "This toggle allows you to filter the taxa in the visualization based on whether they have associated genomic accessions or not. When enabled, only taxa with associated accessions will be displayed in the visualization. This can help to clean up larger trees and focus on taxa with available genomic data for further analysis.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "vitax-theme",
        popover: {
          title: "Theme Selector",
          description:
            "Vitax uses your systems preferred theme by default. This button allows you to change between the light and dark theme. Your currently selected theme will be saved for future visits.",
          side: "left",
          align: "end",
        },
      },
      {
        element: "vitax-tutorial",
        popover: {
          title: "Tutorial",
          description:
            "If you want to retake this tutorial, you can do so by clicking this button.",
          side: "left",
          align: "end",
        },
      },
    ],
  });
  driverObj.drive();
}

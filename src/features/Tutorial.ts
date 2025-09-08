import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { TaxonomyTypeComponent } from "../components/Search/TaxonomyType/TaxonomyTypeComponent";

export function startTutorial() {
  const taxonomyTypeComponent = document.querySelector(
    "taxonomy-type",
  ) as TaxonomyTypeComponent | null;
  const searchComponentEl = document.querySelector("vitax-search") as HTMLElement | null;
  const taxonomyTypeButton = document.getElementById("taxonomy-type-button") as HTMLButtonElement;
  const searchInput = document.getElementById("search-input") as HTMLInputElement;
  const visualizeButton = document.getElementById("visualize-button") as HTMLButtonElement;

  if (!taxonomyTypeComponent) {
    throw new Error("Could not find taxonomy type component");
  }
  if (!searchComponentEl) {
    throw new Error("Could not find search component");
  }

  searchComponentEl.setAttribute("keep-open-on-blur", "");

  const driverObj = driver({
    showProgress: true,
    steps: [
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
        element: "taxonomy-type",
        popover: {
          title: "Taxonomy Type Selector",
          description:
            "If you click this button, a dropdown will open, where you can select the type of taxonomic information to display.",
          side: "left",
          align: "center",
          onNextClick: () => {
            taxonomyTypeButton.click();
            driverObj.moveNext();
          },
        },
      },
      {
        element: "#taxonomy-type-popover",
        popover: {
          title: "Taxonomy Type Dropdown",
          description:
            "This dropdown menu allows you to select the type of taxonomic information to display.",
          side: "right",
          align: "center",
          onNextClick: () => {
            taxonomyTypeComponent.close();
            driverObj.moveNext();
          },
        },
      },
      {
        element: "#search-input-label",
        popover: {
          title: "Search Input",
          description:
            "This is the search input field. You can use it to search for a taxon. Let's try searching for the genus <i>Homo</i>.",
          side: "bottom",
          align: "center",
          onNextClick: () => {
            searchInput.focus();

            if (searchInput.value !== "Homo") {
              searchInput.value = "Homo";
              searchInput.dispatchEvent(
                new InputEvent("input", { bubbles: true, cancelable: true }),
              );
            }
            driverObj.moveNext();
          },
        },
      },
      {
        element: "vitax-suggestions",
        popover: {
          title: "Suggested Taxa",
          description:
            "Suggestions based on your input are displayed in this table. You can either select a suggestion from the table, press <b>Enter</b> to select your current input (if a taxon with this name exists), or continue typing to refine your search. Let's select the <i>Homo</i> taxon from the suggestions.",
          side: "bottom",
          align: "center",
          onNextClick: () => {
            searchInput.value = "Homo";
            searchInput.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
            );
            driverObj.moveNext();
          },
        },
      },
      {
        element: "vitax-selection",
        popover: {
          title: "Selected Taxa",
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
          align: "center",
          onNextClick: () => {
            visualizeButton.click();
            driverObj.moveNext();
          },
        },
      },
      {
        element: "vitax-canvas",
        popover: {
          title: "Canvas",
          description:
            "Here you can see the visualization of your requested taxonomic information.",
          side: "right",
          align: "center",
          onNextClick: () => {
            driverObj.moveNext();
          },
        },
      },
      {
        element: 'g[data-layer="content"]',
        popover: {
          title: "Visualization",
          description:
            "If you hover over a taxon in the visualization, you can get more information about it.",
          onNextClick: () => {
            // Kleines Polling, falls Visualisierung noch nicht fertig gerendert ist
            const start = performance.now();
            const timeoutMs = 2000;
            const tryDispatch = () => {
              const homoNode = document.querySelector<SVGGElement>('g[data-id="9605"]');
              const canvasEl = document.querySelector("vitax-canvas") as HTMLElement | null;
              // Wenn der Knoten noch nicht existiert, später erneut versuchen (solange innerhalb Timeout)
              if (!homoNode && performance.now() - start < timeoutMs) {
                requestAnimationFrame(tryDispatch);
                return;
              }
              let clientX: number;
              let clientY: number;
              if (canvasEl) {
                const canvasRect = canvasEl.getBoundingClientRect();
                clientX = canvasRect.left + canvasRect.width / 2;
                clientY = canvasRect.top + canvasRect.height / 2;
              } else {
                const bbox = homoNode?.getBoundingClientRect();
                if (bbox) {
                  clientX = bbox.x + bbox.width / 2;
                  clientY = bbox.y + bbox.height / 2;
                } else {
                  clientX = window.innerWidth / 2;
                  clientY = window.innerHeight / 2;
                }
              }
              window.dispatchEvent(
                new CustomEvent("vitax:taxonHover", {
                  detail: {
                    id: 9605, // Nummer statt String, damit findTaxonById funktioniert
                    name: "Homo",
                    x: clientX,
                    y: clientY,
                  },
                }),
              );
              driverObj.moveNext();
            };
            tryDispatch();
          },
        },
      },
      {
        element: "taxon-popover",
        popover: {
          title: "Extra Information",
          description: "Here you can see detailed information about the selected taxon.",
          onNextClick: () => {
            driverObj.moveNext();
          },
          side: "left",
          align: "center",
        },
      },
      {
        element: "#taxon-popover-header",
        popover: {
          title: "Name & ID",
          description: "You can find the name of the taxon and its ID.",
          onNextClick: () => {
            driverObj.moveNext();
          },
          side: "left",
          align: "center",
        },
      },
      {
        element: "#rank",
        popover: {
          title: "Rank",
          description: "As well as the rank of the taxon.",
          onNextClick: () => {
            driverObj.moveNext();
          },
          side: "left",
          align: "center",
        },
      },
      {
        element: "#genomes-table",
        popover: {
          title: "Genomes",
          description:
            "This table shows the accessions associated with the taxon. Direct accessions are those that are directly linked to the taxon, while recursive accessions include all descendants. You also have the option to download the accessions in <tt>.csv</tt> format.",
          onNextClick: () => {
            driverObj.moveNext();
          },
          side: "left",
          align: "center",
        },
      },
      {
        element: "#taxon-popover-actions",
        popover: {
          title: "Actions",
          description:
            "It is possible to perform various actions related to the taxon. These include fetching parent and child taxa as well as expanding or collapsing the descendants of the taxon.",
          onNextClick: () => {
            window.dispatchEvent(new CustomEvent("vitax:taxonUnhover"));
            driverObj.moveNext();
          },
          side: "left",
          align: "center",
        },
      },
      {
        element: 'g[data-name="Uproot"]',
        popover: {
          title: "Uproot",
          description:
            "This node allows you to always expand the tree upwards by one level (until you reach the true root). Let's move upwards one level!",
          onNextClick: () => {
            const uprootNode = document.querySelector('g[data-name="Uproot"]');
            if (!uprootNode) {
              throw new Error("Could not find Uproot node");
            }
            uprootNode.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            driverObj.moveNext();
          },
          side: "left",
          align: "center",
        },
      },
      {
        element: 'g[data-layer="content"]',
        popover: {
          title: "Visualization",
          description: "Now the visualization contains one more layer.",
        },
      },
      {
        element: "#drawer-button",
        popover: {
          title: "Taxon List Drawer",
          description:
            "This button opens a drawer containing a hierarchical list view of the taxa in the currently displayed tree.",
          onNextClick: () => {
            const drawerButton = document.getElementById("drawer-button") as HTMLButtonElement;
            drawerButton.click();
            driverObj.moveNext();
          },
          side: "right",
          align: "center",
        },
      },
      {
        element: "#list-content",
        popover: {
          title: "Taxon List",
          description:
            "This list shows all taxa in the currently displayed tree in a hierarchical manner. You can dynamically expand and collapse each taxon to explore its children.",
          onNextClick: () => {
            const drawerOverlay = document.getElementById("drawer-overlay") as HTMLLabelElement;
            drawerOverlay.click();
            driverObj.moveNext();
          },
          side: "right",
          align: "start",
        },
      },
      {
        element: "display-type",
        popover: {
          title: "Visualization Type Selector",
          description:
            "These tabs allow you to switch quickly between different types of visualization.",
        },
      },
      {
        element: "vitax-theme",
        popover: {
          title: "Theme Selector",
          description:
            "Vitax uses your systems preferred theme by default. This button allows you to change between the light and dark theme.",
          onNextClick: () => {
            localStorage.setItem("vitax.tutorialCompleted", "true");
            driverObj.moveNext();
          },
        },
      },
    ],
    onDestroyed: () => {
      // Flag zurücksetzen sobald Tutorial endet
      searchComponentEl.removeAttribute("keep-open-on-blur");
    },
  });
  driverObj.drive();
}

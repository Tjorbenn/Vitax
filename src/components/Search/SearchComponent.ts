import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./SearchTemplate.html?raw";

import * as Orchestrator from "../../core/Orchestrator.ts";
import * as Router from "../../core/Routing.ts";
import * as State from "../../core/State.ts";
import { SuggestionsService } from "../../services/SuggestionsService.ts";
import { Status, TaxonomyType, type Suggestion } from "../../types/Application";

import "./Selection/SelectionComponent.ts";
import { SelectionComponent } from "./Selection/SelectionComponent.ts";
import "./Suggestions/SuggestionsComponent.ts";
import { SuggestionsComponent } from "./Suggestions/SuggestionsComponent.ts";
import "./TaxonomyType/TaxonomyTypeComponent.ts";

/**
 * Main Search Component.
 * Orchestrates search input, suggestions, selection, taxonomy type toggling.
 */
export class SearchComponent extends BaseComponent {
  private input!: HTMLInputElement;
  private button!: HTMLButtonElement;
  private section!: HTMLElement;
  private readonly suggestionsComp = new SuggestionsComponent();
  private readonly selectionComp = new SelectionComponent();
  private readonly service = new SuggestionsService();

  private debounceTimer?: number;
  private readonly debounceDelay = Number(import.meta.env.VITAX_DEBOUNCE_TIME) || 200;

  private term = "";
  private outsideListener?: (e: Event) => void;
  private _keepOpenOnBlur = false;

  /**
   * Creates a new SearchComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  /**
   * Initialize child components and event listeners.
   */
  initialize(): void {
    this.input = requireElement<HTMLInputElement>(this, "#search-input");
    this.button = requireElement<HTMLButtonElement>(this, "button[type=submit]");
    this.section = requireElement<HTMLElement>(this, "section");

    this.addEvent(this.button, "click", () => {
      this.onVisualize();
    });
    this.addEvent(this.input, "input", () => {
      this.onInput();
    });
    this.addEvent(this.input, "keydown", (event: Event) => {
      void this.onKeyDown(event as KeyboardEvent);
    });
    this.addEvent(
      this.suggestionsComp,
      "vitax:selectSuggestion",
      this.onSelectSuggestion.bind(this),
    );

    this.section.appendChild(this.selectionComp);
    this.section.appendChild(this.suggestionsComp);

    this.addSubscription(State.subscribeToTaxonomyType(this.updateVisualizeButton.bind(this)));
    this.addSubscription(State.subscribeToQuery(this.updateVisualizeButton.bind(this)));
    this.addSubscription(State.subscribeToStatus(this.onStatusChange.bind(this)));

    this.outsideListener = (event: Event) => {
      const target = event.target as Node | null;
      if (this._keepOpenOnBlur) {
        return;
      }
      if (target && !this.contains(target)) {
        this.closeSuggestions();
      }
    };
    window.addEventListener("mousedown", this.outsideListener, true);
    window.addEventListener("focusin", this.outsideListener, true);

    this.updateVisualizeButton();
  }

  /**
   * Handle input event.
   */
  private onInput(): void {
    const newTerm = this.input.value.trim();

    if (newTerm === this.term) {
      return;
    }
    this.term = newTerm;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (!this.term) {
      this.suggestionsComp.onInput("");
      return;
    }

    this.debounceTimer = window.setTimeout(() => {
      if (!this.term) {
        return;
      }
      this.suggestionsComp.onInput(this.term);
    }, this.debounceDelay);
  }

  /**
   * Handle select suggestion event.
   * @param event - The selection event containing the selected suggestion.
   */
  private onSelectSuggestion(event: Event): void {
    const selectEvent = event as CustomEvent<Suggestion>;
    this.selectionComp.addSelection(selectEvent.detail);
  }

  /**
   * Handle visualize button click event.
   */
  private onVisualize(): void {
    if (State.getQuery().length > 0) {
      void Orchestrator.resolveTree();
      this.closeSuggestions();
      Router.updateUrl();
    }
  }

  /**
   * Hides the suggestions list.
   */
  private closeSuggestions(): void {
    this.suggestionsComp.hide();
  }

  /**
   * Handle keydown event.
   * @param event - The keydown event.
   */
  private async onKeyDown(event: KeyboardEvent): Promise<void> {
    if (event.key === "Enter") {
      event.preventDefault();

      const term = this.input.value.trim();
      if (!term) {
        return;
      }

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = undefined;
      }

      const suggestion = await this.service.getExactSuggestion(term);
      this.selectionComp.addSelection(suggestion);

      this.input.value = "";
      this.term = "";
      this.suggestionsComp.onInput("");
    }
  }

  /**
   * Callback for application status changes.
   * Updates loading state of the visualize button.
   * @param status The new status.
   */
  public onStatusChange(status: Status): void {
    if (status === Status.Loading) {
      this.button.innerHTML = '<span class="loading loading-spinner"></span>';
    } else if (this.button.querySelector(".loading")) {
      this.button.innerHTML = `
        <span id="visualize-text" class="hidden md:inline">Visualize</span>
        <span
          id="visualize-icon"
          class="icon-[material-symbols--account-tree-rounded] md:hidden"
          style="width: 1.5em; height: 1.5em"
        ></span>
      `;
    }
  }

  /**
   * Update the disabled state and tooltip of the visualize button based on the current selection count and taxonomy type.
   */
  public updateVisualizeButton(): void {
    const taxonomyType = State.getTaxonomyType();
    const query = State.getQuery();

    const singleSelectTypes = [TaxonomyType.Descendants, TaxonomyType.Taxon];
    const multiSelectTypes: TaxonomyType[] = [];

    if (
      query.length < 1 ||
      (singleSelectTypes.includes(taxonomyType) && query.length > 1) ||
      (multiSelectTypes.includes(taxonomyType) && query.length < 2)
    ) {
      this.button.disabled = true;
      if (query.length < 1) {
        this.button.dataset.tip = "Select at least one taxon!";
      } else if (singleSelectTypes.includes(taxonomyType)) {
        this.button.dataset.tip = "Select exactly one taxon!";
      } else if (multiSelectTypes.includes(taxonomyType)) {
        this.button.dataset.tip = "Select at least two taxa!";
      }
      this.button.classList.add("tooltip-open");
      return;
    } else {
      this.button.disabled = false;
      this.button.classList.remove("tooltip-open");
      this.button.removeAttribute("data-tip");
    }
  }

  /**
   * Callback for when the component is disconnected from the DOM.
   */
  disconnectedCallback(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.outsideListener) {
      window.removeEventListener("mousedown", this.outsideListener, true);
      window.removeEventListener("focusin", this.outsideListener, true);
    }
  }
}

customElements.define("vitax-search", SearchComponent);

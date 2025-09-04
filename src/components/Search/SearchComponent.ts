import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./SearchTemplate.html?raw";

import { Orchestrator } from "../../core/Orchestrator.ts";
import { State } from "../../core/State.ts";
import { SuggestionsService } from "../../services/SuggestionsService.ts";
import { Status, type Suggestion } from "../../types/Application";

import "./Selection/SelectionComponent.ts";
import { SelectionComponent } from "./Selection/SelectionComponent.ts";
import "./Suggestions/SuggestionsComponent.ts";
import { SuggestionsComponent } from "./Suggestions/SuggestionsComponent.ts";
import "./TaxonomyType/TaxonomyTypeComponent.ts";

export class SearchComponent extends BaseComponent {
  private input?: HTMLInputElement;
  private button?: HTMLButtonElement;
  private section?: HTMLElement;
  private suggestionsComp: SuggestionsComponent = new SuggestionsComponent();
  private selectionComp: SelectionComponent = new SelectionComponent();
  private service: SuggestionsService = new SuggestionsService();
  private state: State = State.instance;

  private debounceTimer?: number;
  private debounceDelay: number = import.meta.env.VITAX_DEBOUNCE_TIME as number;

  private orchestrator: Orchestrator = Orchestrator.instance;

  private term = "";
  private outsideListener?: (e: Event) => void;

  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  initialize(): void {
    this.input = this.querySelector("#search-input") ?? undefined;
    this.button = this.querySelector("button[type=submit]") ?? undefined;
    this.section = this.querySelector("section") ?? undefined;

    if (!this.input || !this.section || !this.button) {
      throw new Error("Missing input, section or button");
    }

    this.button.addEventListener("click", () => {
      this.onVisualize();
    });
    this.input.addEventListener("input", () => {
      this.onInput();
    });
    this.input.addEventListener("keydown", (e: KeyboardEvent) => {
      void this.onKeyDown(e);
    });
    this.suggestionsComp.addEventListener(
      "vitax:selectSuggestion",
      this.onSelectSuggestion.bind(this),
    );

    this.section.appendChild(this.selectionComp);
    this.section.appendChild(this.suggestionsComp);

    this.state.subscribeToStatus(this.onStatusChange.bind(this));

    // Outside click / focus handling
    this.outsideListener = (e: Event) => {
      const target = e.target as Node | null;
      if (target && !this.contains(target)) {
        this.closeSuggestions();
      }
    };
    window.addEventListener("mousedown", this.outsideListener, true);
    window.addEventListener("focusin", this.outsideListener, true);
  }

  private onInput(): void {
    const newTerm = this.input?.value.trim() ?? "";

    // Wenn sich der Term nicht geändert hat -> ignorieren
    if (newTerm === this.term) {
      return;
    }
    this.term = newTerm;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Leerer Term: sofort zurücksetzen ohne Debounce
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

  private onSelectSuggestion(event: Event): void {
    const selectEvent = event as CustomEvent<Suggestion>;
    this.selectionComp.addSelection(selectEvent.detail);
  }

  private onVisualize(): void {
    if (this.state.query.size > 0) {
      void this.orchestrator.resolveTree();
      window.dispatchEvent(new CustomEvent("vitax:resetView"));
      this.closeSuggestions();
    }
  }

  private closeSuggestions(): void {
    this.suggestionsComp.hide();
  }

  private async onKeyDown(e: KeyboardEvent): Promise<void> {
    if (e.key === "Enter") {
      e.preventDefault();

      if (!this.input) {
        throw new Error("Input element is not defined");
      }

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

  public onStatusChange(status: Status): void {
    if (!this.button) {
      throw new Error("Button not defined");
    }
    if (status === Status.Loading) {
      this.button.innerHTML = '<span class="loading loading-spinner"></span>';
    } else {
      this.button.innerHTML = "Visualize";
    }
  }
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

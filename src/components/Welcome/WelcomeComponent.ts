import { startTutorial } from "../../features/Tutorial";
import { queryElements, requireElement } from "../../utility/Dom";
import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./WelcomeTemplate.html?raw";

import * as NeverApi from "../../api/Never/NeverClient";
import * as Orchestrator from "../../core/Orchestrator.ts";
import * as Router from "../../core/Routing.ts";
import * as State from "../../core/State.ts";
import { Status } from "../../types/Application";

/**
 * Component displaying the welcome modal for first-time users.
 */
export class WelcomeComponent extends BaseComponent {
  /**
   * Creates a new WelcomeComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
  }

  /**
   * Initialize modal and check onboarding status.
   */
  initialize(): void {
    const modal = requireElement<HTMLDialogElement>(this, "#welcome-modal");
    const tutorialButton = requireElement<HTMLButtonElement>(this, "#welcome-tutorial");
    const onboarded = localStorage.getItem("vitax.onboarded");

    this.addEvent(tutorialButton, "click", () => {
      modal.close();
      void startTutorial();
    });

    this.addEvent(modal, "close", () => {
      this.setOnboarded();
    });

    const quickStartButtons = queryElements<HTMLButtonElement>(this, ".welcome-quick-start");
    quickStartButtons.forEach((btn) => {
      this.addEvent(btn, "click", (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const taxonName = target.getAttribute("data-taxon");
        if (taxonName) {
          void this.loadQuickStartTaxon(taxonName, modal);
        }
      });
    });

    const prevBtn = requireElement<HTMLButtonElement>(this, "#welcome-stack-prev");
    const nextBtn = requireElement<HTMLButtonElement>(this, "#welcome-stack-next");
    const indicator = requireElement<HTMLElement>(this, "#welcome-stack-indicator");
    const cards = queryElements<HTMLElement>(this, ".features-card");
    let activeIndex = 0;

    this.addEvent(prevBtn, "click", (event) => {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + cards.length) % cards.length;
      this.updateStack(cards, activeIndex, indicator);
    });

    this.addEvent(nextBtn, "click", (event) => {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % cards.length;
      this.updateStack(cards, activeIndex, indicator);
    });

    cards.forEach((card, index) => {
      this.addEvent(card, "click", () => {
        if (index === activeIndex) {
          activeIndex = (activeIndex + 1) % cards.length;
          this.updateStack(cards, activeIndex, indicator);
        }
      });
    });

    this.updateStack(cards, activeIndex, indicator);

    if (onboarded !== "true") {
      modal.showModal();
    }
  }

  /**
   * Updates the layout classes of the features stack component.
   * @param cards The list of card elements in the stack.
   * @param activeIndex The currently active stack index.
   * @param indicator The indicator element to display current page index.
   */
  private updateStack(cards: Element[], activeIndex: number, indicator: HTMLElement): void {
    cards.forEach((card, index) => {
      const rel = (index - activeIndex + cards.length) % cards.length;
      card.classList.remove("stack-active", "stack-next", "stack-prev");
      if (rel === 0) {
        card.classList.add("stack-active");
      } else if (rel === 1) {
        card.classList.add("stack-next");
      } else {
        card.classList.add("stack-prev");
      }
    });
    indicator.textContent = `${String(activeIndex + 1)}/${String(cards.length)}`;
  }

  /**
   * Loads a quick start taxon by name.
   * @param taxonName The taxon name to load.
   * @param modal The welcome modal element to close.
   */
  private async loadQuickStartTaxon(taxonName: string, modal: HTMLDialogElement): Promise<void> {
    modal.close();
    try {
      State.setStatus(Status.Loading);
      const taxon = await NeverApi.getFullTaxonByName(taxonName);
      State.clear();
      State.addToQuery(taxon);
      await Orchestrator.resolveTree();
      Router.updateUrl();
    } catch (err) {
      console.error("Failed to load quick start taxon:", err);
      State.setStatus(Status.Error);
    }
  }

  /**
   * Marks the user as onboarded in local storage.
   */
  private setOnboarded() {
    localStorage.setItem("vitax.onboarded", "true");
  }
}

customElements.define("vitax-welcome", WelcomeComponent);

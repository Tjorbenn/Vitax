import { requireElement } from "../../utility/Dom";
import { BaseComponent } from "../BaseComponent";
import { TutorialComponent } from "../Tutorial/TutorialComponent";
import HTMLtemplate from "./WelcomeTemplate.html?raw";

/**
 * Component displaying the welcome modal for first-time users.
 */
export class WelcomeComponent extends BaseComponent {
  /**
   * Creates a new WelcomeComponent instance.
   */
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  /**
   * Initialize modal and check onboarding status.
   */
  initialize(): void {
    const modal = requireElement<HTMLDialogElement>(this, "#welcome-modal");
    const tutorialButton = requireElement<TutorialComponent>(this, "vitax-tutorial");
    const closeButton = requireElement<HTMLButtonElement>(this, "#welcome-close");
    const onboarded = localStorage.getItem("vitax.onboarded");

    tutorialButton.text = "Tour";
    this.addEvent(tutorialButton, "click", () => {
      this.setOnboarded();
      modal.close();
    });
    this.addEvent(closeButton, "click", () => {
      this.setOnboarded();
    });

    if (onboarded !== "true") {
      modal.showModal();
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

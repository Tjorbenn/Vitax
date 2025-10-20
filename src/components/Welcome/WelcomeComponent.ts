import { BaseComponent } from "../BaseComponent";
import { TutorialComponent } from "../Tutorial/TutorialComponent";
import HTMLtemplate from "./WelcomeTemplate.html?raw";

export class WelcomeComponent extends BaseComponent {
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

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

  private setOnboarded() {
    localStorage.setItem("vitax.onboarded", "true");
  }
}

customElements.define("vitax-welcome", WelcomeComponent);

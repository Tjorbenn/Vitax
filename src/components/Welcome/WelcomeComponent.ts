import { BaseComponent } from "../BaseComponent";
import { TutorialComponent } from "../Tutorial/TutorialComponent";
import HTMLtemplate from "./WelcomeTemplate.html?raw";

export class WelcomeComponent extends BaseComponent {
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  initialize(): void {
    const modal = this.querySelector("#welcome-modal") as HTMLDialogElement | null;
    const tutorialButton = this.querySelector("vitax-tutorial") as TutorialComponent | null;
    const closeButton = this.querySelector("#welcome-close") as HTMLButtonElement | null;
    const onboarded = localStorage.getItem("vitax.onboarded");

    if (!modal) {
      throw new Error("Could not find welcome modal");
    }
    if (!tutorialButton) {
      throw new Error("Could not find tutorial button");
    }
    if (!closeButton) {
      throw new Error("Could not find closing button");
    }

    tutorialButton.text = "Tour";
    tutorialButton.addEventListener("click", () => {
      this.setOnboarded();
      modal.close();
    });
    closeButton.addEventListener("click", () => {
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

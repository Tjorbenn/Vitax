import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./WelcomeTemplate.html?raw";
import { TutorialComponent } from "../Tutorial/TutorialComponent";

export class WelcomeComponent extends BaseComponent {
  constructor() {
    super(HTMLtemplate);
    this.loadTemplate();
  }

  initialize(): void {
    const modal = this.querySelector("#welcome-modal") as HTMLDialogElement | null;
    const tutorialButton = this.querySelector("vitax-tutorial") as TutorialComponent | null;
    const completedTutorial = localStorage.getItem("vitax.tutorialCompleted");

    if (!modal) {
      throw new Error("Could not find welcome modal");
    }
    if (!tutorialButton) {
      throw new Error("Could not find tutorial button");
    }

    tutorialButton.text = "Tour";
    tutorialButton.addEventListener("click", () => {
      modal.close();
    });

    if (!completedTutorial) {
      modal.showModal();
    }
  }
}

customElements.define("vitax-welcome", WelcomeComponent);

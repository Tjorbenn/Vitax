export class BuildComponent {
    private commitHash?: string;
    private container: HTMLDivElement;
    private link: HTMLAnchorElement;

    constructor(container: HTMLDivElement) {
        this.commitHash = import.meta.env.VITE_GIT_COMMIT_HASH;
        this.container = container;
        if (this.container.querySelector("a")) {
            this.link = this.container.querySelector("a") as HTMLAnchorElement;
        }
        else {
            throw new Error("Link element is missing from the Build-Hash div")
        }

        this.setBuildHash();
    }

    private setBuildHash() {
        if (this.commitHash) {
            this.container.hidden = false;
            this.link.href = `https://github.com/Tjorbenn/Vitax/commit/${this.commitHash}`
            this.link.innerText = this.commitHash;
        }
        else {
            this.container.hidden = true;
        }
    }
}
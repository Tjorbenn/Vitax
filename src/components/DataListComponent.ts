import type { Taxon, TaxonomyTree } from "../types/Taxonomy";

export class DataListComponent {
    private listContainer: HTMLDivElement;
    private tree?: TaxonomyTree;
    private list?: HTMLUListElement;

    constructor(listContainer: HTMLDivElement) {
        this.listContainer = listContainer;
        this.hide();
    }

    public setTree(tree: TaxonomyTree) {
        this.tree = tree;
        this.render();
    }

    public removeTree() {
        this.tree = undefined;
        this.hide();
        this.removeList();
    }

    public show() {
        if (!this.list) {
            throw new Error("No list available to show. Please set a taxonomy tree first.");
        }
        this.listContainer.closest("#data-window")?.classList.remove("hidden");
    }

    public hide() {
        this.listContainer.closest("#data-window")?.classList.add("hidden");
    }

    private render() {
        if (!this.tree) {
            throw new Error("No taxonomy tree set. Please set a taxonomy tree before rendering.");
        }
        this.setList(this.TaxonomyTreeToList(this.tree));
    }

    private setList(list: HTMLUListElement) {
        this.list = list;
        this.listContainer.innerHTML = "";
        this.listContainer.appendChild(list);
    }

    private removeList() {
        this.listContainer.innerHTML = "";
        this.list = undefined;
    }

    private TaxonomyTreeToList(tree: TaxonomyTree): HTMLUListElement {
        const root = tree.root;
        const ul = document.createElement("ul") as HTMLUListElement;
        ul.classList.add("taxonomy-list");
        ul.appendChild(this.buildListRecursive(root));
        return ul;
    }

    private buildListRecursive(taxon: Taxon): HTMLLIElement {
        const li = document.createElement("li") as HTMLLIElement;
        li.classList.add("taxonomy-list-item");
        const nameSpan = document.createElement("span") as HTMLSpanElement;
        const idSpan = document.createElement("span") as HTMLSpanElement;
        nameSpan.textContent = taxon.name;
        idSpan.textContent = `[${taxon.id}]`;

        if (taxon.children && taxon.children.size > 0) {
            const button = document.createElement("button") as HTMLButtonElement;
            button.classList.add("taxonomy-list-toggle", "animated");

            const icon = document.createElement("icon-material-symbols-expand-circle-right-rounded");
            icon.classList.add("animated");
            button.appendChild(icon);
            button.appendChild(nameSpan);
            button.appendChild(idSpan);

            const ul = document.createElement("ul") as HTMLUListElement;
            ul.classList.add("taxonomy-list", "hidden");

            taxon.children.forEach((child) => {
                const childLi = this.buildListRecursive(child);
                ul.appendChild(childLi);
            });

            li.appendChild(button);
            li.appendChild(ul);
            button.addEventListener("click", (event) => this.toggleList(event));
        }
        else {
            const div = document.createElement("div") as HTMLDivElement;
            div.classList.add("taxonomy-list-item-info", "animated");
            div.appendChild(nameSpan);
            div.appendChild(idSpan);
            li.appendChild(div);
        }

        return li;
    }

    private toggleList(event: MouseEvent) {
        const button = event.currentTarget as HTMLButtonElement;
        button.classList.toggle("expanded");
        const list = button.closest(".taxonomy-list-item");
        const childrenList = list?.querySelector(".taxonomy-list");
        if (childrenList) {
            childrenList.classList.toggle("hidden");
        }
    }
}
import { LinkSource } from "../api/NCBI/Ncbi";
import { Rank, type TaxonImage } from "./Taxonomy";

export type IconClass = string;

export class Icon extends HTMLSpanElement {
  private class: IconClass;
  private size = "2em";

  constructor(iconClass: IconClass, size?: string) {
    super();
    this.class = iconClass;
    if (size) {
      this.size = size;
    }
    this.initialize();
  }

  private initialize(): void {
    this.className = this.class;
    this.style.width = this.size;
    this.style.height = this.size;
  }

  public set iconClass(iconClass: IconClass) {
    this.class = iconClass;
    this.initialize();
  }

  public set iconSize(size: string) {
    this.size = size;
    this.initialize();
  }
}

export const RankIcons: Record<Rank, IconClass> = {
  [Rank.None]: "icon-[material-symbols--question-mark-rounded]",
  [Rank.Unknown]: "icon-[material-symbols--question-mark-rounded]",
  [Rank.Domain]: "icon-[material-symbols--domain-rounded]",
  [Rank.Kingdom]: "icon-[material-symbols--castle-rounded]",
  [Rank.Phylum]: "icon-[material-symbols--account-tree-rounded]",
  [Rank.Class]: "icon-[material-symbols--hotel-class-rounded]",
  [Rank.Order]: "icon-[material-symbols--orders-rounded]",
  [Rank.Suborder]: "icon-[material-symbols--orders-rounded]",
  [Rank.Superfamily]: "icon-[material-symbols--family-history-rounded]",
  [Rank.Family]: "icon-[material-symbols--family-history-rounded]",
  [Rank.Subfamily]: "icon-[material-symbols--family-history-rounded]",
  [Rank.Genus]: "icon-[material-symbols--genetics-rounded]",
  [Rank.Subgenus]: "icon-[material-symbols--genetics-rounded]",
  [Rank.Group]: "icon-[material-symbols--groups-rounded]",
  [Rank.Subgroup]: "icon-[material-symbols--groups-rounded]",
  [Rank.Species]: "icon-[material-symbols--person-rounded]",
  [Rank.Subspecies]: "icon-[material-symbols--person-rounded]",
  [Rank.Strain]: "icon-[material-symbols--microbiology]",
  [Rank.Varietas]: "icon-[material-symbols--safety-divider-rounded]",
  [Rank.Tribe]: "icon-[material-symbols--history-edu-rounded]",
  [Rank.Subtribe]: "icon-[material-symbols--history-edu-rounded]",
  [Rank.Isolate]: "icon-[material-symbols--point-scan-rounded]",
  [Rank.Clade]: "icon-[material-symbols--table-large-rounded]",
  [Rank.Forma]: "icon-[material-symbols--shapes-rounded]",
  [Rank.FormaSpecialis]: "icon-[material-symbols--shapes-rounded]",
  [Rank.Serotype]: "icon-[material-symbols--bloodtype-rounded]",
  [Rank.Section]: "icon-[material-symbols--area-chart-rounded]",
};

export const LinkSourceIcons: Record<LinkSource, IconClass> = {
  [LinkSource.Wikipedia]: "icon-[simple-icons--wikipedia]",
  [LinkSource.GBIF]: "icon-[material-symbols--nest-eco-leaf-rounded]",
  [LinkSource.ViralZone]: "icon-[material-symbols--coronavirus]",
};

export function getRankIcon(rank?: string | Rank, size = "2em"): Icon {
  const createIcon = (iconClass: IconClass): Icon => {
    const icon = document.createElement("span", { is: "vitax-icon" }) as Icon;
    icon.iconClass = iconClass;
    icon.iconSize = size;
    return icon;
  };

  if (!rank) {
    return createIcon(RankIcons[Rank.Unknown]);
  }

  const input = (typeof rank === "string" ? rank : String(rank)).toLowerCase();
  // Lookup-Map: value->Rank und key->Rank jeweils lowercase
  const valueToRank: Record<string, Rank> = {};
  const keyToRank: Record<string, Rank> = {};
  (Object.keys(Rank) as (keyof typeof Rank)[]).forEach((k) => {
    const value = Rank[k];
    keyToRank[k.toLowerCase()] = value as unknown as Rank;
    valueToRank[(value as unknown as string).toLowerCase()] = value as unknown as Rank;
  });
  const hit = valueToRank[input] ?? keyToRank[input] ?? Rank.Unknown;
  return createIcon(RankIcons[hit]);
}

export function ImageToElement(image: TaxonImage): HTMLImageElement {
  const imageEl = document.createElement("img");
  imageEl.src = image.url.toString();
  return imageEl;
}

customElements.define("vitax-icon", Icon, { extends: "span" });

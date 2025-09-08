import { Rank } from "./Taxonomy";

export const RankIcons: Record<Rank, string> = {
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

export function getRankIcon(rank?: string | Rank): string {
  const defaultIcon = RankIcons[Rank.None];
  if (!rank) return defaultIcon;

  if ((rank as Rank) in RankIcons) {
    return RankIcons[rank as Rank];
  }

  const normalized = (rank as string).toLowerCase().trim();

  for (const r of Object.values(Rank)) {
    if (r.toLowerCase() === normalized) {
      return RankIcons[r as Rank];
    }
  }

  return defaultIcon;
}

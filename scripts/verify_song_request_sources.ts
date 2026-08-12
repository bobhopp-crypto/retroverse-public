import { discoverVirtualDjSources, loadVirtualDjSourceSelection } from "../packages/shared/lib/song-requests/vdj-sources";

function flatten<T extends { children: T[] }>(nodes: T[]): T[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

async function main() {
  const discovery = await discoverVirtualDjSources();
  const nodes = flatten(discovery.groups.flatMap((group) => group.children));
  const selected = nodes.find((node) => node.sourceKey === discovery.defaultSourceKey) ?? null;
  const selection = selected ? await loadVirtualDjSourceSelection(selected.sourceKey) : null;

  process.stdout.write(
    `${JSON.stringify({
      scannedAt: discovery.scannedAt,
      defaultSource: selected
        ? {
            displayPath: selected.displayPath,
            kind: selected.kind,
            includeDescendants: selected.includeDescendants,
            eligibleTrackCount: selected.eligibleTrackCount,
          }
        : null,
      activatedSnapshot: selection
        ? {
            sourceLabel: selection.sourceLabel,
            trackCount: selection.tracks.length,
            firstTrack: selection.tracks[0] ?? null,
            lastTrack: selection.tracks.at(-1) ?? null,
          }
        : null,
      groups: discovery.groups.map((group) => ({
        label: group.label,
        selectableSources: flatten(group.children).filter((node) => node.selectable).length,
        note: group.note,
      })),
      }, null, 2)}\n`,
  );
}

void main();

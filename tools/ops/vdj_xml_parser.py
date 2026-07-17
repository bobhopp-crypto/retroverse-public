"""Tolerant, read-only parser for VirtualDJ's occasionally malformed Song XML."""
import html, re
from dataclasses import dataclass

@dataclass
class VdjSong:
    filepath: str
    tags: dict[str, str]
    infos: dict[str, str]
    warning: str | None = None

def _attrs(text: str) -> dict[str, str]:
    return {k: html.unescape(v) for k, v in re.findall(r'(\w+)="([^"]*)"', text)}

def parse_vdj_songs(xml: str) -> tuple[list[VdjSong], list[str]]:
    songs: list[VdjSong] = []; warnings: list[str] = []
    # VirtualDJ writes one Song start tag per physical line. Segmenting on
    # those lines avoids regex/XML-parser loss when attributes are duplicated.
    starts = [m.start() for m in re.finditer(r'^\s*<Song\b', xml, re.M)]
    blocks = []
    for idx, start in enumerate(starts):
        end = starts[idx + 1] if idx + 1 < len(starts) else len(xml)
        blocks.append(xml[start:end])
    for block in blocks:
        paths = [html.unescape(v) for v in re.findall(r'FilePath="([^"]*)"', block)]
        if not paths:
            warnings.append('Song without FilePath'); continue
        path = paths[0]
        warning = None
        if len(paths) > 1:
            warning = 'duplicate FilePath attributes: ' + ' | '.join(paths)
            warnings.append(warning)
        tags = re.search(r'<Tags\b([^>]*)', block)
        infos = re.search(r'<Infos\b([^>]*)', block)
        songs.append(VdjSong(path, _attrs(tags.group(1) if tags else ''), _attrs(infos.group(1) if infos else ''), warning))
    return songs, warnings

def production_songs(xml: str, root='/Users/bobhopp/DJ MEDIA/VIDEO/'):
    songs, warnings = parse_vdj_songs(xml)
    return [s for s in songs if s.filepath.startswith(root)], warnings

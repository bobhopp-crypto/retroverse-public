from vdj_xml_parser import parse_vdj_songs, production_songs

def test_duplicate_conflicting_path_keeps_first_and_warns():
    rows, warnings = parse_vdj_songs('<Song FilePath="/a" FilePath="/b"><Tags Label="RVTR123456" /></Song>')
    assert rows[0].filepath == '/a' and warnings

def test_self_closing_and_labels():
    rows, _ = parse_vdj_songs('<Song FilePath="/a" /><Song FilePath="/b"><Tags Label="PK_RVTR123456" /></Song>')
    assert len(rows) == 2 and rows[1].tags['Label'].startswith('PK_')

def test_escaping_and_archive_exclusion():
    rows, _ = production_songs('<Song FilePath="/Users/bobhopp/DJ MEDIA/VIDEO/A &amp; B.mp4"><Tags Author="A &amp; B" /></Song><Song FilePath="/Users/bobhopp/DJ MEDIA/VIDEO VAULT/x.mp4" />')
    assert len(rows) == 1 and rows[0].tags['Author'] == 'A & B'

if __name__ == '__main__':
    import pathlib
    xml = pathlib.Path('/Users/bobhopp/Library/Application Support/VirtualDJ/database.xml').read_text(errors='replace')
    rows, warnings = production_songs(xml)
    existing = [r for r in rows if pathlib.Path(r.filepath).exists()]
    labels = [r.tags.get('Label','') for r in existing]
    rvtrs = {x for label in labels for x in __import__('re').findall(r'RVTR\d{6}', label)}
    assert (len(rows), len(existing), len(rows)-len(existing), sum(bool(x) for x in labels), len(rvtrs)) == (9163, 8807, 356, 8477, 8026)
    print('production invariants passed; duplicate warnings:', len(warnings))

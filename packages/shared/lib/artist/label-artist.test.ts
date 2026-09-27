import assert from "node:assert/strict";
import test from "node:test";

import { groupDossiersForArtist } from "./dossier-group";
import { normalizeLabelArtist, primaryLabelArtist, starterArtistHref } from "./label-artist";

test("starter swipe uses the primary artist, not a featured credit", () => {
  assert.equal(starterArtistHref("Madonna feat. Justin Timberlake"), "/artist/madonna");
  assert.equal(starterArtistHref("Justin Timberlake feat. Madonna"), null);
  assert.equal(primaryLabelArtist("Elton John with Kiki Dee"), "Elton John");
  assert.equal(primaryLabelArtist("Hall & Oates"), "Hall & Oates");
});

test("spelling forks and unlabeled variants stay separate", () => {
  assert.notEqual(normalizeLabelArtist("Beyoncé"), normalizeLabelArtist("Beyonce"));
  assert.equal(starterArtistHref("Michael Jackson"), "/artist/michael-jackson");
  assert.equal(starterArtistHref("This Is It"), null);
  assert.equal(starterArtistHref("Michael Jackson This Is It"), null);
});

test("dossier grouping keeps conflicts apart and hides non-video files", () => {
  const shelf = groupDossiersForArtist(
    [
      {
        id: "MD1",
        identity: { labelArtist: "Madonna", labelTitle: "Like a Virgin", features: ["Nile Rodgers"] },
        paths: ["/Users/bobhopp/DJ MEDIA/VIDEO/1980's/Madonna - Like a Virgin.mp4"],
        rvtr: "RVTR111111",
      },
      {
        id: "MD2",
        identity: { labelArtist: "Madonna", labelTitle: "Like a Virgin" },
        paths: ["/Users/bobhopp/DJ MEDIA/VIDEO/1980's/Madonna - Like a Virgin (alt).mp4"],
        pathCount: 2,
        packageLie: true,
      },
      {
        id: "UNL-9",
        identity: { labelArtist: "Madonna", labelTitle: "Holiday" },
        paths: ["/Users/bobhopp/DJ MEDIA/VIDEO/1980's/Madonna - Holiday.mp4"],
        doNotWriteToVdj: true,
      },
      {
        id: "MD4",
        identity: { labelArtist: "Madonna feat. Justin Timberlake", labelTitle: "4 Minutes" },
        paths: ["/Users/bobhopp/DJ MEDIA/AUDIO/Madonna - 4 Minutes.mp3"],
      },
      {
        id: "MD5",
        identity: { labelArtist: "Justin Timberlake feat. Madonna", labelTitle: "4 Minutes" },
        paths: ["/Users/bobhopp/DJ MEDIA/VIDEO/2000's/4 Minutes.mp4"],
      },
    ],
    "Madonna",
  );

  assert.deepEqual(
    shelf.songs.map((song) => song.title),
    ["Like a Virgin", "Like a Virgin", "Holiday", "4 Minutes"],
  );
  assert.equal(shelf.songs[0]?.vdjIdentity, true);
  assert.equal(shelf.songs[0]?.trackHref, "/retroverse-2/song/RVTR111111");
  assert.equal(shelf.songs[2]?.vdjIdentity, false);
  assert.equal(shelf.songs[2]?.inCollection, true);
  assert.equal(shelf.songs[3]?.inCollection, false);
  assert.equal(shelf.collectionCount, 3);
});

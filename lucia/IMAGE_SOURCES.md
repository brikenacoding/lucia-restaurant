# Image sources

Every photograph in this project is a real photograph sourced from **Pexels**. None of it is
AI-generated. Nothing was taken from a restaurant's own website.

**License — Pexels License** (<https://www.pexels.com/license/>): free to use for commercial and
non-commercial purposes, no permission needed, attribution not required. Photographers are credited
here anyway, as a matter of practice.

**How the images are loaded.** The site references the Pexels image CDN directly
(`https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg?...`) with a `srcset` of width
variants, which is a delivery method Pexels supports. If you would rather serve the files yourself,
run `tools/fetch-images.sh` — it downloads every photograph below into `assets/img/{key}.jpg`.
Then set `USE_LOCAL = true` at the top of `assets/js/images.js` and the whole site switches over.
Doing that also gives the PDF its photography: `tools/build_pdf.py` places images from `assets/img/`
automatically wherever a photo slot exists, and simply sets those pages typographically if the
folder is empty.

| Key / local filename | Photographer | Source page | Used in |
| --- | --- | --- | --- |
| `heroRoom.jpg` | Jonathan Borba | https://www.pexels.com/photo/28059309/ | Homepage hero; PDF cover plate |
| `roomBar.jpg` | Rachel Claire | https://www.pexels.com/photo/5863513/ | Homepage “the room”; The Table gallery |
| `roomWarm.jpg` | Amine | https://www.pexels.com/photo/9371714/ | Homepage editorial stack; The Table gallery; Visit page hero |
| `roomNight.jpg` | Ahsen | https://www.pexels.com/photo/11279651/ | The Table gallery; Visit page full-bleed parallax |
| `roomClassic.jpg` | Rene Terp | https://www.pexels.com/photo/2504911/ | The Table page hero |
| `roomStylish.jpg` | Maria Orlova | https://www.pexels.com/photo/4913313/ | The Table gallery |
| `fireChef.jpg` | Helmy Zairy | https://www.pexels.com/photo/7205249/ | Homepage editorial stack; Our Table page hero |
| `fireGrill.jpg` | Malte Luk | https://www.pexels.com/photo/1233101/ | Menu — From the Fire section opener; The Table gallery; PDF page 6 slot |
| `kitchen.jpg` | Emil Lazarian | https://www.pexels.com/photo/5251019/ | Our Table page; The Table gallery; Visit page; PDF slot |
| `seafoodGrill.jpg` | Yan Stavchansky | https://www.pexels.com/photo/4571250/ | Our Table page; Menu — From the Sea opener |
| `tableSetting.jpg` | Burak The Weekender | https://www.pexels.com/photo/735869/ | Homepage editorial stack; The Table gallery |
| `napkin.jpg` | wutthichai charoenburi | https://www.pexels.com/photo/19921112/ | Our Table page; The Table gallery |
| `espresso.jpg` | Eva Belšánová Langrová | https://www.pexels.com/photo/30384438/ | Menu — Coffee & Tea opener; The Table gallery |
| `winePour.jpg` | cottonbro studio | https://www.pexels.com/photo/4691211/ | Homepage wine teaser; The Table gallery; Wine page hero |
| `negroni.jpg` | Isabella Mendes | https://www.pexels.com/photo/1304540/ | Menu — Aperitivi section opener |
| `sea.jpg` | Anna S | https://www.pexels.com/photo/29837765/ | Homepage full-bleed parallax; Menu page hero; Our Table page; PDF slot |
| `seaRocks.jpg` | Serhii Panasiuk | https://www.pexels.com/photo/23962081/ | Our Table full-bleed parallax |
| `octopus.jpg` | Alex Favali | https://www.pexels.com/photo/921361/ | Signature dish — Charred Octopus (homepage feature, menu feature, modal) |
| `octopusPlate.jpg` | Toni Canaj | https://www.pexels.com/photo/14885388/ | Menu — Small Plates |
| `burrata.jpg` | Nadin Sh | https://www.pexels.com/photo/26833230/ | Menu — Small Plates; The Table gallery |
| `mezze.jpg` | Karolina Grabowska | https://www.pexels.com/photo/5944/ | Menu — Antipasti opener; Our Table page; PDF page 3 slot |
| `caprese.jpg` | Nano Erdozain | https://www.pexels.com/photo/28841111/ | Menu — Antipasti |
| `pastaPesto.jpg` | Daniele Sgura | https://www.pexels.com/photo/4162492/ | Signature dish — Lemon Ricotta Ravioli feature; PDF page 4 slot |
| `pastaMush.jpg` | Engin Akyurt | https://www.pexels.com/photo/3214160/ | Menu — Pasta & Grains |
| `pastaMarble.jpg` | Polina Tankilevitch | https://www.pexels.com/photo/4518879/ | Menu — Pasta & Grains opener |
| `fishFine.jpg` | cottonbro studio | https://www.pexels.com/photo/6839650/ | Signature dish — Charred Sea Bass feature; PDF page 5 slot |
| `fishWhole.jpg` | Cristian Mihaila | https://www.pexels.com/photo/11653557/ | Menu — From the Sea |
| `prawns.jpg` | Kristina Paukshtite | https://www.pexels.com/photo/1998920/ | Menu — From the Sea |
| `vegetables.jpg` | Markus Winkler | https://www.pexels.com/photo/19856566/ | Menu — From the Fire |
| `cakeCitrus.jpg` | Pouyan Moujoodi | https://www.pexels.com/photo/15526782/ | Signature dish — Olive Oil Cake feature (homepage + menu) |
| `cakePistachio.jpg` | Razane Adra | https://www.pexels.com/photo/13715795/ | Menu — Desserts opener |
| `cakeChoc.jpg` | Sylwester Ficek | https://www.pexels.com/photo/30128890/ | Menu — Desserts |
| `cheeseBoard.jpg` | Polina Tankilevitch | https://www.pexels.com/photo/4187783/ | Menu — Cheese opener; The Table gallery |

### Alt text

Every image carries descriptive alt text, written per-image in the `IMG` manifest in
`assets/js/images.js`, so the manifest is the single place to edit both the source and its
description.

### If an image fails to load

The site degrades gracefully: `guardImages()` in `assets/js/app.js` replaces any image that fails
to load with a designed tonal plate carrying the monogram, so a dropped connection never produces a
broken-image icon in the middle of an editorial layout.

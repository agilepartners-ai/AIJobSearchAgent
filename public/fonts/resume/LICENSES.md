# Resume preview fonts

Subset `woff2` files built from the font packages in TeX Live 2025, the release Texapi uses to
compile PDFs, so the in-browser preview uses the same glyph metrics as the exported PDF.

Each file keeps its original `name` table, which carries the copyright and licence notice below.
Subsetting keeps Latin, Latin-1, Latin Extended-A and a few punctuation marks (see
`src/lib/resume/text.ts`); no glyph outlines were modified.

| Folder | Family | Version | Licence | Copyright |
|---|---|---|---|---|
| `alegreya` | Alegreya | Version 2.008 | [OFL-1.1](https://scripts.sil.org/OFL) | Copyright 2011 The Alegreya Project Authors (https://github.com/huertatipografica/Alegreya) |
| `ebgaramond` | EB Garamond | Version 1.001 | [OFL-1.1](https://scripts.sil.org/OFL) | Copyright 2017 The EB Garamond Project Authors (https://github.com/octaviopardo/EBGaramond12) |
| `inter` | Inter | Version 4.000 | [OFL-1.1](https://scripts.sil.org/OFL) | Copyright 2016 The Inter Project Authors |
| `lato` | Lato | Version 2.015 | [OFL-1.1](https://scripts.sil.org/OFL) | Copyright (c) 2011-2015 by tyPoland Lukasz Dziedzic (http://www.typoland.com/) with Reserved Font Name "Lato". Licensed under the SIL Open Font License, Version 1.1 (http://scripts.sil.org/OFL). |
| `merriweather` | Merriweather | Version 2.100 | [OFL-1.1](https://scripts.sil.org/OFL) | Copyright 2020 The Merriweather Project Authors (https://github.com/SorkinType/Merriweather/), with Reserved Font Name "Merriweather". |
| `nunito` | Nunito | Version 3.601 | [OFL-1.1](https://scripts.sil.org/OFL) | Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito) |
| `opensans` | Open Sans | Version 1.10 | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | Digitized data copyright © 2010-2011, Google Corporation. |
| `plexsans` | IBM Plex Sans | Version 3.005 | [OFL-1.1](https://scripts.sil.org/OFL) | Copyright 2018 IBM Corp. All rights reserved. |
| `raleway` | Raleway | Version 4.101 | [OFL-1.1](https://scripts.sil.org/OFL) | Copyright 2010-2020 The Raleway Project Authors with Reserved Font Name "Raleway". |
| `roboto` | Roboto | Version 2.001101 | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | Copyright 2011 Google Inc. All Rights Reserved. |
| `sourcesans` | Source Sans Pro | Version 3.006 | [OFL-1.1](https://scripts.sil.org/OFL) | © 2010 - 2019 Adobe Systems Incorporated (http://www.adobe.com/), with Reserved Font Name ‘Source’. |
| `sourceserif` | Source Serif Pro | Version 2.007 | [OFL-1.1](https://scripts.sil.org/OFL) | © 2014 - 2018 Adobe Systems Incorporated (http://www.adobe.com/), with Reserved Font Name ‘Source’. |

Regenerate with the TeX Live 2025 image; see `docs/RESUME_EDITOR_PLAN.md` (font registry).

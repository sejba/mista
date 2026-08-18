# Mista



Mapová PWA aplikace pro iPhone — načítá zajímavá místa z CSV souboru v pCloud, zobrazí je na mapě a umožní přidávat nová místa lokálně s exportem CSV zpět do pCloud.



## Funkce



- Interaktivní mapa (Leaflet) s piny z GPS sloupce CSV

- Filtry podle **Tagy** a **Status**

- Detail místa s tlačítkem **Navigovat** (Apple Maps)

- Přidání nového místa (FAB +) s GPS z polohy nebo výběrem na mapě

- Synchronizace CSV: **čtení** přes pCloud Direct Link, **zápis** lokálně + export CSV



## Technologie



- HTML5, Tailwind CSS (CDN), vanilla JavaScript (ES modules)

- Leaflet + Mapy.cz tiles (volitelný API klíč) nebo OpenStreetMap fallback

- Žádný build proces — statické soubory



## Struktura



```

mista/

├── index.html

├── css/styles.css

├── js/

│   ├── app.js

│   ├── csv.js

│   ├── pcloud.js

│   ├── storage.js

│   ├── map.js

│   ├── filters.js

│   ├── ui.js

│   └── config.js

├── manifest.json

├── icons/

└── README.md

```



## Formát CSV



Tabulátor nebo čárka jako oddělovač. Sloupce:



| Název | GPS | Poznámka | Tagy | Status |

|-------|-----|----------|------|--------|

| Karlův most | 50.0865, 14.4114 | ... | památka | Chci navštívit |



GPS: `50.08, 14.42` nebo `50.08 14.42` nebo `50.08;14.42`



## Lokální spuštění



```bash

cd mista

npx http-server -p 8080

```



Otevřete `http://localhost:8080`.



## Nastavení pCloud (čtení CSV)



1. V aplikaci pCloud na iPhonu otevřete CSV soubor

2. Sdílet → **Share link** (typicky `https://e.pcloud.link/publink/show?code=...`)

3. Zkopírujte URL a vložte do nastavení aplikace

**Share link vs Direct link:** běžný **Share link** otevírá náhledovou stránku pCloud — appka ho umí načíst automaticky. **Direct link** (surový soubor) je k dispozici jen ze [Public Folder](https://help.pcloud.com/article/public-folder) (Premium).



OAuth ani schvalování pCloud appky **nepotřebujete** — zápis probíhá přes export CSV.



## Hybridní synchronizace (read + export)



1. **Načtení:** aplikace stáhne CSV z pCloud Direct Linku

2. **Nová místa:** ukládají se lokálně v prohlížeči (localStorage)

3. **Export:** v nastavení klepněte **Exportovat CSV** — stáhne se soubor se všemi místy (pCloud + lokální)

4. **Upload:** v pCloud appce nahraďte původní CSV exportovaným souborem

5. **Obnovení:** klepněte **Načíst CSV znovu**, pak **Vymazat lokální místa** (aby se nezdvojovala)



Na iPhonu export využije sdílení (Share sheet), takže soubor uložíte do Files nebo rovnou do pCloud.



## Mapy.cz API klíč (volitelné)



1. Registrace na [developer.mapy.com](https://developer.mapy.com)

2. Vytvoření API klíče

3. Vložení do nastavení aplikace



Bez klíče se použije OpenStreetMap.



## Použití na iPhone



1. Nasazete aplikaci na GitHub Pages (viz Deploy)

2. Nastavíte CSV Direct Link

3. Otevřete v Safari

4. Sdílet → **Přidat na plochu**



## Deploy (GitHub Pages)



1. Public repo `mista` na GitHubu

2. **Settings → Pages** → Deploy from branch `master`, folder `/ (root)`

3. Appka běží na `https://sejba.github.io/mista/`

4. Každý `git push` automaticky nasadí novou verzi



## Verzování

Verze aplikace je v `js/config.js`. Stejné číslo je v query parametrech u skriptů a CSS (`?v=1.1.4`) kvůli cache bustingu — zejména na iPhonu v PWA, kde Safari jinak drží staré JS moduly.

Formát **x.y.z** (semver):

| Část | Kdy zvednout | Příklad |
|------|----------------|---------|
| **x** (major) | Ne kompatibilní změna (formát CSV, sync workflow) | `2.0.0` |
| **y** (minor) | Nová funkce, zpětně kompatibilní | `1.2.0` |
| **z** (patch) | Opravy, kosmetika, export | `1.1.5` |

Po každém deployi, který chceš mít jistě na telefonu, zvedni **patch** a sjednoť číslo v `config.js`, `index.html` (`app.js`, `styles.css`) a importech v `js/*.js` (`?v=…`).

Verzi uvidíš v nastavení v panelu **Diagnostika načtení**.

## Licence



Soukromý projekt.


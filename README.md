# Mista

Mapová PWA aplikace pro iPhone — načítá zajímavá místa z CSV souboru v pCloud, zobrazí je na mapě a umožní přidávat nová místa zpět do CSV přes pCloud API.

## Funkce

- Interaktivní mapa (Leaflet) s piny z GPS sloupce CSV
- Filtry podle **Tagy** a **Status**
- Detail místa s tlačítkem **Navigovat** (Apple Maps)
- Přidání nového místa (FAB +) s GPS z polohy nebo výběrem na mapě
- Synchronizace CSV: čtení přes **Direct Link**, zápis přes **pCloud API**

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

Otevřete `http://localhost:8080` (OAuth redirect URI musí odpovídat této URL).

## Nastavení pCloud

### 1. CSV Direct Link (čtení)

1. V aplikaci pCloud na iPhonu otevřete CSV soubor
2. Sdílet → **Direct link** (nebo „Odkaz ke stažení“)
3. Zkopírujte URL a vložte do nastavení aplikace jako **CSV Direct Link URL**

### 2. OAuth aplikace (zápis)

1. Přihlaste se na [my.pcloud.com](https://my.pcloud.com)
2. Vytvořte OAuth2 aplikaci
3. Nastavte **Redirect URI** — musí přesně odpovídat URL nasazené aplikace, např.:
   - `http://localhost:8080/` (lokální dev)
   - `https://<user>.github.io/mista/` (GitHub Pages)
4. Zkopírujte **Client ID** do nastavení aplikace
5. Klepněte **Připojit pCloud** a autorizujte

### 3. Folder ID

ID složky v pCloud, kde leží CSV soubor. Získáte např.:

- Z URL při prohlížení složky v pCloud webu
- Voláním API `listfolder` s access tokenem

### 4. Upload CSV

Při přidání místa aplikace serializuje celý CSV a nahraje ho přes `uploadfile` do zadané složky (soubor se přepíše stejným názvem).

**Poznámka:** Pokud upload z prohlížeče selže kvůli CORS, bude potřeba serverless proxy (např. Netlify Function).

## Mapy.cz API klíč (volitelné)

1. Registrace na [developer.mapy.com](https://developer.mapy.com)
2. Vytvoření API klíče
3. Vložení do nastavení aplikace

Bez klíče se použije OpenStreetMap.

## Použití na iPhone

1. Nasazete aplikaci na GitHub Pages (viz Deploy)
2. Nastavíte CSV Direct Link a připojíte pCloud
3. Otevřete v Safari
4. Sdílet → **Přidat na plochu**

## Deploy (GitHub Pages)

1. Public repo `mista` na GitHubu
2. **Settings → Pages** → Deploy from branch `main`, folder `/ (root)`
3. Appka běží na `https://<user>.github.io/mista/`
4. Každý `git push` automaticky nasadí novou verzi

## OAuth redirect URI

| Prostředí | Redirect URI |
|-----------|--------------|
| Lokální | `http://localhost:8080/` |
| GitHub Pages | `https://<user>.github.io/mista/` |

URI musí končit stejně jako v pCloud OAuth nastavení (včetně `/`).

## Licence

Soukromý projekt.

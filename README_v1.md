# MCP LAN-test

Vi tester, om **én MCP-server på MIKC's PC** kan bruges af **Lektor Hansen og András fra deres egne PC'er** over et lokalt Wi-Fi.

Målet er at vise, at flere klienter kan bruge den samme MCP-server til at læse og ændre den samme `shared.txt` – uden at filen deles som et almindeligt Windows-share.

## Hvad tester vi?

```text
       Lektor Hansen ──┐
                       │
András ────────────────┼──> Wi-Fi: AIgutterne
                       │
                       └──> MIKC's PC :3001
                                │
                              Docker
                                │
                           MCP-server
                                │
                           shared.txt
```

Hvis testen virker, har vi vist at:

- MCP-serveren kan køre centralt på én PC.
- flere klienter kan forbinde til den samme MCP-server.
- klienterne kan læse og ændre den samme fil gennem MCP.
- klienterne ikke behøver Docker eller direkte adgang til MIKC's filsystem.
- Copilot eller en anden AI-klient efterfølgende kan bruge de samme MCP-tools.

## MIKC – server

MIKC's PC kører Docker og MCP-serveren.

### 1. Forbind til Wi-Fi

Forbind MIKC's PC til:

```text
AIgutterne
```

Find derefter IP-adressen:

```powershell
ipconfig
```

Eksempel:

```text
192.168.8.100
```

### 2. Konfigurer `.env`

```env
MCP_TOKEN=min-hemmelige-lan-token
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.8.100
```

Brug den IP-adresse, MIKC faktisk får fra routeren.

### 3. Start MCP-serveren i Docker

```powershell
docker compose down
docker compose up --build -d
```

Kontroller:

```powershell
docker compose ps
```

Der skal gerne stå noget med:

```text
0.0.0.0:3001->3000/tcp
```

### 4. Test serveren

```powershell
curl.exe http://127.0.0.1:3001/health
```

Forventet:

```json
{"status":"ok"}
```

Test derefter via LAN-IP'en:

```powershell
curl.exe http://192.168.8.100:3001/health
```

## Mikkel Lektor Hansen og András – klienter

De skal **ikke** køre MCP-serveren og derfor **ikke køre**:

```powershell
npm start
```

Det er kun MIKC, der kører serveren.

Inden testen skal de have:

```powershell
git clone https://github.com/krollchristensen/mcp-lan-file-server_mhan_anac.git
cd mcp-lan-file-server_mhan_anac
npm install
```

De behøver ikke Docker.

### 1. Forbind til samme Wi-Fi

Forbind til:

```text
AIgutterne
```

### 2. Test forbindelsen til MIKC

Hvis MIKC fx har IP `192.168.8.100`:

```powershell
Test-NetConnection 192.168.8.100 -Port 3001
```

Vi vil gerne se:

```text
TcpTestSucceeded : True
```

### 3. Kør MCP-klienten

```powershell
$env:MCP_URL="http://192.168.8.100:3001/mcp"
$env:MCP_TOKEN="min-hemmelige-lan-token"
npm run client
```

Klienten vil:

1. forbinde til MCP-serveren
2. vise de MCP-tools serveren tilbyder
3. læse `shared.txt`
4. tilføje en linje
5. læse filen igen

## Selve testen

Kør testen i denne rækkefølge:

1. MIKC starter Docker og tester `/health`.
2. Lektor Hansen forbinder og kører `npm run client`.
3. MIKC åbner `shared/shared.txt` og ser ændringen.
4. András kører `npm run client`.
5. András bør kunne læse Mikkel Lektor Hansens ændring og tilføje sin egen.
6. MIKC kontrollerer, at begge ændringer står i samme `shared.txt`.

Resultatet bør ligne:

```text
Mikkel Lektor Hansen ──┐
                       ├── MCP-server i Docker ── shared.txt
András ────────────────┘
```

## Test med Copilot

Når `npm run client` virker fra begge PC'er, kan vi prøve med Copilot som MCP-klient.

På MIKC's PC bruges:

```text
http://127.0.0.1:3001/mcp
```

På Mikkel Lektor Hansens og András' PC'er bruges:

```text
http://<MIKC-IP>:3001/mcp
```

Eksempel:

```text
http://192.168.8.100:3001/mcp
```

Målet er derefter at bede Copilot om fx:

```text
Læs den delte tekstfil gennem MCP.
```

og:

```text
Tilføj "Hej fra Copilot" til den delte tekstfil gennem MCP.
```

## Hvad gør Docker?

Docker kører selve MCP-serveren isoleret.

Serveren ser filen som:

```text
/data/shared.txt
```

men Docker mapper den til:

```text
./shared/shared.txt
```

på MIKC's PC.

Det betyder, at klienterne aldrig får direkte adgang til filen. De kalder kun MCP-serverens tools, og MCP-serveren læser eller skriver filen for dem.

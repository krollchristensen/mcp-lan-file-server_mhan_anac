# MCP LAN file server med Docker

Dette projekt viser, hvordan en **MCP-server kan køre i Docker** og give AI-agenter adgang til en tekstfil på værtscomputeren.

MCP-serveren kan bruges af:

* en lokal MCP-klient
* en AI-agent på samme computer
* AI-agenter på andre computere på det samme lokale netværk

Alle klienter arbejder gennem den samme MCP-server og dermed med den samme tekstfil.

---

# Formål

Eksemplet viser fire ting:

1. Hvordan en MCP-server kan køre i Docker.
2. Hvordan Docker kan få adgang til en fil på værtscomputeren.
3. Hvordan MCP-serveren kan tilgås via HTTP.
4. Hvordan flere AI-agenter kan arbejde med den samme fil.

Arkitekturen ser sådan ud:

```mermaid
flowchart LR
    A["AI-agent<br>Computer A"]
    B["AI-agent<br>Computer B"]
    C["MCP testklient<br>Computer C"]

    subgraph HOST["Computer med Docker"]
        D["Docker container"]
        M["MCP-server<br>port 3000 internt"]
        F["shared.txt<br>på værtscomputeren"]

        D --> M
        M -->|"læser/skriver"| F
    end

    A -->|"MCP HTTP<br>port 3001"| M
    B -->|"MCP HTTP<br>port 3001"| M
    C -->|"MCP HTTP<br>port 3001"| M
```

På værtscomputeren bruger vi port:

```text
3001
```

Inde i Docker-containeren bruger MCP-serveren stadig:

```text
3000
```

Docker videresender derfor:

```text
Computer:3001
      ↓
Docker:3000
      ↓
MCP-server
```

---

# Projektstruktur

```text
mcp-lan-file-server/
├── src/
│   ├── server.js
│   └── test-client.js
│
├── shared/
│   └── shared.txt
│
├── Dockerfile
├── docker-compose.yml
├── .env
├── .env.example
├── package.json
└── README.md
```

---

# Hvad kan MCP-serveren?

Serveren giver MCP-klienter adgang til en tekstfil.

Den har blandt andet disse tools:

```text
read_text_file
write_text_file
append_text_file
```

Eksempel:

En AI-agent kan spørge:

```text
Læs indholdet af den delte tekstfil.
```

Agenten kan derefter bruge:

```text
read_text_file
```

Den kan også få besked på:

```text
Tilføj "Hej fra computer 2" til filen.
```

Så kan agenten bruge:

```text
append_text_file
```

---

# Den delte fil

Filen ligger i:

```text
shared/shared.txt
```

Det vigtige er, at filen ligger på **værtscomputeren**.

Den ligger ikke permanent inde i Docker-containeren.

Docker får adgang til mappen gennem et volume.

---

# Hvad gør Docker?

Docker bruges til at isolere og afvikle MCP-serveren.

MCP-serveren får sit eget miljø med:

* Node.js
* MCP SDK
* projektets dependencies
* MCP-serverens kode

Det betyder, at andre computere ikke behøver at have MCP-serverens kode eller dependencies installeret.

De skal kun kunne kontakte MCP-serveren over netværket.

```mermaid
flowchart TD
    H["Windows-computer"]

    subgraph D["Docker"]
        N["Node.js"]
        S["MCP-server"]
        N --> S
    end

    F["shared/shared.txt"]

    H --> D
    S -->|"Docker volume"| F
```

Docker-containeren kan altså slettes og oprettes igen, uden at tekstfilen nødvendigvis forsvinder.

---

# Docker volume

I `docker-compose.yml` bruges:

```yaml
volumes:
  - ./shared:/data
```

Det betyder:

```text
På Windows                   Inde i Docker

./shared/                    /data/
    │                           │
    └── shared.txt  <---------- ┘
```

MCP-serveren arbejder eksempelvis med:

```text
/data/shared.txt
```

Men den virkelige fil ligger på computeren:

```text
mcp-lan-file-server/shared/shared.txt
```

Hvis en AI-agent ændrer filen via MCP, kan du derfor åbne `shared.txt` direkte i WebStorm eller Windows og se ændringen.

---

# Hvorfor Docker?

Vi kunne godt starte MCP-serveren direkte med:

```bash
node src/server.js
```

Docker giver dog nogle interessante fordele.

MCP-serveren bliver pakket sammen med:

```text
Node.js
+
dependencies
+
serverkode
+
konfiguration
```

Det giver denne arkitektur:

```mermaid
flowchart LR
    A["Windows"]
    B["Docker"]
    C["MCP-server"]
    D["shared.txt"]

    A --> B
    B --> C
    C --> D
```

Man kan derfor flytte MCP-serveren til en anden maskine med Docker uden først manuelt at installere hele miljøet.

---

# Konfiguration

Opret en fil:

```text
.env
```

Eksempel:

```env
MCP_TOKEN=min-hemmelige-lan-token
ALLOWED_HOSTS=localhost,127.0.0.1
```

Senere, når serveren skal bruges fra andre computere, tilføjer vi computerens lokale IP-adresse.

Eksempel:

```env
MCP_TOKEN=min-hemmelige-lan-token
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.0.37
```

IP-adressen `192.168.0.37` er kun et eksempel.

---

# Docker Compose

I `docker-compose.yml` skal port-konfigurationen være:

```yaml
ports:
  - "3001:3000"
```

Det betyder:

```text
Windows port 3001
        ↓
Docker port 3000
        ↓
MCP-server
```

---

# Start serveren

Sørg først for, at Docker Desktop kører.

Åbn derefter terminalen i projektets rod:

```powershell
docker compose up --build
```

Docker bygger nu imaget og starter MCP-serveren.

Du bør se noget i retning af:

```text
MCP server started
```

---

# Start serveren i baggrunden

Hvis du ikke ønsker at have terminalen åben:

```powershell
docker compose up --build -d
```

`-d` betyder:

```text
detached
```

Containeren kører dermed i baggrunden.

---

# Kontroller Docker-containeren

Kør:

```powershell
docker compose ps
```

Du bør se noget i retning af:

```text
NAME                  STATUS       PORTS
mcp-lan-file-server   Up           0.0.0.0:3001->3000/tcp
```

Det vigtigste er:

```text
3001->3000
```

Det betyder, at port 3001 på computeren videresendes til port 3000 i Docker.

---

# Test serveren

Inden vi tester MCP, tester vi først almindelig HTTP.

Kør:

```powershell
curl.exe http://127.0.0.1:3001/health
```

Serveren bør svare:

```json
{
  "status": "ok"
}
```

Hvis dette virker, ved vi:

```text
Windows
   │
   │ port 3001
   ↓
Docker
   │
   │ port 3000
   ↓
MCP-server
```

---

# Test MCP-klienten

Sæt først adressen til MCP-serveren:

```powershell
$env:MCP_URL="http://127.0.0.1:3001/mcp"
```

Sæt derefter token:

```powershell
$env:MCP_TOKEN="min-hemmelige-lan-token"
```

Start klienten:

```powershell
npm run client
```

Klienten forbinder nu til:

```text
http://127.0.0.1:3001/mcp
```

---

# Kommunikation mellem klient og server

```mermaid
sequenceDiagram
    participant C as MCP-klient
    participant D as Docker
    participant M as MCP-server
    participant F as shared.txt

    C->>D: HTTP port 3001
    D->>M: videresend til port 3000

    C->>M: read_text_file
    M->>F: readFile()
    F-->>M: filens indhold
    M-->>C: MCP-resultat

    C->>M: append_text_file("Hej")
    M->>F: appendFile("Hej")
    M-->>C: OK
```

---

# Find computerens IP-adresse

Hvis andre computere på netværket skal bruge MCP-serveren, skal de kende IP-adressen på computeren, hvor Docker kører.

Kør:

```powershell
ipconfig
```

Find den aktive Wi-Fi- eller Ethernet-forbindelse.

Eksempel:

```text
IPv4 Address . . . . . . . . . . : 192.168.0.37
```

MCP-serveren vil så kunne tilgås på:

```text
http://192.168.0.37:3001/mcp
```

---

# Opdater .env

Tilføj IP-adressen:

```env
MCP_TOKEN=min-hemmelige-lan-token
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.0.37
```

Genstart Docker:

```powershell
docker compose down
docker compose up --build
```

---

# Test med computerens netværksadresse

På samme computer kan du nu prøve:

```powershell
curl.exe http://192.168.0.37:3001/health
```

Hvis serveren svarer:

```json
{
  "status": "ok"
}
```

er næste trin at teste fra en anden computer.

---

# Test fra en anden computer

Computer 2 skal være på samme lokale netværk.

Test først forbindelsen:

```powershell
Test-NetConnection 192.168.0.37 -Port 3001
```

Du ønsker:

```text
TcpTestSucceeded : True
```

Hvis den viser:

```text
TcpTestSucceeded : False
```

kan Windows Firewall blokere forbindelsen.

---

# Kør MCP-klienten fra computer 2

På computer 2:

```powershell
$env:MCP_URL="http://192.168.0.37:3001/mcp"
$env:MCP_TOKEN="min-hemmelige-lan-token"

npm run client
```

Computer 2 kommunikerer nu med MCP-serveren, der kører i Docker på computer 1.

```mermaid
flowchart LR
    C1["Computer 1<br>192.168.0.37"]

    subgraph C1
        D["Docker"]
        M["MCP-server"]
        F["shared.txt"]

        D --> M
        M --> F
    end

    C2["Computer 2<br>MCP-klient"]

    C2 -->|"192.168.0.37:3001"| M
```

---

# Flere AI-agenter

En af de vigtigste pointer med dette eksempel er, at MCP-serveren ikke kun kan bruges af én klient.

Flere MCP-klienter eller AI-agenter kan kontakte samme server.

```mermaid
flowchart LR
    A["AI-agent A"]
    B["AI-agent B"]
    C["AI-agent C"]

    M["MCP-server<br>Docker"]

    F["shared.txt"]

    A -->|"MCP"| M
    B -->|"MCP"| M
    C -->|"MCP"| M

    M --> F
```

Alle tre arbejder dermed mod:

```text
den samme MCP-server
```

og:

```text
den samme shared.txt
```

---

# Bevis at flere klienter bruger samme fil

Man kan lave et simpelt eksperiment.

Start først MCP-serveren:

```powershell
docker compose up -d
```

## Klient 1

På computer 1:

```powershell
$env:MCP_URL="http://127.0.0.1:3001/mcp"
$env:MCP_TOKEN="min-hemmelige-lan-token"

npm run client
```

Lad eksempelvis klient 1 skrive:

```text
Hej fra computer 1
```

Filen indeholder nu:

```text
Hej fra computer 1
```

---

# Klient 2

På computer 2:

```powershell
$env:MCP_URL="http://192.168.0.37:3001/mcp"
$env:MCP_TOKEN="min-hemmelige-lan-token"

npm run client
```

Klient 2 kan nu læse:

```text
Hej fra computer 1
```

Klient 2 kan derefter tilføje:

```text
Hej fra computer 2
```

---

# Kontroller filen

Åbn:

```text
shared/shared.txt
```

på computer 1.

Nu bør den eksempelvis indeholde:

```text
Hej fra computer 1
Hej fra computer 2
```

Det viser:

```text
Computer 1
     │
     └────────┐
              ↓
         MCP-server
              │
              ↓
         shared.txt
              ↑
              │
     ┌────────┘
     │
Computer 2
```

Begge klienter har altså arbejdet med den samme fil gennem MCP.

---

# Eksempel med AI-agenter

Hvis en AI-agent understøtter en remote MCP-server, skal den forbindes til:

```text
http://192.168.0.37:3001/mcp
```

Konceptuelt kan konfigurationen ligne:

```json
{
  "mcpServers": {
    "shared-files": {
      "url": "http://192.168.0.37:3001/mcp",
      "headers": {
        "Authorization": "Bearer min-hemmelige-lan-token"
      }
    }
  }
}
```

Den præcise konfiguration afhænger af den MCP-klient eller AI-agent, der anvendes.

---

# Eksempel på to AI-agenter

AI-agent på computer 1:

```text
Læs den delte fil og tilføj:

Status fra agent A: Serveren virker.
```

AI-agent på computer 2:

```text
Læs den delte fil og tilføj:

Status fra agent B: Jeg kan også tilgå filen.
```

`shared.txt` kunne derefter indeholde:

```text
Status fra agent A: Serveren virker.
Status fra agent B: Jeg kan også tilgå filen.
```

Dermed har vi et konkret bevis på, at flere AI-agenter kan bruge samme MCP-server.

---

# Hvad sker der egentlig?

Når agenten siger:

```text
Læs shared.txt
```

sker der ikke dette:

```text
AI-agent → shared.txt
```

I stedet sker:

```mermaid
flowchart LR
    A["AI-agent"]
    M["MCP-server"]
    F["shared.txt"]

    A -->|"Kald MCP tool"| M
    M -->|"Node.js fs"| F
    F -->|"data"| M
    M -->|"MCP-resultat"| A
```

AI-agenten har altså ikke direkte adgang til filsystemet.

Det er **MCP-serveren**, der bestemmer, hvad agenten må gøre.

---

# Hvorfor er det vigtigt?

MCP-serveren fungerer som et kontrolleret lag mellem AI og systemet.

I dette eksempel må AI-agenten eksempelvis:

```text
læse shared.txt
skrive shared.txt
tilføje tekst til shared.txt
```

Men AI-agenten får ikke automatisk adgang til:

```text
C:\
Documents
Desktop
andre projekter
password-filer
hele filsystemet
```

Det er MCP-serveren, som bestemmer grænserne.

---

# MCP-serveren som fælles service

Vi kan derfor betragte MCP-serveren som en lille service:

```mermaid
flowchart TD
    A["AI-agent"]
    B["AI-agent"]
    C["AI-agent"]

    API["MCP-server"]

    D["Filer"]
    E["Database"]
    F["API"]
    G["Virksomhedssystem"]

    A --> API
    B --> API
    C --> API

    API --> D
    API --> E
    API --> F
    API --> G
```

I dette projekt bruger vi kun:

```text
shared.txt
```

Men samme princip kan senere bruges til:

* database
* GitHub
* REST API
* opgavestyring
* studieadministration
* interne systemer
* logfiler

---

# Hvorfor bruger vi ikke stdio?

En lokal MCP-server kan ofte startes med `stdio`.

Arkitekturen er typisk:

```text
AI-klient
   │
   └── starter MCP-serveren
             │
             └── stdio
```

Det fungerer godt, når serveren kun skal bruges på samme computer.

I dette projekt vil vi derimod have:

```text
Computer A
Computer B
Computer C
     │
     ↓
fælles MCP-server
```

Derfor bruger vi HTTP.

```mermaid
flowchart LR
    A["Computer A"]
    B["Computer B"]
    C["Computer C"]

    M["MCP-server<br>HTTP"]

    A --> M
    B --> M
    C --> M
```

---

# Samlet arkitektur

```mermaid
flowchart LR
    subgraph LAN["Lokalt netværk"]
        A["Computer A<br>AI-agent"]
        B["Computer B<br>AI-agent"]
        C["Computer C<br>AI-agent"]

        subgraph HOST["Servercomputer"]
            P["Port 3001"]

            subgraph DOCKER["Docker"]
                M["MCP-server<br>port 3000"]
            end

            F["shared/shared.txt"]

            P --> M
            M -->|"Docker volume"| F
        end

        A -->|"MCP HTTP"| P
        B -->|"MCP HTTP"| P
        C -->|"MCP HTTP"| P
    end
```

---

# Stop serveren

Hvis serveren kører i terminalen:

```text
Ctrl + C
```

Hvis den kører i baggrunden:

```powershell
docker compose down
```

---

# Se Docker logs

Hvis noget ikke virker:

```powershell
docker compose logs
```

Eller følg loggen løbende:

```powershell
docker compose logs -f
```

---

# Se aktive containere

```powershell
docker ps
```

Eller specifikt for projektet:

```powershell
docker compose ps
```

---

# Typiske fejl

## Port 3001 er allerede optaget

Hvis Docker viser:

```text
Bind for 0.0.0.0:3001 failed: port is already allocated
```

kan du undersøge porten:

```powershell
netstat -ano | findstr :3001
```

---

## Connection refused

Hvis klienten viser:

```text
ECONNREFUSED
```

er MCP-serveren sandsynligvis ikke startet.

Kontroller:

```powershell
docker compose ps
```

og:

```powershell
curl.exe http://127.0.0.1:3001/health
```

---

## Andre computere kan ikke forbinde

Test:

```powershell
Test-NetConnection 192.168.0.37 -Port 3001
```

Hvis:

```text
TcpTestSucceeded : False
```

kan problemet blandt andet være:

* Windows Firewall
* forkert IP-adresse
* computeren er på et andet netværk
* Docker-containeren kører ikke
* port 3001 er ikke eksponeret
* `ALLOWED_HOSTS` indeholder ikke serverens IP

---

# Forslag til eksperiment

## Eksperiment 1 – lokal klient

```text
MCP-klient
   ↓
localhost:3001
   ↓
Docker
   ↓
shared.txt
```

Bevis:

```text
Klienten kan læse og ændre filen.
```

## Eksperiment 2 – anden computer

```text
Computer 2
   ↓
192.168.x.x:3001
   ↓
Docker på computer 1
   ↓
shared.txt
```

Bevis:

```text
Computer 2 kan læse ændringer lavet på computer 1.
```

## Eksperiment 3 – to agenter

```text
Agent A ─┐
         ├── MCP-server ── shared.txt
Agent B ─┘
```

Lad agent A skrive:

```text
Jeg er agent A
```

Lad agent B læse filen.

Hvis agent B kan se:

```text
Jeg er agent A
```

har vi bevist, at begge agenter bruger den samme MCP-server og samme datakilde.

---

# Den centrale pointe

Docker giver os et isoleret miljø, hvor MCP-serveren kan køre.

Docker-volume giver MCP-serveren adgang til data på værtscomputeren.

HTTP gør MCP-serveren tilgængelig på netværket.

MCP bestemmer, hvilke handlinger AI-agenterne må udføre.

Det giver:

```text
AI-agent
    ↓
MCP
    ↓
Docker
    ↓
kontrolleret adgang
    ↓
shared.txt
```

Flere AI-agenter kan dermed bruge den samme MCP-server uden at få direkte adgang til værtscomputerens filsystem.

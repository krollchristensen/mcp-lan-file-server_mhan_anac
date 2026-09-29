# MCP LAN-test

## Hvad tester vi?

Vi tester, om én MCP-server kan køre i Docker på **MIKC's PC**, mens **Lektor Hansen** og **András** forbinder fra deres egne PC'er over et lokalt Wi-Fi og bruger den samme `shared.txt`.

Målet er at vise:

- at MCP-serveren ikke behøver køre på samme PC som klienten
- at flere klienter kan bruge den samme MCP-server
- at klienterne ikke får direkte adgang til MIKC's filsystem
- at GitHub Copilot kan bruge MCP-serverens tools
- at Docker giver MCP-serveren kontrolleret adgang til `shared.txt`

```mermaid
flowchart LR
    H["Mikkel Lektor Hansen<br>Copilot / MCP-klient"]
    A["András<br>Copilot / MCP-klient"]
    R["Wi-Fi: AIgutterne"]

    subgraph MIKC["MIKC's PC"]
        P["Port 3001"]
        D["Docker"]
        M["MCP-server<br>port 3000"]
        F["shared/shared.txt"]
        P --> D
        D --> M
        M --> F
    end

    H --> R
    A --> R
    R --> P
```

## Roller

### MIKC

MIKC har serveren og skal:

1. forbinde sin PC til Wi-Fi-netværket `AIgutterne`
2. starte Docker Desktop
3. finde sin IP-adresse med:

```powershell
ipconfig
```

4. sætte IP-adressen i `.env`, fx:

```env
MCP_TOKEN=min-hemmelige-lan-token
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.8.100
```

5. starte MCP-serveren:

```powershell
docker compose down
docker compose up --build -d
```

6. kontrollere at den kører:

```powershell
docker compose ps
```

Der skal stå noget i retning af:

```text
0.0.0.0:3001->3000/tcp
```

7. teste serveren:

```powershell
curl.exe http://127.0.0.1:3001/health
```

Forventet:

```json
{"status":"ok"}
```

### Vigtigt om `/mcp`

Hvis man åbner:

```text
http://127.0.0.1:3001/mcp
```

direkte i en browser, får man:

```json
{"error":"Unauthorized"}
```

Det er **forventet**.

Browseren sender ikke vores MCP-token i `Authorization`-headeren. Det viser faktisk, at MCP-serveren svarer, og at adgangskontrollen virker.

Brug derfor `/health` til den simple browsertest og MCP-klienten eller Copilot til selve MCP-testen.

### Lektor Hansen og András

De er klienter og skal **ikke** køre:

```powershell
npm start
```

Det ville forsøge at starte deres egen MCP-server.

De skal kun have:

- Node.js installeret
- projektet klonet
- kørt `npm install`
- deres IDE / Copilot klar

## Først: test med Node-klienten

Antag at MIKC får IP-adressen:

```text
192.168.8.100
```

På  Lektor Hansens og András' PC:

```powershell
Test-NetConnection 192.168.8.100 -Port 3001
```

Vi vil se:

```text
TcpTestSucceeded : True
```

Derefter:
kKlienttesten -> Den bruges før Copilot, så vi først beviser, at MCP-forbindelsen over LAN virker.

```powershell
$env:MCP_URL="http://192.168.8.100:3001/mcp"
$env:MCP_TOKEN="min-hemmelige-lan-token"

npm run client
```

Klienten læser `shared.txt`, skriver en linje og læser filen igen.

MIKC kan samtidig åbne:

```text
shared/shared.txt
```

og se ændringerne.

## MCP-konfiguration til Copilot

Når Node-klienten virker, tester vi GitHub Copilot eller anden agent.

### MIKC – lokal Copilot

På MIKC's PC:

```json
{
  "servers": {
    "lan-file-server": {
      "url": "http://127.0.0.1:3001/mcp",
      "requestInit": {
        "headers": {
          "Authorization": "Bearer min-hemmelige-lan-token"
        }
      }
    }
  }
}
```

### Lektor Hansen og András – Copilot over LAN

Begge bruger MIKC's IP-adresse:

```json
{
  "servers": {
    "lan-file-server": {
      "url": "http://192.168.8.100:3001/mcp",
      "requestInit": {
        "headers": {
          "Authorization": "Bearer min-hemmelige-lan-token"
        }
      }
    }
  }
}
```

Erstat `192.168.8.100` med MIKC's faktiske IP-adresse på `AIgutterne`.

I JetBrains åbnes Copilot Chat i **Agent mode**, derefter **Tools / Configure MCP server → Add MCP Tools**, og konfigurationen indsættes i `mcp.json`.

Copilot bør derefter kunne se:

```text
read_text_file
write_text_file
append_text_file
```

## Test med Copilot

På lektor Hansens PC:

```text
Brug MCP-serveren til at læse den delte tekstfil.
```

Derefter:

```text
Brug MCP-serveren til at tilføje:
"Hej fra lektor Hansens Copilot"
```

På András' PC:

```text
Læs den delte tekstfil gennem MCP og tilføj:
"Hej fra András' Copilot"
```

MIKC åbner derefter `shared/shared.txt`.

Hvis begge tekster står i filen, har vi vist:

```text
Mikkel Lektor Hansen ─┐
                      ├── MCP-server i Docker ── shared.txt
András ────────────────┘
```

## Hvad gør Docker?

Docker kører MCP-serveren isoleret.

Serveren ser filen som:

```text
/data/shared.txt
```

men `docker-compose.yml` mapper:

```yaml
volumes:
  - ./shared:/data
```

så den virkelige fil ligger på MIKC's PC:

```text
shared/shared.txt
```

Klienterne får derfor ikke direkte adgang til MIKC's filsystem. De kan kun gøre det, MCP-serverens tools tillader.

## Hvad kan vi konkludere?

Hvis testen virker, har vi vist:

- én MCP-server kan deles af flere klienter
- MCP kan bruges over et lokalt netværk
- Mikkel Lektor Hansen og András behøver ikke Docker
- klienterne behøver ikke direkte adgang til filen
- Docker kan give MCP-serveren kontrolleret adgang til lokale data
- Copilot kan bruge samme remote MCP-server som en almindelig MCP-klient

# Keep-Alive Architecture Diagrams

## Current State (The Problem)

```mermaid
flowchart TD
    subgraph Render["Render Free Tier"]
        R1["Self-ping timer<br/>(every 10 min)"] --> R2["GET /health"]
    end

    subgraph Backend["Express Backend"]
        R2 --> H["/health handler"]
        H --> S1["supabase.from('company_settings')<br/>.select('id')"]
        S1 --> SB["Supabase Query executed<br/>(every 10 min)"]
        K1["Supabase keep-alive timer<br/>(every 12h)"] --> S1
    end

    subgraph Supabase["Supabase Free Tier"]
        SB --> DB["PostgreSQL<br/>'company_settings' table"]
    end

    style Render fill:#ffcccc
    style Backend fill:#ffeebb
    style Supabase fill:#ccffcc

    note1["❗ Double-tax problem:<br/>Every Render ping also<br/>costs a Supabase query
    "]
```

---

## Proposed State (The Solution)

```mermaid
flowchart TD
    subgraph Request["Incoming Request"]
        direction LR
        REQ["Any API call<br/>(trips, orders, pricing)"] --> T["Update<br/>lastRequestTime"]
    end

    subgraph Render_Keepalive["Render Keep-Alive"]
        direction TB
        RT["Timer fires<br/>(every 10 min)"] --> RC{Idle > 10 min?}
        RC -->|Yes| RP["GET /ping"]
        RC -->|No <br/>(app active)| SKIP[" SKIP ✅"]
        RP --> R200["Return 200<br/>(no DB touch)"]
    end

    subgraph Supabase_Keepalive["Supabase Keep-Alive"]
        direction TB
        ST["Timer fires<br/>(every 12h)"] --> SC{Idle > 12h?}
        SC -->|Yes| SQ["Cheapest query:<br/>RPC select 1"]
        SC -->|No <br/>(recent traffic)| SUPSKIP[" SKIP ✅"]
        SQ --> SB["Supabase ping"]
    end

    T -.->|updates| RTIMER["shared lastRequestTime"]
    T -.->|updates| STIMER["shared lastRequestTime"]
    RTIMER -.-> RC
    STIMER -.-> SC

    style Request fill:#e1f5fe
    style Render_Keepalive fill:#ffcccc
    style Supabase_Keepalive fill:#ccffcc
```

---

## Request Lifecycle (Traffic-Aware Detail)

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Express
    participant Timer as Keep-Alive Timers
    participant Supabase

    Note over Client,Supabase: App is IDLE

    Timer->>+Timer: Render timer fires (10 min)
    Timer->>+Express: GET /ping
    Express-->>-Timer: 200 OK (no DB)
    Note right of Timer: Render stays warm ✅

    Timer->>+Timer: Supabase timer fires (12h)
    Timer->>+Express: RPC select 1
    Express->>+Supabase: execute RPC
    Supabase-->>-Express: 1 row
    Express-->>-Timer: 200 OK
    Note right of Timer: Supabase stays warm ✅

    Note over Client,Supabase: App is ACTIVE

    Client->>+Express: GET /trips
    Express->>Supabase: query trips
    Supabase-->>Express: data
    Express->>Express: update lastRequestTime
    Express-->>-Client: trips + profiles

    Note over Timer: Next timer fires...
    Timer->>+Timer: Check lastRequestTime
    Timer-->>Timer: Idle < threshold
    Note right of Timer: SKIP ✅<br/>No unnecessary work
```

---

## Key Changes Summary

| Component | Before | After |
|-----------|--------|-------|
| **Render ping** | `GET /health` (hits DB) | `GET /ping` (static 200) |
| **Render frequency** | Every 10 min (unconditional) | Every 10 min (only if idle) |
| **Supabase query** | `company_settings` select | RPC `select 1` (cheapest) |
| **Supabase frequency** | Every 12 h (unconditional) | Every 12 h (only if idle) |
| **Shared state** | None | `lastRequestTime` timestamp |

---

## Rate Math (Before vs After)

| Scenario | Render pings/day | Supabase queries/day | Notes |
|----------|------------------|----------------------|-------|
| **Before** (idle) | 144 | 144 + 2 = **146** | Every Render ping also hits Supabase |
| **Before** (active 8h) | 144 | 144 + 2 = **146** | No reduction during active hours |
| **After** (idle) | 144 | **2** | Only Supabase 12h timer fires |
| **After** (active 8h) | **~0** | **~0** | Traffic-aware skip saves everything |

> **Result**: During an 8-hour active day, both keep-alive systems reduce to near-zero work.

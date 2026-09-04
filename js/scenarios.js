window.OPS_SCENARIOS = {
  portal: {
    id: "portal",
    title: "SA retail portal — hybrid blast radius",
    spokenStart: "Run the Johannesburg retail portal incident.",
    azure: {
      source: "Azure Monitor / Service Health (simulated)",
      sev: "crit",
      title: "Azure Front Door — South Africa North degraded",
      fired: "2026-09-03 07:18 SAST",
      resource: "afd-retail-za / sa-north",
      signal: "Origin latency p95 2.4s (SLO 400ms). 5xx 6.8%. Health probe to origin-group portal-bff failing 4/4.",
      blast: "Customer checkout + account for ZA retail web and mobile."
    },
    onprem: {
      source: "HPE GreenLake / SNMP (simulated)",
      sev: "warn",
      title: "Uplink CRC + bond saturation — rack JHB-DC-A",
      fired: "2026-09-03 07:16 SAST",
      resource: "gl-jhb-a / chassis-3 / bond0 → PE-CORE-02",
      signal: "SNMP ifInErrors rising; bond0 98% util; iLO thermal normal. Same VLAN as Azure ExpressRoute private peering.",
      blast: "On-prem origin for portal-bff and session Redis."
    },
    context: {
      changeCalendar: "CAB freeze week (ZA retail promo). Next approved window: Sat 6 Sep 06:00–08:00 SAST. Emergency CAB available with VP infra + security.",
      lastDeploy: "portal-bff 1.14.2 via GitHub Actions → AKS (SA North) yesterday 22:10 SAST. Chart only; no network change.",
      similar: "INC-4412 (May 2026): AFD origin failures correlated with PE-CORE-02 optic flap. Fix: replace LR optic + dampen BFD. Recurrence risk medium."
    },
    window: {
      proposed: "Emergency 45-min window today 09:30–10:15 SAST",
      alt: "Standard CAB Sat 6 Sep 06:00–08:00 SAST",
      rationale: "Promo traffic already impacted; optic replacement is low-blast if we drain origin via AFD weighted routing first.",
      tz: "Africa/Johannesburg (SAST, UTC+2)"
    },
    ticket: {
      id: "CHG-88421",
      title: "Emergency: replace PE-CORE-02 LR optic + drain AFD origin portal-bff",
      severity: "SEV-2 hybrid",
      cmdb: "afd-retail-za, aks-za-prod, gl-jhb-a, pe-core-02, exprt-za-01"
    }
  },
  storage: {
    id: "storage",
    title: "Backup replication — Primera to Azure Storage",
    spokenStart: "Run the backup replication incident.",
    azure: {
      source: "Azure Service Health (simulated)",
      sev: "warn",
      title: "Storage — South Africa North elevated latency",
      fired: "2026-09-03 06:52 SAST",
      resource: "stzaarchiveprod / blob hot+cool",
      signal: "PutBlob p99 1.8s. Service Health: 'investigating storage latency SA North'. Private endpoint stzaarchiveprod-pe affected.",
      blast: "Nightly VM backup ingest + SQL log shipping to Azure."
    },
    onprem: {
      source: "HPE Primera / GreenLake (simulated)",
      sev: "crit",
      title: "Predictive disk failure — array PRM-JHB-01",
      fired: "2026-09-03 06:47 SAST",
      resource: "PRM-JHB-01 / cage 2 / SSD 19 (RAID-6)",
      signal: "SMART media errors + GreenLake 'replace within 24h'. Replication RPO to Azure stretching 14m → 47m.",
      blast: "Same backup fabric feeding Azure Blob via Data Box Gateway VM."
    },
    context: {
      changeCalendar: "Backup window nightly 22:00–02:00 SAST. Hardware replacement allowed with storage on-call; no freeze.",
      lastDeploy: "databox-gw appliance patch 1.8.3 last Tuesday. No array firmware change in 40 days.",
      similar: "INC-3901: Primera predictive fail without Azure latency — swap disk, RPO recovered in 12m. This one is dual-sided."
    },
    window: {
      proposed: "Hardware swap today 11:00–12:00 SAST (hot spare present)",
      alt: "If Azure advisory persists, pause log-ship 12:00–13:00 SAST and fail backups to on-prem vault only",
      rationale: "Disk is the local RPO driver; Azure latency is coincident but not the disk fault. Swap first, then re-evaluate cloud path.",
      tz: "Africa/Johannesburg (SAST, UTC+2)"
    },
    ticket: {
      id: "CHG-88430",
      title: "Replace PRM-JHB-01 SSD-19 + verify replication RPO to stzaarchiveprod",
      severity: "SEV-2 storage",
      cmdb: "prm-jhb-01, databox-gw-01, stzaarchiveprod, vault-jhb-a"
    }
  }
};

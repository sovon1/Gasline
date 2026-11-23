export interface ClusterOption {
  id: string;
  name: string;
  plantName: string;
  location: string;
  gridProvider: string;
  defaultPsi: number;
  severity: "CRITICAL" | "MODERATE" | "STABLE";
  description: string;
}

export const CLUSTERS: ClusterOption[] = [
  {
    id: "gazipur",
    name: "Gazipur Industrial Zone",
    plantName: "Summit Garments Ltd. (Unit 3)",
    location: "Kashimpur, Gazipur",
    gridProvider: "Titas Gas Transmission (TGTDCL)",
    defaultPsi: 2.1,
    severity: "CRITICAL",
    description: "Most severely throttled RMG hub. Gas delivered at 1.5–2.5 PSI vs 15 PSI required, starving dyeing boilers.",
  },
  {
    id: "narayanganj",
    name: "Narayanganj Knitwear Hub",
    plantName: "Fakir Knitwears Complex",
    location: "Fatullah, Narayanganj",
    gridProvider: "Titas Gas (Fatullah Regional Ring)",
    defaultPsi: 2.4,
    severity: "CRITICAL",
    description: "Highest concentration of knit-dyeing factories in Asia. Dyeing vats face 51% loss in saturated steam.",
  },
  {
    id: "savar",
    name: "Savar & Ashulia Cluster",
    plantName: "Ananta Denim Washing Plant",
    location: "Ashulia Highway, Savar",
    gridProvider: "Titas Gas (Savar Transmission)",
    defaultPsi: 3.2,
    severity: "MODERATE",
    description: "Major denim washing and hydro-extraction corridor. High steam requirements for fabric curing.",
  },
  {
    id: "chattogram",
    name: "Chattogram Export Zone (KEPZ)",
    plantName: "Pacific Jeans Manufacturing",
    location: "Karnaphuli EPZ, Chattogram",
    gridProvider: "Karnaphuli Gas Distribution (KGDCL)",
    defaultPsi: 6.5,
    severity: "STABLE",
    description: "Proximity to Maheshkhali LNG terminals yields higher pipeline pressure (5.0–7.0 PSI) with localized dips.",
  },
];

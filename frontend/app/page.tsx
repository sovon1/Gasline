"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "../components/Header";
import MetricsOverview from "../components/MetricsOverview";
import PipelineFlow from "../components/PipelineFlow";
import ShockConsole from "../components/ShockConsole";
import OrderLedger, { OrderItem } from "../components/OrderLedger";
import RescueDrawer from "../components/RescueDrawer";
import AuditModal from "../components/AuditModal";
import AddGarmentModal from "../components/AddGarmentModal";
import DieselScheduler from "../components/DieselScheduler";
import PromiseDateEngine from "../components/PromiseDateEngine";
import BenchmarkView from "../components/BenchmarkView";
import NationalMap from "../components/NationalMap";
import AiCopilotModal from "../components/AiCopilotModal";
import VisionScanModal from "../components/VisionScanModal";
import ForceMajeureModal from "../components/ForceMajeureModal";
import CommandPalette from "../components/CommandPalette";
import { ToastProvider, useToast } from "../components/ToastProvider";
import fallbackOrders from "../data/initial_orders.json";
import { CLUSTERS, ClusterOption } from "../data/clusters";
import { Language, translations } from "../data/translations";
import { applyTheme } from "../utils/theme";
import {
  AlertTriangleIcon,
  AnchorIcon,
  BarChartIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  ClockIcon,
  FuelIcon,
  MapIcon,
  MessageSquareIcon,
  XIcon,
  ZapIcon,
} from "../components/Icons";
import { scadaAudio } from "../utils/audio";

type DashboardTab = "ORDERS" | "DIESEL" | "PROMISE" | "BENCHMARK" | "MAP";

interface PortBufferData {
  port_name: string;
  terminals?: string[];
  berth_dwell_time_days: number;
  yard_occupancy_pct: number;
  recommended_buffer_days: number;
  feeder_vessel_window_hours: number;
  status: string;
  advisory?: string;
}

const DEFAULT_SHOCKS = [
  { shock_id: 1, event_name: "Normal Operations", zone_psi_actual: 12.0, national_supply_mmcfd: 2900 },
  { shock_id: 2, event_name: "FSRU Terminal Failure", zone_psi_actual: 2.5, national_supply_mmcfd: 2450 },
  { shock_id: 3, event_name: "August Low-Supply Average", zone_psi_actual: 2.1, national_supply_mmcfd: 2235 },
  { shock_id: 4, event_name: "BKMEA Crisis Survey Period", zone_psi_actual: 2.0, national_supply_mmcfd: 2300 },
  { shock_id: 5, event_name: "Summit LNG Maintenance", zone_psi_actual: 1.6, national_supply_mmcfd: 2250 },
];

function computeLocalCapacities(psi: number) {
  let dyeingCap = 0.95;
  let knittingCap = 0.98;
  let sewingCap = 0.95;

  if (psi < 4.0) {
    dyeingCap = Math.max(0.15, Number((0.49 * (psi / 4.0)).toFixed(3)));
    knittingCap = Math.max(0.2, Number((0.63 * (psi / 4.0)).toFixed(3)));
    sewingCap = 0.6;
  } else if (psi < 8.0) {
    dyeingCap = Number((0.7 + (psi - 4.0) * 0.05).toFixed(3));
    knittingCap = Number((0.8 + (psi - 4.0) * 0.03).toFixed(3));
    sewingCap = 0.82;
  }

  return { dyeingCap, knittingCap, sewingCap };
}

function GasLineDashboardContent() {
  const toast = useToast();
  const [orders, setOrders] = useState<OrderItem[]>(fallbackOrders as unknown as OrderItem[]);
  const [shocks, setShocks] = useState<any[]>(DEFAULT_SHOCKS);
  const [activeCluster, setActiveCluster] = useState<ClusterOption>(CLUSTERS[0]);
  const [currentPsi, setCurrentPsi] = useState<number>(2.1);
  const [currentSupply, setCurrentSupply] = useState<number>(2235.0);
  const [dyeingCap, setDyeingCap] = useState<number>(0.257);
  const [knittingCap, setKnittingCap] = useState<number>(0.33);
  const [sewingCap, setSewingCap] = useState<number>(0.6);
  const [activeShockId, setActiveShockId] = useState<number | null>(3);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [auditOrder, setAuditOrder] = useState<OrderItem | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [accuracy, setAccuracy] = useState<number>(0.9933);
  const [conformalMargin, setConformalMargin] = useState<number>(2.62);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const [lang, setLang] = useState<Language>("en");
  const [activeTab, setActiveTab] = useState<DashboardTab>("ORDERS");
  const [autoStream, setAutoStream] = useState<boolean>(false);
  const [autonomousDeployed, setAutonomousDeployed] = useState<boolean>(false);
  const [alertDismissedAtPsi, setAlertDismissedAtPsi] = useState<number | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [isVisionScanOpen, setIsVisionScanOpen] = useState<boolean>(false);
  const [forceMajeureOrder, setForceMajeureOrder] = useState<OrderItem | null>(null);
  const [portBuffer, setPortBuffer] = useState<PortBufferData>({
    port_name: "Chattogram Port Authority (CPA)",
    berth_dwell_time_days: 3.8,
    yard_occupancy_pct: 84.5,
    recommended_buffer_days: 2.5,
    feeder_vessel_window_hours: 48,
    status: "CONGESTED",
    advisory: "High yard dwell time at CPA terminals.",
  });

  const deepLinkHandledRef = useRef(false);
  const simRequestSeqRef = useRef(0);
  const sliderDebounceRef = useRef<number | null>(null);
  const tabRefs = useRef<Record<DashboardTab, HTMLButtonElement | null>>({
    ORDERS: null,
    DIESEL: null,
    PROMISE: null,
    BENCHMARK: null,
    MAP: null,
  });

  const t = translations[lang];

  // Keep <html lang="..."> aligned with active locale for typography & screen readers
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // Global Cmd/Ctrl + K command palette shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (sliderDebounceRef.current) {
        window.clearTimeout(sliderDebounceRef.current);
      }
    };
  }, []);

  const handleToggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      scadaAudio.enabled = next;
      return next;
    });
  }, []);

  const handleAddCustomOrder = (newOrder: OrderItem, openRescueNow?: boolean) => {
    setOrders((prev) => [newOrder, ...prev]);
    if (openRescueNow) {
      setSelectedOrder(newOrder);
    }
  };

  const checkHealth = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/health");
      if (res.ok) {
        const data = await res.json();
        setBackendOnline(true);
        if (data.model_accuracy) setAccuracy(data.model_accuracy);
        if (data.conformal_q90_margin_days) setConformalMargin(data.conformal_q90_margin_days);
        return true;
      }
    } catch {
      setBackendOnline(false);
      return false;
    }
    return false;
  };

  const simulateOrdersLocally = useCallback(
    (psi: number, dyeingFactor: number, currentOrders: OrderItem[]): OrderItem[] => {
      return currentOrders.map((o) => {
        const qty = o.quantity || 15000;
        const weight = o.total_weight_kg || Math.round(qty * 0.45);
        const smv = o.base_smv || 20.0;
        const lead = o.lead_days || 14;
        const penalty = o.penalty_per_day_usd || 1000;
        const gasIntensity = o.gas_intensity || "MEDIUM";
        const gasWeight = gasIntensity.includes("EXTREME")
          ? 1.5
          : gasIntensity.includes("HIGH")
          ? 1.25
          : gasIntensity.includes("MEDIUM")
          ? 1.0
          : 0.7;

        const workloadMinutes = qty * smv;
        const standardDays = workloadMinutes / 7056.0;
        const leadSlack = lead - standardDays;
        const pressureDeficit = Math.max(0, 10.0 - psi);

        const daysLate = Math.max(
          0,
          Number((pressureDeficit * gasWeight * 0.45 - leadSlack * 0.25).toFixed(1))
        );
        const pLate = daysLate > 0.5 ? Math.min(0.99, Number((0.55 + daysLate * 0.08).toFixed(2))) : 0.08;
        const isLate = pLate > 0.5 || daysLate > 0.5 ? 1 : 0;
        const airFreight = pLate > 0.4 ? weight * 6.65 : 0;
        const exposure = Math.round(airFreight + daysLate * penalty);

        const shapGas = Math.min(
          75,
          Math.max(15, Number((gasWeight * (pressureDeficit / 10.0) * 48).toFixed(1)))
        );
        const shapSlack = Math.min(45, Math.max(10, Number((Math.max(0, -leadSlack) * 3 + 22).toFixed(1))));
        const shapSmv = Math.min(30, Math.max(8, Number(((smv / 30.0) * 15).toFixed(1))));
        const shapQty = Math.max(5, Number((100 - (shapGas + shapSlack + shapSmv)).toFixed(1)));

        return {
          ...o,
          current_psi: psi,
          current_dyeing_cap: dyeingFactor,
          predicted_prob_late: pLate,
          predicted_days_late: daysLate,
          conformal_interval_90: [
            Math.max(0, Number((daysLate - 2.62).toFixed(1))),
            Number((daysLate + 2.62).toFixed(1)),
          ],
          simulated_exposure_usd: exposure,
          simulated_is_late: isLate,
          shap_attribution: o.shap_attribution || {
            primary_risk_driver: gasWeight > 1.1 ? "Dyeing Gas Shock" : "Lead Slack Deficit",
            explanation: `${shapGas}% of risk driven by pipeline gas pressure collapse.`,
            feature_attributions: {
              dyeing_gas_collapse_pct: shapGas,
              lead_slack_deficit_pct: shapSlack,
              garment_smv_complexity_pct: shapSmv,
              batch_volume_scale_pct: shapQty,
            },
            drivers_list: [
              { factor: "Gas Pressure Drop", pct: shapGas, category: "ENERGY" },
              { factor: "Lead Slack Deficit", pct: shapSlack, category: "SCHEDULE" },
              { factor: "Garment SMV", pct: shapSmv, category: "COMPLEXITY" },
              { factor: "Batch Volume", pct: shapQty, category: "VOLUME" },
            ],
          },
        };
      });
    },
    []
  );

  const triggerSimulation = useCallback(
    async (payload: { shock_id?: number; custom_psi?: number }) => {
      const reqSeq = ++simRequestSeqRef.current;
      setIsSimulating(true);

      let targetPsi = currentPsi;
      let targetSupply = currentSupply;
      if (payload.shock_id !== undefined) {
        const match = shocks.find((s) => s.shock_id === payload.shock_id);
        if (match) {
          targetPsi = match.zone_psi_actual;
          targetSupply = match.national_supply_mmcfd;
        }
      }
      if (payload.custom_psi !== undefined) {
        targetPsi = payload.custom_psi;
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/api/simulate-shock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          if (reqSeq !== simRequestSeqRef.current) return;
          if (data.orders) {
            setOrders(data.orders);
            setCurrentPsi(data.parameters.gas_pressure_psi);
            setCurrentSupply(data.parameters.national_supply_mmcfd);
            setDyeingCap(data.parameters.dyeing_capacity_factor);
            if (data.parameters.knitting_capacity_factor)
              setKnittingCap(data.parameters.knitting_capacity_factor);
            if (data.parameters.sewing_capacity_factor) setSewingCap(data.parameters.sewing_capacity_factor);
            setBackendOnline(true);

            setSelectedOrder((prevSelected) => {
              if (!prevSelected) return null;
              const updated = data.orders.find((o: OrderItem) => o.order_id === prevSelected.order_id);
              return updated || prevSelected;
            });
            return;
          }
        }
        throw new Error("Simulation endpoint returned error");
      } catch {
        if (reqSeq !== simRequestSeqRef.current) return;
        setBackendOnline(false);
        const caps = computeLocalCapacities(targetPsi);

        setCurrentPsi(targetPsi);
        setCurrentSupply(targetSupply);
        setDyeingCap(caps.dyeingCap);
        setKnittingCap(caps.knittingCap);
        setSewingCap(caps.sewingCap);

        setOrders((prev) => {
          const simulated = simulateOrdersLocally(targetPsi, caps.dyeingCap, prev);
          setSelectedOrder((prevSelected) => {
            if (!prevSelected) return null;
            return simulated.find((o) => o.order_id === prevSelected.order_id) || prevSelected;
          });
          return simulated;
        });
      } finally {
        if (reqSeq === simRequestSeqRef.current) {
          setIsSimulating(false);
        }
      }
    },
    [currentPsi, currentSupply, shocks, simulateOrdersLocally]
  );

  // Initial load
  useEffect(() => {
    checkHealth().then((isOnline) => {
      if (isOnline) {
        fetch("http://127.0.0.1:8000/api/shocks")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (Array.isArray(data)) setShocks(data);
          })
          .catch(() => {});

        fetch("http://127.0.0.1:8000/api/port-buffer")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && data.recommended_buffer_days) setPortBuffer(data);
          })
          .catch(() => {});

        triggerSimulation({ shock_id: 3 });
      }
    });

    const interval = setInterval(() => {
      checkHealth();
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep-linking URL query param handler
  useEffect(() => {
    if (typeof window === "undefined" || deepLinkHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get("order");
    const auditParam = params.get("audit");
    if (orderIdParam && orders.length > 0) {
      const target = orders.find((o) => o.order_id === orderIdParam);
      if (target) {
        deepLinkHandledRef.current = true;
        if (auditParam) {
          setAuditOrder(target);
        } else {
          setSelectedOrder(target);
        }
      }
    }
  }, [orders]);

  // Automated IoT Stream Engine
  useEffect(() => {
    if (!autoStream) return;

    const streamInterval = setInterval(() => {
      const drift = (Math.random() - 0.5) * 0.4;
      const nextPsi = Math.max(1.2, Math.min(6.5, Number((currentPsi + drift).toFixed(1))));
      setCurrentPsi(nextPsi);
      triggerSimulation({ custom_psi: nextPsi });
    }, 3500);

    return () => clearInterval(streamInterval);
  }, [autoStream, currentPsi, triggerSimulation]);

  const handleSelectShock = (shockId: number) => {
    if (sliderDebounceRef.current) window.clearTimeout(sliderDebounceRef.current);
    setAutoStream(false);
    setAutonomousDeployed(false);
    setAlertDismissedAtPsi(null);
    setActiveShockId(shockId);
    triggerSimulation({ shock_id: shockId });
  };

  // 60fps local physics update + 180ms debounced backend sync
  const handleSliderChange = (psi: number) => {
    setAutoStream(false);
    setActiveShockId(null);
    setCurrentPsi(psi);
    const caps = computeLocalCapacities(psi);
    setDyeingCap(caps.dyeingCap);
    setKnittingCap(caps.knittingCap);
    setSewingCap(caps.sewingCap);
    setOrders((prev) => simulateOrdersLocally(psi, caps.dyeingCap, prev));

    if (sliderDebounceRef.current) {
      window.clearTimeout(sliderDebounceRef.current);
    }
    sliderDebounceRef.current = window.setTimeout(() => {
      triggerSimulation({ custom_psi: psi });
    }, 180);
  };

  const handleSelectCluster = (cluster: ClusterOption) => {
    if (sliderDebounceRef.current) window.clearTimeout(sliderDebounceRef.current);
    setAutoStream(false);
    setAutonomousDeployed(false);
    setAlertDismissedAtPsi(null);
    setActiveCluster(cluster);
    setActiveShockId(null);
    setCurrentPsi(cluster.defaultPsi);
    triggerSimulation({ custom_psi: cluster.defaultPsi });
    toast.info(`Switched cluster to ${cluster.name}`, `${cluster.plantName} (${cluster.defaultPsi} PSI baseline)`);
  };

  // 1-Click Scripted Crisis Demo Action
  const handleRunJudgeDemo = () => {
    if (sliderDebounceRef.current) window.clearTimeout(sliderDebounceRef.current);
    scadaAudio.playEmergencyAlert();
    setAutoStream(false);
    setAutonomousDeployed(false);
    setAlertDismissedAtPsi(null);
    setActiveTab("ORDERS");
    setActiveShockId(5);
    setCurrentPsi(1.6);
    triggerSimulation({ shock_id: 5 });
    toast.warning("Summit LNG Crisis Simulated (1.6 PSI)", "Inspecting top-risk order for immediate rescue.");
    setTimeout(() => {
      setOrders((latest) => {
        const topOrder = latest.find((o) => o.order_id === "ORD-2026-001") || latest[0];
        if (topOrder) setSelectedOrder(topOrder);
        return latest;
      });
    }, 320);
  };

  // Automated Rescue Action
  const handleAutoDeployRescue = () => {
    scadaAudio.playSuccessChime();
    setAutonomousDeployed(true);
    setOrders((prev) =>
      prev.map((o) => {
        const isLate = o.simulated_is_late !== undefined ? o.simulated_is_late === 1 : o.is_late === 1;
        if (isLate) {
          const currentDaysLate = o.predicted_days_late ?? o.days_late ?? 0;
          const daysLate = Math.max(0, currentDaysLate - 3.5);
          return {
            ...o,
            predicted_days_late: daysLate,
            simulated_is_late: daysLate > 0.5 ? 1 : 0,
            simulated_exposure_usd: Math.round(daysLate * o.penalty_per_day_usd),
          };
        }
        return o;
      })
    );
    toast.success(
      "Zero-Cost Night Shift Deployed",
      "At-risk dyeing lots resequenced to off-peak 23:00–06:00 pressure window."
    );
  };

  // Direct WhatsApp alert for the worst at-risk order
  const handleSendUrgentWhatsApp = async () => {
    const worstOrder =
      orders.find((o) => (o.simulated_is_late !== undefined ? o.simulated_is_late === 1 : o.is_late === 1)) ||
      orders[0];
    if (!worstOrder) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/dispatch-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: worstOrder.order_id,
          channel: "whatsapp",
          recipient: "+8801712345678",
        }),
      });
      const data = await res.json();
      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, "_blank");
        toast.info("WhatsApp Alert Dispatched", `Opened line-chief dispatch for ${worstOrder.order_id}.`);
      }
    } catch {
      const exposure = (worstOrder.simulated_exposure_usd ?? worstOrder.total_exposure_usd) || 0;
      const daysLate = (worstOrder.predicted_days_late ?? worstOrder.days_late) || 0;
      const msg =
        `🚨 [GasLine জরুরী সতর্কবার্তা] 🚨\n` +
        `অর্ডার নং: ${worstOrder.order_id} (${worstOrder.buyer})\n` +
        `পণ্য: ${worstOrder.quantity.toLocaleString()} পিস ${worstOrder.product}\n` +
        `গ্যাস প্রেশার নেমেছে ${currentPsi.toFixed(1)} PSI-এ। বিলম্ব ঝুঁকি: +${daysLate.toFixed(1)} দিন।\n\n` +
        `✅ প্রস্তাবিত রেসকিউ: Dyeing Window Re-sequence (রাতের শিফটে স্থানান্তর)\n` +
        `🛡️ সম্ভাব্য ঝুঁকি সাশ্রয়: $${exposure.toLocaleString()} USD\n` +
        `নির্দেশনা: ফ্লোর ম্যানেজার দ্রুত অ্যাকশন প্ল্যান অনুমোদন করুন।`;
      const waUrl = `https://api.whatsapp.com/send?phone=8801712345678&text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank");
      toast.info("WhatsApp Alert Ready", `Opened offline Bangla dispatch for ${worstOrder.order_id}.`);
    }
  };

  const totalOrders = orders.length || 60;
  const lateOrders = orders.filter((o) =>
    o.simulated_is_late !== undefined ? o.simulated_is_late === 1 : o.is_late === 1
  );
  const ordersAtRisk = lateOrders.length;
  const riskPct = (ordersAtRisk / totalOrders) * 100;
  const totalExposureUSD = orders.reduce(
    (sum, o) => sum + ((o.simulated_exposure_usd ?? o.total_exposure_usd) || 0),
    0
  );
  const totalExposureBDT = totalExposureUSD * 120.0;
  const isCriticalShock = currentPsi < 3.0;
  const showEmergencyBanner =
    isCriticalShock && (alertDismissedAtPsi === null || currentPsi < alertDismissedAtPsi - 0.25);

  const tabs: { id: DashboardTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: "ORDERS",
      label: t.dashboardTab,
      icon: <ClipboardListIcon className="h-3.5 w-3.5" />,
      badge: ordersAtRisk > 0 ? ordersAtRisk : undefined,
    },
    { id: "DIESEL", label: t.dieselSchedulerTab, icon: <FuelIcon className="h-3.5 w-3.5" /> },
    { id: "PROMISE", label: t.promiseDateTab, icon: <ClockIcon className="h-3.5 w-3.5" /> },
    { id: "BENCHMARK", label: t.benchmarkTab, icon: <BarChartIcon className="h-3.5 w-3.5" /> },
    { id: "MAP", label: t.nationalMapTab, icon: <MapIcon className="h-3.5 w-3.5" /> },
  ];

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIdx: number) => {
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") nextIdx = (currentIdx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = tabs.length - 1;

    if (nextIdx !== null) {
      e.preventDefault();
      const targetTab = tabs[nextIdx];
      setActiveTab(targetTab.id);
      tabRefs.current[targetTab.id]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-canvas pb-16 font-sans text-ink">
      {/* 1. Streamlined Sticky Header */}
      <Header
        backendOnline={backendOnline}
        accuracy={accuracy}
        conformalMargin={conformalMargin}
        activeCluster={activeCluster}
        onSelectCluster={handleSelectCluster}
        lang={lang}
        onToggleLang={(newLang) => setLang(newLang)}
        onRunJudgeDemo={handleRunJudgeDemo}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenVisionScan={() => setIsVisionScanOpen(true)}
        onOpenCommandPalette={() => setIsCommandOpen(true)}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
      />

      <main className="mx-auto mt-5 max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
        {/* Refined Critical Emergency Status Bar */}
        {showEmergencyBanner && (
          <div
            role="region"
            aria-label="Critical Pressure Alert"
            className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--status-critical-border)] border-l-4 border-l-rose-500 bg-[var(--status-critical-bg)] px-4 py-3 text-xs shadow-2xs md:flex-row md:items-center"
          >
            <div className="flex items-start gap-2.5 md:items-center">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-[var(--status-critical-text)] md:mt-0">
                <AlertTriangleIcon className="h-4 w-4" />
              </span>
              <div className="leading-relaxed text-ink">
                <strong className="font-semibold uppercase tracking-wide text-[var(--status-critical-text)]">
                  {lang === "en" ? "Autonomous SCADA Alert" : "স্বয়ংক্রিয় এআই সতর্কবার্তা"}
                </strong>
                <span className="mx-1.5 text-ink-muted">·</span>
                <span className="text-ink-2">
                  {lang === "en"
                    ? `Pipeline delivered at ${currentPsi.toFixed(1)} PSI (${activeCluster.gridProvider}). Boilers stalled; ${ordersAtRisk} orders moved to emergency rescue queue.`
                    : `পাইপলাইনে গ্যাস নেমেছে ${currentPsi.toFixed(1)} পিএসআই-এ। বয়লারে বাষ্প নেই; ${ordersAtRisk}টি অর্ডার ঝুঁকিতে।`}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSendUrgentWhatsApp}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink shadow-2xs transition-colors hover:bg-surface-2"
              >
                <MessageSquareIcon className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp Chief Alert</span>
              </button>

              <button
                type="button"
                onClick={handleAutoDeployRescue}
                disabled={autonomousDeployed}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  autonomousDeployed
                    ? "cursor-not-allowed border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] text-[var(--status-safe-text)]"
                    : "bg-accent text-accent-fg shadow-xs hover:opacity-90 active:scale-[0.98]"
                }`}
              >
                {autonomousDeployed ? (
                  <>
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                    <span>Protected (Night Shifted)</span>
                  </>
                ) : (
                  <>
                    <ZapIcon className="h-3.5 w-3.5 text-amber-400" />
                    <span>Auto-Deploy Zero-Cost Shift</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAlertDismissedAtPsi(currentPsi)}
                aria-label="Acknowledge and minimize alert"
                title="Dismiss alert"
                className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 2. Top Industrial KPI Cards */}
        <MetricsOverview
          psi={currentPsi}
          dyeingCap={dyeingCap}
          totalOrders={totalOrders}
          ordersAtRisk={ordersAtRisk}
          riskPct={riskPct}
          totalExposureUSD={totalExposureUSD}
          totalExposureBDT={totalExposureBDT}
          lang={lang}
        />

        {/* Compact Collapsible Chattogram Port Gate-in Buffer */}
        <details className="group rounded-xl border border-line bg-surface text-xs shadow-2xs">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/60 [&::-webkit-details-marker]:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg">
                <AnchorIcon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate font-semibold text-ink">
                {lang === "en" ? "Chattogram Port Gate-in Buffer" : "চট্টগ্রাম বন্দর ইয়ার্ড কনজেশন ও বাফার"}
              </span>
              <span className="font-tabular shrink-0 rounded-md border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--status-safe-text)]">
                +{portBuffer.recommended_buffer_days.toFixed(1)}d Safe Buffer
              </span>
              <span className="font-tabular hidden truncate font-mono text-[11px] text-ink-muted md:inline">
                CPA Yard {portBuffer.yard_occupancy_pct.toFixed(1)}% · Dwell {portBuffer.berth_dwell_time_days.toFixed(1)}d
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-[11px] text-ink-muted">
              <span className="hidden font-mono sm:inline">Sea Cargo Cut-off</span>
              <ChevronDownIcon className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
            </div>
          </summary>

          <div className="flex flex-col justify-between gap-3 border-t border-line bg-surface-2/40 px-4 py-3 text-[11px] text-ink-2 sm:flex-row sm:items-center">
            <p className="leading-relaxed">
              {lang === "en"
                ? `CPA Container Yard Occupancy: ${portBuffer.yard_occupancy_pct.toFixed(1)}% · Berth Dwell: ${portBuffer.berth_dwell_time_days.toFixed(1)} days · Feeder Connection Window: ${portBuffer.feeder_vessel_window_hours} hours to mother vessels at Colombo/Singapore.`
                : `চট্টগ্রাম বন্দর কনটেইনার ইয়ার্ডে ${portBuffer.yard_occupancy_pct.toFixed(1)}% পণ্যজট। বার্থিং সময় ${portBuffer.berth_dwell_time_days.toFixed(1)} দিন। ফিডার জাহাজের গেট-ইন কাট-অফ রক্ষায় ${portBuffer.recommended_buffer_days.toFixed(1)} দিন বাড়তি মার্জিন প্রযোজ্য।`}
            </p>
            <div className="shrink-0 font-mono text-[11px] text-ink-muted sm:text-right">
              <span className="block text-[10px]">Joined to Model B Risk</span>
              <strong className="font-semibold text-ink">Status: {portBuffer.status}</strong>
            </div>
          </div>
        </details>

        {/* 3. Accessible Single-Row Operational Tabs */}
        <div className="border-b border-line">
          <div
            role="tablist"
            aria-label="Operational Modules"
            className="scroll-fade-x flex items-center gap-1 text-xs font-medium"
          >
            {tabs.map((tab, idx) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={`flex shrink-0 items-center gap-2 rounded-t-lg px-3.5 py-2.5 transition-colors ${
                    isSelected
                      ? "text-ink font-semibold"
                      : "text-ink-muted hover:bg-surface-2/60 hover:text-ink"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="font-tabular rounded-full border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--status-critical-text)]">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: Live Order Book & Floor Ledger */}
        {activeTab === "ORDERS" && (
          <div role="tabpanel" aria-labelledby="tab-ORDERS" className="space-y-5">
            <PipelineFlow
              psi={currentPsi}
              dyeingCap={dyeingCap}
              knittingCap={knittingCap}
              sewingCap={sewingCap}
              lang={lang}
            />

            <ShockConsole
              shocks={shocks}
              currentPsi={currentPsi}
              currentSupply={currentSupply}
              activeShockId={activeShockId}
              onSelectShock={handleSelectShock}
              onSliderChange={handleSliderChange}
              isSimulating={isSimulating}
              autoStream={autoStream}
              onToggleAutoStream={() => setAutoStream(!autoStream)}
              lang={lang}
            />

            <OrderLedger
              orders={orders}
              onSelectOrder={(order) => setSelectedOrder(order)}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenForceMajeure={(order) => setForceMajeureOrder(order)}
              lang={lang}
            />
          </div>
        )}

        {/* TAB 2: 24-Hour Smart Diesel Scheduler */}
        {activeTab === "DIESEL" && (
          <div role="tabpanel" aria-labelledby="tab-DIESEL">
            <DieselScheduler currentPsi={currentPsi} lang={lang} />
          </div>
        )}

        {/* TAB 3: Pre-PO Promise-Date Engine */}
        {activeTab === "PROMISE" && (
          <div role="tabpanel" aria-labelledby="tab-PROMISE">
            <PromiseDateEngine currentPsi={currentPsi} dyeingCap={dyeingCap} lang={lang} />
          </div>
        )}

        {/* TAB 4: Model Intelligence & Benchmark Evaluation */}
        {activeTab === "BENCHMARK" && (
          <div role="tabpanel" aria-labelledby="tab-BENCHMARK">
            <BenchmarkView lang={lang} />
          </div>
        )}

        {/* TAB 5: National RMG Energy Disruption GIS Corridor */}
        {activeTab === "MAP" && (
          <div role="tabpanel" aria-labelledby="tab-MAP">
            <NationalMap
              activeCluster={activeCluster}
              onSelectCluster={handleSelectCluster}
              clusters={CLUSTERS}
              currentPsi={currentPsi}
              lang={lang}
            />
          </div>
        )}

        {/* Provenance & Open-Source Attribution Footer */}
        <footer className="rounded-xl border border-line bg-surface-2/40 px-4 py-3 text-center text-[11px] text-ink-muted">
          Simulated factory environment · Parameters calibrated from UCI Garment Productivity (1,197 rows), BKMEA
          Crisis Survey (Aug–Sep 2026), and Petrobangla public shock notices · Stack: scikit-learn, FastAPI, Next.js
        </footer>
      </main>

      {/* Top-Layer Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        orders={orders}
        clusters={CLUSTERS}
        activeCluster={activeCluster}
        lang={lang}
        audioEnabled={audioEnabled}
        onSelectCluster={handleSelectCluster}
        onSelectOrder={(order) => setSelectedOrder(order)}
        onSwitchTab={(tab) => setActiveTab(tab)}
        onRunCrisisDemo={handleRunJudgeDemo}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenVisionScan={() => setIsVisionScanOpen(true)}
        onOpenAddOrder={() => setIsAddModalOpen(true)}
        onToggleAudio={handleToggleAudio}
        onSetTheme={(mode) => applyTheme(mode)}
        onToggleLang={(newLang) => setLang(newLang)}
      />

      {/* Slide-Over Rescue Drawer */}
      <RescueDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOpenAudit={(order) => {
          setSelectedOrder(null);
          setAuditOrder(order);
        }}
      />

      {/* Formal Buyer Force Majeure Audit Notice Modal */}
      <AuditModal order={auditOrder} onClose={() => setAuditOrder(null)} />

      {/* Custom Garment Lot Input & Stress-Test Modal */}
      <AddGarmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddOrder={handleAddCustomOrder}
        currentPsi={currentPsi}
        dyeingCap={dyeingCap}
        lang={lang}
      />

      {/* Autonomous Bilingual ReAct SCADA Copilot Drawer */}
      <AiCopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        lang={lang}
        currentPsi={currentPsi}
        selectedOrderId={selectedOrder?.order_id}
        activeShockId={activeShockId}
        onSimulatePsi={(psi) => handleSliderChange(psi)}
        onSelectOrderById={(orderId) => {
          const match = orders.find((o) => o.order_id?.toUpperCase() === orderId.toUpperCase());
          if (match) setSelectedOrder(match);
        }}
        onOpenPortBuffer={() => setActiveTab("ORDERS")}
        onOpenForceMajeure={(orderId) => {
          const match = orders.find((o) => o.order_id?.toUpperCase() === orderId.toUpperCase());
          setForceMajeureOrder(match || orders[0]);
        }}
      />

      {/* Optical Vision Line Board / Lot Ticket Scanner Modal */}
      <VisionScanModal
        isOpen={isVisionScanOpen}
        onClose={() => setIsVisionScanOpen(false)}
        lang={lang}
        onOrderImported={(newOrder) => handleAddCustomOrder(newOrder, true)}
      />

      {/* BERC Act 2003 §42 Legal Force Majeure Relief Certificate Modal */}
      <ForceMajeureModal
        isOpen={!!forceMajeureOrder}
        onClose={() => setForceMajeureOrder(null)}
        order={forceMajeureOrder}
        currentPsi={currentPsi}
        lang={lang}
      />
    </div>
  );
}

export default function GasLineDashboard() {
  return (
    <ToastProvider>
      <GasLineDashboardContent />
    </ToastProvider>
  );
}

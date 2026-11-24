"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ModalDialog from "./ModalDialog";
import { OrderItem } from "./OrderLedger";
import { ClusterOption } from "../data/clusters";
import { Language } from "../data/translations";
import { ThemeMode } from "../utils/theme";
import {
  BarChartIcon,
  ClipboardListIcon,
  ClockIcon,
  FactoryIcon,
  FuelIcon,
  MapIcon,
  MonitorIcon,
  MoonIcon,
  PlusIcon,
  ScanLineIcon,
  SearchIcon,
  SparklesIcon,
  SunIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
  ZapIcon,
} from "./Icons";

interface CommandItem {
  id: string;
  section: string;
  label: string;
  sublabel?: string;
  badge?: string;
  icon: React.ReactNode;
  keywords?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderItem[];
  clusters: ClusterOption[];
  activeCluster: ClusterOption;
  lang: Language;
  audioEnabled: boolean;
  onSelectCluster: (cluster: ClusterOption) => void;
  onSelectOrder: (order: OrderItem) => void;
  onSwitchTab: (tab: "ORDERS" | "DIESEL" | "PROMISE" | "BENCHMARK" | "MAP") => void;
  onRunCrisisDemo: () => void;
  onOpenCopilot: () => void;
  onOpenVisionScan: () => void;
  onOpenAddOrder: () => void;
  onToggleAudio: () => void;
  onSetTheme: (mode: ThemeMode) => void;
  onToggleLang: (lang: Language) => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  orders,
  clusters,
  activeCluster,
  lang,
  audioEnabled,
  onSelectCluster,
  onSelectOrder,
  onSwitchTab,
  onRunCrisisDemo,
  onOpenCopilot,
  onOpenVisionScan,
  onOpenAddOrder,
  onToggleAudio,
  onSetTheme,
  onToggleLang,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  const allItems = useMemo<CommandItem[]>(() => {
    const quickActions: CommandItem[] = [
      {
        id: "act-crisis-demo",
        section: "Quick Actions",
        label: "Trigger Crisis Scenario (1.6 PSI Summit LNG)",
        sublabel: "Simulates grid collapse and opens top-risk order rescue",
        badge: "Scenario",
        icon: <ZapIcon className="h-4 w-4 text-amber-500" />,
        keywords: "judge demo crisis shock simulation",
        onSelect: () => {
          onClose();
          onRunCrisisDemo();
        },
      },
      {
        id: "act-copilot",
        section: "Quick Actions",
        label: "Open AI Plant Copilot",
        sublabel: "Autonomous bilingual SCADA reasoning assistant",
        badge: "AI",
        icon: <SparklesIcon className="h-4 w-4 text-emerald-500" />,
        keywords: "ai chat assistant llm copilot",
        onSelect: () => {
          onClose();
          onOpenCopilot();
        },
      },
      {
        id: "act-scan",
        section: "Quick Actions",
        label: "Scan Line Whiteboard / Dye Lot Ticket",
        sublabel: "Tap-to-confirm template digitization to Model B inference",
        badge: "Board",
        icon: <ScanLineIcon className="h-4 w-4 text-sky-500" />,
        keywords: "vision camera whiteboard ticket scan tap confirm",
        onSelect: () => {
          onClose();
          onOpenVisionScan();
        },
      },
      {
        id: "act-add-order",
        section: "Quick Actions",
        label: "Input Custom Garment Lot / CSV Upload",
        sublabel: "Add custom PO or batch stress-test CSV",
        icon: <PlusIcon className="h-4 w-4 text-ink-2" />,
        keywords: "add garment order csv bulk import",
        onSelect: () => {
          onClose();
          onOpenAddOrder();
        },
      },
      {
        id: "act-lang",
        section: "Preferences",
        label: lang === "en" ? "Switch Language to বাংলা (Bangla)" : "Switch Language to English",
        sublabel: "Updates dashboard, alerts, and AI copilot locale",
        icon: <span className="font-mono text-[11px] font-bold text-ink-2">{lang === "en" ? "বাং" : "EN"}</span>,
        keywords: "language bangla english locale",
        onSelect: () => {
          onToggleLang(lang === "en" ? "bn" : "en");
          onClose();
        },
      },
      {
        id: "act-audio",
        section: "Preferences",
        label: audioEnabled ? "Mute SCADA Audio Alerts" : "Enable SCADA Audio Alerts",
        sublabel: "Toggle synthesized alert chimes",
        icon: audioEnabled ? (
          <VolumeXIcon className="h-4 w-4 text-ink-2" />
        ) : (
          <Volume2Icon className="h-4 w-4 text-ink-2" />
        ),
        keywords: "sound audio mute scada chime",
        onSelect: () => {
          onToggleAudio();
          onClose();
        },
      },
      {
        id: "theme-light",
        section: "Preferences",
        label: "Theme: Daylight Precision (Light)",
        icon: <SunIcon className="h-4 w-4 text-amber-500" />,
        keywords: "theme light mode bright",
        onSelect: () => {
          onSetTheme("light");
          onClose();
        },
      },
      {
        id: "theme-dark",
        section: "Preferences",
        label: "Theme: SCADA Control Room (Dark)",
        icon: <MoonIcon className="h-4 w-4 text-indigo-400" />,
        keywords: "theme dark mode night",
        onSelect: () => {
          onSetTheme("dark");
          onClose();
        },
      },
      {
        id: "theme-system",
        section: "Preferences",
        label: "Theme: Follow System Preference",
        icon: <MonitorIcon className="h-4 w-4 text-ink-2" />,
        keywords: "theme system os auto",
        onSelect: () => {
          onSetTheme("system");
          onClose();
        },
      },
    ];

    const navItems: CommandItem[] = [
      {
        id: "nav-orders",
        section: "Navigation",
        label: "Live Order Book & Floor Ledger",
        icon: <ClipboardListIcon className="h-4 w-4 text-ink-2" />,
        keywords: "orders table ledger dashboard",
        onSelect: () => {
          onSwitchTab("ORDERS");
          onClose();
        },
      },
      {
        id: "nav-diesel",
        section: "Navigation",
        label: "24h Smart Diesel Boiler Scheduler",
        icon: <FuelIcon className="h-4 w-4 text-ink-2" />,
        keywords: "diesel boiler fuel schedule 24h",
        onSelect: () => {
          onSwitchTab("DIESEL");
          onClose();
        },
      },
      {
        id: "nav-promise",
        section: "Navigation",
        label: "Pre-PO Promise-Date Quoting Engine",
        icon: <ClockIcon className="h-4 w-4 text-ink-2" />,
        keywords: "promise date lead time quote merchandiser",
        onSelect: () => {
          onSwitchTab("PROMISE");
          onClose();
        },
      },
      {
        id: "nav-benchmark",
        section: "Navigation",
        label: "Model Intelligence & Benchmarks",
        icon: <BarChartIcon className="h-4 w-4 text-ink-2" />,
        keywords: "ml model benchmark roc auc conformal threshold",
        onSelect: () => {
          onSwitchTab("BENCHMARK");
          onClose();
        },
      },
      {
        id: "nav-map",
        section: "Navigation",
        label: "National RMG Energy GIS Corridor",
        icon: <MapIcon className="h-4 w-4 text-ink-2" />,
        keywords: "map gis pipeline national corridor",
        onSelect: () => {
          onSwitchTab("MAP");
          onClose();
        },
      },
    ];

    const clusterItems: CommandItem[] = clusters.map((c) => ({
      id: `cluster-${c.id}`,
      section: "Industrial Clusters",
      label: c.name,
      sublabel: `${c.plantName} • ${c.gridProvider}`,
      badge: c.id === activeCluster.id ? "Active" : `${c.defaultPsi} PSI`,
      icon: <FactoryIcon className="h-4 w-4 text-ink-2" />,
      keywords: `${c.name} ${c.location} ${c.plantName} cluster`,
      onSelect: () => {
        onSelectCluster(c);
        onClose();
      },
    }));

    const orderItems: CommandItem[] = orders.map((o) => {
      const isLate = o.simulated_is_late !== undefined ? o.simulated_is_late === 1 : o.is_late === 1;
      return {
        id: `order-${o.order_id}`,
        section: "Orders",
        label: `${o.order_id} — ${o.buyer}`,
        sublabel: `${o.quantity.toLocaleString()} pcs ${o.product}`,
        badge: isLate ? "At Risk" : "On Track",
        icon: <ClipboardListIcon className={`h-4 w-4 ${isLate ? "text-rose-500" : "text-emerald-500"}`} />,
        keywords: `${o.order_id} ${o.buyer} ${o.product}`,
        onSelect: () => {
          onSelectOrder(o);
          onClose();
        },
      };
    });

    return [...quickActions, ...navItems, ...clusterItems, ...orderItems];
  }, [
    orders,
    clusters,
    activeCluster.id,
    lang,
    audioEnabled,
    onClose,
    onRunCrisisDemo,
    onOpenCopilot,
    onOpenVisionScan,
    onOpenAddOrder,
    onToggleLang,
    onToggleAudio,
    onSetTheme,
    onSwitchTab,
    onSelectCluster,
    onSelectOrder,
  ]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show Quick Actions, Navigation, Clusters, and top 4 Orders by default
      const nonOrders = allItems.filter((item) => item.section !== "Orders");
      const topOrders = allItems.filter((item) => item.section === "Orders").slice(0, 4);
      return [...nonOrders, ...topOrders];
    }
    return allItems
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.sublabel?.toLowerCase().includes(q) ||
          item.keywords?.toLowerCase().includes(q)
      )
      .slice(0, 18);
  }, [allItems, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const groupedSections = useMemo(() => {
    const groups: { title: string; items: { item: CommandItem; flatIndex: number }[] }[] = [];
    const map = new Map<string, { item: CommandItem; flatIndex: number }[]>();
    filteredItems.forEach((item, flatIndex) => {
      if (!map.has(item.section)) {
        const arr: { item: CommandItem; flatIndex: number }[] = [];
        map.set(item.section, arr);
        groups.push({ title: item.section, items: arr });
      }
      map.get(item.section)!.push({ item, flatIndex });
    });
    return groups;
  }, [filteredItems]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (filteredItems.length ? (prev + 1) % filteredItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
      );
    } else if (e.key === "Enter") {
      const selected = filteredItems[activeIndex];
      if (selected) {
        e.preventDefault();
        selected.onSelect();
      }
    }
  };

  return (
    <ModalDialog
      variant="modal"
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      ariaLabel="GasLine Command Palette"
    >
      <div className="flex flex-col overflow-hidden bg-surface text-ink">
        {/* Search Header */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-ink-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, cluster, or order ID (e.g. ORD-2026-001)..."
            aria-label="Search commands and orders"
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="scroll-shadow-y gasline-scroll max-h-[60vh] overflow-y-auto p-2">
          {groupedSections.length === 0 ? (
            <div className="py-10 text-center text-xs text-ink-muted">
              No matching commands, clusters, or garment lots found.
            </div>
          ) : (
            groupedSections.map((group) => (
              <div key={group.title} className="mb-2 last:mb-0">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map(({ item, flatIndex }) => {
                    const isActive = flatIndex === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        onClick={item.onSelect}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                          isActive ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2/60"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface">
                            {item.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium text-ink">{item.label}</div>
                            {item.sublabel && (
                              <div className="truncate text-[11px] text-ink-muted">{item.sublabel}</div>
                            )}
                          </div>
                        </div>
                        {item.badge && (
                          <span className="shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-2">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between border-t border-line bg-surface-2/60 px-4 py-2 text-[11px] text-ink-muted">
          <div className="flex items-center gap-3 font-mono">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="font-mono">GasLine Quick Command</span>
        </div>
      </div>
    </ModalDialog>
  );
}

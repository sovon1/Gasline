"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ModalDialog from "./ModalDialog";
import { Language } from "../data/translations";
import { API_BASE } from "../utils/api";
import {
  AlertTriangleIcon,
  AnchorIcon,
  ArrowRightIcon,
  BrainIcon,
  CheckCircleIcon,
  InfoIcon,
  PackageIcon,
  RefreshCwIcon,
  ScaleIcon,
  SendIcon,
  ShieldCheckIcon,
  SlidersIcon,
  SparklesIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
  ZapIcon,
} from "./Icons";

type ProviderType = "gemini" | "groq" | "openai" | "ollama" | "local";

const PROVIDER_OPTIONS: { id: ProviderType; label: string; badge: string; desc: string }[] = [
  { id: "gemini", label: "Google Gemini", badge: "Live Online", desc: "1.5 Flash, 1.5 Pro, 2.0 Flash" },
  { id: "groq", label: "Groq (Llama 3.3)", badge: "Ultra Fast", desc: "500 tokens/sec, low latency" },
  { id: "openai", label: "OpenAI", badge: "GPT-4o", desc: "GPT-4o, GPT-4o-mini" },
  { id: "ollama", label: "Ollama (Local LLM)", badge: "100% Offline", desc: "Llama 3, Mistral on localhost:11434" },
  { id: "local", label: "GasLine Domain Engine", badge: "Deterministic", desc: "SCADA physics + GBDT (No key needed)" },
];

const PROVIDER_MODELS: Record<ProviderType, { id: string; name: string }[]> = {
  gemini: [
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Fast, Free)" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Deep Reasoning)" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Next-Gen)" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (Versatile, Free)" },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B (Instant)" },
  ],
  openai: [
    { id: "gpt-4o-mini", name: "GPT-4o Mini (Cost-Efficient)" },
    { id: "gpt-4o", name: "GPT-4o (Frontier Model)" },
  ],
  ollama: [
    { id: "llama3", name: "Llama 3 (Offline Local)" },
    { id: "mistral", name: "Mistral 7B (Offline Local)" },
    { id: "qwen", name: "Qwen 2.5 (Offline Local)" },
  ],
  local: [{ id: "deterministic_engine", name: "GasLine Domain Physics Engine" }],
};

interface ActionChip {
  label: string;
  action: string;
  val: any;
}

interface CopilotCard {
  card_type: string;
  data: any;
  actions?: ActionChip[];
}

interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: string;
  mode?: string;
  toolsCalled?: string[];
  cards?: CopilotCard[];
  actionChips?: ActionChip[];
}

interface AiCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSimulatePsi?: (psi: number) => void;
  onSelectOrderById?: (orderId: string) => void;
  onOpenPortBuffer?: () => void;
  onOpenForceMajeure?: (orderId: string) => void;
  currentPsi?: number;
  selectedOrderId?: string;
  activeShockId?: number | null;
}

function CopilotCardRenderer({
  card,
  onAction,
}: {
  card: CopilotCard;
  onAction: (chip: ActionChip) => void;
}) {
  if (!card || !card.card_type) return null;

  switch (card.card_type) {
    case "pressure_shock": {
      const d = card.data;
      const isSevere = Boolean(d.is_severe);
      const isModerate = Boolean(d.is_moderate);
      const badgeColor = isSevere
        ? "bg-[var(--status-critical-bg)] text-[var(--status-critical-text)] border-[var(--status-critical-border)]"
        : isModerate
        ? "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]"
        : "bg-[var(--status-safe-bg)] text-[var(--status-safe-text)] border-[var(--status-safe-border)]";
      const cardBorder = isSevere
        ? "border-[var(--status-critical-border)] bg-[var(--status-critical-bg)]"
        : isModerate
        ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]"
        : "border-[var(--status-safe-border)] bg-[var(--status-safe-bg)]";
      const barColor = isSevere ? "bg-rose-500" : isModerate ? "bg-amber-500" : "bg-emerald-500";

      return (
        <div className={`mt-3 space-y-3 rounded-xl border p-3.5 ${cardBorder}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-ink">
                {isSevere || isModerate ? (
                  <AlertTriangleIcon className="h-4 w-4 text-rose-500" />
                ) : (
                  <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                )}
              </span>
              <div>
                <span className="font-mono text-xs font-bold text-ink">
                  SCADA Simulation: {Number(d.psi).toFixed(1)} PSI
                </span>
                <p className="text-[10px] text-ink-muted">Pipeline pressure shock evaluation</p>
              </div>
            </div>
            <span className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${badgeColor}`}>
              {d.status_label}
            </span>
          </div>

          <div className="font-tabular grid grid-cols-3 gap-2 rounded-lg border border-line bg-surface px-2 py-2 text-center">
            <div>
              <div className="font-mono text-[10px] uppercase text-ink-muted">Dyeing Cap</div>
              <div className="mt-0.5 font-mono text-sm font-bold text-ink">{d.dyeing_cap_pct}%</div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full ${barColor}`}
                  style={{ width: `${Math.min(100, Math.max(0, d.dyeing_cap_pct))}%` }}
                />
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-ink-muted">At-Risk Lots</div>
              <div className="mt-0.5 font-mono text-sm font-bold text-[var(--status-warning-text)]">
                {d.orders_at_risk} Lots
              </div>
              <div className="mt-0.5 text-[9px] text-ink-muted">Dyeing Queue</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-ink-muted">Exposure</div>
              <div
                className={`mt-0.5 font-mono text-sm font-bold ${
                  d.total_exposure_usd > 0
                    ? "text-[var(--status-critical-text)]"
                    : "text-[var(--status-safe-text)]"
                }`}
              >
                ${Math.round(d.total_exposure_usd || 0).toLocaleString()}
              </div>
              <div className="mt-0.5 text-[9px] text-ink-muted">Air-Freight Risk</div>
            </div>
          </div>

          {card.actions && card.actions.length > 0 && (
            <div className="flex justify-end pt-1">
              {card.actions.map((act, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAction(act)}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg shadow-xs transition-opacity hover:opacity-90"
                >
                  <span>{act.label}</span>
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "order_risk": {
      const d = card.data;
      return (
        <div className="mt-3 space-y-3 rounded-xl border border-[var(--status-warning-border)] bg-surface p-3.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]">
                <PackageIcon className="h-4 w-4" />
              </span>
              <div>
                <span className="font-mono text-xs font-bold text-ink">
                  {d.order_id} · {d.buyer}
                </span>
                <p className="text-[10px] text-ink-muted">
                  {d.product} ({d.quantity ? Number(d.quantity).toLocaleString() : 0} pcs)
                </p>
              </div>
            </div>
            <span className="rounded border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--status-warning-text)]">
              LOT SCORING
            </span>
          </div>

          <div className="font-tabular grid grid-cols-3 gap-2 rounded-lg border border-line bg-surface-2/60 px-2 py-2 text-center">
            <div>
              <div className="font-mono text-[10px] uppercase text-ink-muted">Predicted Delay</div>
              <div className="mt-0.5 font-mono text-sm font-bold text-ink">{d.predicted_days_late} Days</div>
              <div className="mt-0.5 text-[9px] text-ink-muted">Model B GBDT</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-ink-muted">90% Conformal</div>
              <div className="mt-1 font-mono text-xs font-bold text-[var(--status-info-text)]">
                [{d.conformal_lower}, {d.conformal_upper}]d
              </div>
              <div className="mt-0.5 text-[9px] text-ink-muted">Finite-Sample</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-ink-muted">Air Penalty</div>
              <div className="mt-0.5 font-mono text-sm font-bold text-[var(--status-critical-text)]">
                ${Math.round(d.exposure_usd || 0).toLocaleString()}
              </div>
              <div className="mt-0.5 text-[9px] text-ink-muted">Buyer Liability</div>
            </div>
          </div>

          {card.actions && card.actions.length > 0 && (
            <div className="flex items-center justify-end gap-2 pt-1">
              {card.actions.map((act, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAction(act)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    act.action === "DEPLOY_RESCUE"
                      ? "bg-accent text-accent-fg shadow-xs hover:opacity-90"
                      : "border border-line bg-surface-2 text-ink hover:border-line-strong"
                  }`}
                >
                  <span>{act.label}</span>
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "rescue_plan": {
      const d = card.data;
      return (
        <div className="mt-3 space-y-3 rounded-xl border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-emerald-500">
                <ZapIcon className="h-4 w-4" />
              </span>
              <div>
                <span className="font-mono text-xs font-bold text-[var(--status-safe-text)]">{d.plan_name}</span>
                <p className="text-[10px] text-ink-2">Order: {d.order_id} · Rank #1 Prescriptive Plan</p>
              </div>
            </div>
            <span className="rounded border border-[var(--status-safe-border)] bg-surface px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--status-safe-text)]">
              OPTIMAL
            </span>
          </div>

          <div className="font-tabular grid grid-cols-4 gap-1.5 rounded-lg border border-line bg-surface px-2 py-2 text-center">
            <div>
              <div className="font-mono text-[9px] uppercase text-ink-muted">Net Savings</div>
              <div className="mt-0.5 font-mono text-xs font-bold text-[var(--status-safe-text)]">
                +${Math.round(d.net_savings_usd || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase text-ink-muted">Avoided Air</div>
              <div className="mt-0.5 font-mono text-xs font-bold text-ink">
                ${Math.round(d.avoided_air_freight_usd || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase text-ink-muted">Cost</div>
              <div className="mt-0.5 font-mono text-xs font-bold text-[var(--status-warning-text)]">
                ${Math.round(d.intervention_cost_usd || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase text-ink-muted">Risk Cut</div>
              <div className="mt-0.5 font-mono text-xs font-bold text-[var(--status-info-text)]">
                {d.risk_reduction_pct}%
              </div>
            </div>
          </div>

          {card.actions && card.actions.length > 0 && (
            <div className="flex justify-end pt-1">
              {card.actions.map((act, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAction(act)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-500"
                >
                  <span>{act.label}</span>
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "port_buffer": {
      const d = card.data;
      return (
        <div className="mt-3 space-y-3 rounded-xl border border-[var(--status-info-border)] bg-[var(--status-info-bg)] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-[var(--status-info-text)]">
                <AnchorIcon className="h-4 w-4" />
              </span>
              <div>
                <span className="font-mono text-xs font-bold text-ink">{d.port_name}</span>
                <p className="text-[10px] text-ink-2">Live Container Yard Telemetry</p>
              </div>
            </div>
            <span className="rounded border border-[var(--status-info-border)] bg-surface px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--status-info-text)]">
              {d.status}
            </span>
          </div>

          <div className="font-tabular grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface px-2 py-2 text-center">
            <div>
              <div className="font-mono text-[10px] uppercase text-ink-muted">Berth Dwell Window</div>
              <div className="mt-0.5 font-mono text-sm font-bold text-ink">{d.dwell_days} Days</div>
              <div className="mt-0.5 text-[9px] text-ink-muted">Feeder vessel turnaround</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-ink-muted">Safe Gate-In Buffer</div>
              <div className="mt-0.5 font-mono text-sm font-bold text-[var(--status-info-text)]">
                +{d.recommended_buffer_days} Days
              </div>
              <div className="mt-0.5 text-[9px] text-ink-muted">Logistics protection</div>
            </div>
          </div>

          {d.advisory && (
            <p className="flex items-start gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink-2">
              <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--status-info-text)]" />
              <span>{d.advisory}</span>
            </p>
          )}

          {card.actions && card.actions.length > 0 && (
            <div className="flex justify-end pt-1">
              {card.actions.map((act, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAction(act)}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition-opacity hover:opacity-90"
                >
                  <span>{act.label}</span>
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "force_majeure": {
      const d = card.data;
      return (
        <div className="mt-3 space-y-3 rounded-xl border border-line bg-surface p-3.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--status-info-bg)] text-[var(--status-info-text)]">
                <ScaleIcon className="h-4 w-4" />
              </span>
              <div>
                <span className="font-mono text-xs font-bold text-ink">Statutory Force Majeure Relief</span>
                <p className="text-[10px] text-ink-muted">
                  {d.certificate_ref} · Order {d.order_id}
                </p>
              </div>
            </div>
            <span className="rounded border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--status-info-text)]">
              BERC §42 RELIEF
            </span>
          </div>

          <div className="space-y-1.5 rounded-lg border border-line bg-surface-2/60 p-2.5 text-xs">
            <div className="text-[11px] text-ink">
              <strong>Legal Grounding:</strong> {d.statutory_act}
            </div>
            <p className="text-[11px] leading-relaxed text-ink-2">{d.summary}</p>
          </div>

          {card.actions && card.actions.length > 0 && (
            <div className="flex justify-end pt-1">
              {card.actions.map((act, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAction(act)}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition-opacity hover:opacity-90"
                >
                  <span>{act.label}</span>
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "ai_architecture": {
      const d = card.data;
      return (
        <div className="mt-3 space-y-3 rounded-xl border border-line bg-surface p-3.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--status-info-bg)] text-[var(--status-info-text)]">
                <BrainIcon className="h-4 w-4" />
              </span>
              <div>
                <span className="font-mono text-xs font-bold text-ink">GasLine AI Engine &amp; Rigor</span>
                <p className="text-[10px] text-ink-muted">Formal Machine Learning Architecture</p>
              </div>
            </div>
            <span className="rounded border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--status-safe-text)]">
              99.33% ACC
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="rounded-lg border border-line bg-surface-2/60 p-2">
              <span className="font-mono text-[10px] font-bold uppercase text-[var(--status-warning-text)]">
                Model A (Physics):
              </span>
              <p className="mt-0.5 text-[11px] text-ink-2">{d.model_a}</p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/60 p-2">
              <span className="font-mono text-[10px] font-bold uppercase text-[var(--status-safe-text)]">
                Model B (Risk Inference):
              </span>
              <p className="mt-0.5 text-[11px] text-ink-2">{d.model_b}</p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/60 p-2">
              <span className="font-mono text-[10px] font-bold uppercase text-[var(--status-info-text)]">
                Conformal Prediction:
              </span>
              <p className="mt-0.5 text-[11px] text-ink-2">{d.conformal_prediction}</p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/60 p-2">
              <span className="font-mono text-[10px] font-bold uppercase text-ink">Explainability (TreeSHAP):</span>
              <p className="mt-0.5 text-[11px] text-ink-2">{d.explainability}</p>
            </div>
          </div>

          {d.evaluation && (
            <div className="border-t border-line pt-1.5 text-center font-mono text-[10px] text-ink-muted">
              {d.evaluation}
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

export default function AiCopilotModal({
  isOpen,
  onClose,
  lang: initialLang,
  onSimulatePsi,
  onSelectOrderById,
  onOpenPortBuffer,
  onOpenForceMajeure,
  currentPsi,
  selectedOrderId,
  activeShockId,
}: AiCopilotModalProps) {
  const [lang, setLang] = useState<Language>(initialLang);
  const [provider, setProvider] = useState<ProviderType>("gemini");
  const [model, setModel] = useState<string>("gemini-1.5-flash");
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; description?: string }[]>(
    PROVIDER_MODELS.gemini
  );
  const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);
  const [isLiveFetched, setIsLiveFetched] = useState<boolean>(false);
  const [isCustomSelected, setIsCustomSelected] = useState<boolean>(false);
  const [customModelInput, setCustomModelInput] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [ollamaUrl, setOllamaUrl] = useState<string>("http://127.0.0.1:11434");
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const debounceFetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchModelsForProvider = async (
    targetProvider: ProviderType,
    currentKey: string,
    currentOllamaUrl: string
  ) => {
    setIsFetchingModels(true);
    try {
      const res = await fetch(`${API_BASE}/api/copilot/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: targetProvider,
          api_key: currentKey.trim() || undefined,
          base_url: targetProvider === "ollama" ? currentOllamaUrl.trim() : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
          setIsLiveFetched(Boolean(data.is_live_fetched));

          setModel((prevModel) => {
            const exists = data.models.some((m: any) => m.id === prevModel);
            if (isCustomSelected) return prevModel;
            if (!exists) {
              const fallback = data.models[0].id;
              if (typeof window !== "undefined") {
                localStorage.setItem("gasline_ai_model", fallback);
              }
              return fallback;
            }
            return prevModel;
          });
        }
      }
    } catch {
      setAvailableModels(PROVIDER_MODELS[targetProvider] || PROVIDER_MODELS.gemini);
      setIsLiveFetched(false);
    } finally {
      setIsFetchingModels(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedProvider = (localStorage.getItem("gasline_ai_provider") as ProviderType) || "gemini";
      setProvider(savedProvider);
      const savedModel = localStorage.getItem("gasline_ai_model") || PROVIDER_MODELS[savedProvider][0].id;
      setModel(savedModel);
      const savedKey =
        localStorage.getItem(`gasline_${savedProvider}_key`) ||
        localStorage.getItem("gasline_gemini_api_key") ||
        "";
      setApiKey(savedKey);
      const savedOllama = localStorage.getItem("gasline_ollama_url") || "http://127.0.0.1:11434";
      setOllamaUrl(savedOllama);

      const isKnown = PROVIDER_MODELS[savedProvider]?.some((m) => m.id === savedModel);
      if (!isKnown && savedModel && savedModel !== "__custom__") {
        setIsCustomSelected(true);
        setCustomModelInput(savedModel);
      }

      fetchModelsForProvider(savedProvider, savedKey, savedOllama);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProviderChange = (newP: ProviderType) => {
    setProvider(newP);
    setIsCustomSelected(false);
    setCustomModelInput("");
    const defaultM = PROVIDER_MODELS[newP][0].id;
    setModel(defaultM);
    setAvailableModels(PROVIDER_MODELS[newP] || []);
    setIsLiveFetched(false);

    let nextKey = "";
    if (typeof window !== "undefined") {
      localStorage.setItem("gasline_ai_provider", newP);
      localStorage.setItem("gasline_ai_model", defaultM);
      nextKey =
        localStorage.getItem(`gasline_${newP}_key`) ||
        (newP === "gemini" ? localStorage.getItem("gasline_gemini_api_key") || "" : "");
      setApiKey(nextKey);
    }
    fetchModelsForProvider(newP, nextKey, ollamaUrl);
  };

  const handleModelChange = (newM: string) => {
    setModel(newM);
    if (typeof window !== "undefined") {
      localStorage.setItem("gasline_ai_model", newM);
    }
  };

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem(`gasline_${provider}_key`, key.trim());
      if (provider === "gemini") {
        localStorage.setItem("gasline_gemini_api_key", key.trim());
      }
    }
    if (debounceFetchRef.current) clearTimeout(debounceFetchRef.current);
    debounceFetchRef.current = setTimeout(() => {
      fetchModelsForProvider(provider, key, ollamaUrl);
    }, 600);
  };

  const handleOllamaUrlChange = (url: string) => {
    setOllamaUrl(url);
    if (typeof window !== "undefined") {
      localStorage.setItem("gasline_ollama_url", url);
    }
    if (debounceFetchRef.current) clearTimeout(debounceFetchRef.current);
    debounceFetchRef.current = setTimeout(() => {
      fetchModelsForProvider(provider, apiKey, url);
    }, 600);
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-welcome",
      sender: "copilot",
      text:
        lang === "bn"
          ? "স্বাগতম! আমি গ্যাসলাইন অটোনোমাস প্ল্যান্ট কো-পাইলট। গ্যাস সংকট চলাকালে ডাইং বয়লার প্রেসার, কনফরমাল রিস্ক এবং উদ্ধার পরিকল্পনা সম্পর্কে যে কোনো প্রশ্ন করতে পারেন।"
          : "Welcome! I am the GasLine Autonomous Plant Dispatcher. Ask about real-time boiler steam pressure drops, Conformal late risk, or optimal Dual-Fuel diesel rescue economics.",
      timestamp: "Ready",
      toolsCalled: ["scada_telemetry_ready()"],
      actionChips: [
        { label: "Simulate 1.6 PSI Drop", action: "SET_PSI", val: 1.6 },
        { label: "Inspect ORD-2026-001", action: "OPEN_ORDER", val: "ORD-2026-001" },
        { label: "Port Logistics Advisory", action: "OPEN_PORT_BUFFER", val: true },
      ],
    },
  ]);

  useEffect(() => {
    setLang(initialLang);
  }, [initialLang]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const speakText = (text: string, language: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#`~[\]]/g, "").replace(/\(([^)]+)\)/g, "$1");
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = language === "bn" ? "bn-BD" : "en-US";
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech fallback
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          lang,
          provider,
          model,
          api_key: apiKey.trim() || undefined,
          base_url: provider === "ollama" ? ollamaUrl : undefined,
          history: messages.slice(-10).map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
          factory_state: {
            current_psi: currentPsi,
            selected_order_id: selectedOrderId,
            active_shock_id: activeShockId,
          },
        }),
      });

      if (!res.ok) throw new Error(`Copilot responded with HTTP ${res.status}`);

      const data = await res.json();
      const copilotMsg: ChatMessage = {
        id: `c-${Date.now()}`,
        sender: "copilot",
        text: data.reply || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mode: data.mode,
        toolsCalled: data.tools_called,
        cards: data.cards,
        actionChips: data.action_chips,
      };

      setMessages((prev) => [...prev, copilotMsg]);
      speakText(copilotMsg.text, data.lang || lang);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "copilot",
        text:
          lang === "bn"
            ? `দুঃখিত, কো-পাইলট সার্ভারের সাথে যোগাযোগ করা যায়নি (${err.message})। ব্যাকএন্ড পোর্ট ৮০০০ যাচাই করুন অথবা নিচের অ্যাকশন শর্টকাট ব্যবহার করুন।`
            : `Unable to reach the Copilot backend (${err.message}). Verify the API server on port 8000 or use the quick simulation chips above.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (chip: ActionChip) => {
    if (chip.action === "SET_PSI" && onSimulatePsi) {
      onSimulatePsi(Number(chip.val));
      onClose();
    } else if (chip.action === "OPEN_ORDER" && onSelectOrderById) {
      onSelectOrderById(String(chip.val));
      onClose();
    } else if (chip.action === "OPEN_PORT_BUFFER" && onOpenPortBuffer) {
      onOpenPortBuffer();
      onClose();
    } else if (chip.action === "DEPLOY_RESCUE" && onSelectOrderById) {
      onSelectOrderById(String(chip.val));
      onClose();
    } else if (chip.action === "OPEN_FORCE_MAJEURE" && onOpenForceMajeure) {
      onOpenForceMajeure(String(chip.val));
      onClose();
    }
  };

  const quickPrompts =
    lang === "bn"
      ? [
          { label: "স্বাভাবিক ১০ PSI টেস্ট", text: "গ্যাস প্রেশার স্বাভাবিক ১০ পিএসআই হলে কারখানার অবস্থা কী হবে?" },
          { label: "তিতাস ১.৬ পিএসআই ড্রপ", text: "তিতাস গ্যাস প্রেশার ১.৬ পিএসআই নামলে কারখানার ডাইং ও অর্ডারে কী প্রভাব পড়বে?" },
          { label: "জারা হুডি (ORD-2026-001)", text: "Inditex Zara Hoodie (ORD-2026-001) এর লেট হওয়ার ঝুঁকি এবং এয়ার ফ্রেইট কত?" },
          { label: "ডুয়াল-ফুয়েল ডিজেল রেসকিউ", text: "সবচেয়ে লাভজনক উদ্ধার পরিকল্পনা এবং ডিজেল বয়লার বুস্টের খরচ কত?" },
          { label: "AI আর্কিটেকচার ও মডেল", text: "গ্যাসলাইনে কী কী মেশিন লার্নিং মডেল ও কনফরমাল প্রেডিকশন ব্যবহার করা হয়েছে?" },
          { label: "চট্টগ্রাম পোর্ট বাফার", text: "চট্টগ্রাম বন্দর ফিডার ভেসেল বাফার ও ড্রিল টাইম কত?" },
        ]
      : [
          { label: "Simulate 10 PSI Normal", text: "What happens at 10.0 PSI normal pipeline operating conditions?" },
          { label: "1.6 PSI Summit LNG Drop", text: "What happens if pipeline pressure collapses to 1.6 PSI during Summit LNG maintenance?" },
          { label: "Zara Hoodie (ORD-2026-001)", text: "What is the Conformal delay interval and air freight penalty for Inditex PO ORD-2026-001?" },
          { label: "Dual-Fuel Diesel Economics", text: "Show the top ranked rescue plan and net financial savings for critical orders." },
          { label: "AI Models & Math", text: "Explain the machine learning models and Conformal Prediction architecture used in GasLine." },
          { label: "Chattogram Port Buffer", text: "What is the CPA container berth dwell buffer and logistics congestion advisory?" },
        ];

  const hasKey = provider === "ollama" || provider === "local" || apiKey.trim().length > 5;

  return (
    <ModalDialog
      variant="drawer"
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      ariaLabelledBy="copilot-modal-title"
    >
      <div className="flex h-full flex-col bg-surface text-ink">
        {/* Header Bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface-2/60 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] text-[var(--status-safe-text)]">
              <SparklesIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="copilot-modal-title" className="text-sm font-semibold text-ink">
                  {lang === "bn" ? "গ্যাসলাইন অটোনোমাস কো-পাইলট" : "GasLine Autonomous Plant Copilot"}
                </h2>
                <span className="rounded border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-[var(--status-safe-text)]">
                  ReAct Agent
                </span>
              </div>
              <p className="text-[11px] text-ink-muted">
                {lang === "bn"
                  ? "মাল্টি-মডেল এসসিএডিএ টুল কলিং ও ডোমেইন রিজনিং ইঞ্জিন"
                  : "Multi-model SCADA tool calling & domain reasoning"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                if (!next && typeof window !== "undefined") window.speechSynthesis?.cancel();
              }}
              title="Voice Synthesizer (Text-to-Speech)"
              aria-pressed={voiceEnabled}
              className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                voiceEnabled
                  ? "border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] text-[var(--status-safe-text)]"
                  : "border-line bg-surface text-ink-2 hover:bg-surface-2"
              }`}
            >
              {voiceEnabled ? <Volume2Icon className="h-3.5 w-3.5" /> : <VolumeXIcon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{voiceEnabled ? "Spoken" : "Mute"}</span>
            </button>

            <div className="flex items-center rounded-lg border border-line bg-surface-2 p-0.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`rounded px-2 py-0.5 transition-colors ${
                  lang === "en" ? "bg-surface font-semibold text-ink shadow-2xs" : "text-ink-muted hover:text-ink"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("bn")}
                className={`rounded px-2 py-0.5 transition-colors ${
                  lang === "bn" ? "bg-surface font-semibold text-ink shadow-2xs" : "text-ink-muted hover:text-ink"
                }`}
              >
                বাং
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI Copilot"
              className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Multi-Model Provider Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2/40 px-5 py-2 text-xs">
          <div className="flex items-center gap-2 text-ink-2">
            <span className={`h-2 w-2 rounded-full ${hasKey ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className="font-mono text-[11px]">
              Provider:{" "}
              <strong className="text-ink">
                {provider === "gemini" && `Google Gemini (${model})`}
                {provider === "groq" && `Groq (${model})`}
                {provider === "openai" && `OpenAI (${model})`}
                {provider === "ollama" && `Ollama Offline (${model})`}
                {provider === "local" && "GasLine Domain Engine"}
              </strong>
              {isLiveFetched && (
                <span className="ml-1.5 rounded border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[var(--status-safe-text)]">
                  LIVE API
                </span>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface-2"
          >
            <SlidersIcon className="h-3 w-3 text-ink-muted" />
            <span>{showConfig ? "Hide Config" : "Switch Model / Key"}</span>
          </button>
        </div>

        {/* Expandable Model & API Key Configuration Drawer */}
        {showConfig && (
          <div className="space-y-3 border-b border-line bg-surface-2/60 px-5 py-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-mono text-[10px] font-bold uppercase text-ink-muted">
                  AI Model Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
                  className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-ink focus:border-line-strong focus:outline-none"
                >
                  {PROVIDER_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.badge})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="font-mono text-[10px] font-bold uppercase text-ink-muted">
                    Model Variant
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-ink-muted">
                      {isFetchingModels
                        ? "Syncing..."
                        : isLiveFetched
                        ? `Live API (${availableModels.length})`
                        : `Baseline (${availableModels.length})`}
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchModelsForProvider(provider, apiKey, ollamaUrl)}
                      disabled={isFetchingModels}
                      title="Fetch live models from provider API"
                      className="flex items-center gap-1 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-ink-2 transition-colors hover:bg-surface-2"
                    >
                      <RefreshCwIcon className="h-2.5 w-2.5" />
                      <span>Sync</span>
                    </button>
                  </div>
                </div>

                <select
                  value={isCustomSelected ? "__custom__" : model}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomSelected(true);
                      if (customModelInput) handleModelChange(customModelInput);
                    } else {
                      setIsCustomSelected(false);
                      handleModelChange(e.target.value);
                    }
                  }}
                  className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-ink focus:border-line-strong focus:outline-none"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id} title={m.description || m.id}>
                      {m.name || m.id}
                    </option>
                  ))}
                  <option value="__custom__">Custom Model ID...</option>
                </select>

                {isCustomSelected && (
                  <div className="mt-1.5 space-y-1">
                    <input
                      type="text"
                      placeholder="Enter model ID (e.g. deepseek-r1-distill-llama-70b)..."
                      value={customModelInput}
                      onChange={(e) => {
                        setCustomModelInput(e.target.value);
                        handleModelChange(e.target.value);
                      }}
                      className="w-full rounded-lg border border-[var(--status-warning-border)] bg-surface px-2.5 py-1 font-mono text-xs text-ink focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {provider === "ollama" ? (
              <div>
                <label className="mb-1 block font-mono text-[10px] font-bold uppercase text-ink-muted">
                  Local Ollama Base URL
                </label>
                <input
                  type="text"
                  placeholder="http://127.0.0.1:11434"
                  value={ollamaUrl}
                  onChange={(e) => handleOllamaUrlChange(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 font-mono text-xs text-ink focus:border-line-strong focus:outline-none"
                />
              </div>
            ) : provider === "local" ? (
              <div className="flex items-start gap-2 rounded-lg border border-line bg-surface p-2.5 text-[11px] text-ink-2">
                <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-safe-text)]" />
                <div>
                  <strong className="text-ink">Offline Deterministic Physics Engine</strong>
                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    Operates without external API keys using GasLine&apos;s scikit-learn GBDT risk inference, Conformal
                    bounds, and saturated steam tables.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[10px] font-bold uppercase text-ink-muted">
                    {provider === "gemini" && "Google Gemini API Key"}
                    {provider === "groq" && "Groq API Key"}
                    {provider === "openai" && "OpenAI API Key"}
                  </label>
                  {apiKey && (
                    <span className="font-mono text-[10px] text-[var(--status-safe-text)]">Key Saved</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder={`Paste ${provider.toUpperCase()} API key...`}
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    className="flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 font-mono text-xs text-ink focus:border-line-strong focus:outline-none"
                  />
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => handleApiKeyChange("")}
                      className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink-2 hover:bg-surface-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            <p className="border-t border-line pt-1.5 text-[10px] text-ink-muted">
              Supports Gemini, Groq, OpenAI, local Ollama, or deterministic SCADA engine fallback when offline.
            </p>
          </div>
        )}

        {/* Chat Message Scrollport */}
        <div className="scroll-shadow-y gasline-scroll flex-1 space-y-4 overflow-y-auto p-5 font-sans text-xs sm:text-sm">
          {messages.map((m) => {
            const isUser = m.sender === "user";
            return (
              <div key={m.id} className={`flex flex-col space-y-1.5 ${isUser ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-2 px-1 text-[10px] text-ink-muted">
                  <span className="font-semibold text-ink-2">
                    {isUser ? "You (Plant Merchandiser)" : "GasLine ReAct Dispatcher"}
                  </span>
                  <span suppressHydrationWarning>{m.timestamp}</span>
                  {m.mode && (
                    <span className="rounded border border-line bg-surface-2 px-1 font-mono text-[9px] text-ink-2">
                      {m.mode}
                    </span>
                  )}
                </div>

                <div
                  className={`max-w-[88%] rounded-xl px-4 py-3 leading-relaxed shadow-2xs ${
                    isUser
                      ? "rounded-tr-xs bg-accent font-medium text-accent-fg"
                      : "rounded-tl-xs border border-line bg-surface-2/60 text-ink"
                  }`}
                >
                  {m.toolsCalled && m.toolsCalled.length > 0 && (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5 border-b border-line pb-2">
                      <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-ink-muted">
                        <ZapIcon className="h-3 w-3 text-amber-500" />
                        <span>SCADA Tools:</span>
                      </span>
                      {m.toolsCalled.map((tool, i) => (
                        <span
                          key={i}
                          className="rounded border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--status-safe-text)]"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}

                  {isUser ? (
                    <div className="whitespace-pre-wrap text-xs font-medium leading-relaxed sm:text-sm">
                      {m.text}
                    </div>
                  ) : (
                    <div className="overflow-x-hidden text-xs text-ink sm:text-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 leading-relaxed text-ink last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
                          em: ({ children }) => <em className="italic text-ink-2">{children}</em>,
                          ul: ({ children }) => (
                            <ul className="mb-2 ml-4 list-outside list-disc space-y-1 text-ink-2">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-2 ml-4 list-outside list-decimal space-y-1 text-ink-2">{children}</ol>
                          ),
                          li: ({ children }) => <li className="leading-snug">{children}</li>,
                          h1: ({ children }) => <h1 className="mb-1.5 mt-2.5 text-base font-bold text-ink">{children}</h1>,
                          h2: ({ children }) => <h2 className="mb-1 mt-2 text-sm font-bold text-ink">{children}</h2>,
                          h3: ({ children }) => (
                            <h3 className="mb-1 mt-2 text-xs font-bold uppercase tracking-wide text-ink-2">
                              {children}
                            </h3>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="my-2 rounded-r border-l-2 border-amber-500 bg-surface py-1 pl-3 italic text-ink-2">
                              {children}
                            </blockquote>
                          ),
                          code: ({ inline, children, ...props }: any) => {
                            if (inline) {
                              return (
                                <code
                                  className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink"
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <pre className="my-2 overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-xs text-ink">
                                <code {...props}>{children}</code>
                              </pre>
                            );
                          },
                          table: ({ children }) => (
                            <div className="my-2 overflow-x-auto rounded-lg border border-line">
                              <table className="min-w-full divide-y divide-line text-xs">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-surface font-mono font-bold text-ink">{children}</thead>
                          ),
                          tbody: ({ children }) => <tbody className="divide-y divide-line text-ink-2">{children}</tbody>,
                          tr: ({ children }) => <tr className="hover:bg-surface/60">{children}</tr>,
                          th: ({ children }) => <th className="px-2.5 py-1.5 text-left text-[11px]">{children}</th>,
                          td: ({ children }) => <td className="px-2.5 py-1.5 text-[11px]">{children}</td>,
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-[var(--status-info-text)] underline"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    </div>
                  )}

                  {m.cards && m.cards.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {m.cards.map((card, cIdx) => (
                        <CopilotCardRenderer key={cIdx} card={card} onAction={handleActionClick} />
                      ))}
                    </div>
                  )}

                  {m.actionChips && m.actionChips.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-2.5">
                      {m.actionChips.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleActionClick(chip)}
                          className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink shadow-2xs transition-colors hover:border-line-strong hover:bg-surface-2"
                        >
                          <span>{chip.label}</span>
                          <ArrowRightIcon className="h-3 w-3 text-ink-muted" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex w-fit items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-mono">
                {lang === "bn"
                  ? "টুল কলিং ও ফিজিক্স সিমুলেশন চলছে..."
                  : "Invoking SCADA telemetry & Model B inference..."}
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Suggested Chips */}
        <div className="scroll-fade-x flex items-center gap-2 border-t border-line bg-surface-2/40 px-5 py-2.5 text-[11px]">
          <span className="shrink-0 font-mono text-[9px] font-semibold uppercase text-ink-muted">
            {lang === "bn" ? "দ্রুত প্রশ্ন:" : "Prompts:"}
          </span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(p.text)}
              disabled={loading}
              className="shrink-0 rounded-full border border-line bg-surface px-2.5 py-1 text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex shrink-0 items-center gap-2.5 border-t border-line bg-surface p-4">
          <input
            type="text"
            placeholder={
              lang === "bn"
                ? "প্রশ্ন লিখুন (যেমন: simulate 10psi বা তিতাস ১.৬ পিএসআই)"
                : "Ask Copilot (e.g., simulate 10psi, or Inditex Hoodie risk)..."
            }
            aria-label="Ask GasLine Copilot"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={loading}
            className="flex-1 rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-line-strong focus:bg-surface focus:outline-none sm:text-sm"
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={loading || !inputMessage.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-accent-fg shadow-xs transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            <span>{lang === "bn" ? "পাঠান" : "Send"}</span>
            <SendIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

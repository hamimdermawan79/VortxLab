import { 
  Database, Layers, Zap, Cpu, ShieldCheck, Terminal, Search 
} from "lucide-react";

export const TOOL_UI_CONFIG: Record<string, { icon: any; pricingUnit: 'day' | 'id' }> = {
  "mac-extractor":    { icon: Database,     pricingUnit: 'day' },
  "mac-splitter":     { icon: Layers,       pricingUnit: 'day' },
  "nomac-extractor":  { icon: Zap,          pricingUnit: 'day' },
  "xml-conf":         { icon: Cpu,          pricingUnit: 'day' },
  "cek-id":           { icon: ShieldCheck,  pricingUnit: 'id' },
  "sortir-banned":    { icon: ShieldCheck,  pricingUnit: 'id' },
  "result-proc":      { icon: Terminal,     pricingUnit: 'day' },
  "data-checker":     { icon: Search,       pricingUnit: 'day' },
};

import type { Species } from "./tropel";

export type SignalType =
  | "HAMBRE"
  | "ABANDONO"
  | "MUTACION"
  | "FUGA"
  | "CONFLICTO"
  | "REPRODUCCION_MASIVA"
  | "SENAL_CORRUPTA";

export type Severity =
  | "LEVE"
  | "MODERADO"
  | "GRAVE"
  | "CRITICO";

export type SignalStatus =
  | "RECIBIDA"
  | "PROCESANDO"
  | "ATENDIDA";

export interface Signal {
  id: string;
  signalType: SignalType;
  severity: Severity;
  status: SignalStatus;
  rawContent: string;
  tropel: {
    id: string;
    name: string;
    species: Species;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SignalsFeedResponse {
  items: Signal[];
  nextCursor: string | null;
  hasMore: boolean;
  totalEstimate: number;
}
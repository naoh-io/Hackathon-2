export type Species =
  | "BLOBITO"
  | "CHISPA"
  | "GRUNON"
  | "DORMILON"
  | "GLITCHY";

export type VitalState =
  | "ESTABLE"
  | "HAMBRIENTO"
  | "AGITADO"
  | "MUTANDO"
  | "CRITICO";

export interface Tropel {
  id: string;
  name: string;
  species: Species;
  vitalState: VitalState;
  energyLevel: number;
  chaosIndex: number;
  mutationStage: number;
  guardianName: string;
  sector: {
    id: string;
    name: string;
    sectorCode: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TropelsResponse {
  content: Tropel[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}
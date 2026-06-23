export interface Sector {
  id: string;
  sectorCode: string;
  name: string;
  climate: string;
  capacity: number;
  currentLoad: number;
  stabilityLevel: number;
}

export interface SectorsResponse {
  items: Sector[];
}
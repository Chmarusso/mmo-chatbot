export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  qrRequired: boolean;
  createdAt: string;
  updatedAt: string;
  collectedAt?: string | null;
}

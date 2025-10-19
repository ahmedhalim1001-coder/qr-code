export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface ShippingCompany {
  id: number;
  companyName: string;
  createdAt: string;
}

export interface Device {
  id: number;
  deviceName: string;
  apiKey: string;
  active: boolean;
  createdAt: string;
}

export interface Shipment {
  id: number;
  barcode: string;
  companyId: number;
  companyName: string;
  userId: number | null;
  userName: string | null;
  deviceId: number | null;
  deviceName: string | null;
  scannedAt: string;
}

export interface OfflineScan {
  barcode: string;
  companyId: string;
  userId: number;
  scannedAt: string;
}

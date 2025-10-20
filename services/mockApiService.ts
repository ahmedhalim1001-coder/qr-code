import { User, ShippingCompany, Device, Shipment, shipmentStatuses, ShipmentStatus } from '../types';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Helper to generate unique IDs
const uniqueId = (() => {
  let id = 100;
  return () => id++;
})();

class ApiService {
  private users: User[] = [
    { id: 1, username: 'admin', fullName: 'Admin User', role: 'admin', createdAt: new Date('2023-01-01').toISOString() },
    { id: 2, username: 'ibrahim', fullName: 'Ibrahim S', role: 'user', createdAt: new Date('2023-01-02').toISOString() },
    { id: 3, username: 'sara', fullName: 'Sara K', role: 'user', createdAt: new Date('2023-01-03').toISOString() },
  ];

  private companies: ShippingCompany[] = [
    { id: 1, companyName: 'Aramex', createdAt: new Date().toISOString() },
    { id: 2, companyName: 'FedEx', createdAt: new Date().toISOString() },
    { id: 3, companyName: 'UPS', createdAt: new Date().toISOString() },
  ];

  private devices: Device[] = [
      { id: 1, deviceName: 'Warehouse PDA 1', apiKey: 'key_wh1pda1_abc123', active: true, createdAt: new Date().toISOString() },
      { id: 2, deviceName: 'Delivery Van 3', apiKey: 'key_dv3pda1_def456', active: true, createdAt: new Date().toISOString() },
      { id: 3, deviceName: 'Main Office Scanner', apiKey: 'key_mo1scn1_ghi789', active: false, createdAt: new Date().toISOString() },
  ];
  
  private shipments: Shipment[] = [];

  constructor() {
    // Generate some initial shipments
    if (this.shipments.length === 0) { // Ensure seed only runs once
        for(let i = 0; i < 50; i++) {
            const user = this.users[Math.floor(Math.random() * this.users.length)];
            const company = this.companies[Math.floor(Math.random() * this.companies.length)];
            const device = this.devices[Math.floor(Math.random() * this.devices.length)];
            this.shipments.push({
                id: uniqueId(),
                barcode: `BC${1000 + i}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                companyId: company.id,
                companyName: company.companyName,
                userId: user.id,
                userName: user.fullName,
                deviceId: Math.random() > 0.5 ? device.id : null,
                deviceName: Math.random() > 0.5 ? device.deviceName : null,
                scannedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                status: shipmentStatuses[Math.floor(Math.random() * shipmentStatuses.length)],
            });
        }
        this.shipments.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
    }
  }

  // --- Auth ---
  async login(username: string, password_unused: string): Promise<User> {
    await delay(500);
    const user = this.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user) {
      // Per login page hint, any password is valid for mock
      return user;
    }
    throw new Error('Invalid credentials');
  }

  // --- Users ---
  async getUsers(): Promise<User[]> {
    await delay(300);
    return [...this.users];
  }

  async addUser(fullName: string, username: string, role: 'admin' | 'user'): Promise<User> {
    await delay(400);
    if (this.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        throw new Error('Username already exists.');
    }
    const newUser: User = {
        id: uniqueId(),
        fullName,
        username,
        role,
        createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(id: number, fullName: string, username: string, role: 'admin' | 'user'): Promise<User> {
      await delay(400);
      const user = this.users.find(u => u.id === id);
      if (!user) throw new Error('User not found.');
      if (this.users.some(u => u.id !== id && u.username.toLowerCase() === username.toLowerCase())) {
          throw new Error('Username already exists.');
      }
      user.fullName = fullName;
      user.username = username;
      user.role = role;
      return user;
  }

  async deleteUser(id: number): Promise<void> {
      await delay(500);
      if (id === 1) throw new Error('Cannot delete the main admin user.'); // Safeguard
      
      // Unlink user from shipments instead of blocking deletion
      this.shipments.forEach(shipment => {
          if (shipment.userId === id) {
              shipment.userId = null;
              shipment.userName = null;
          }
      });
      
      this.users = this.users.filter(u => u.id !== id);
  }


  // --- Companies ---
  async getCompanies(): Promise<ShippingCompany[]> {
    await delay(300);
    return [...this.companies].sort((a,b) => a.companyName.localeCompare(b.companyName));
  }

  async addCompany(companyName: string): Promise<ShippingCompany> {
    await delay(400);
    if (this.companies.some(c => c.companyName.toLowerCase() === companyName.toLowerCase())) {
        throw new Error('Company name already exists.');
    }
    const newCompany: ShippingCompany = {
      id: uniqueId(),
      companyName,
      createdAt: new Date().toISOString(),
    };
    this.companies.push(newCompany);
    return newCompany;
  }

  async updateCompany(id: number, companyName: string): Promise<ShippingCompany> {
    await delay(400);
    const company = this.companies.find(c => c.id === id);
    if (!company) throw new Error('Company not found.');
    if (this.companies.some(c => c.id !== id && c.companyName.toLowerCase() === companyName.toLowerCase())) {
        throw new Error('Company name already exists.');
    }
    company.companyName = companyName;
    return company;
  }

  async deleteCompany(id: number): Promise<void> {
    await delay(500);
    // Cascade delete: also remove shipments associated with this company
    this.shipments = this.shipments.filter(s => s.companyId !== id);
    this.companies = this.companies.filter(c => c.id !== id);
  }

  // --- Devices ---
  async getDevices(): Promise<Device[]> {
    await delay(300);
    return [...this.devices];
  }

  async addDevice(deviceName: string): Promise<Device> {
    await delay(400);
    if (this.devices.some(d => d.deviceName.toLowerCase() === deviceName.toLowerCase())) {
        throw new Error('Device name already exists.');
    }
    const newDevice: Device = {
        id: uniqueId(),
        deviceName,
        apiKey: `key_${uniqueId()}_${Math.random().toString(36).substring(2, 10)}`,
        active: true,
        createdAt: new Date().toISOString(),
    };
    this.devices.push(newDevice);
    return newDevice;
  }

  async deleteDevice(id: number): Promise<void> {
    await delay(500);
    // Unlink device from shipments instead of blocking deletion
    this.shipments.forEach(shipment => {
        if (shipment.deviceId === id) {
            shipment.deviceId = null;
            shipment.deviceName = null;
        }
    });
    this.devices = this.devices.filter(d => d.id !== id);
  }

  async toggleDeviceActive(id: number): Promise<Device> {
    await delay(200);
    const device = this.devices.find(d => d.id === id);
    if (!device) throw new Error('Device not found');
    device.active = !device.active;
    return device;
  }

  async regenerateApiKey(id: number): Promise<Device> {
    await delay(300);
    const device = this.devices.find(d => d.id === id);
    if (!device) throw new Error('Device not found');
    device.apiKey = `key_${uniqueId()}_${Math.random().toString(36).substring(2, 10)}`;
    return device;
  }
  
  // --- Shipments ---
  private filterShipments(
    filters: { from?: string; to?: string; companyId?: number; userId?: number; },
    requestingUser?: User | null
  ): Shipment[] {
    let effectiveFilters = { ...filters };
    // If a regular user is making the request, force the filter to their ID.
    // An admin can still filter by a specific user by passing a userId.
    if (requestingUser?.role === 'user' && !effectiveFilters.userId) {
      effectiveFilters.userId = requestingUser.id;
    }
    
    let filtered = [...this.shipments];
    
    if (effectiveFilters.from) {
        filtered = filtered.filter(s => new Date(s.scannedAt) >= new Date(effectiveFilters.from!));
    }
    if (effectiveFilters.to) {
        const toDate = new Date(effectiveFilters.to);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(s => new Date(s.scannedAt) <= toDate);
    }
    if (effectiveFilters.companyId) {
        filtered = filtered.filter(s => s.companyId === effectiveFilters.companyId);
    }
    if (effectiveFilters.userId) {
        filtered = filtered.filter(s => s.userId === effectiveFilters.userId);
    }
    return filtered;
  }

  async getAllFilteredShipments(
    filters: { from?: string; to?: string; companyId?: number; userId?: number; },
    requestingUser?: User | null
  ): Promise<Shipment[]> {
    await delay(1000); 
    return this.filterShipments(filters, requestingUser);
  }

  async getShipments(
    page: number, 
    limit: number, 
    filters: { from?: string; to?: string; companyId?: number; userId?: number; },
    requestingUser?: User | null
  ): Promise<{ data: Shipment[], total: number }> {
    await delay(700);
    const allFiltered = this.filterShipments(filters, requestingUser);
    const data = allFiltered.slice((page - 1) * limit, page * limit);
    return { data, total: allFiltered.length };
  }

  async addShipment(barcode: string, companyId: number, userId: number, deviceId: number | null, scannedAt?: string): Promise<Shipment> {
    await delay(500);
    const company = this.companies.find(c => c.id === companyId);
    if (!company) throw new Error('Company not found.');

    const user = this.users.find(u => u.id === userId);
    const device = deviceId ? this.devices.find(d => d.id === deviceId) : null;
    
    if (deviceId && device && !device.active) {
        throw new Error('Device is inactive.');
    }

    const newShipment: Shipment = {
        id: uniqueId(),
        barcode,
        companyId,
        companyName: company.companyName,
        userId: user?.id || null,
        userName: user?.fullName || null,
        deviceId: device?.id || null,
        deviceName: device?.deviceName || null,
        scannedAt: scannedAt || new Date().toISOString(),
        status: 'قيد التنفيذ',
    };
    this.shipments.unshift(newShipment); // Add to the top
    this.shipments.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
    return newShipment;
  }

  async updateShipment(id: number, status: ShipmentStatus): Promise<Shipment> {
      await delay(300);
      const shipment = this.shipments.find(s => s.id === id);
      if (!shipment) throw new Error('Shipment not found.');
      shipment.status = status;
      return shipment;
  }

  async deleteShipment(id: number): Promise<void> {
      await delay(500);
      this.shipments = this.shipments.filter(s => s.id !== id);
  }
}

export const api = new ApiService();
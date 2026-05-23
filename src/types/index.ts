export interface Driver {
  id: string;
  name: string;
  phone: string;
  yearlySalary?: number;
  picLink?: string;
  createdAt: Date;
  userId: string;
}

export interface DriverPayment {
  id: string;
  driverId: string;
  driverName: string;
  amount: number;
  modeOfPayment: string;
  reason: string;
  details?: string;
  date: Date;
  userId: string;
}

export interface Tractor {
  id: string;
  name: string;
  boughtDate: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  details?: string;
  picLink?: string;
  userId: string;
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  loyaltyLevel: string;
  picLink?: string;
  userId: string;
  createdAt: Date;
}

export interface Service {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
}

export interface ServiceRecord {
  id: string;
  customerName: string;
  customerId: string;
  driverName: string;
  driverId: string;
  tractorId: string;
  tractorName: string;
  serviceName: string;
  serviceId: string;
  areaOrTime: string;
  amount: number;
  paidAmount: number;
  paymentStatus: "paid" | "partial" | "unpaid";
  date: Date;
  userId: string;
}

export interface MaintenanceRecord {
  id: string;
  tractorId: string;
  tractorName: string;
  description: string;
  cost: number;
  date: Date;
  userId: string;
}

export interface Expenditure {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: Date;
  userId: string;
}
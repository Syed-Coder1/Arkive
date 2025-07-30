export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'employee';
  createdAt: Date;
  lastLogin?: Date;
  lastModified?: Date;
}

export interface Client {
  id: string;
  name: string;
  cnic: string;
  password: string;
  type: 'IRIS' | 'SECP' | 'PRA' | 'Other';
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastModified?: Date;
}

export interface Receipt {
  id: string;
  clientName: string;
  clientCnic: string;
  amount: number;
  natureOfWork: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'online';
  date: Date;
  createdAt: Date;
  createdBy: string;
  lastModified?: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'office' | 'utilities' | 'supplies' | 'maintenance' | 'food' | 'rent' | 'salary' | 'other';
  date: Date;
  createdAt: Date;
  createdBy: string;
  lastModified?: Date;
}

export interface Activity {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: Date;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: Date;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  salary: number;
  joinDate: Date;
  status: 'active' | 'inactive' | 'terminated';
  username: string;
  password: string;
  role: 'employee' | 'manager';
  createdAt: Date;
  updatedAt: Date;
  lastModified?: Date;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'leave';
  notes?: string;
  workingHours?: number;
  createdAt: Date;
  lastModified?: Date;
}

export interface Document {
  id: string;
  clientCnic: string;
  fileName: string;
  fileType: 'cnic' | 'tax_file' | 'contract' | 'invoice' | 'other';
  fileSize: number;
  mimeType: string;
  encryptedData: string;
  tags: string[];
  uploadedBy: string;
  uploadedAt: Date;
  lastAccessed?: Date;
  lastModified?: Date;
  accessLog: {
    userId: string;
    timestamp: Date;
    action: 'view' | 'download' | 'upload';
  }[];
}

export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  activeClients: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  recentReceipts: Receipt[];
}

export interface Whiteboard {
  id: string;
  name: string;
  location: string;
  content: WhiteboardContent;
  template?: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastViewedAt: Date;
  createdBy: string;
}

export interface WhiteboardContent {
  elements: WhiteboardElement[];
  canvasSize: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };
}

export interface WhiteboardElement {
  id: string;
  type: 'text' | 'shape' | 'arrow' | 'sticky' | 'image' | 'drawing' | 'rectangle' | 'circle' | 'triangle';
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
  style: {
    color: string;
    backgroundColor: string;
    fontSize?: number;
    strokeWidth?: number;
    opacity?: number;
  };
  rotation?: number;
  zIndex: number;
}

export interface WhiteboardTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  content: WhiteboardContent;
}
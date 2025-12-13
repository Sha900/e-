export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export enum VisionMode {
  OFF = 'OFF',
  ON = 'ON'
}

export interface LogEntry {
  id: string;
  source: 'user' | 'system' | 'model';
  text: string;
  timestamp: Date;
}

export interface AudioVisualizerData {
  volume: number; // 0 to 1
  frequencyData: Uint8Array;
}
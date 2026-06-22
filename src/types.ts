/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QRCodeItem {
  id: string;         // Unique ID in database
  code: string;       // The actual data string for QR code (e.g., "PROD-00123")
  name: string;       // Display Name/Title of the item
  price?: string | number; // Display Price (optional)
  category?: string;  // Category/Grouping (optional)
  createdAt: string;  // Timestamp
  notes?: string;     // Additional field
  printedCount: number; // Tracking print count
}

export type PrintLayoutType = 'grid' | 'single-column' | 'badge';

export interface PrintSetup {
  qrSize: number;       // Pixel size (e.g., 100)
  layoutCols: number;   // Grid columns (e.g., 2, 3, 4, 6)
  showLabel: boolean;   // Product name displayed below QR
  showCode: boolean;    // Code string displayed below QR
  showPrice: boolean;   // Price text displayed below QR
  badgeWidth: string;   // Label width in mm/px for CSS print sizing
  badgeHeight: string;  // Label height in mm/px
  fontSize: number;     // Font size for labels (px)
  spacing: number;      // Padding / gap between QR codes (px)
  colorDark: string;    // Foreground color (#000000)
  colorLight: string;   // Background color (#ffffff)
}

export interface ImportFieldMapping {
  code: string;
  name: string;
  price: string;
  category: string;
  notes: string;
}

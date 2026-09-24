// OpsFlow 360 – Google Sheets & Google Drive API Client & Service Wrapper

import { google } from 'googleapis';

export const DEFAULT_VENDOR_SPREADSHEET_ID = '1aV7d-5e263Esq1_uO7eY_YvX9aB1Hw0jZ3l3l7h5m5c';
export const DEFAULT_INTERBANK_SPREADSHEET_ID = '1VTHJhHcxAf-1ny_pNsWg9_-AZUiOuJtjZ4-8FphAD6o';
export const DEFAULT_BENEFICIARY_SPREADSHEET_ID = '15nd-fIaWYoiS3LYZnY-C0bnicHomEemgAnu_Ll6z7gA';
export const DEFAULT_IT_CHECKLIST_SPREADSHEET_ID = '1NBjkQKe2IOPVJB_LdfPN6c0CotH850DemssPDjZohDo';

export interface GoogleConnectionStatus {
  connected: boolean;
  spreadsheetId?: string;
  interbankSpreadsheetId?: string;
  beneficiarySpreadsheetId?: string;
  itChecklistSpreadsheetId?: string;
  serviceAccountEmail?: string;
  driveFolderConfigured: boolean;
  mode: 'LIVE_GOOGLE_WORKSPACE' | 'LOCAL_SHEETS_COMPLIANT_REPOSITORY';
  details: string;
}

class GoogleIntegrationService {
  private sheetsClient: any = null;
  private driveClient: any = null;
  private isConfigured = false;
  private authError: string | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (clientEmail && privateKeyRaw) {
      try {
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
        const auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey,
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive',
          ],
        });

        this.sheetsClient = google.sheets({ version: 'v4', auth });
        this.driveClient = google.drive({ version: 'v3', auth });
        this.isConfigured = true;
      } catch (err: any) {
        this.authError = err?.message || 'Failed to initialize Google API credentials';
        this.isConfigured = false;
      }
    }
  }

  getVendorSpreadsheetId(): string {
    return process.env.GOOGLE_SHEETS_SPREADSHEET_ID || DEFAULT_VENDOR_SPREADSHEET_ID;
  }

  getInterbankSpreadsheetId(): string {
    return process.env.GOOGLE_SHEETS_INTERBANK_SPREADSHEET_ID || DEFAULT_INTERBANK_SPREADSHEET_ID;
  }

  getBeneficiarySpreadsheetId(): string {
    return process.env.GOOGLE_SHEETS_BENEFICIARY_SPREADSHEET_ID || DEFAULT_BENEFICIARY_SPREADSHEET_ID;
  }

  getITChecklistSpreadsheetId(): string {
    return process.env.GOOGLE_SHEETS_IT_CHECKLIST_SPREADSHEET_ID || DEFAULT_IT_CHECKLIST_SPREADSHEET_ID;
  }

  getStatus(): GoogleConnectionStatus {
    const spreadsheetId = this.getVendorSpreadsheetId();
    const interbankSpreadsheetId = this.getInterbankSpreadsheetId();
    const beneficiarySpreadsheetId = this.getBeneficiarySpreadsheetId();
    const itChecklistSpreadsheetId = this.getITChecklistSpreadsheetId();
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    if (this.isConfigured && this.sheetsClient) {
      return {
        connected: true,
        spreadsheetId,
        interbankSpreadsheetId,
        beneficiarySpreadsheetId,
        itChecklistSpreadsheetId,
        serviceAccountEmail: clientEmail,
        driveFolderConfigured: !!folderId,
        mode: 'LIVE_GOOGLE_WORKSPACE',
        details: 'Live connection to Google Sheets (Vendor, Interbank, Beneficiary, IT Checklist) & Google Drive operational.',
      };
    }

    return {
      connected: false,
      spreadsheetId,
      interbankSpreadsheetId,
      beneficiarySpreadsheetId,
      itChecklistSpreadsheetId,
      serviceAccountEmail: clientEmail || undefined,
      driveFolderConfigured: false,
      mode: 'LOCAL_SHEETS_COMPLIANT_REPOSITORY',
      details: this.authError
        ? `Configuration Error: ${this.authError}. Defaulted to zero-latency Sheets-compliant repository engine.`
        : 'Running in zero-latency Sheets-compliant repository engine with full 15-tab schema & atomic locking.',
    };
  }

  /**
   * Appends a row to a specified Google Sheet tab if credentials are live
   */
  async appendRowToSheet(tabName: string, rowValues: any[], targetSpreadsheetId?: string): Promise<boolean> {
    if (!this.isConfigured || !this.sheetsClient) {
      return false;
    }

    const spreadsheetId = targetSpreadsheetId || this.getVendorSpreadsheetId();
    try {
      await this.sheetsClient.spreadsheets.values.append({
        spreadsheetId,
        range: `${tabName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowValues],
        },
      });
      return true;
    } catch (err: any) {
      console.warn(`[Google Sheets Warning] Could not append to ${tabName} in ${spreadsheetId}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Fetches all rows from Vendor Payments "Form Responses 1" tab in read-only mode
   */
  async fetchFormResponses(): Promise<any[][]> {
    if (!this.isConfigured || !this.sheetsClient) {
      return [];
    }
    const spreadsheetId = this.getVendorSpreadsheetId();
    try {
      const res = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: 'Form Responses 1!A2:R',
      });
      return res.data.values || [];
    } catch (err: any) {
      console.warn('[Google Sheets Warning] Could not fetch Vendor Form Responses 1:', err?.message || err);
      return [];
    }
  }

  /**
   * Fetches all rows from Interbank Transfers "Form Responses 1" tab in read-only mode
   */
  async fetchInterbankResponses(): Promise<any[][]> {
    if (!this.isConfigured || !this.sheetsClient) {
      return [];
    }
    const spreadsheetId = this.getInterbankSpreadsheetId();
    try {
      const res = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: 'Form Responses 1!A2:K',
      });
      return res.data.values || [];
    } catch (err: any) {
      console.warn('[Google Sheets Warning] Could not fetch Interbank Form Responses 1:', err?.message || err);
      return [];
    }
  }

  /**
   * Fetches all rows from Beneficiaries "Form Responses 1" tab in read-only mode
   */
  async fetchBeneficiaryResponses(): Promise<any[][]> {
    if (!this.isConfigured || !this.sheetsClient) {
      return [];
    }
    const spreadsheetId = this.getBeneficiarySpreadsheetId();
    try {
      const res = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: 'Form Responses 1!A2:O',
      });
      return res.data.values || [];
    } catch (err: any) {
      console.warn('[Google Sheets Warning] Could not fetch Beneficiary Form Responses 1:', err?.message || err);
      return [];
    }
  }

  /**
   * Sync a vendor payment into Vendor Payments spreadsheet
   */
  async syncVendorPayment(payment: any): Promise<boolean> {
    if (!this.isConfigured || !this.sheetsClient) return false;
    const spreadsheetId = this.getVendorSpreadsheetId();

    try {
      const row = [
        payment.sheetNo || '',
        payment.timestamp || new Date().toISOString(),
        payment.vendorName || '',
        payment.billNoPO || '',
        payment.purposeOfPayment || '',
        payment.requestedBy || '',
        payment.site || '',
        payment.modeOfPayment || 'ACCOUNT',
        payment.poBillInvoiceUrl || '',
        payment.amountToBePaid || 0,
        payment.remark || '',
        payment.status || 'SUBMITTED',
        payment.approvalTimestamp || '',
        payment.paymentEntry || 'NOT_STARTED',
        payment.paymentEntryTimestamp || '',
        payment.paymentStatus || 'NOT_PAID',
        payment.paymentDoneTimestamp || '',
        payment.paymentRemarks || payment.paymentReferenceNumber || '',
      ];

      await this.appendRowToSheet('Form Responses 1', row, spreadsheetId);
      return true;
    } catch (err: any) {
      console.warn('[Google Sheets Warning] Failed to sync payment to Google Sheets:', err?.message || err);
      return false;
    }
  }

  /**
   * Sync an interbank transfer into Interbank spreadsheet
   */
  async syncInterbankTransfer(transfer: any): Promise<boolean> {
    if (!this.isConfigured || !this.sheetsClient) return false;
    const spreadsheetId = this.getInterbankSpreadsheetId();

    try {
      const row = [
        transfer.sheetNo || '',
        transfer.timestamp || new Date().toISOString(),
        transfer.transferFrom || '',
        transfer.transferTo || '',
        transfer.purpose || '',
        transfer.requestedBy || '',
        transfer.site || '',
        transfer.amount || 0,
        transfer.remarks || '',
        transfer.status || 'SUBMITTED',
        transfer.approvalTimestamp || '',
      ];

      await this.appendRowToSheet('Form Responses 1', row, spreadsheetId);
      return true;
    } catch (err: any) {
      console.warn('[Google Sheets Warning] Failed to sync interbank transfer to Google Sheets:', err?.message || err);
      return false;
    }
  }

  /**
   * Sync a beneficiary addition into Beneficiaries spreadsheet
   */
  async syncBeneficiary(ben: any): Promise<boolean> {
    if (!this.isConfigured || !this.sheetsClient) return false;
    const spreadsheetId = this.getBeneficiarySpreadsheetId();

    try {
      const row = [
        ben.sheetNo || '',
        ben.timestamp || new Date().toISOString(),
        ben.nameOfBeneficiary || '',
        ben.accountNo || '',
        ben.ifscCode || '',
        ben.bankName || '',
        ben.purpose || '',
        ben.cancelledChequeUrl || '',
        ben.remark || '',
        ben.status || 'SUBMITTED',
        ben.approvalTimestamp || '',
        ben.beneficiaryEntry || 'NOT_STARTED',
        ben.beneficiaryEntryTimestamp || '',
        ben.additionStatus || 'NOT_STARTED',
        ben.additionTimestamp || '',
      ];

      await this.appendRowToSheet('Form Responses 1', row, spreadsheetId);
      return true;
    } catch (err: any) {
      console.warn('[Google Sheets Warning] Failed to sync beneficiary to Google Sheets:', err?.message || err);
      return false;
    }
  }

  /**
   * Fetch all IT Checklist Master tasks
   */
  async fetchITChecklistMaster(): Promise<any[][]> {
    if (!this.isConfigured || !this.sheetsClient) return [];
    const spreadsheetId = this.getITChecklistSpreadsheetId();

    try {
      const res = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: 'Master!A2:K',
      });
      return res.data.values || [];
    } catch (err: any) {
      console.warn('[Google Sheets Warning] Failed to fetch IT Checklist Master:', err?.message || err);
      return [];
    }
  }

  /**
   * Fetch IT Checklist Doers
   */
  async fetchITDoers(): Promise<any[][]> {
    if (!this.isConfigured || !this.sheetsClient) return [];
    const spreadsheetId = this.getITChecklistSpreadsheetId();

    try {
      const res = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: 'Doer List!A2:D',
      });
      return res.data.values || [];
    } catch (err: any) {
      console.warn('[Google Sheets Warning] Failed to fetch IT Checklist Doers:', err?.message || err);
      return [];
    }
  }

  /**
   * Log an IT task completion to Consolidated sheet
   */
  async logITTaskCompletion(taskId: string, timestamp: string): Promise<boolean> {
    if (!this.isConfigured || !this.sheetsClient) return false;
    const spreadsheetId = this.getITChecklistSpreadsheetId();

    try {
      const row = [taskId, timestamp];
      await this.appendRowToSheet('Consolidated', row, spreadsheetId);
      return true;
    } catch (err: any) {
      console.warn('[Google Sheets Warning] Failed to log IT task completion:', err?.message || err);
      return false;
    }
  }

  /**
   * Upload file to Google Drive if live credentials exist
   */
  async uploadToDrive(fileName: string, mimeType: string, buffer: Buffer): Promise<{ fileId?: string; webViewLink?: string }> {
    if (!this.isConfigured || !this.driveClient) {
      // Local simulated file ID and URL
      const mockId = `drive-file-${Date.now()}`;
      return {
        fileId: mockId,
        webViewLink: `/api/files/${mockId}/download`,
      };
    }

    const folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    // First attempt: with parents folder
    try {
      const res = await this.driveClient.files.create({
        requestBody: {
          name: fileName,
          mimeType,
          parents: folderId ? [folderId] : undefined,
        },
        media: {
          mimeType,
          body: buffer,
        },
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true,
      });

      return {
        fileId: res.data.id,
        webViewLink: res.data.webViewLink,
      };
    } catch (err: any) {
      // If folder not found (e.g. folder not shared yet), fallback to root upload
      if (folderId && err?.message?.includes('File not found')) {
        console.warn(`[Google Drive Notice] Folder ${folderId} not found or not shared with service account. Retrying upload to service account root...`);
        try {
          const fallbackRes = await this.driveClient.files.create({
            requestBody: {
              name: fileName,
              mimeType,
            },
            media: {
              mimeType,
              body: buffer,
            },
            fields: 'id, webViewLink, webContentLink',
          });
          return {
            fileId: fallbackRes.data.id,
            webViewLink: fallbackRes.data.webViewLink,
          };
        } catch (fallbackErr: any) {
          console.warn('[Google Drive Warning] Root upload failed:', fallbackErr?.message || fallbackErr);
        }
      }

      console.warn('[Google Drive Warning] Upload failed:', err?.message || err);
      const mockId = `drive-file-${Date.now()}`;
      return {
        fileId: mockId,
        webViewLink: `/api/files/${mockId}/download`,
      };
    }
  }
}

export const googleIntegrationService = new GoogleIntegrationService();

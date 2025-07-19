import { utils, writeFile } from 'xlsx';
import { Receipt, Client } from '../types';
import { format } from 'date-fns';

class ExportService {
  async exportReceiptsToExcel(receipts: Receipt[], clients: Client[], filename?: string): Promise<void> {
    const data = receipts.map(receipt => {
      const client = clients.find(c => c.cnic === receipt.clientCnic);
      return {
        'Receipt ID': receipt.id,
        'Date': format(receipt.date, 'yyyy-MM-dd'),
        'Client Name': client?.name || 'Unknown',
        'CNIC': receipt.clientCnic,
        'Amount': receipt.amount,
        'Nature of Work': receipt.natureOfWork,
        'Payment Method': receipt.paymentMethod,
        'Created Date': format(receipt.createdAt, 'yyyy-MM-dd HH:mm:ss'),
      };
    });

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Receipts');

    // Add some styling
    const range = utils.decode_range(worksheet['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = utils.encode_cell({ r: row, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: row === 0 },
            alignment: { horizontal: 'center' },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' },
            },
          };
        }
      }
    }

    const fileName = filename || `receipts_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    writeFile(workbook, fileName);
  }

  async exportClientsToExcel(clients: Client[], filename?: string): Promise<void> {
    const data = clients.map(client => ({
      'Client ID': client.id,
      'Name': client.name,
      'CNIC': client.cnic,
      'Type': client.type,
      'Phone': client.phone || '',
      'Email': client.email || '',
      'Notes': client.notes || '',
      'Created Date': format(client.createdAt, 'yyyy-MM-dd HH:mm:ss'),
      'Updated Date': format(client.updatedAt, 'yyyy-MM-dd HH:mm:ss'),
    }));

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Clients');

    // Add some styling
    const range = utils.decode_range(worksheet['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = utils.encode_cell({ r: row, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: row === 0 },
            alignment: { horizontal: 'center' },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' },
            },
          };
        }
      }
    }

    const fileName = filename || `clients_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    writeFile(workbook, fileName);
  }

  async exportClientPaymentHistory(client: Client, receipts: Receipt[], filename?: string): Promise<void> {
    const data = receipts.map(receipt => ({
      'Receipt ID': receipt.id,
      'Date': format(receipt.date, 'yyyy-MM-dd'),
      'Amount': receipt.amount,
      'Nature of Work': receipt.natureOfWork,
      'Payment Method': receipt.paymentMethod,
      'Created Date': format(receipt.createdAt, 'yyyy-MM-dd HH:mm:ss'),
    }));

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Payment History');

    // Add client info sheet
    const clientInfo = [
      ['Client Information', ''],
      ['Name', client.name],
      ['CNIC', client.cnic],
      ['Type', client.type],
      ['Phone', client.phone || ''],
      ['Email', client.email || ''],
      ['Notes', client.notes || ''],
      ['Total Amount', receipts.reduce((sum, r) => sum + r.amount, 0)],
      ['Total Receipts', receipts.length],
    ];

    const clientInfoSheet = utils.aoa_to_sheet(clientInfo);
    utils.book_append_sheet(workbook, clientInfoSheet, 'Client Info');

    const fileName = filename || `${client.name}_payment_history_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    writeFile(workbook, fileName);
  }
}

export const exportService = new ExportService();
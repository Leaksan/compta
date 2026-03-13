import * as XLSX from 'xlsx';
import { Transaction, getUserSettings, updateUserSettings, getMonthKey, saveExportRecord } from './storage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export async function exportToExcel(transactions: Transaction[], periodName: string, saveToHistory: boolean = true) {
  const settings = getUserSettings();
  const customFields = settings.customFields || [];
  const fieldOrder = settings.fieldOrder || ['date', 'category', 'label', 'observation', 'income', 'expense'];
  const hiddenFields = settings.hiddenFields || [];
  const visibleFields = fieldOrder.filter(id => !hiddenFields.includes(id));
  
  const wb = XLSX.utils.book_new();

  if (transactions.length === 0) {
    alert("Aucune transaction à exporter pour cette période.");
    return;
  }

  // Group transactions by month
  const groupedByMonth: Record<string, Transaction[]> = {};
  transactions.forEach(t => {
    const date = new Date(t.date);
    const monthName = format(date, 'MMMM yyyy', { locale: fr });
    if (!groupedByMonth[monthName]) {
      groupedByMonth[monthName] = [];
    }
    groupedByMonth[monthName].push(t);
  });

  let totalIncomeAll = 0;
  let totalExpenseAll = 0;

  // Create a sheet for each month
  Object.keys(groupedByMonth).forEach(monthName => {
    const monthTransactions = groupedByMonth[monthName];
    
    const headers = visibleFields.map(id => {
      if (id === 'date') return 'Date';
      if (id === 'type') return 'Type';
      if (id === 'category') return 'Catégorie';
      if (id === 'label') return 'Libellé';
      if (id === 'observation') return 'Observation';
      if (id === 'amount') return 'Montant';
      if (id === 'income') return 'Entrée (CA)';
      if (id === 'expense') return 'Dépense';
      const cf = customFields.find(f => f.id === id);
      return cf ? cf.name : '';
    });

    const rowData = monthTransactions.map(t => {
      return visibleFields.map(id => {
        if (id === 'date') return format(new Date(t.date), 'dd/MM/yyyy');
        if (id === 'type') return t.type === 'income' ? 'Entrée' : 'Dépense';
        if (id === 'category') return t.category;
        if (id === 'label') return t.label;
        if (id === 'observation') return t.observation || '';
        if (id === 'amount') return t.amount;
        if (id === 'income') return t.type === 'income' ? t.amount : '';
        if (id === 'expense') return t.type === 'expense' ? t.amount : '';
        const cf = customFields.find(f => f.id === id);
        if (cf) return t.customData ? t.customData[cf.id] || '' : '';
        return '';
      });
    });

    const aoa: any[][] = [headers, ...rowData];
    
    const endRow = 1 + monthTransactions.length; // 1-based index for Excel
    const incomeColIndex = visibleFields.indexOf('income');
    const expenseColIndex = visibleFields.indexOf('expense');
    
    aoa.push([]); // Empty row

    // TOTAL Row
    const totalRow = new Array(visibleFields.length).fill('');
    totalRow[0] = 'TOTAL';
    
    if (incomeColIndex !== -1) {
      const colLetter = XLSX.utils.encode_col(incomeColIndex);
      totalRow[incomeColIndex] = { t: 'n', f: `SUM(${colLetter}2:${colLetter}${endRow})` };
    }
    if (expenseColIndex !== -1) {
      const colLetter = XLSX.utils.encode_col(expenseColIndex);
      totalRow[expenseColIndex] = { t: 'n', f: `SUM(${colLetter}2:${colLetter}${endRow})` };
    }
    aoa.push(totalRow);

    // BÉNÉFICE Row
    const beneficeRow = new Array(visibleFields.length).fill('');
    beneficeRow[0] = 'BÉNÉFICE NET';
    
    if (incomeColIndex !== -1 && expenseColIndex !== -1) {
      const incomeColLetter = XLSX.utils.encode_col(incomeColIndex);
      const expenseColLetter = XLSX.utils.encode_col(expenseColIndex);
      const totalRowExcelNum = endRow + 2; // +1 for empty row, +1 for TOTAL row
      beneficeRow[incomeColIndex] = { t: 'n', f: `${incomeColLetter}${totalRowExcelNum}-${expenseColLetter}${totalRowExcelNum}` };
    } else {
      // Fallback if columns are hidden
      const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      beneficeRow[1] = monthIncome - monthExpense;
    }
    aoa.push(beneficeRow);

    const wsTransactions = XLSX.utils.aoa_to_sheet(aoa);
    
    const cols = visibleFields.map(id => {
      if (id === 'date') return { wch: 12 };
      if (id === 'type') return { wch: 10 };
      if (id === 'category') return { wch: 20 };
      if (id === 'label') return { wch: 30 };
      if (id === 'observation') return { wch: 30 };
      if (id === 'amount') return { wch: 15 };
      if (id === 'income') return { wch: 15 };
      if (id === 'expense') return { wch: 15 };
      return { wch: 20 }; // custom fields
    });
    
    wsTransactions['!cols'] = cols;

    // Sheet names cannot exceed 31 characters
    const safeSheetName = monthName.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, wsTransactions, safeSheetName);

    const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    totalIncomeAll += monthIncome;
    totalExpenseAll += monthExpense;
  });

  // Summary Sheet
  const netBalanceAll = totalIncomeAll - totalExpenseAll;
  const summaryData = [
    { 'Métrique': 'Période', 'Valeur': periodName },
    { 'Métrique': 'Date d\'export', 'Valeur': format(new Date(), 'dd/MM/yyyy HH:mm') },
    { 'Métrique': 'Chiffre d\'Affaires (Entrées)', 'Valeur': `${totalIncomeAll} ${settings.currency}` },
    { 'Métrique': 'Total Dépenses', 'Valeur': `${totalExpenseAll} ${settings.currency}` },
    { 'Métrique': 'Bénéfice Net', 'Valeur': `${netBalanceAll} ${settings.currency}` }
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 40 }];
  
  // Add summary sheet
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');
  
  // Add hidden raw data sheet for import
  const rawData = {
    transactions,
    settings
  };
  const wsRaw = XLSX.utils.json_to_sheet([{ data: JSON.stringify(rawData) }]);
  XLSX.utils.book_append_sheet(wb, wsRaw, '_app_state_');

  // Move summary sheet to the front
  const summarySheetName = 'Résumé';
  wb.SheetNames = [summarySheetName, ...wb.SheetNames.filter(name => name !== summarySheetName)];

  // Hide the _app_state_ sheet
  wb.Workbook = {
    Views: [{}],
    Sheets: wb.SheetNames.map(name => ({
      name,
      Hidden: name === '_app_state_' ? 1 : 0
    }))
  };

  // Generate file name
  const safePeriodName = periodName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fileName = `Rapport_Financier_${safePeriodName}.xlsx`;

  // Save to history if requested
  if (saveToHistory) {
    saveExportRecord({
      periodName,
      fileName,
      transactions
    });
  }

  // Generate file and try to share
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Rapport Financier',
        text: `Voici le rapport financier pour la période : ${periodName}`
      });
    } else {
      // Fallback to download
      XLSX.writeFile(wb, fileName);
    }
  } catch (error) {
    console.error('Erreur lors du partage:', error);
    // Fallback to download if share was cancelled or failed
    XLSX.writeFile(wb, fileName);
  }
}

export async function importFromExcel(file: File): Promise<{ success: boolean; message?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        if (!wb.SheetNames.includes('_app_state_')) {
          resolve({ success: false, message: "Ce fichier Excel ne contient pas de données d'application valides pour l'importation." });
          return;
        }

        const wsRaw = wb.Sheets['_app_state_'];
        const rawJson = XLSX.utils.sheet_to_json(wsRaw) as { data: string }[];
        
        if (rawJson.length === 0 || !rawJson[0].data) {
          resolve({ success: false, message: "Les données d'application sont corrompues." });
          return;
        }

        const parsedData = JSON.parse(rawJson[0].data);
        const { transactions, settings } = parsedData;

        if (!transactions || !Array.isArray(transactions) || !settings) {
          resolve({ success: false, message: "Format de données invalide." });
          return;
        }

        // Import settings
        updateUserSettings(settings);

        // Import transactions (group by month and save)
        const groupedByMonth: Record<string, Transaction[]> = {};
        transactions.forEach((t: Transaction) => {
          const monthKey = getMonthKey(t.date);
          if (!groupedByMonth[monthKey]) {
            groupedByMonth[monthKey] = [];
          }
          groupedByMonth[monthKey].push(t);
        });

        // Save to localStorage
        Object.keys(groupedByMonth).forEach(monthKey => {
          const monthTransactions = groupedByMonth[monthKey];
          // Sort by date desc
          monthTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          localStorage.setItem(monthKey, JSON.stringify(monthTransactions));
        });

        resolve({ success: true, message: "Importation réussie !" });
      } catch (error) {
        console.error("Erreur lors de l'importation:", error);
        resolve({ success: false, message: "Une erreur est survenue lors de l'importation du fichier." });
      }
    };
    reader.onerror = () => {
      resolve({ success: false, message: "Erreur de lecture du fichier." });
    };
    reader.readAsArrayBuffer(file);
  });
}

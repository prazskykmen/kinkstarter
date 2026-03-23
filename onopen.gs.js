//add button to menu
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('Spustit Kmení skript')
      .addItem('Uzavřít projekty','checkProjects')
      .addItem('Stáhnout FIO', 'fetchTransactions')
      .addToUi();
}
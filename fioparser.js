// FIO API documentation https://www.fio.cz/docs/cz/API_Bankovnictvi.pdf
// UrlFetchApi docs https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app


const READONLY_TOKEN = PropertiesService.getScriptProperties().getProperty('FIO_READONLY_TOKEN');
const RESPONSE_FORMAT="json"
const SHEET_NAME = "kickstarter_db"
const DEFAULT_FIRST_DATE_TO_FETCH = new Date(2022, 9, 1)





function Transaction() {
  this.transactionId = ""
  this.vs = ""
  this.ks = ""
  this.ss = ""
  this.amount = 0
  this.date = ""
  this.contraAccount = ""
  this.contraAccountName = ""
}

function compareDates(dateA, dateB) {
         if(dateA.getTime() == dateB.getTime()) return 0;

         return dateA.getTime() > dateB.getTime() ? 1 : -1
}

function getFirstDateToFetch()
{
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName(SHEET_NAME)
  const existingTransactionDates = 
    sheet.getRange("A2:A").getValues()
      .filter(x => x[0] != "")
      .map(x => x[0])
      .sort(compareDates)
  Logger.log(existingTransactionDates)

  //get first date to fetch
  let firstDateToFetch = DEFAULT_FIRST_DATE_TO_FETCH

  // modify first day to fetch if already in table
  if(existingTransactionDates.length > 0) {
    const lastTransactionDate = existingTransactionDates[existingTransactionDates.length - 1] //@TODO sort these first
    Logger.log(lastTransactionDate)
  //  const lastTransactionDateSplit = lastTransactionDate.toISOString().split("-")
  //        Logger.log(lastTransactionDateSplit)
   // const lastTransactionDate = new Date(lastTransactionDateSplit[0], parseInt(lastTransactionDateSplit[1])-1, lastTransactionDateSplit[2].substr(0,2))

    Logger.log("Last transactionDate")
    Logger.log(lastTransactionDate.toString())
    lastTransactionDate.setDate(lastTransactionDate.getDate() - 1)
    firstDateToFetch = lastTransactionDate
    Logger.log("first transaction date to fetch")
  } 
  Logger.log(firstDateToFetch.toString())

  return firstDateToFetch;
}

function fetchTransactions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  
  const lastDateToFetch =  new Date()
  const firstDateToFetch = getFirstDateToFetch()
  Logger.log(lastDateToFetch.toString())

  //const fetchURl = ` https://fioapi.fio.cz/v1/rest/periods/${READONLY_TOKEN}/${dateFrom}/${dateTo}/transactions.${RESPONSE_FORMAT}`
  // fetch only transactions since last api call
  //const fetchUrl = ` https://fioapi.fio.cz/v1/rest/last/${READONLY_TOKEN}/transactions.${RESPONSE_FORMAT}`
  const dateFrom = firstDateToFetch.toISOString().slice(0,10)
  const dateTo = lastDateToFetch.toISOString().slice(0,10)
  const fetchUrl = `https://fioapi.fio.cz/v1/rest/periods/${READONLY_TOKEN}/${dateFrom}/${dateTo}/transactions.${RESPONSE_FORMAT}`
  Logger.log(fetchUrl)
  const response = UrlFetchApp.fetch(fetchUrl)
  const responsePayload = JSON.parse(response.getContentText())
  Logger.log(responsePayload)

  writeTransactions(responsePayload.accountStatement.transactionList.transaction)
  //writeClosingBalance(responsePayload.accountStatement.info.closingBalance)

  return
}

function writeTransactions(transactionListIn) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  //const transactionListIn = 
Logger.log(transactionListIn)
//filter out income
const incomes = transactionListIn.filter(
    // Column 8 = Typ pohybu (see FIO API docs)
    (val) => (val.column8.value == "Příjem" 
              ||  val.column8.value == "Příjem převodem uvnitř banky" 
              || val.column8.value == "Okamžitá příchozí platba" 
              || val.column8.value == "Bezhotovostní příjem"
              || val.column8.value == "Platba převodem uvnitř banky"
            )
            && val.column1.value > 0
            && val.column2 != null // if column25 == "Přeúčtování aktivační platby došlé z účtu" , column2 is null and is not a received payment from kmen member
    )

Logger.log(Transaction)
const newTransactions = 
  incomes.map(
      iTransaction => { 
        const tr = new Transaction()
        tr.amount = iTransaction.column1.value
        tr.date =  iTransaction.column0.value.split("+")[0]
        tr.ks = iTransaction.column4 == null ? "" : iTransaction.column4.value
        tr.vs =  iTransaction.column5 == null ? "" : iTransaction.column5.value
        tr.contraAccount = iTransaction.column2.value
        tr.contraAccountName = iTransaction.column10.value
        tr.ss = iTransaction.column6 == null ? "" : iTransaction.column6.value
        tr.transactionId = iTransaction.column22.value
        return tr
      }
  )

  Logger.log(newTransactions)

  const sheet = ss.getSheetByName(SHEET_NAME)
    //https://stackoverflow.com/questions/56373138/how-to-get-the-range-of-a-non-blank-cell-in-google-script
  const existingTransactions = 
    sheet.getRange("I2:I").getValues().filter(x => x[0] != "").map(x => x[0])
    
  Logger.log("existing transactions")
  Logger.log(existingTransactions)
  
  // Filter out transactions already in the sheet
  // O(n*m) . Optimize if this thing gets too slow
  const nonDuplicateNewTransactions =
    newTransactions.filter( 
                iNewTrans => -1 == existingTransactions.indexOf(iNewTrans.transactionId)
                )

  Logger.log("Non duplicate transactions")
  Logger.log(nonDuplicateNewTransactions)

// @TODO: report actions taken
 // append rows to the sheet
    nonDuplicateNewTransactions.forEach(
        iTrans => sheet.appendRow(
            [iTrans.date, iTrans.date.substr(0,7), iTrans.ss,  iTrans.amount, iTrans.contraAccount,iTrans.contraAccountName, iTrans.ks, iTrans.vs,iTrans.transactionId]
            )
    )
}

// TBD
function writeClosingBalance(closingBalance) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("sanity_check")
  const kickstarterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("kickstarter")
  const rangeStartRow = 5;
  //const dates = sheet.getRange(`A5:A`)
  const dates = sheet.getRange(`A${rangeStartRow}:A`).getValues().filter(x => x[0] != "").map(x => formatDateSql(x[0]).slice(0,7))
  const thisMonth = formatDateSql(new Date()) .slice(0,7)
  const indexOfThisMonth = dates.indexOf(thisMonth)
  Logger.log(thisMonth)
  Logger.log(dates)

  const freeCredits = kickstarterSheet.getRange("F2:2").getValues().filter(x => x[0] != "").reduce((acc,currValue) => acc + currValue[0])
  const allocatedButUnlockedCredits = kickstarterSheet.getRange("F4:1000").getValues().filter(x => x[0] != "").reduce((acc,currValue) => acc + currValue[0])

  Logger.log(`${freeCredits}, ${allocatedButUnlockedCredits}`)

  if(indexOfThisMonth === -1) {
    sheet.appendRow([thisMonth, closingBalance, `=SUM(SUMIF(kickstarter!F2:2,">0"),SUMIF(kickstarter!F4:1000,">0"))`])
    // append row
  } else {
    const row = sheet.getRange(`A${rangeStartRow + indexOfThisMonth}:C${rangeStartRow + indexOfThisMonth}`)
    row.getCell(1,1).setValue(thisMonth)
    row.getCell(1,2).setValue(closingBalance)
    row.getCell(1,3).setValue(0)
  }
}

function formatDateSql(date) {
  const dateSql = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`
  return dateSql
}

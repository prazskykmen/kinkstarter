function openVlastnictviKmene() {
  const sheetId = PropertiesService.getScriptProperties().getProperty('VLASTNICTVI_KMENE_SHEET_ID');
  window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0`)
}

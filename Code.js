const data_row_start = 4;
const data_row_end = 1000;
const price_col = "G";
const collected_col = "F";
const spent_row = 1;
const project_name_col = "C";

const project_start_col = "H";
const project_end_col = "AA";

const log_line = { 
  date: Utilities.formatDate(new Date(), "Europe/Prague", "yyyy-MM-dd HH:mm:ss"),
  user: getCurrentUserEmail(),
  errors: [], 
  closed_projects: []
}

function checkProjects() {
  // TODO: freeze cells
  const sheetName = "kickstarter";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  const projects_to_finalize =  get_finalized_rows(sheet)
  for (var i = 0; i < projects_to_finalize.length; i++) {
    finalizeProject(sheet, projects_to_finalize[i] + data_row_start)
  }
  
  logScriptExecutionToSheet();
}

function getCurrentUserEmail()
{
  // GET EMAIL ADDRESS OF ACTIVE USER
  const email = Session.getActiveUser().getEmail();
  return email;
}

function logScriptExecutionToSheet()
{
  // log the run
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const log_sheet = ss.getSheetByName("Log")
  if(false == log_sheet) {
    // error if not found
    SpreadsheetApp.getUi().alert("Could not get log spreadsheet in the script!")
  }
  log_sheet.appendRow([log_line.date, log_line.user, log_line.closed_projects.join(", "), log_line.errors.join(", ")])
}

// gets offset of the row to finalize from data row start
function get_finalized_rows (sheet) {  
	Logger.log("Starting get_finalized_rows");
	var ui = SpreadsheetApp.getUi();
  
	const project_query_address = `${project_name_col}${data_row_start}:${price_col}${data_row_end}`;
	const project_range = sheet.getRange(project_query_address).getValues();
  
	Logger.log("project_range")
	Logger.log(project_range)
  
	const projects_to_finalize = []
	var error_occurred = false;
	var debugs = []
  
	for(var i = 0; i < project_range.length; i++)
	{
	  var project = project_range[i];
  
  
	  // skip empty rows at the end
	  if(project[0] == ""
		 && project[1] == ""
		 && project[2] == ""
		 && (project[3] == "-" || project[3] == "")
		 && project[4] == "") 
	  {
		  debugs.push(`${i} - skip`)
		  // empty row
		  continue;
	  }
  
	  // validate projects 
	  if(project[0] == "") {ui.alert("CHYBA: Chybí název projektu"); log_line.errors.push("CHYBA: Chybí název projektu"); error_occurred = true; }
	  if(project[1] == "") {ui.alert(`CHYBA: Chybí owner projektu "${project[0]}"`); log_line.errors.push(`CHYBA: Chybí owner projektu "${project[0]}"`); error_occurred = true;}
	  if(project[2] == "") {/* NOOP. It's ok, if there's no link to the project */ }
	  if(project[3] == "") {/* NOOP. No need to validate this column. Will be filled out by Spreadsheet equation */ }
	  if(project[4] == "") {ui.alert(`CHYBA: Chybí cena projektu "${project[0]}"`);  log_line.errors.push(`CHYBA: Chybí cena projektu "${project[0]}"`); error_occurred = true;  }
	  
	// early breaks if some project info is missing
	  if(error_occurred) {
		debugs.push(`${i} - error`)
	  break;
	  }
	  
  
	if(project[3] < project[4]) {
	  // NOOP. Not finalized
		  debugs.push(`${i} - not enough funds`)
	  continue;
	}
  
	  // skip project if it's overfunded
	  if(project[3] > project[4]) {
		  debugs.push(`${i} - overfunded`)
	    ui.alert(`Na projektu "${project[0]}" je naspořeno více, než je jeho cena.`)
      log_line.errors.push(`Na projektu "${project[0]}" je naspořeno více, než je jeho cena.`);
		  continue;
	  }
  
	  // woohoo! The project is funded
	  if(project[3] == project[4]) {
		  debugs.push(`${i} - FUNDED`)
		  projects_to_finalize.push(i);
	  }
	}
  
    Logger.log("debugs")
	Logger.log(debugs)
  
	// return empty array (no projects will be finalized) if iteration over the projects yielded an error
	if(error_occurred) return [];
	
  Logger.log("Projects to finalize")
	Logger.log(projects_to_finalize)
	return projects_to_finalize
}

// prereqs for finalizing the project. Implement specific rules for different price ranges
function checkFinalizationPrerequisites(projectValues){
    projectValues.forEach(value => { Logger.log(value); Logger.log(isNaN(parseInt(value)))})
    const numContributors = projectValues.filter(value => (false == isNaN(parseInt(value))) && parseInt(value) > 0).length

    return numContributors >= 3
}

function protectProject(sheet, project_row_address) {
  Logger.log(`Protecting project ${project_row_address}`)
  const project_range_address = `${project_start_col}${project_row_address}:${project_end_col}${project_row_address}`;
  const project_range = sheet.getRange(project_range_address)

  const protection = project_range.protect()
  protection.setDescription(`Projekt je uzavřen`).removeEditors(protection.getEditors());
}

function finalizeProject(sheet, project_row_address){

  Logger.log("Starting finalizeProject");
  const project_name = sheet.getRange(`${project_name_col}${project_row_address}`).getValues()[0][0]
  Logger.log(project_name)
  
  // get ranges
  const spent_range_address = `${project_start_col}${spent_row}:${project_end_col}${spent_row}`;
  const project_range_address = `${project_start_col}${project_row_address}:${project_end_col}${project_row_address}`;
  const spent_range = sheet.getRange(spent_range_address)
  const project_range = sheet.getRange(project_range_address)

  // early return if not enough contributors, else continue
  if(false == checkFinalizationPrerequisites(project_range.getValues()[0])) {
    Logger.log(project_name + ": Not enough contributors to finalize")
    log_line.errors.push(project_name + ": Not enough contributors to finalize")
    return
  }
    
  Logger.log(project_name + ": Can FINALIZE! WOOHOO!")
  
  // update spent range vals
  const spent_range_vals =  spent_range.getValues()[0]
  const project_range_vals =  project_range.getValues()[0]
  const  new_spent_range_vals = spent_range_vals.map(function(v, i) {return v + project_range_vals[i];})
  spent_range.setValues([new_spent_range_vals])

  // reset project range vals
  const new_project_range_vals = new Array(project_range_vals.length).fill("-");
  project_range.setValues([new_project_range_vals])
  // Logger.log(spent_range_vals)
  // Logger.log(project_range_vals)
  // Logger.log(new_spent_range_vals)
  // Logger.log("===========================================")


  protectProject(sheet, project_row_address)

  // fokin color that shit so evry wan knows
  const project_line_range = sheet.getRange(`A${project_row_address}:AD${project_row_address}`)
  project_line_range.setBackground("green")

  log_line.closed_projects.push(project_name)




  // decrese to project rows to zero
  // increse spent rows 
}

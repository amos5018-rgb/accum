// Google Apps Script - 누가기록 관리 API
// 이 파일을 구글 스프레드시트의 Apps Script 편집기에 붙여넣으세요.

var SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  var action = e.parameter.action;
  var result;

  switch (action) {
    case 'getSubjects':
      result = SheetOps.getSubjects();
      break;
    case 'getClasses':
      result = SheetOps.getClasses(e.parameter.subjectId);
      break;
    case 'getStudents':
      result = SheetOps.getStudents(e.parameter.classId);
      break;
    case 'getRecords':
      result = SheetOps.getRecords(e.parameter.classId, e.parameter.studentId);
      break;
    case 'getTags':
      result = SheetOps.getTags();
      break;
    default:
      result = { error: 'Unknown action: ' + action };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var action = data.action;
  var result;

  switch (action) {
    case 'addRecord':
      result = SheetOps.addRecord(data.record);
      break;
    case 'addStudents':
      result = SheetOps.addStudents(data.classId, data.students);
      break;
    case 'addTag':
      result = SheetOps.addTag(data.tag);
      break;
    case 'batchSync':
      result = SheetOps.batchSync(data.records);
      break;
    default:
      result = { error: 'Unknown action: ' + action };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

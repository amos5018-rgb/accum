// SheetOps - 스프레드시트 읽기/쓰기 연산

var SheetOps = {
  getSheet: function(name) {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  },

  getOrCreateSheet: function(name) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      // 학급별 기록 시트 헤더 추가
      sheet.appendRow(['날짜', '번호', '이름', '태그', '기록내용']);
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    }
    return sheet;
  },

  // ===== 과목 =====
  getSubjects: function() {
    var sheet = this.getSheet('_과목');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    return data.slice(1).map(function(row) {
      return { subjectId: row[0], subjectName: row[1] };
    });
  },

  // ===== 학급 =====
  getClasses: function(subjectId) {
    var sheet = this.getSheet('_학급');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    return data.slice(1)
      .filter(function(row) { return !subjectId || row[1] === subjectId; })
      .map(function(row) {
        return {
          classId: row[0],
          subjectId: row[1],
          grade: row[2],
          className: row[3]
        };
      });
  },

  // ===== 학생 =====
  getStudents: function(classId) {
    var sheet = this.getSheet('_학생');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    return data.slice(1)
      .filter(function(row) { return row[1] === classId; })
      .map(function(row) {
        return {
          studentId: row[0],
          classId: row[1],
          studentNumber: row[2],
          studentName: row[3]
        };
      })
      .sort(function(a, b) { return a.studentNumber - b.studentNumber; });
  },

  // ===== 학생 일괄 추가 =====
  addStudents: function(classId, students) {
    var sheet = this.getSheet('_학생');
    if (!sheet) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      sheet = ss.insertSheet('_학생');
      sheet.appendRow(['student_id', 'class_id', 'number', 'name']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }

    students.forEach(function(s) {
      var studentId = 'S' + Date.now() + Math.floor(Math.random() * 1000);
      sheet.appendRow([studentId, classId, s.number, s.name]);
    });

    return { success: true, count: students.length };
  },

  // ===== 태그 =====
  getTags: function() {
    var sheet = this.getSheet('_태그');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    return data.slice(1).map(function(row) { return row[0]; }).filter(Boolean);
  },

  addTag: function(tag) {
    var sheet = this.getSheet('_태그');
    if (!sheet) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      sheet = ss.insertSheet('_태그');
      sheet.appendRow(['tag']);
      sheet.getRange(1, 1).setFontWeight('bold');
    }

    // 중복 확인
    var existing = this.getTags();
    if (existing.indexOf(tag) !== -1) {
      return { success: true, message: 'Tag already exists' };
    }

    sheet.appendRow([tag]);
    return { success: true };
  },

  // ===== 기록 =====
  getRecordSheetName: function(classId) {
    // classId 형식: "KOR1-1-3" → 학급 정보에서 시트 이름 생성
    var classes = this.getClasses();
    var classInfo = classes.filter(function(c) { return c.classId === classId; })[0];
    if (!classInfo) return classId;

    var subjects = this.getSubjects();
    var subjectInfo = subjects.filter(function(s) { return s.subjectId === classInfo.subjectId; })[0];
    var subjectName = subjectInfo ? subjectInfo.subjectName : classInfo.subjectId;

    return classInfo.className + '_' + subjectName;
  },

  getRecords: function(classId, studentId) {
    var sheetName = this.getRecordSheetName(classId);
    var sheet = this.getSheet(sheetName);
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    return data.slice(1)
      .filter(function(row) {
        if (!studentId) return true;
        // student_id로 찾거나, 번호+이름으로 매칭
        return String(row[1]) === String(studentId) ||
               (row[1] + '' === studentId);
      })
      .map(function(row, index) {
        return {
          recordId: 'R' + index,
          studentId: studentId || '',
          studentNumber: row[1],
          studentName: row[2],
          classId: classId,
          tags: row[3] ? String(row[3]).split(',').map(function(t) { return t.trim(); }) : [],
          content: row[4],
          createdAt: row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
          synced: true
        };
      })
      .reverse(); // 최신순
  },

  addRecord: function(record) {
    var sheetName = this.getRecordSheetName(record.classId);
    var sheet = this.getOrCreateSheet(sheetName);

    var tags = Array.isArray(record.tags) ? record.tags.join(',') : (record.tags || '');
    var createdAt = record.createdAt || new Date().toISOString();

    sheet.appendRow([
      createdAt,
      record.studentNumber,
      record.studentName,
      tags,
      record.content
    ]);

    return { success: true, recordId: 'R' + Date.now() };
  },

  batchSync: function(records) {
    var results = [];
    var self = this;
    records.forEach(function(record) {
      var result = self.addRecord(record);
      results.push(result);
    });
    return { success: true, results: results };
  }
};

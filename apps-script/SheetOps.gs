// SheetOps - 스프레드시트 읽기/쓰기 연산

var SheetOps = {
  // 스프레드시트 객체 재사용 (매번 getActiveSpreadsheet 호출 방지)
  _ss: null,
  getSS: function() {
    if (!this._ss) this._ss = SpreadsheetApp.getActiveSpreadsheet();
    return this._ss;
  },

  getSheet: function(name) {
    return this.getSS().getSheetByName(name);
  },

  getOrCreateSheet: function(name) {
    var ss = this.getSS();
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      // 학급별 기록 시트 헤더 추가
      sheet.appendRow(['날짜', '번호', '이름', '태그', '기록내용']);
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    }
    return sheet;
  },

  // ===== 초기 데이터 통합 로드 (1회 호출로 과목+학급+태그 반환) =====
  getInitData: function() {
    var subjects = this.getSubjects();
    var classes = this.getClasses();
    var tags = this.getTags();
    return { subjects: subjects, classes: classes, tags: tags };
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
      var ss = this.getSS();
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

  // ===== 과목 추가 =====
  addSubject: function(subject) {
    var sheet = this.getSheet('_과목');
    if (!sheet) {
      var ss = this.getSS();
      sheet = ss.insertSheet('_과목');
      sheet.appendRow(['subject_id', 'subject_name']);
      sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    }

    // 중복 확인
    var existing = this.getSubjects();
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].subjectId === subject.subjectId) {
        return { success: false, message: '이미 존재하는 과목 ID입니다.' };
      }
    }

    sheet.appendRow([subject.subjectId, subject.subjectName]);
    return { success: true };
  },

  // ===== 학급 추가 =====
  addClass: function(classGroup) {
    var sheet = this.getSheet('_학급');
    if (!sheet) {
      var ss = this.getSS();
      sheet = ss.insertSheet('_학급');
      sheet.appendRow(['class_id', 'subject_id', 'grade', 'class_name']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }

    // 중복 확인
    var existing = this.getClasses();
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].classId === classGroup.classId) {
        return { success: false, message: '이미 존재하는 학급 ID입니다.' };
      }
    }

    sheet.appendRow([classGroup.classId, classGroup.subjectId, classGroup.grade, classGroup.className]);
    return { success: true };
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
      var ss = this.getSS();
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
  // 시트 이름 계산 시 이미 로드된 데이터를 받아 중복 시트 읽기 방지
  _resolveRecordSheetName: function(classId, classesData, subjectsData) {
    var classes = classesData || this.getClasses();
    var classInfo = classes.filter(function(c) { return c.classId === classId; })[0];
    if (!classInfo) return classId;

    var subjects = subjectsData || this.getSubjects();
    var subjectInfo = subjects.filter(function(s) { return s.subjectId === classInfo.subjectId; })[0];
    var subjectName = subjectInfo ? subjectInfo.subjectName : classInfo.subjectId;

    return classInfo.className + '_' + subjectName;
  },

  getRecordSheetName: function(classId) {
    return this._resolveRecordSheetName(classId, null, null);
  },

  getRecords: function(classId, studentId, studentNumberParam, classNameParam, subjectNameParam) {
    // 시트 이름: 프론트엔드에서 className+subjectName 전달 시 시트 조회 생략
    var sheetName;
    var sheet;
    if (classNameParam && subjectNameParam) {
      sheetName = classNameParam + '_' + subjectNameParam;
      sheet = this.getSheet(sheetName);
      if (!sheet) {
        // 프론트엔드 캐시가 stale일 수 있음 — 시트 이름 직접 해석으로 fallback
        sheetName = this._resolveRecordSheetName(classId, null, null);
        sheet = this.getSheet(sheetName);
      }
    } else {
      sheetName = this._resolveRecordSheetName(classId, null, null);
      sheet = this.getSheet(sheetName);
    }
    if (!sheet) return [];

    // studentNumber: 프론트엔드에서 전달 시 학생 시트 조회 생략
    var studentNumber = null;
    if (studentNumberParam !== undefined && studentNumberParam !== null) {
      studentNumber = Number(studentNumberParam);
    } else if (studentId) {
      var students = this.getStudents(classId);
      var matched = students.filter(function(s) { return s.studentId === studentId; })[0];
      if (matched) studentNumber = matched.studentNumber;
    }

    var data = sheet.getDataRange().getValues();
    return data.slice(1)
      .filter(function(row) {
        if (!studentId) return true;
        if (studentNumber !== null) return Number(row[1]) === Number(studentNumber);
        return false;
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
    var sheetName = this._resolveRecordSheetName(record.classId, null, null);
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
    // 첫 레코드에서 과목/학급 데이터를 한 번만 로드하여 재사용
    var classes = this.getClasses();
    var subjects = this.getSubjects();
    var results = [];
    var self = this;
    records.forEach(function(record) {
      var sheetName = self._resolveRecordSheetName(record.classId, classes, subjects);
      var sheet = self.getOrCreateSheet(sheetName);

      var tags = Array.isArray(record.tags) ? record.tags.join(',') : (record.tags || '');
      var createdAt = record.createdAt || new Date().toISOString();

      sheet.appendRow([
        createdAt,
        record.studentNumber,
        record.studentName,
        tags,
        record.content
      ]);

      results.push({ success: true, recordId: 'R' + Date.now() });
    });
    return { success: true, results: results };
  }
};

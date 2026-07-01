// Admin workflow operations and dashboard logic
let adminActiveTab = 'overview';
let adminSelectedDate = new Date().toISOString().split('T')[0];
let adminSelectedClass = '';
let adminReportsTable = null;
let adminStudentsTable = null;
let adminClassesTable = null;

// Secure Admin Login via SweetAlert
async function showAdminLogin() {
    const { value: formValues } = await Swal.fire({
        title: 'ผู้ดูแลระบบเข้าสู่ระบบ (Admin)',
        html: `
            <div class="text-left mb-3">
                <label class="input-label">ชื่อผู้ใช้</label>
                <input id="swal-user" class="input-field" placeholder="Username" autocomplete="username">
            </div>
            <div class="text-left">
                <label class="input-label">รหัสผ่าน</label>
                <input id="swal-pass" class="input-field" type="password" placeholder="Password" autocomplete="current-password">
            </div>
        `,
        confirmButtonText: 'เข้าสู่ระบบ',
        cancelButtonText: 'ยกเลิก',
        showCancelButton: true,
        preConfirm: async () => {
            const user = document.getElementById('swal-user').value.trim();
            const pass = document.getElementById('swal-pass').value.trim();
            
            try {
                const loggedInUser = await window.db.login(user, pass);
                if (loggedInUser.role === 'admin') {
                    return loggedInUser;
                } else {
                    Swal.showValidationMessage('บัญชีผู้ใช้นี้ไม่มีสิทธิ์ผู้ดูแลระบบ');
                    return false;
                }
            } catch (err) {
                Swal.showValidationMessage(err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                return false;
            }
        }
    });

    if (formValues) {
        localStorage.setItem('adminSession', 'true');
        showSection('admin-section');
        initAdminDashboard();
        
        Swal.fire({
            title: 'เข้าสู่ระบบ Admin สำเร็จ',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    }
}

// Check session on load or toggle
function checkAdminSession() {
    if (localStorage.getItem('adminSession') === 'true') {
        showSection('admin-section');
        initAdminDashboard();
    } else {
        showAdminLogin();
    }
}

function exitAdmin() {
    localStorage.removeItem('adminSession');
    // Check teacher session to redirect back
    const session = localStorage.getItem('teacherInfo');
    if (session) {
        showSection('class-selection');
    } else {
        showSection('login-section');
    }
}

// Initialize Admin UI elements and loading
function initAdminDashboard() {
    setupAdminTabs();
    
    // Initialize Custom Thai DatePicker for admin overview stats
    if (document.getElementById('admin-dashboard-date-container') && window.ThaiDatePicker) {
        new window.ThaiDatePicker('admin-dashboard-date-container', {
            initialDate: adminSelectedDate,
            maxDate: new Date().toISOString().split('T')[0],
            onChange: (val) => {
                adminSelectedDate = val;
                loadAdminStats();
            }
        });
    }

    // Load initial tab data
    switchTab('overview');
}

function setupAdminTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.onclick = () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        };
    });
}

function switchTab(tabName) {
    adminActiveTab = tabName;
    
    // Update tabs UI
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update panels UI
    const panels = document.querySelectorAll('.tab-content');
    panels.forEach(panel => {
        if (panel.id === `tab-${tabName}`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    // Load tab specific content
    if (tabName === 'overview') {
        loadAdminStats();
    } else if (tabName === 'students') {
        loadAdminStudents();
    } else if (tabName === 'classes') {
        loadAdminClasses();
    } else if (tabName === 'promotion') {
        loadPromoteClasses();
    } else if (tabName === 'reports') {
        loadAdminReports();
    } else if (tabName === 'users') {
        loadAdminUsers();
    }
}

// --- TAB 1: OVERVIEW/STATS ---
async function loadAdminStats() {
    const statsContainer = document.getElementById('admin-overview-stats');
    if (!statsContainer) return;

    try {
        const students = await window.db.getAllStudents();
        const logs = await window.db.getAttendanceReport(null, adminSelectedDate);
        
        let present = 0;
        let absent = 0;
        let sick = 0;
        let late = 0;
        let other = 0;
        let unchecked = students.length;

        // Group logs by student_id to prevent duplicate count (if checked multiple times)
        const recordedStudents = new Set();
        logs.forEach(log => {
            if (!recordedStudents.has(log.student_id)) {
                recordedStudents.add(log.student_id);
                unchecked--;
                
                switch (log.status) {
                    case 'มาเรียน': present++; break;
                    case 'ขาดเรียน': absent++; break;
                    case 'ลาป่วย': sick++; break;
                    case 'มาสาย': late++; break;
                    case 'อื่นๆ': other++; break;
                }
            }
        });

        const checkedCount = students.length - unchecked;
        const presentRate = checkedCount > 0 ? Math.round((present / checkedCount) * 100) : 0;
        const totalAttendanceRate = students.length > 0 ? Math.round((checkedCount / students.length) * 100) : 0;

        document.getElementById('stat-total-students').innerText = students.length;
        document.getElementById('stat-checked-count').innerText = `${checkedCount} คน (${totalAttendanceRate}%)`;
        document.getElementById('stat-present-count').innerText = `${present} คน (${presentRate}%)`;
        document.getElementById('stat-absent-count').innerText = `${absent} คน`;
        document.getElementById('stat-sick-late').innerText = `${sick} ลา / ${late} สาย / ${other} อื่นๆ`;

        // Render summary by class on this date
        const classes = await window.db.getClasses();
        const classOverviewList = document.getElementById('class-overview-list');
        classOverviewList.innerHTML = '';

        if (classes.length === 0) {
            classOverviewList.innerHTML = '<div class="text-slate-400 text-center py-4">ยังไม่มีห้องเรียนในระบบ</div>';
            return;
        }

        for (const cls of classes) {
            const classStudents = students.filter(s => s.class_name === cls.name);
            const classLogs = logs.filter(l => l.class_name === cls.name);
            
            const classRecorded = new Set();
            let cPresent = 0;
            classLogs.forEach(l => {
                if (!classRecorded.has(l.student_id)) {
                    classRecorded.add(l.student_id);
                    if (l.status === 'มาเรียน') cPresent++;
                }
            });

            const cChecked = classRecorded.size;
            const cPercent = classStudents.length > 0 ? Math.round((cChecked / classStudents.length) * 100) : 0;
            
            const li = document.createElement('div');
            li.className = 'flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-lg text-sm';
            li.innerHTML = `
                <div>
                    <span class="font-bold text-slate-100">${cls.name}</span>
                    <span class="text-xs text-slate-500 ml-2">(${cls.level})</span>
                </div>
                <div class="text-right">
                    <div class="font-semibold text-slate-200">${cChecked} / ${classStudents.length} คน (${cPercent}%)</div>
                    <div class="text-xs text-emerald-400 font-semibold">มา ${cPresent}</div>
                </div>
            `;
            classOverviewList.appendChild(li);
        }
    } catch (err) {
        console.error('loadAdminStats error:', err);
    }
}

// --- TAB 2: STUDENTS MANAGEMENT ---
async function loadAdminStudents() {
    const listContainer = document.getElementById('admin-students-list');
    if (!listContainer) return;

    if (adminStudentsTable) {
        adminStudentsTable.destroy();
        adminStudentsTable = null;
    }
    listContainer.innerHTML = '';

    try {
        const students = await window.db.getAllStudents();
        
        let tableHTML = `
            <table id="adminStudentsTable" class="display responsive nowrap w-full text-left">
                <thead>
                    <tr>
                        <th style="width: 15%">รหัสนักเรียน</th>
                        <th style="width: 25%">เลขประจำตัวประชาชน</th>
                        <th style="width: 30%">ชื่อ-นามสกุล</th>
                        <th style="width: 15%">ชั้นเรียน</th>
                        <th style="width: 15%">จัดการ</th>
                    </tr>
                </thead>
                <tbody>
        `;

        students.forEach(std => {
            tableHTML += `
                <tr>
                    <td class="font-medium text-slate-200">${std.student_code || '-'}</td>
                    <td class="text-slate-400 font-mono text-xs">${std.national_id || '-'}</td>
                    <td class="font-medium text-slate-200">${std.full_name}</td>
                    <td><span class="level-badge">${std.class_name}</span></td>
                    <td>
                        <div class="flex gap-2">
                            <button onclick="editStudentPrompt('${std.id}', '${std.full_name.replace(/'/g, "\\'")}', '${std.class_name.replace(/'/g, "\\'")}', '${(std.student_code || '').replace(/'/g, "\\'")}', '${(std.national_id || '').replace(/'/g, "\\'")}')" class="text-indigo-400 hover:text-indigo-300 font-semibold text-xs bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">แก้ไข</button>
                            <button onclick="deleteStudentPrompt('${std.id}', '${std.full_name.replace(/'/g, "\\'")}')" class="text-red-400 hover:text-red-300 font-semibold text-xs bg-red-500/10 px-2 py-1 rounded border border-red-500/20">ลบ</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        listContainer.innerHTML = tableHTML;

        adminStudentsTable = $('#adminStudentsTable').DataTable({
            responsive: true,
            pageLength: 10,
            language: {
                search: "ค้นหานักเรียน: ",
                lengthMenu: "แสดง _MENU_ รายการต่อหน้า",
                paginate: {
                    first: "แรก",
                    last: "สุดท้าย",
                    next: "ถัดไป",
                    previous: "ก่อนหน้า"
                },
                info: "แสดงหน้า _PAGE_ จากทั้งหมด _PAGES_ หน้า",
                infoEmpty: "ไม่มีข้อมูลนักเรียน",
                zeroRecords: "ไม่พบข้อมูลที่ค้นหา"
            }
        });
    } catch (err) {
        console.error('loadAdminStudents error:', err);
    }
}

async function addStudentPrompt() {
    const classes = await window.db.getClasses();
    if (classes.length === 0) {
        Swal.fire('ไม่สามารถเพิ่มนักเรียนได้', 'กรุณาสร้างห้องเรียนก่อนในเมนูห้องเรียน', 'warning');
        return;
    }

    let classOptions = '';
    classes.forEach(c => {
        classOptions += `<option value="${c.name}">${c.name} (${c.level})</option>`;
    });

    const { value: formValues } = await Swal.fire({
        title: 'เพิ่มนักเรียนใหม่',
        html: `
            <div class="text-left mb-3">
                <label class="input-label">รหัสนักเรียน</label>
                <input id="new-std-code" class="input-field" placeholder="เช่น STD10001">
            </div>
            <div class="text-left mb-3">
                <label class="input-label">เลขประจำตัวประชาชน</label>
                <input id="new-std-national" class="input-field" placeholder="เช่น 1100100200301" maxlength="13">
            </div>
            <div class="text-left mb-3">
                <label class="input-label">ชื่อ-นามสกุล นักเรียน</label>
                <input id="new-std-name" class="input-field" placeholder="ด.ช. มั่นคง มั่งคั่ง">
            </div>
            <div class="text-left">
                <label class="input-label">ระดับห้องเรียน</label>
                <select id="new-std-class" class="input-field">
                    ${classOptions}
                </select>
            </div>
        `,
        confirmButtonText: 'เพิ่มนักเรียน',
        cancelButtonText: 'ยกเลิก',
        showCancelButton: true,
        preConfirm: () => {
            const name = document.getElementById('new-std-name').value.trim();
            const clsName = document.getElementById('new-std-class').value;
            const code = document.getElementById('new-std-code').value.trim();
            const national = document.getElementById('new-std-national').value.trim();
            if (!name) {
                Swal.showValidationMessage('กรุณากรอกชื่อ-นามสกุลนักเรียน');
                return false;
            }
            return { name, className: clsName, code, national };
        }
    });

    if (formValues) {
        try {
            await window.db.addStudent(formValues.name, formValues.className, formValues.code, formValues.national);
            Swal.fire('เพิ่มสำเร็จ!', `เพิ่มนักเรียน ${formValues.name} เรียบร้อยแล้ว`, 'success');
            loadAdminStudents();
        } catch (err) {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        }
    }
}

async function editStudentPrompt(id, currentName, currentClassName, currentCode = '', currentNational = '') {
    const classes = await window.db.getClasses();
    let classOptions = '';
    classes.forEach(c => {
        classOptions += `<option value="${c.name}" ${c.name === currentClassName ? 'selected' : ''}>${c.name} (${c.level})</option>`;
    });

    const { value: formValues } = await Swal.fire({
        title: 'แก้ไขข้อมูลนักเรียน',
        html: `
            <div class="text-left mb-3">
                <label class="input-label">รหัสนักเรียน</label>
                <input id="edit-std-code" class="input-field" value="${currentCode}" placeholder="เช่น STD10001">
            </div>
            <div class="text-left mb-3">
                <label class="input-label">เลขประจำตัวประชาชน</label>
                <input id="edit-std-national" class="input-field" value="${currentNational}" placeholder="เช่น 1100100200301" maxlength="13">
            </div>
            <div class="text-left mb-3">
                <label class="input-label">ชื่อ-นามสกุล นักเรียน</label>
                <input id="edit-std-name" class="input-field" value="${currentName}">
            </div>
            <div class="text-left">
                <label class="input-label">ระดับห้องเรียน</label>
                <select id="edit-std-class" class="input-field">
                    ${classOptions}
                </select>
            </div>
        `,
        confirmButtonText: 'บันทึกการแก้ไข',
        cancelButtonText: 'ยกเลิก',
        showCancelButton: true,
        preConfirm: () => {
            const name = document.getElementById('edit-std-name').value.trim();
            const clsName = document.getElementById('edit-std-class').value;
            const code = document.getElementById('edit-std-code').value.trim();
            const national = document.getElementById('edit-std-national').value.trim();
            if (!name) {
                Swal.showValidationMessage('กรุณากรอกชื่อ-นามสกุลนักเรียน');
                return false;
            }
            return { name, className: clsName, code, national };
        }
    });

    if (formValues) {
        try {
            await window.db.editStudent(id, formValues.name, formValues.className, formValues.code, formValues.national);
            Swal.fire('แก้ไขสำเร็จ!', 'อัปเดตข้อมูลนักเรียนเรียบร้อยแล้ว', 'success');
            loadAdminStudents();
        } catch (err) {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตข้อมูลได้', 'error');
        }
    }
}

function deleteStudentPrompt(id, name) {
    Swal.fire({
        title: 'ยืนยันการลบนักเรียน?',
        text: `คุณกำลังจะลบข้อมูลของ ${name} ซึ่งประวัติทั้งหมดที่เกี่ยวกับนักเรียนคนนี้จะถูกลบด้วย`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'ใช่, ลบเลย',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await window.db.deleteStudent(id);
                Swal.fire('ลบเรียบร้อย!', `ข้อมูลของ ${name} ถูกลบออกจากระบบแล้ว`, 'success');
                loadAdminStudents();
            } catch (err) {
                Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
            }
        }
    });
}

// --- TAB 3: CLASSES MANAGEMENT ---
async function loadAdminClasses() {
    const listContainer = document.getElementById('admin-classes-list');
    if (!listContainer) return;

    if (adminClassesTable) {
        adminClassesTable.destroy();
        adminClassesTable = null;
    }
    listContainer.innerHTML = '';

    try {
        const classes = await window.db.getClasses();
        
        let tableHTML = `
            <table id="adminClassesTable" class="display responsive nowrap w-full text-left">
                <thead>
                    <tr>
                        <th style="width: 40%">ห้องเรียน</th>
                        <th style="width: 30%">ระดับการศึกษา</th>
                        <th style="width: 30%">จัดการ</th>
                    </tr>
                </thead>
                <tbody>
        `;

        classes.forEach(cls => {
            tableHTML += `
                <tr>
                    <td class="font-bold text-slate-100 text-lg">${cls.name}</td>
                    <td><span class="level-badge">${cls.level}</span></td>
                    <td>
                        <div class="flex gap-2">
                            <button onclick="editClassPrompt('${cls.name.replace(/'/g, "\\'")}', '${cls.level}')" class="text-indigo-400 hover:text-indigo-300 font-semibold text-xs bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">แก้ไข</button>
                            <button onclick="deleteClassPrompt('${cls.name.replace(/'/g, "\\'")}')" class="text-red-400 hover:text-red-300 font-semibold text-xs bg-red-500/10 px-2 py-1 rounded border border-red-500/20">ลบห้องเรียน</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        listContainer.innerHTML = tableHTML;

        adminClassesTable = $('#adminClassesTable').DataTable({
            responsive: true,
            paging: false,
            searching: false,
            info: false
        });
    } catch (err) {
        console.error('loadAdminClasses error:', err);
    }
}

async function addClassPrompt() {
    const { value: formValues } = await Swal.fire({
        title: 'เพิ่มห้องเรียนใหม่',
        html: `
            <div class="text-left mb-3">
                <label class="input-label">ชื่อห้องเรียน (เช่น ป.3/2, ม.4/1)</label>
                <input id="new-class-name" class="input-field" placeholder="ม.1/2">
            </div>
            <div class="text-left">
                <label class="input-label">ระดับการศึกษา</label>
                <select id="new-class-level" class="input-field">
                    <option value="อนุบาล">อนุบาล</option>
                    <option value="ประถม">ประถม</option>
                    <option value="มัธยม">มัธยม</option>
                </select>
            </div>
        `,
        confirmButtonText: 'เพิ่มห้องเรียน',
        cancelButtonText: 'ยกเลิก',
        showCancelButton: true,
        preConfirm: () => {
            const name = document.getElementById('new-class-name').value.trim();
            const level = document.getElementById('new-class-level').value;
            if (!name) {
                Swal.showValidationMessage('กรุณากรอกชื่อห้องเรียน');
                return false;
            }
            return { name, level };
        }
    });

    if (formValues) {
        try {
            await window.db.addClass(formValues.name, formValues.level);
            Swal.fire('สร้างสำเร็จ!', `เพิ่มห้องเรียน ${formValues.name} เรียบร้อยแล้ว`, 'success');
            loadAdminClasses();
        } catch (err) {
            Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        }
    }
}

function deleteClassPrompt(name) {
    Swal.fire({
        title: `ต้องการลบห้องเรียน ${name}?`,
        text: `คำเตือน! นักเรียนและข้อมูลประวัติการเช็คชื่อทั้งหมดของห้องเรียนนี้จะถูกลบถาวร`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'ยืนยันการลบห้องและข้อมูลนักเรียน',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await window.db.deleteClass(name);
                Swal.fire('ลบห้องเรียนเรียบร้อย!', `ห้องเรียน ${name} ถูกลบออกจากระบบแล้ว`, 'success');
                loadAdminClasses();
            } catch (err) {
                Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบห้องเรียนได้', 'error');
            }
        }
    });
}

async function editClassPrompt(oldName, currentLevel) {
    const { value: formValues } = await Swal.fire({
        title: 'แก้ไขข้อมูลห้องเรียน',
        html: `
            <div class="text-left mb-3">
                <label class="input-label">ชื่อห้องเรียน</label>
                <input id="edit-class-name" class="input-field" value="${oldName}" placeholder="เช่น ม.1/2">
            </div>
            <div class="text-left">
                <label class="input-label">ระดับการศึกษา</label>
                <select id="edit-class-level" class="input-field">
                    <option value="อนุบาล" ${currentLevel === 'อนุบาล' ? 'selected' : ''}>อนุบาล</option>
                    <option value="ประถม" ${currentLevel === 'ประถม' ? 'selected' : ''}>ประถม</option>
                    <option value="มัธยม" ${currentLevel === 'มัธยม' ? 'selected' : ''}>มัธยม</option>
                </select>
            </div>
        `,
        confirmButtonText: 'บันทึกการแก้ไข',
        cancelButtonText: 'ยกเลิก',
        showCancelButton: true,
        preConfirm: () => {
            const name = document.getElementById('edit-class-name').value.trim();
            const level = document.getElementById('edit-class-level').value;
            if (!name) {
                Swal.showValidationMessage('กรุณากรอกชื่อห้องเรียน');
                return false;
            }
            return { name, level };
        }
    });

    if (formValues) {
        try {
            Swal.fire({
                title: 'กำลังบันทึกข้อมูล...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            await window.db.editClass(oldName, formValues.name, formValues.level);
            Swal.fire('แก้ไขสำเร็จ!', `แก้ไขข้อมูลห้องเรียนเรียบร้อยแล้ว`, 'success');
            loadAdminClasses();
        } catch (err) {
            Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        }
    }
}

// --- TAB 4: HISTORICAL REPORTS & CSV EXPORT ---
async function loadAdminReports() {
    const listContainer = document.getElementById('admin-reports-list');
    const filterLevelSelect = document.getElementById('admin-report-filter-level');
    const filterClassSelect = document.getElementById('admin-report-filter-class');
    const filterTeacherSelect = document.getElementById('admin-report-filter-teacher');
    const allDatesCheckbox = document.getElementById('admin-report-all-dates');
    if (!listContainer) return;

    // Populate filters if needed
    if (filterClassSelect && filterClassSelect.options.length <= 1) {
        try {
            // Populate classes list
            const classes = await window.db.getClasses();
            filterClassSelect.innerHTML = '<option value="">-- ทุกห้องเรียน --</option>';
            classes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.name;
                opt.innerText = c.name;
                filterClassSelect.appendChild(opt);
            });

            // Initialize custom datepicker
            if (document.getElementById('admin-report-filter-date-container') && window.ThaiDatePicker) {
                new window.ThaiDatePicker('admin-report-filter-date-container', {
                    initialDate: adminSelectedDate,
                    onChange: (val) => {
                        adminSelectedDate = val;
                        loadAdminReports();
                    }
                });
            }
        } catch (err) {
            console.error('Populate report filters error:', err);
        }
    }

    // Populate teachers list dynamically from log history
    try {
        const allLogs = await window.db.getAttendanceReport(null, null, null, null);
        const teachersSet = new Set(allLogs.map(l => l.teacher_name).filter(Boolean));
        const currentTeacherFilterVal = filterTeacherSelect ? filterTeacherSelect.value : '';
        
        if (filterTeacherSelect) {
            filterTeacherSelect.innerHTML = '<option value="">-- ทุกคน --</option>';
            teachersSet.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.innerText = t;
                if (t === currentTeacherFilterVal) opt.selected = true;
                filterTeacherSelect.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('Populate report teachers filter error:', err);
    }

    if (adminReportsTable) {
        adminReportsTable.destroy();
        adminReportsTable = null;
    }
    listContainer.innerHTML = '';

    try {
        const selectedLevel = filterLevelSelect ? filterLevelSelect.value : null;
        const selectedClass = filterClassSelect ? filterClassSelect.value : null;
        const selectedTeacher = filterTeacherSelect ? filterTeacherSelect.value : null;
        const useDate = (allDatesCheckbox && allDatesCheckbox.checked) ? null : adminSelectedDate;

        const logs = await window.db.getAttendanceReport(
            selectedClass || null,
            useDate || null,
            selectedLevel || null,
            selectedTeacher || null
        );

        let tableHTML = `
            <table id="adminReportsTable" class="display responsive nowrap w-full text-left">
                <thead>
                    <tr>
                        <th>วันที่</th>
                        <th>ห้องเรียน</th>
                        <th>ชื่อ-นามสกุล</th>
                        <th>สถานะการเช็ค</th>
                        <th>หมายเหตุ</th>
                        <th>ผู้ตรวจสอบ</th>
                    </tr>
                </thead>
                <tbody>
        `;

        logs.forEach(log => {
            const badgeClass = getStatusBadgeClass(log.status);
            const statusLabel = getStatusLabel(log.status);
            const formattedDate = new Date(log.date).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            tableHTML += `
                <tr>
                    <td class="text-slate-400 text-sm font-semibold">${formattedDate}</td>
                    <td class="font-bold text-slate-200">${log.class_name}</td>
                    <td class="font-medium text-slate-200">${log.student_name}</td>
                    <td><span class="badge-status ${badgeClass}">${statusLabel}</span></td>
                    <td class="text-slate-500 text-xs italic">${log.note || '-'}</td>
                    <td class="text-indigo-400 text-xs font-semibold">${log.teacher_name}</td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        listContainer.innerHTML = tableHTML;

        adminReportsTable = $('#adminReportsTable').DataTable({
            responsive: true,
            pageLength: 25,
            ordering: false,
            language: {
                search: "ค้นหาในหน้านี้: ",
                lengthMenu: "แสดง _MENU_ รายการต่อหน้า",
                paginate: {
                    first: "แรก",
                    last: "สุดท้าย",
                    next: "ถัดไป",
                    previous: "ก่อนหน้า"
                },
                info: "แสดงหน้า _PAGE_ จากทั้งหมด _PAGES_ หน้า",
                infoEmpty: "ไม่มีประวัติการเช็คชื่อตามตัวกรองนี้",
                zeroRecords: "ไม่พบข้อมูลประวัติการเช็คชื่อ"
            }
        });
    } catch (err) {
        console.error('loadAdminReports error:', err);
    }
}

// Export logs to Excel-compatible CSV in Thai encoding
async function exportToCSV() {
    try {
        const filterLevelSelect = document.getElementById('admin-report-filter-level');
        const filterClassSelect = document.getElementById('admin-report-filter-class');
        const filterTeacherSelect = document.getElementById('admin-report-filter-teacher');
        const allDatesCheckbox = document.getElementById('admin-report-all-dates');

        const selectedLevel = filterLevelSelect ? filterLevelSelect.value : null;
        const selectedClass = filterClassSelect ? filterClassSelect.value : null;
        const selectedTeacher = filterTeacherSelect ? filterTeacherSelect.value : null;
        const useDate = (allDatesCheckbox && allDatesCheckbox.checked) ? null : adminSelectedDate;

        const logs = await window.db.getAttendanceReport(
            selectedClass || null,
            useDate || null,
            selectedLevel || null,
            selectedTeacher || null
        );

        if (logs.length === 0) {
            Swal.fire('ไม่มีข้อมูล', 'ไม่มีประวัติการเช็คชื่อสำหรับส่งออกในช่วงเวลาและชั้นเรียนที่เลือก', 'warning');
            return;
        }

        // Header configuration
        const csvHeaders = ['วันที่เช็คชื่อ', 'ห้องเรียน', 'ชื่อนักเรียน', 'สถานะเข้าเรียน', 'หมายเหตุเพิ่มเติม', 'ผู้บันทึกข้อมูล'];
        
        let csvContent = '\uFEFF'; // Include UTF-8 Byte Order Mark (BOM) so MS Excel reads Thai text correctly!
        csvContent += csvHeaders.join(',') + '\n';

        logs.forEach(log => {
            const rowData = [
                log.date,
                log.class_name,
                `"${log.student_name.replace(/"/g, '""')}"`,
                log.status,
                `"${(log.note || '').replace(/"/g, '""')}"`,
                `"${log.teacher_name.replace(/"/g, '""')}"`
            ];
            csvContent += rowData.join(',') + '\n';
        });

        // Trigger file download in browser
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const fileDateStr = useDate ? `_${useDate}` : '_ทุกวัน';
        const fileClassStr = selectedClass ? `_${selectedClass}` : (selectedLevel ? `_${selectedLevel}` : '');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `รายงานการเช็คชื่อ${fileClassStr}${fileDateStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Swal.fire({
            title: 'ส่งออกสำเร็จ!',
            text: `ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว (${logs.length} แถว)`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    } catch (err) {
        console.error('exportToCSV error:', err);
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถส่งออกข้อมูลเป็นไฟล์ได้', 'error');
    }
}

// Excel upload handler using SheetJS
async function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    Swal.fire({
        title: 'กำลังนำเข้าข้อมูล...',
        html: 'กรุณารอสักครู่ ระบบกำลังอ่านไฟล์ Excel และนำข้อมูลนักเรียนเข้าสู่ฐานข้อมูล',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length <= 1) {
                throw new Error('ไม่พบข้อมูลนักเรียนในไฟล์ Excel');
            }

            const headers = jsonData[0].map(h => String(h || '').trim());
            const idxCode = headers.indexOf('รหัสนักเรียน');
            const idxNational = headers.indexOf('เลขประจำตัวประชาชน');
            const idxName = headers.indexOf('ชื่อ-นามสกุล');
            const idxClass = headers.indexOf('ชั้นเรียน');

            if (idxName === -1 || idxClass === -1) {
                throw new Error('โครงสร้างไฟล์ Excel ไม่ถูกต้อง กรุณาตรวจสอบว่ามีคอลัมน์ "ชื่อ-นามสกุล" และ "ชั้นเรียน"');
            }

            let successCount = 0;
            const existingClasses = await window.db.getClasses();
            const classMap = new Map(existingClasses.map(c => [c.name, c.level]));

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                const fullName = row[idxName] ? String(row[idxName]).trim() : '';
                const className = row[idxClass] ? String(row[idxClass]).trim() : '';
                const studentCode = idxCode !== -1 && row[idxCode] ? String(row[idxCode]).trim() : '';
                const nationalId = idxNational !== -1 && row[idxNational] ? String(row[idxNational]).trim() : '';

                if (!fullName && !className) continue;

                if (className && !classMap.has(className)) {
                    let level = 'ประถม';
                    if (className.startsWith('อ') || className.startsWith('อนุบาล')) {
                        level = 'อนุบาล';
                    } else if (className.startsWith('ป') || className.startsWith('ประถม')) {
                        level = 'ประถม';
                    } else if (className.startsWith('ม') || className.startsWith('มัธยม')) {
                        level = 'มัธยม';
                    }
                    await window.db.addClass(className, level);
                    classMap.set(className, level);
                }

                await window.db.addStudent(fullName, className, studentCode, nationalId);
                successCount++;
            }

            Swal.fire({
                icon: 'success',
                title: 'นำเข้าสำเร็จ!',
                text: `นำข้อมูลนักเรียนเข้าสู่ระบบสำเร็จทั้งหมด ${successCount} รายการ`,
                confirmButtonText: 'ตกลง'
            });

            loadAdminStudents();
        } catch (err) {
            console.error('handleExcelUpload error:', err);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาดในการนำเข้า',
                text: err.message || 'ไม่สามารถประมวลผลไฟล์ Excel ได้',
                confirmButtonText: 'ตกลง'
            });
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

// Class Promotion/Transfer state and functions
let promotionCheckedStudents = new Set();

async function loadPromoteClasses() {
    const sourceSelect = document.getElementById('promote-source-class');
    const targetSelect = document.getElementById('promote-target-class');
    if (!sourceSelect || !targetSelect) return;

    try {
        const classes = await window.db.getClasses();
        
        sourceSelect.innerHTML = '<option value="">-- เลือกห้องเรียนต้นทาง --</option>';
        targetSelect.innerHTML = '<option value="">-- เลือกห้องเรียนปลายทาง --</option>';
        
        classes.forEach(c => {
            const opt1 = document.createElement('option');
            opt1.value = c.name;
            opt1.innerText = `${c.name} (${c.level})`;
            sourceSelect.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = c.name;
            opt2.innerText = `${c.name} (${c.level})`;
            targetSelect.appendChild(opt2);
        });
        
        document.getElementById('promote-students-list').innerHTML = '<div class="col-span-full text-slate-400 text-center py-8">กรุณาเลือกห้องเรียนต้นทาง</div>';
        document.getElementById('promote-select-all').checked = false;
        promotionCheckedStudents.clear();
    } catch (err) {
        console.error('loadPromoteClasses error:', err);
    }
}

async function loadPromoteStudentsList() {
    const sourceClass = document.getElementById('promote-source-class').value;
    const listContainer = document.getElementById('promote-students-list');
    const selectAllCheckbox = document.getElementById('promote-select-all');
    
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    promotionCheckedStudents.clear();

    if (!sourceClass) {
        listContainer.innerHTML = '<div class="col-span-full text-slate-400 text-center py-8">กรุณาเลือกห้องเรียนต้นทาง</div>';
        return;
    }

    listContainer.innerHTML = `
        <div class="col-span-full text-center py-4 text-slate-500">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mb-2"></div>
            <div>กำลังโหลดรายชื่อนักเรียน...</div>
        </div>
    `;

    try {
        const students = await window.db.getStudents(sourceClass);
        if (students.length === 0) {
            listContainer.innerHTML = '<div class="col-span-full text-slate-400 text-center py-8">ไม่มีข้อมูลนักเรียนในห้องเรียนนี้</div>';
            return;
        }

        listContainer.innerHTML = '';
        students.forEach(std => {
            const item = document.createElement('label');
            item.className = 'flex items-center gap-2.5 p-2.5 border border-white/10 rounded-lg hover:bg-white/5 transition cursor-pointer text-sm font-medium';
            item.innerHTML = `
                <input type="checkbox" data-id="${std.id}" class="promote-student-checkbox h-4 w-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 bg-slate-800" onchange="handleStudentPromoteCheck(this, '${std.id}')">
                <div class="flex flex-col">
                    <span class="text-slate-200">${std.full_name}</span>
                    <span class="text-[10px] text-slate-400 font-mono">${std.student_code || 'ไม่มีรหัส'}</span>
                </div>
            `;
            listContainer.appendChild(item);
        });
    } catch (err) {
        console.error('loadPromoteStudentsList error:', err);
        listContainer.innerHTML = '<div class="col-span-full text-red-500 text-center py-8">เกิดข้อผิดพลาดในการโหลดรายชื่อ</div>';
    }
}

function handleStudentPromoteCheck(checkbox, id) {
    if (checkbox.checked) {
        promotionCheckedStudents.add(id);
    } else {
        promotionCheckedStudents.delete(id);
    }
    
    const checkboxes = document.querySelectorAll('.promote-student-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const selectAllCheckbox = document.getElementById('promote-select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = allChecked;
    }
}

function toggleSelectAllPromotion(selectAllCb) {
    const checkboxes = document.querySelectorAll('.promote-student-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = selectAllCb.checked;
        const id = cb.dataset.id;
        if (selectAllCb.checked) {
            promotionCheckedStudents.add(id);
        } else {
            promotionCheckedStudents.delete(id);
        }
    });
}

async function executePromotion() {
    const sourceClass = document.getElementById('promote-source-class').value;
    const targetClass = document.getElementById('promote-target-class').value;
    
    if (!sourceClass) {
        Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกห้องเรียนต้นทาง', 'warning');
        return;
    }
    if (!targetClass) {
        Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกห้องเรียนปลายทาง', 'warning');
        return;
    }
    if (sourceClass === targetClass) {
        Swal.fire('ข้อผิดพลาด', 'ห้องเรียนต้นทางและห้องเรียนปลายทางต้องเป็นคนละห้องเรียนกัน', 'warning');
        return;
    }
    if (promotionCheckedStudents.size === 0) {
        Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกนักเรียนอย่างน้อย 1 คนที่ต้องการย้ายหรือเลื่อนชั้นเรียน', 'warning');
        return;
    }

    const confirmText = `คุณต้องการย้ายนักเรียนจำนวน ${promotionCheckedStudents.size} คน จากห้องเรียน ${sourceClass} ไปยังห้องเรียน ${targetClass} ใช่หรือไม่?`;
    
    const { isConfirmed } = await Swal.fire({
        title: 'ยืนยันการเลื่อนชั้นเรียน?',
        text: confirmText,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ยืนยันการย้ายห้อง',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#ec4899'
    });

    if (isConfirmed) {
        try {
            Swal.fire({
                title: 'กำลังดำเนินการ...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            await window.db.promoteStudents(Array.from(promotionCheckedStudents), targetClass);
            
            Swal.fire('ดำเนินการสำเร็จ!', `ย้ายนักเรียนไปยังห้อง ${targetClass} เรียบร้อยแล้ว`, 'success');
            
            loadPromoteStudentsList();
        } catch (err) {
            console.error('executePromotion error:', err);
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถดำเนินการย้ายชั้นเรียนได้', 'error');
        }
    }
}

function toggleReportsDateFilter(checkbox) {
    const dateBtn = document.getElementById('admin-report-filter-date-btn');
    if (checkbox.checked) {
        if (dateBtn) dateBtn.disabled = true;
        const dateText = document.querySelector('#admin-report-filter-date-container .date-text');
        if (dateText) dateText.innerText = 'ทุกวัน (ทุกช่วงเวลา)';
    } else {
        if (dateBtn) dateBtn.disabled = false;
        const dpInput = document.getElementById('admin-report-filter-date');
        if (dpInput && window.ThaiDatePicker) {
            const parts = dpInput.value.split('-');
            const d = parseInt(parts[2]);
            const m = parseInt(parts[1]) - 1;
            const y = parseInt(parts[0]) + 543;
            const dateText = document.querySelector('#admin-report-filter-date-container .date-text');
            if (dateText) {
                const monthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                dateText.innerText = `${d} ${monthsShort[m]} ${y}`;
            }
        }
    }
    loadAdminReports();
}

// User management functions
let adminUsersTable = null;

async function loadAdminUsers() {
    const listContainer = document.getElementById('admin-users-list');
    if (!listContainer) return;

    if (adminUsersTable) {
        adminUsersTable.destroy();
        adminUsersTable = null;
    }
    listContainer.innerHTML = '';

    try {
        const users = await window.db.getUsers();
        
        let tableHTML = `
            <table id="adminUsersTable" class="display responsive nowrap w-full text-left">
                <thead>
                    <tr>
                        <th style="width: 15%">ชื่อผู้ใช้ (Username)</th>
                        <th style="width: 12%">ชื่อเล่น</th>
                        <th style="width: 23%">ชื่อจริง-นามสกุล</th>
                        <th style="width: 12%">บทบาท (Role)</th>
                        <th style="width: 13%">ชั้นเรียนประจำ</th>
                        <th style="width: 10%">รหัสผ่าน</th>
                        <th style="width: 15%">จัดการ</th>
                    </tr>
                </thead>
                <tbody>
        `;

        users.forEach(usr => {
            const roleBadge = usr.role === 'admin' 
                ? '<span class="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-xs font-semibold">Admin</span>'
                : '<span class="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-xs font-semibold">Teacher</span>';
                
            const classBadge = usr.class_name 
                ? `<span class="px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-semibold text-xs">${usr.class_name}</span>`
                : '<span class="text-xs text-slate-400 font-medium">-</span>';

            tableHTML += `
                <tr>
                    <td class="font-bold text-slate-100">${usr.username}</td>
                    <td class="font-medium text-slate-300">${usr.nickname || '-'}</td>
                    <td class="font-medium text-slate-200">${usr.first_name} ${usr.last_name}</td>
                    <td>${roleBadge}</td>
                    <td>${classBadge}</td>
                    <td class="font-mono text-xs text-slate-400">${usr.password}</td>
                    <td>
                        <div class="flex gap-2">
                            <button onclick="editUserPrompt('${usr.id}', '${usr.username.replace(/'/g, "\\'")}', '${usr.password.replace(/'/g, "\\'")}', '${usr.role}', '${usr.first_name.replace(/'/g, "\\'")}', '${usr.last_name.replace(/'/g, "\\'")}', '${(usr.nickname || '').replace(/'/g, "\\'")}', '${(usr.class_name || '').replace(/'/g, "\\'")}')" class="text-indigo-400 hover:text-indigo-300 font-semibold text-xs bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">แก้ไข</button>
                            <button onclick="deleteUserPrompt('${usr.id}', '${usr.username.replace(/'/g, "\\'")}', '${usr.role}')" class="text-red-400 hover:text-red-300 font-semibold text-xs bg-red-500/10 px-2 py-1 rounded border border-red-500/20" ${usr.username === 'uj-admin' ? 'disabled title="ไม่สามารถลบผู้ดูแลระบบหลักได้"' : ''}>ลบ</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        listContainer.innerHTML = tableHTML;

        adminUsersTable = $('#adminUsersTable').DataTable({
            responsive: true,
            pageLength: 10,
            language: {
                search: "ค้นหาผู้ใช้: ",
                lengthMenu: "แสดง _MENU_ รายการต่อหน้า",
                paginate: {
                    first: "แรก",
                    last: "สุดท้าย",
                    next: "ถัดไป",
                    previous: "ก่อนหน้า"
                },
                info: "แสดงหน้า _PAGE_ จากทั้งหมด _PAGES_ หน้า",
                infoEmpty: "ไม่มีข้อมูลผู้ใช้งาน",
                zeroRecords: "ไม่พบข้อมูลที่ค้นหา"
            }
        });
    } catch (err) {
        console.error('loadAdminUsers error:', err);
    }
}

async function addUserPrompt() {
    let classes = [];
    try {
        classes = await window.db.getClasses();
    } catch (err) {
        console.error('Error fetching classes for user prompt:', err);
    }

    let classOptions = '<option value="">-- ไม่มีห้องเรียนประจำชั้น --</option>';
    classes.forEach(c => {
        classOptions += `<option value="${c.name}">${c.name} (${c.level})</option>`;
    });

    const { value: formValues } = await Swal.fire({
        title: 'เพิ่มผู้ใช้งานใหม่',
        html: `
            <div class="text-left mb-3">
                <label class="input-label">ชื่อผู้ใช้ (Username)</label>
                <input id="new-usr-username" class="input-field" placeholder="เช่น teacher2" autocomplete="username">
            </div>
            <div class="text-left mb-3">
                <label class="input-label">รหัสผ่าน (Password)</label>
                <input id="new-usr-password" class="input-field" type="password" placeholder="เช่น 123456" autocomplete="new-password">
            </div>
            <div class="text-left mb-3">
                <label class="input-label">บทบาท (Role)</label>
                <select id="new-usr-role" class="input-field">
                    <option value="teacher">คุณครู (Teacher)</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                </select>
            </div>
            <div id="new-usr-class-container" class="text-left mb-3">
                <label class="input-label">ชั้นเรียนประจำ (Assigned Class)</label>
                <select id="new-usr-class" class="input-field">
                    ${classOptions}
                </select>
            </div>
            <div class="text-left mb-3">
                <label class="input-label">ชื่อเล่น (Nickname)</label>
                <input id="new-usr-nickname" class="input-field" placeholder="เช่น ครูนิด">
            </div>
            <div class="grid grid-cols-2 gap-3 text-left">
                <div>
                    <label class="input-label">ชื่อจริง (First Name)</label>
                    <input id="new-usr-firstname" class="input-field" placeholder="เช่น นงลักษณ์">
                </div>
                <div>
                    <label class="input-label">นามสกุล (Last Name)</label>
                    <input id="new-usr-lastname" class="input-field" placeholder="เช่น สุขใจ">
                </div>
            </div>
        `,
        confirmButtonText: 'เพิ่มผู้ใช้',
        cancelButtonText: 'ยกเลิก',
        showCancelButton: true,
        didOpen: () => {
            const roleSelect = document.getElementById('new-usr-role');
            const classContainer = document.getElementById('new-usr-class-container');
            if (roleSelect && classContainer) {
                roleSelect.addEventListener('change', () => {
                    if (roleSelect.value === 'teacher') {
                        classContainer.style.display = 'block';
                    } else {
                        classContainer.style.display = 'none';
                        document.getElementById('new-usr-class').value = '';
                    }
                });
            }
        },
        preConfirm: () => {
            const username = document.getElementById('new-usr-username').value.trim();
            const password = document.getElementById('new-usr-password').value.trim();
            const role = document.getElementById('new-usr-role').value;
            const classNameInput = document.getElementById('new-usr-class');
            const className = (role === 'teacher' && classNameInput) ? classNameInput.value : '';
            const nickname = document.getElementById('new-usr-nickname').value.trim();
            const firstName = document.getElementById('new-usr-firstname').value.trim();
            const lastName = document.getElementById('new-usr-lastname').value.trim();

            if (!username || !password || !nickname || !firstName || !lastName) {
                Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
                return false;
            }
            return { username, password, role, nickname, firstName, lastName, className };
        }
    });

    if (formValues) {
        try {
            Swal.fire({
                title: 'กำลังบันทึกข้อมูล...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            await window.db.addUser(
                formValues.username, 
                formValues.password, 
                formValues.role, 
                formValues.firstName, 
                formValues.lastName, 
                formValues.nickname,
                formValues.className
            );

            Swal.fire('เพิ่มสำเร็จ!', `เพิ่มผู้ใช้ ${formValues.username} เรียบร้อยแล้ว`, 'success');
            loadAdminUsers();
        } catch (err) {
            Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        }
    }
}

async function editUserPrompt(id, currentUsername, currentPassword, currentRole, currentFirstName, currentLastName, currentNickname, currentClassName = '') {
    let classes = [];
    try {
        classes = await window.db.getClasses();
    } catch (err) {
        console.error('Error fetching classes for user prompt:', err);
    }

    let classOptions = '<option value="">-- ไม่มีห้องเรียนประจำชั้น --</option>';
    classes.forEach(c => {
        classOptions += `<option value="${c.name}" ${c.name === currentClassName ? 'selected' : ''}>${c.name} (${c.level})</option>`;
    });

    const { value: formValues } = await Swal.fire({
        title: 'แก้ไขข้อมูลผู้ใช้งาน',
        html: `
            <div class="text-left mb-3">
                <label class="input-label">ชื่อผู้ใช้ (Username)</label>
                <input id="edit-usr-username" class="input-field" value="${currentUsername}" placeholder="เช่น teacher2" autocomplete="username">
            </div>
            <div class="text-left mb-3">
                <label class="input-label">รหัสผ่าน (Password)</label>
                <input id="edit-usr-password" class="input-field" type="text" value="${currentPassword}" placeholder="เช่น 123456" autocomplete="new-password">
            </div>
            <div class="text-left mb-3">
                <label class="input-label">บทบาท (Role)</label>
                <select id="edit-usr-role" class="input-field" ${currentUsername === 'uj-admin' ? 'disabled' : ''}>
                    <option value="teacher" ${currentRole === 'teacher' ? 'selected' : ''}>คุณครู (Teacher)</option>
                    <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>ผู้ดูแลระบบ (Admin)</option>
                </select>
            </div>
            <div id="edit-usr-class-container" class="text-left mb-3" style="display: ${currentRole === 'teacher' ? 'block' : 'none'};">
                <label class="input-label">ชั้นเรียนประจำ (Assigned Class)</label>
                <select id="edit-usr-class" class="input-field">
                    ${classOptions}
                </select>
            </div>
            <div class="text-left mb-3">
                <label class="input-label">ชื่อเล่น (Nickname)</label>
                <input id="edit-usr-nickname" class="input-field" value="${currentNickname}" placeholder="เช่น ครูนิด">
            </div>
            <div class="grid grid-cols-2 gap-3 text-left">
                <div>
                    <label class="input-label">ชื่อจริง (First Name)</label>
                    <input id="edit-usr-firstname" class="input-field" value="${currentFirstName}" placeholder="เช่น นงลักษณ์">
                </div>
                <div>
                    <label class="input-label">นามสกุล (Last Name)</label>
                    <input id="edit-usr-lastname" class="input-field" value="${currentLastName}" placeholder="เช่น สุขใจ">
                </div>
            </div>
        `,
        confirmButtonText: 'บันทึกการแก้ไข',
        cancelButtonText: 'ยกเลิก',
        showCancelButton: true,
        didOpen: () => {
            const roleSelect = document.getElementById('edit-usr-role');
            const classContainer = document.getElementById('edit-usr-class-container');
            if (roleSelect && classContainer) {
                roleSelect.addEventListener('change', () => {
                    if (roleSelect.value === 'teacher') {
                        classContainer.style.display = 'block';
                    } else {
                        classContainer.style.display = 'none';
                        document.getElementById('edit-usr-class').value = '';
                    }
                });
            }
        },
        preConfirm: () => {
            const username = document.getElementById('edit-usr-username').value.trim();
            const password = document.getElementById('edit-usr-password').value.trim();
            const role = document.getElementById('edit-usr-role').disabled ? currentRole : document.getElementById('edit-usr-role').value;
            const classNameInput = document.getElementById('edit-usr-class');
            const className = (role === 'teacher' && classNameInput) ? classNameInput.value : '';
            const nickname = document.getElementById('edit-usr-nickname').value.trim();
            const firstName = document.getElementById('edit-usr-firstname').value.trim();
            const lastName = document.getElementById('edit-usr-lastname').value.trim();

            if (!username || !password || !nickname || !firstName || !lastName) {
                Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
                return false;
            }
            return { username, password, role, nickname, firstName, lastName, className };
        }
    });

    if (formValues) {
        try {
            Swal.fire({
                title: 'กำลังบันทึกข้อมูล...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            await window.db.editUser(
                id,
                formValues.username, 
                formValues.password, 
                formValues.role, 
                formValues.firstName, 
                formValues.lastName, 
                formValues.nickname,
                formValues.className
            );

            Swal.fire('แก้ไขสำเร็จ!', 'อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว', 'success');
            loadAdminUsers();
        } catch (err) {
            Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        }
    }
}

function deleteUserPrompt(id, username, role) {
    if (username === 'uj-admin') {
        Swal.fire('ไม่อนุญาต', 'ไม่สามารถลบผู้ดูแลระบบหลักได้', 'warning');
        return;
    }

    Swal.fire({
        title: `ยืนยันการลบผู้ใช้ ${username}?`,
        text: `บัญชีผู้ใช้นี้จะไม่สามารถเข้าสู่ระบบเช็คชื่อได้อีกต่อไป`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'ใช่, ลบผู้ใช้งาน',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                Swal.fire({
                    title: 'กำลังลบข้อมูล...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                await window.db.deleteUser(id);
                Swal.fire('ลบสำเร็จ!', `ผู้ใช้งาน ${username} ถูกลบออกจากระบบแล้ว`, 'success');
                loadAdminUsers();
            } catch (err) {
                Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลผู้ใช้งานได้', 'error');
            }
        }
    });
}

// Global functions attached to window for HTML buttons
window.showAdminLogin = showAdminLogin;
window.checkAdminSession = checkAdminSession;
window.exitAdmin = exitAdmin;
window.addStudentPrompt = addStudentPrompt;
window.editStudentPrompt = editStudentPrompt;
window.deleteStudentPrompt = deleteStudentPrompt;
window.addClassPrompt = addClassPrompt;
window.editClassPrompt = editClassPrompt;
window.deleteClassPrompt = deleteClassPrompt;
window.exportToCSV = exportToCSV;
window.handleExcelUpload = handleExcelUpload;
window.loadPromoteClasses = loadPromoteClasses;
window.loadPromoteStudentsList = loadPromoteStudentsList;
window.handleStudentPromoteCheck = handleStudentPromoteCheck;
window.toggleSelectAllPromotion = toggleSelectAllPromotion;
window.executePromotion = executePromotion;
window.toggleReportsDateFilter = toggleReportsDateFilter;
window.loadAdminReports = loadAdminReports;
window.loadAdminUsers = loadAdminUsers;
window.addUserPrompt = addUserPrompt;
window.editUserPrompt = editUserPrompt;
window.deleteUserPrompt = deleteUserPrompt;


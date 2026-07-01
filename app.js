// Teacher workflow state and UI logic
let currentTeacher = null;
let currentLevel = 'อนุบาล';
let currentClass = null;
let currentStudents = [];
let attendanceCache = {}; // Key: student_id, Value: { status, note }
let selectedDate = new Date().toISOString().split('T')[0]; // Default to today YYYY-MM-DD
let dataTableInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initial setup
    checkUserSession();
    setupEventListeners();
    
    // Initialize Custom Thai DatePicker for teacher check-in
    if (document.getElementById('attendance-date-container') && window.ThaiDatePicker) {
        new window.ThaiDatePicker('attendance-date-container', {
            initialDate: selectedDate,
            maxDate: new Date().toISOString().split('T')[0],
            onChange: (val) => {
                selectedDate = val;
                loadSessionCache();
                renderStudentUI();
            }
        });
    }
});

function checkUserSession() {
    const adminSession = localStorage.getItem('adminSession');
    const teacherSession = localStorage.getItem('teacherInfo');
    
    if (adminSession === 'true') {
        showSection('admin-section');
        if (window.initAdminDashboard) {
            window.initAdminDashboard();
        }
    } else if (teacherSession) {
        currentTeacher = JSON.parse(teacherSession);
        document.getElementById('teacher-name-display').innerText = 
            `คุณครู: ${currentTeacher.firstName} ${currentTeacher.lastName} (${currentTeacher.nickname})`;
        showSection('class-selection');
        loadClasses(currentLevel);
    } else {
        showSection('login-section');
    }
}

function setupEventListeners() {
    // Resize listener to adapt responsive UI structure
    window.addEventListener('resize', () => {
        const studentSection = document.getElementById('student-list-section');
        if (studentSection && studentSection.style.display === 'block') {
            renderStudentUI();
        }
    });
}

async function handleLogin() {
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!username || !password) {
        Swal.fire({
            title: 'กรอกข้อมูลไม่ครบ',
            text: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน',
            icon: 'warning',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    Swal.fire({
        title: 'กำลังตรวจสอบข้อมูล...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() }
    });

    try {
        const user = await window.db.login(username, password);
        
        if (user.role === 'admin') {
            localStorage.setItem('adminSession', 'true');
            // Reset input values
            if (usernameInput) usernameInput.value = '';
            if (passwordInput) passwordInput.value = '';
            
            Swal.fire({
                title: 'เข้าสู่ระบบสำเร็จ',
                text: `ยินดีต้อนรับผู้ดูแลระบบ`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                showSection('admin-section');
                if (window.initAdminDashboard) {
                    window.initAdminDashboard();
                }
            });
        } else {
            currentTeacher = { 
                firstName: user.first_name, 
                lastName: user.last_name, 
                nickname: user.nickname,
                username: user.username,
                class_name: user.class_name
            };
            localStorage.setItem('teacherInfo', JSON.stringify(currentTeacher));
            
            document.getElementById('teacher-name-display').innerText = 
                `คุณครู: ${user.first_name} ${user.last_name} (${user.nickname})`;
            
            // Reset input values
            if (usernameInput) usernameInput.value = '';
            if (passwordInput) passwordInput.value = '';

            Swal.fire({
                title: 'เข้าสู่ระบบสำเร็จ',
                text: `ยินดีต้อนรับ คุณครู${user.nickname}`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                showSection('class-selection');
                loadClasses(currentLevel);
            });
        }
    } catch (err) {
        console.error('Login error:', err);
        Swal.fire({
            title: 'เข้าสู่ระบบล้มเหลว',
            text: err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
            icon: 'error',
            confirmButtonText: 'ตกลง'
        });
    }
}

function handleLogout() {
    Swal.fire({
        title: 'ต้องการออกจากระบบ?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ออกจากระบบ',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('teacherInfo');
            currentTeacher = null;
            showSection('login-section');
            
            // Reset input values
            const usernameInput = document.getElementById('login-username');
            const passwordInput = document.getElementById('login-password');
            if (usernameInput) usernameInput.value = '';
            if (passwordInput) passwordInput.value = '';
        }
    });
}

function updateHeaderUserPanel() {
    const panel = document.getElementById('header-user-panel');
    if (!panel) return;

    const teacherInfoStr = localStorage.getItem('teacherInfo');
    const isAdmin = localStorage.getItem('adminSession') === 'true';

    let content = '';

    if (isAdmin) {
        content = `
            <span class="text-xs md:text-sm text-indigo-400 font-semibold mr-1">ผู้ดูแลระบบ (Admin)</span>
            <button onclick="exitAdmin()" class="btn-danger py-1.5 px-3 text-xs" style="border-radius: 8px;">ออกจากระบบ</button>
            <button onclick="toggleSettingsModal(true)" class="btn-secondary py-1.5 px-2.5 text-xs" style="border-radius: 8px;" title="ตั้งค่าฐานข้อมูล">⚙️</button>
        `;
    } else if (teacherInfoStr) {
        const info = JSON.parse(teacherInfoStr);
        content = `
            <span class="text-xs md:text-sm text-slate-300 font-medium mr-1">ครู: ${info.nickname}</span>
            <button onclick="handleLogout()" class="btn-danger py-1.5 px-3 text-xs" style="border-radius: 8px;">ออกจากระบบ</button>
            <button onclick="toggleSettingsModal(true)" class="btn-secondary py-1.5 px-2.5 text-xs" style="border-radius: 8px;" title="ตั้งค่าฐานข้อมูล">⚙️</button>
        `;
    } else {
        content = `
            <button onclick="toggleSettingsModal(true)" class="btn-secondary px-3 py-2 text-xs md:text-sm" title="ตั้งค่าฐานข้อมูล">
                ⚙️ เชื่อมต่อ Supabase
            </button>
        `;
    }

    panel.innerHTML = content;
}

function showSection(sectionId) {
    const sections = ['login-section', 'class-selection', 'student-list-section', 'admin-section'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = (id === sectionId) ? 'block' : 'none';
        }
    });

    // Update the dynamic logout/user info panel in the top header
    updateHeaderUserPanel();

    // Custom behaviors when switching sections
    if (sectionId === 'class-selection') {
        loadClasses(currentLevel);
    }
}

async function loadClasses(level) {
    currentLevel = level;
    
    const classList = document.getElementById('class-list');
    if (!classList) return;
    
    // Check if teacher is assigned to a specific class
    const hasAssignedClass = currentTeacher && currentTeacher.class_name;
    
    // Update active tab styling and toggle visibility of level selection tabs
    const levelNav = document.querySelector('.level-nav-container');
    if (levelNav) {
        levelNav.style.display = hasAssignedClass ? 'none' : 'flex';
    }

    const buttons = document.querySelectorAll('.level-tab');
    buttons.forEach(btn => {
        if (btn.dataset.level === level) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    classList.innerHTML = `
        <div class="col-span-full text-center py-8 text-slate-400">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
            <div>กำลังโหลดข้อมูลห้องเรียน...</div>
        </div>
    `;

    try {
        let classes = [];
        if (hasAssignedClass) {
            // Fetch all classes and filter for the assigned one
            const allConfiguredClasses = await window.db.getClasses(null);
            classes = allConfiguredClasses.filter(c => c.name === currentTeacher.class_name);
        } else {
            classes = await window.db.getClasses(level);
        }
        classList.innerHTML = '';

        if (classes.length === 0) {
            classList.innerHTML = `
                <div class="col-span-full text-center py-8 text-slate-500">
                    ไม่พบห้องเรียนในระดับนี้
                </div>
            `;
            return;
        }

        for (const cls of classes) {
            const students = await window.db.getStudents(cls.name);
            const card = document.createElement('div');
            card.className = 'class-card';
            card.onclick = () => selectClass(cls.name);
            
            card.innerHTML = `
                <div class="text-2xl font-bold text-slate-100">${cls.name}</div>
                <div class="text-xs text-indigo-400 font-semibold">${cls.level}</div>
                <div class="text-sm text-slate-400 mt-2">${students.length} นักเรียน</div>
            `;
            classList.appendChild(card);
        }
    } catch (err) {
        console.error('loadClasses error:', err);
        classList.innerHTML = `<div class="col-span-full text-red-400 text-center py-4">เกิดข้อผิดพลาดในการโหลดข้อมูลห้องเรียน</div>`;
    }
}

async function selectClass(className) {
    currentClass = className;
    document.getElementById('current-class-title').innerText = `รายชื่อนักเรียนชั้น: ${className}`;
    
    // Load student list
    currentStudents = await window.db.getStudents(className);
    
    // Load local storage session cache for this specific class & date
    loadSessionCache();
    
    // Show section and render
    showSection('student-list-section');
    renderStudentUI();
}

function loadSessionCache() {
    const cacheKey = `attendance_cache_${currentClass}_${selectedDate}`;
    const cachedData = localStorage.getItem(cacheKey);
    attendanceCache = cachedData ? JSON.parse(cachedData) : {};
    
    // If cache is empty, prepopulate unchecked statuses
    currentStudents.forEach(std => {
        if (!attendanceCache[std.id]) {
            attendanceCache[std.id] = { status: 'ยังไม่ได้เช็ค', note: '' };
        }
    });
    updateProgressTracker();
}

function saveSessionCache() {
    const cacheKey = `attendance_cache_${currentClass}_${selectedDate}`;
    localStorage.setItem(cacheKey, JSON.stringify(attendanceCache));
    updateProgressTracker();
}

function updateProgressTracker() {
    if (!currentStudents.length) return;
    
    let checkedCount = 0;
    Object.values(attendanceCache).forEach(rec => {
        if (rec.status !== 'ยังไม่ได้เช็ค') {
            checkedCount++;
        }
    });

    const percent = Math.round((checkedCount / currentStudents.length) * 100);
    const textEl = document.getElementById('attendance-progress-text');
    const barEl = document.getElementById('attendance-progress-bar');
    
    if (textEl) {
        textEl.innerText = `เช็คชื่อแล้ว ${checkedCount} จาก ${currentStudents.length} คน (${percent}%)`;
    }
    if (barEl) {
        barEl.style.width = `${percent}%`;
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'มาเรียน': return 'badge-present';
        case 'ขาดเรียน': return 'badge-absent';
        case 'ลาป่วย': return 'badge-sick';
        case 'มาสาย': return 'badge-late';
        case 'อื่นๆ': return 'badge-other';
        default: return 'badge-unchecked';
    }
}

function getStatusLabel(status) {
    switch (status) {
        case 'มาเรียน': return '✅ มาเรียน';
        case 'ขาดเรียน': return '❌ ขาด';
        case 'ลาป่วย': return '🌡️ ลาป่วย';
        case 'มาสาย': return '⚠️ สาย';
        case 'อื่นๆ': return '❓ อื่นๆ';
        default: return '⚪ ยังไม่เช็ค';
    }
}

function renderStudentUI() {
    const container = document.getElementById('students-container');
    if (!container) return;

    // Destroy DataTable if it exists to avoid re-initialization error
    if (dataTableInstance) {
        dataTableInstance.destroy();
        dataTableInstance = null;
    }
    container.innerHTML = '';

    if (currentStudents.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-slate-500">ไม่มีรายชื่อนักเรียนในห้องเรียนนี้</div>';
        return;
    }

    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        // Mobile Cards Layout
        const listDiv = document.createElement('div');
        listDiv.className = 'flex flex-col gap-3 w-full';
        
        currentStudents.forEach((std, idx) => {
            const cache = attendanceCache[std.id] || { status: 'ยังไม่ได้เช็ค', note: '' };
            const badgeClass = getStatusBadgeClass(cache.status);
            const statusLabel = getStatusLabel(cache.status);
            const displayNote = cache.note ? `<div class="text-xs text-indigo-400 mt-1">หมายเหตุ: ${cache.note}</div>` : '';
            
            const card = document.createElement('div');
            card.className = 'student-mobile-card';
            card.onclick = () => handleStudentInteraction(std);
            
            card.innerHTML = `
                <div class="text-left">
                    <span class="text-slate-400 text-xs font-semibold mr-1">#${idx + 1}</span>
                    <span class="font-medium text-slate-200">${std.full_name}</span>
                    ${displayNote}
                </div>
                <div>
                    <span class="badge-status ${badgeClass}">${statusLabel}</span>
                </div>
            `;
            listDiv.appendChild(card);
        });
        container.appendChild(listDiv);
    } else {
        // Desktop Table Layout
        let tableHTML = `
            <table id="studentTable" class="display responsive nowrap w-full text-left">
                <thead>
                    <tr>
                        <th style="width: 8%">ลำดับ</th>
                        <th style="width: 32%">ชื่อ-นามสกุล</th>
                        <th style="width: 18%">สถานะ</th>
                        <th style="width: 42%">เช็คสถานะ / หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        currentStudents.forEach((std, idx) => {
            const cache = attendanceCache[std.id] || { status: 'ยังไม่ได้เช็ค', note: '' };
            const badgeClass = getStatusBadgeClass(cache.status);
            const statusLabel = getStatusLabel(cache.status);
            const noteText = cache.note ? `<span class="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded ml-2 border border-slate-700">📝 ${cache.note}</span>` : '';
            
            tableHTML += `
                <tr class="student-row" data-id="${std.id}">
                    <td class="text-slate-400 font-semibold">${idx + 1}</td>
                    <td class="font-medium text-slate-200">${std.full_name}</td>
                    <td>
                        <span class="badge-status ${badgeClass}" id="status-badge-${std.id}">${statusLabel}</span>
                        <div id="status-note-${std.id}" class="inline-block">${noteText}</div>
                    </td>
                    <td>
                        <div class="flex gap-1.5 items-center">
                            <button onclick="setStudentStatus('${std.id}', 'มาเรียน')" class="status-btn ${cache.status === 'มาเรียน' ? 'active-present' : ''}">มาเรียน</button>
                            <button onclick="setStudentStatus('${std.id}', 'ขาดเรียน')" class="status-btn ${cache.status === 'ขาดเรียน' ? 'active-absent' : ''}">ขาด</button>
                            <button onclick="setStudentStatus('${std.id}', 'ลาป่วย')" class="status-btn ${cache.status === 'ลาป่วย' ? 'active-sick' : ''}">ลาป่วย</button>
                            <button onclick="setStudentStatus('${std.id}', 'มาสาย')" class="status-btn ${cache.status === 'มาสาย' ? 'active-late' : ''}">สาย</button>
                            <button onclick="handleOtherStatus('${std.id}')" class="status-btn ${cache.status === 'อื่นๆ' ? 'active-other' : ''}">อื่นๆ...</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;
        
        // Initialize DataTables
        dataTableInstance = $('#studentTable').DataTable({
            responsive: true,
            paging: false,
            info: false,
            searching: true,
            language: {
                search: "ค้นหาชื่อ: ",
                zeroRecords: "ไม่พบข้อมูลรายชื่อ"
            }
        });
    }
}

// Inline status button trigger for desktop
function setStudentStatus(studentId, status, note = '') {
    attendanceCache[studentId] = { status, note };
    saveSessionCache();
    
    // Quick DOM update instead of full re-render on desktop to preserve table states and search values
    const badge = document.getElementById(`status-badge-${studentId}`);
    const noteEl = document.getElementById(`status-note-${studentId}`);
    
    if (badge) {
        badge.className = `badge-status ${getStatusBadgeClass(status)}`;
        badge.innerText = getStatusLabel(status);
    }
    
    if (noteEl) {
        noteEl.innerHTML = note ? `<span class="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded ml-2 border border-slate-700">📝 ${note}</span>` : '';
    }

    // Update active highlight classes for buttons in the row
    const row = document.querySelector(`.student-row[data-id="${studentId}"]`);
    if (row) {
        const buttons = row.querySelectorAll('.status-btn');
        buttons.forEach(btn => {
            const btnText = btn.innerText;
            // Clear current active classes
            btn.classList.remove('active-present', 'active-absent', 'active-sick', 'active-late', 'active-other');
            
            if (btnText === 'มาเรียน' && status === 'มาเรียน') {
                btn.classList.add('active-present');
            } else if (btnText === 'ขาด' && status === 'ขาดเรียน') {
                btn.classList.add('active-absent');
            } else if (btnText === 'ลาป่วย' && status === 'ลาป่วย') {
                btn.classList.add('active-sick');
            } else if (btnText === 'สาย' && status === 'มาสาย') {
                btn.classList.add('active-late');
            } else if (btnText === 'อื่นๆ...' && status === 'อื่นๆ') {
                btn.classList.add('active-other');
            }
        });
    }
}

// Special handler for "Other..." status on desktop
async function handleOtherStatus(studentId) {
    const currentRecord = attendanceCache[studentId] || {};
    const currentNote = currentRecord.status === 'อื่นๆ' ? currentRecord.note : '';

    const { value: note } = await Swal.fire({
        title: 'ระบุเหตุผล / หมายเหตุอื่น ๆ',
        input: 'text',
        inputValue: currentNote,
        placeholder: 'เช่น กิจกรรมโรงเรียน, ได้รับอนุญาตพิเศษ',
        showCancelButton: true,
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก',
        inputValidator: (value) => {
            if (!value.trim()) {
                return 'กรุณาระบุเหตุผล!';
            }
        }
    });

    if (note !== undefined) {
        setStudentStatus(studentId, 'อื่นๆ', note);
    }
}

// Mobile single-tap status selector sheet (modal simulation via SweetAlert radio)
async function handleStudentInteraction(student) {
    const currentRecord = attendanceCache[student.id] || { status: 'ยังไม่ได้เช็ค', note: '' };
    
    const { value: status } = await Swal.fire({
        title: `เช็คชื่อ: ${student.full_name}`,
        input: 'radio',
        inputOptions: {
            'มาเรียน': '✅ มาเรียน',
            'ขาดเรียน': '❌ ขาดเรียน',
            'ลาป่วย': '🌡️ ลาป่วย',
            'มาสาย': '⚠️ มาสาย',
            'อื่นๆ': '❓ อื่น ๆ (ระบุเหตุผล)'
        },
        inputValue: currentRecord.status !== 'ยังไม่ได้เช็ค' ? currentRecord.status : '',
        inputValidator: (value) => {
            if (!value) return 'กรุณาเลือกสถานะการเช็คชื่อ!';
        },
        showCancelButton: true,
        confirmButtonText: 'ตกลง',
        cancelButtonText: 'ยกเลิก'
    });

    if (status) {
        let note = '';
        if (status === 'อื่นๆ') {
            const currentNote = currentRecord.status === 'อื่นๆ' ? currentRecord.note : '';
            const { value: text } = await Swal.fire({
                title: 'โปรดระบุหมายเหตุ',
                input: 'text',
                inputValue: currentNote,
                placeholder: 'รายละเอียด...',
                confirmButtonText: 'บันทึก',
                cancelButtonText: 'ยกเลิก',
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value.trim()) return 'กรุณากรอกข้อมูล!';
                }
            });
            if (text === undefined) return; // Cancelled note
            note = text.trim();
        }

        attendanceCache[student.id] = { status, note };
        saveSessionCache();
        renderStudentUI();
    }
}

// Submit checked attendance to DB
async function submitAttendance() {
    // Validate if everyone is checked
    const unchecked = currentStudents.filter(std => !attendanceCache[std.id] || attendanceCache[std.id].status === 'ยังไม่ได้เช็ค');
    
    if (unchecked.length > 0) {
        const confirmSave = await Swal.fire({
            title: 'นักเรียนยังเช็คไม่ครบ',
            text: `มีนักเรียนอีก ${unchecked.length} คน ที่ยังไม่ได้รับการเช็คชื่อ คุณต้องการบันทึกแบบไม่สมบูรณ์หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ใช่, บันทึกเฉพาะเท่าที่เช็ค',
            cancelButtonText: 'เช็คชื่อต่อ'
        });
        
        if (!confirmSave.isConfirmed) return;
    }

    Swal.fire({
        title: 'กำลังบันทึกข้อมูล...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() }
    });

    try {
        const teacherName = `${currentTeacher.firstName} ${currentTeacher.lastName} (${currentTeacher.nickname})`;
        const records = currentStudents.map(std => {
            const rec = attendanceCache[std.id] || { status: 'ยังไม่ได้เช็ค', note: '' };
            return {
                student_id: std.id,
                student_name: std.full_name,
                status: rec.status,
                note: rec.note
            };
        });

        // Call database client to save
        await window.db.saveAttendance(currentClass, selectedDate, teacherName, records);

        // Delete this class session cache
        const cacheKey = `attendance_cache_${currentClass}_${selectedDate}`;
        localStorage.removeItem(cacheKey);

        Swal.fire({
            title: 'บันทึกสำเร็จ!',
            text: `บันทึกประวัติการเข้าเรียน ชั้น ${currentClass} ของวันที่ ${selectedDate} เรียบร้อยแล้ว`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            showSection('class-selection');
        });
    } catch (err) {
        console.error('submitAttendance error:', err);
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง', 'error');
    }
}

// Cancel check-in and return to class list
function clearCacheAndCancel() {
    Swal.fire({
        title: 'ต้องการยกเลิก?',
        text: 'ข้อมูลการเช็คชื่อทั้งหมดที่คุณเพิ่งเช็คในหน้านี้จะหายไป',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'ใช่, ยกเลิกและย้อนกลับ',
        cancelButtonText: 'เช็คชื่อต่อ'
    }).then((result) => {
        if (result.isConfirmed) {
            // Delete cache for current session
            const cacheKey = `attendance_cache_${currentClass}_${selectedDate}`;
            localStorage.removeItem(cacheKey);
            showSection('class-selection');
        }
    });
}

function goBackToClasses() {
    // If they checked some students, warn them
    let hasCheckIn = false;
    Object.values(attendanceCache).forEach(rec => {
        if (rec.status !== 'ยังไม่ได้เช็ค') hasCheckIn = true;
    });

    if (hasCheckIn) {
        Swal.fire({
            title: 'ต้องการย้อนกลับ?',
            text: 'ข้อมูลเช็คชื่อที่ทำไว้จะถูกบันทึกชั่วคราวในอุปกรณ์นี้ คุณสามารถกลับมาทำต่อได้',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ใช่, ย้อนกลับ',
            cancelButtonText: 'เช็คชื่อต่อ'
        }).then((result) => {
            if (result.isConfirmed) {
                showSection('class-selection');
            }
        });
    } else {
        showSection('class-selection');
    }
}

// Global functions attached to window for HTML button onclicks
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.loadClasses = loadClasses;
window.selectClass = selectClass;
window.setStudentStatus = setStudentStatus;
window.handleOtherStatus = handleOtherStatus;
window.submitAttendance = submitAttendance;
window.clearCacheAndCancel = clearCacheAndCancel;
window.goBackToClasses = goBackToClasses;
window.showSection = showSection;
window.handleStudentInteraction = handleStudentInteraction;
window.updateHeaderUserPanel = updateHeaderUserPanel;

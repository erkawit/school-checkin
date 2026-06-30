// Database abstraction layer supporting both LocalStorage (Mock) and Supabase cloud DB

const DEFAULT_CLASSES = [
    { name: 'อ.1/1', level: 'อนุบาล' },
    { name: 'อ.1/2', level: 'อนุบาล' },
    { name: 'อ.2/1', level: 'อนุบาล' },
    { name: 'อ.3/1', level: 'อนุบาล' },
    { name: 'ป.1/1', level: 'ประถม' },
    { name: 'ป.2/1', level: 'ประถม' },
    { name: 'ป.3/1', level: 'ประถม' },
    { name: 'ป.4/1', level: 'ประถม' },
    { name: 'ป.5/1', level: 'ประถม' },
    { name: 'ป.6/1', level: 'ประถม' },
    { name: 'ม.1/1', level: 'มัธยม' },
    { name: 'ม.2/1', level: 'มัธยม' },
    { name: 'ม.3/1', level: 'มัธยม' },
    { name: 'ม.4/1', level: 'มัธยม' },
    { name: 'ม.5/1', level: 'มัธยม' },
    { name: 'ม.6/1', level: 'มัธยม' }
];

const DEFAULT_STUDENTS = [
    // Kindergarten (อนุบาล)
    { id: 'std_k1_1', full_name: 'ด.ช. กิตติภพ รักเรียน', class_name: 'อ.1/1', student_code: 'STD10001', national_id: '1100100200301' },
    { id: 'std_k1_2', full_name: 'ด.ญ. จิราพร ใจดี', class_name: 'อ.1/1', student_code: 'STD10002', national_id: '1100100200302' },
    { id: 'std_k1_3', full_name: 'ด.ช. ณัฐวุฒิ เรียนดี', class_name: 'อ.1/1', student_code: 'STD10003', national_id: '1100100200303' },
    { id: 'std_k1_4', full_name: 'ด.ญ. ธนัญญา สุขใจ', class_name: 'อ.1/1', student_code: 'STD10004', national_id: '' },
    { id: 'std_k1_5', full_name: 'ด.ช. ปัญญากร แข็งแกร่ง', class_name: 'อ.1/1', student_code: 'STD10005', national_id: '1100100200305' },
    
    { id: 'std_k2_1', full_name: 'ด.ช. ภัทรพล พากเพียร', class_name: 'อ.1/2', student_code: 'STD10006', national_id: '1100100200306' },
    { id: 'std_k2_2', full_name: 'ด.ญ. มนัสนันท์ เรียนเก่ง', class_name: 'อ.1/2', student_code: 'STD10007', national_id: '' },
    
    // Primary (ประถม)
    { id: 'std_p1_1', full_name: 'ด.ช. ชลทิศ สดใส', class_name: 'ป.1/1', student_code: 'STD20001', national_id: '1200200300401' },
    { id: 'std_p1_2', full_name: 'ด.ญ. ณัฏฐณิชา งดงาม', class_name: 'ป.1/1', student_code: 'STD20002', national_id: '1200200300402' },
    { id: 'std_p1_3', full_name: 'ด.ช. ธนทัต อดทน', class_name: 'ป.1/1', student_code: 'STD20003', national_id: '1200200300403' },
    { id: 'std_p1_4', full_name: 'ด.ญ. พรประวีณ์ รักสงบ', class_name: 'ป.1/1', student_code: 'STD20004', national_id: '1200200300404' },
    { id: 'std_p1_5', full_name: 'ด.ช. รัชพล ทรงพลัง', class_name: 'ป.1/1', student_code: 'STD20005', national_id: '' },
    { id: 'std_p1_6', full_name: 'ด.ญ. วรัญญา ปัญญาเลิศ', class_name: 'ป.1/1', student_code: 'STD20006', national_id: '1200200300406' },
    
    { id: 'std_p2_1', full_name: 'ด.ช. อนิรุจน์ แสงทอง', class_name: 'ป.2/1', student_code: 'STD20007', national_id: '1200200300407' },
    { id: 'std_p2_2', full_name: 'ด.ญ. สุพรรษา วรรณดี', class_name: 'ป.2/1', student_code: 'STD20008', national_id: '' },
    
    // Secondary (มัธยม)
    { id: 'std_s1_1', full_name: 'นาย กรวิชญ์ เก่งกล้า', class_name: 'ม.1/1', student_code: 'STD30001', national_id: '1300300400501' },
    { id: 'std_s1_2', full_name: 'น.ส. กัญญารัตน์ สวยสม', class_name: 'ม.1/1', student_code: 'STD30002', national_id: '1300300400502' },
    { id: 'std_s1_3', full_name: 'นาย จิรเดช มุ่งมั่น', class_name: 'ม.1/1', student_code: 'STD30003', national_id: '' },
    { id: 'std_s1_4', full_name: 'น.ส. ชลิตา อดออม', class_name: 'ม.1/1', student_code: 'STD30004', national_id: '1300300400504' },
    { id: 'std_s1_5', full_name: 'นาย ณรงค์ชัย ว่องไว', class_name: 'ม.1/1', student_code: 'STD30005', national_id: '1300300400505' },
    { id: 'std_s1_6', full_name: 'น.ส. ทิพวรรณ ใจดี', class_name: 'ม.1/1', student_code: 'STD30006', national_id: '1300300400506' }
];

class Database {
    constructor() {
        this.supabase = null;
        this.init();
    }

    init() {
        let url = localStorage.getItem('supabase_url');
        let key = localStorage.getItem('supabase_anon_key');
        
        // If not set, default to user's provided Supabase config
        if (!url || !key) {
            url = 'https://kqusjecpueedkbbupqsn.supabase.co';
            key = 'sb_publishable_SZj4P1D2pcvEc9v6qPZeng_IQX6a4ct';
            localStorage.setItem('supabase_url', url);
            localStorage.setItem('supabase_anon_key', key);
        }
        
        if (url && key && window.supabase) {
            try {
                this.supabase = window.supabase.createClient(url, key);
                console.log('Supabase client initialized successfully with URL:', url);
            } catch (err) {
                console.error('Failed to initialize Supabase client:', err);
                this.supabase = null;
            }
        } else {
            this.supabase = null;
        }

        // Initialize localStorage mockup schemas if they do not exist
        if (!localStorage.getItem('db_classes')) {
            localStorage.setItem('db_classes', JSON.stringify(DEFAULT_CLASSES));
        }
        if (!localStorage.getItem('db_students')) {
            localStorage.setItem('db_students', JSON.stringify(DEFAULT_STUDENTS));
        }
        if (!localStorage.getItem('db_attendance_logs')) {
            localStorage.setItem('db_attendance_logs', JSON.stringify([]));
        }
        if (!localStorage.getItem('db_users')) {
            const defaultUsers = [
                {
                    id: 'usr_admin',
                    username: 'uj-admin',
                    password: 'ujadmin123456',
                    role: 'admin',
                    first_name: 'ผู้ดูแล',
                    last_name: 'ระบบ',
                    nickname: 'แอดมิน'
                },
                {
                    id: 'usr_teacher1',
                    username: 'teacher1',
                    password: '123456',
                    role: 'teacher',
                    first_name: 'วรรณภา',
                    last_name: 'ใจงาม',
                    nickname: 'ครูวรรณ'
                }
            ];
            localStorage.setItem('db_users', JSON.stringify(defaultUsers));
        }
    }

    isSupabaseActive() {
        return this.supabase !== null;
    }

    saveConfig(url, key) {
        if (!url || !key) {
            localStorage.removeItem('supabase_url');
            localStorage.removeItem('supabase_anon_key');
        } else {
            localStorage.setItem('supabase_url', url);
            localStorage.setItem('supabase_anon_key', key);
        }
        this.init();
    }

    getConfig() {
        return {
            url: localStorage.getItem('supabase_url') || '',
            key: localStorage.getItem('supabase_anon_key') || ''
        };
    }

    // --- Classes Operations ---
    async getClasses(level = null) {
        if (this.isSupabaseActive()) {
            try {
                let query = this.supabase.from('classes').select('*');
                if (level) {
                    query = query.eq('level', level);
                }
                const { data, error } = await query.order('name', { ascending: true });
                if (error) throw error;
                return data;
            } catch (err) {
                console.error('Supabase getClasses error, falling back to local:', err);
            }
        }
        
        // Mock fallback
        const classes = JSON.parse(localStorage.getItem('db_classes')) || [];
        if (level) {
            return classes.filter(c => c.level === level);
        }
        return classes.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }

    async addClass(name, level) {
        if (this.isSupabaseActive()) {
            try {
                const { data, error } = await this.supabase.from('classes').insert([{ name, level }]).select();
                if (error) throw error;
                return data[0];
            } catch (err) {
                console.error('Supabase addClass error:', err);
                throw err;
            }
        }

        const classes = JSON.parse(localStorage.getItem('db_classes')) || [];
        if (classes.some(c => c.name === name)) {
            return classes.find(c => c.name === name);
        }
        const newClass = { name, level };
        classes.push(newClass);
        localStorage.setItem('db_classes', JSON.stringify(classes));
        return newClass;
    }

    async deleteClass(name) {
        if (this.isSupabaseActive()) {
            try {
                const { error } = await this.supabase.from('classes').delete().eq('name', name);
                if (error) throw error;
                return true;
            } catch (err) {
                console.error('Supabase deleteClass error:', err);
                throw err;
            }
        }

        let classes = JSON.parse(localStorage.getItem('db_classes')) || [];
        classes = classes.filter(c => c.name !== name);
        localStorage.setItem('db_classes', JSON.stringify(classes));

        // Cascade delete students in that class
        let students = JSON.parse(localStorage.getItem('db_students')) || [];
        students = students.filter(s => s.class_name !== name);
        localStorage.setItem('db_students', JSON.stringify(students));
        return true;
    }

    // --- Students Operations ---
    async getStudents(className) {
        if (this.isSupabaseActive()) {
            try {
                const { data, error } = await this.supabase
                    .from('students')
                    .select('*')
                    .eq('class_name', className)
                    .order('full_name', { ascending: true });
                if (error) throw error;
                return data;
            } catch (err) {
                console.error('Supabase getStudents error, falling back to local:', err);
            }
        }

        const students = JSON.parse(localStorage.getItem('db_students')) || [];
        return students
            .filter(s => s.class_name === className)
            .sort((a, b) => a.full_name.localeCompare(b.full_name, 'th'));
    }

    async getAllStudents() {
        if (this.isSupabaseActive()) {
            try {
                const { data, error } = await this.supabase
                    .from('students')
                    .select('*')
                    .order('class_name', { ascending: true })
                    .order('full_name', { ascending: true });
                if (error) throw error;
                return data;
            } catch (err) {
                console.error('Supabase getAllStudents error, falling back to local:', err);
            }
        }

        return JSON.parse(localStorage.getItem('db_students')) || [];
    }

    async addStudent(fullName, className, studentCode = '', nationalId = '') {
        const id = 'std_' + Math.random().toString(36).substr(2, 9);
        if (this.isSupabaseActive()) {
            try {
                const { data, error } = await this.supabase
                    .from('students')
                    .insert([{ 
                        id, 
                        full_name: fullName, 
                        class_name: className, 
                        student_code: studentCode, 
                        national_id: nationalId 
                    }])
                    .select();
                if (error) throw error;
                return data[0];
            } catch (err) {
                console.error('Supabase addStudent error, falling back to local:', err);
            }
        }

        const students = JSON.parse(localStorage.getItem('db_students')) || [];
        const newStudent = { 
            id, 
            full_name: fullName, 
            class_name: className, 
            student_code: studentCode, 
            national_id: nationalId 
        };
        students.push(newStudent);
        localStorage.setItem('db_students', JSON.stringify(students));
        return newStudent;
    }

    async editStudent(id, fullName, className, studentCode = '', nationalId = '') {
        if (this.isSupabaseActive()) {
            try {
                const { data, error } = await this.supabase
                    .from('students')
                    .update({ 
                        full_name: fullName, 
                        class_name: className, 
                        student_code: studentCode, 
                        national_id: nationalId 
                    })
                    .eq('id', id)
                    .select();
                if (error) throw error;
                return data[0];
            } catch (err) {
                console.error('Supabase editStudent error, falling back to local:', err);
            }
        }

        const students = JSON.parse(localStorage.getItem('db_students')) || [];
        const idx = students.findIndex(s => s.id === id);
        if (idx !== -1) {
            students[idx].full_name = fullName;
            students[idx].class_name = className;
            students[idx].student_code = studentCode;
            students[idx].national_id = nationalId;
            localStorage.setItem('db_students', JSON.stringify(students));
            return students[idx];
        }
        throw new Error('ไม่พบข้อมูลนักเรียน');
    }

    async deleteStudent(id) {
        if (this.isSupabaseActive()) {
            try {
                const { error } = await this.supabase.from('students').delete().eq('id', id);
                if (error) throw error;
                return true;
            } catch (err) {
                console.error('Supabase deleteStudent error, falling back to local:', err);
            }
        }

        let students = JSON.parse(localStorage.getItem('db_students')) || [];
        students = students.filter(s => s.id !== id);
        localStorage.setItem('db_students', JSON.stringify(students));
        return true;
    }

    // Bulk transfer or promote students
    async promoteStudents(studentIds, targetClassName) {
        if (studentIds.length === 0) return true;

        if (this.isSupabaseActive()) {
            try {
                const { error } = await this.supabase
                    .from('students')
                    .update({ class_name: targetClassName })
                    .in('id', studentIds);
                if (error) throw error;
                return true;
            } catch (err) {
                console.error('Supabase promoteStudents error:', err);
                throw err;
            }
        }

        const students = JSON.parse(localStorage.getItem('db_students')) || [];
        students.forEach(s => {
            if (studentIds.includes(s.id)) {
                s.class_name = targetClassName;
            }
        });
        localStorage.setItem('db_students', JSON.stringify(students));
        return true;
    }

    // --- Attendance Operations ---
    async saveAttendance(className, date, teacherName, records) {
        const formattedRecords = records.map(rec => ({
            id: 'att_' + Math.random().toString(36).substr(2, 9),
            date: date,
            class_name: className,
            student_id: rec.student_id,
            student_name: rec.student_name,
            status: rec.status,
            note: rec.note || '',
            teacher_name: teacherName,
            created_at: new Date().toISOString()
        }));

        if (this.isSupabaseActive()) {
            try {
                await this.supabase.from('attendance_logs').delete().eq('class_name', className).eq('date', date);
                
                const { data, error } = await this.supabase
                    .from('attendance_logs')
                    .insert(formattedRecords.map(({ id, created_at, ...rest }) => rest));
                if (error) throw error;
                return true;
            } catch (err) {
                console.error('Supabase saveAttendance error, falling back to local saving:', err);
            }
        }

        let logs = JSON.parse(localStorage.getItem('db_attendance_logs')) || [];
        logs = logs.filter(log => !(log.class_name === className && log.date === date));
        logs = [...logs, ...formattedRecords];
        localStorage.setItem('db_attendance_logs', JSON.stringify(logs));
        return true;
    }

    async getAttendanceReport(className = null, date = null, level = null, teacherName = null) {
        if (this.isSupabaseActive()) {
            try {
                let query = this.supabase.from('attendance_logs').select('*');
                if (className) {
                    query = query.eq('class_name', className);
                } else if (level) {
                    const classes = await this.getClasses(level);
                    const classNames = classes.map(c => c.name);
                    query = query.in('class_name', classNames);
                }
                if (date) {
                    query = query.eq('date', date);
                }
                if (teacherName) {
                    query = query.eq('teacher_name', teacherName);
                }
                const { data, error } = await query.order('date', { ascending: false }).order('created_at', { ascending: false });
                if (error) throw error;
                return data;
            } catch (err) {
                console.error('Supabase getAttendanceReport error, falling back to local:', err);
            }
        }

        let logs = JSON.parse(localStorage.getItem('db_attendance_logs')) || [];
        if (className) {
            logs = logs.filter(log => log.class_name === className);
        } else if (level) {
            const classes = JSON.parse(localStorage.getItem('db_classes')) || [];
            const classNames = classes.filter(c => c.level === level).map(c => c.name);
            logs = logs.filter(log => classNames.includes(log.class_name));
        }
        if (date) {
            logs = logs.filter(log => log.date === date);
        }
        if (teacherName) {
            logs = logs.filter(log => log.teacher_name === teacherName);
        }
        
        return logs.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
    }

    // --- Authentication Operations ---
    async login(username, password) {
        if (this.isSupabaseActive()) {
            try {
                const { data, error } = await this.supabase
                    .from('users')
                    .select('*')
                    .eq('username', username)
                    .eq('password', password)
                    .single();
                
                if (error) {
                    if (error.code === 'PGRST116') {
                        throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                    }
                    throw error;
                }
                return data;
            } catch (err) {
                console.error('Supabase login error, checking if user exists locally:', err);
                // If the users table doesn't exist yet, it'll fall back to local storage
            }
        }

        // Mock fallback
        const users = JSON.parse(localStorage.getItem('db_users')) || [];
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            return user;
        }
        throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    // --- Users Operations ---
    async getUsers() {
        if (this.isSupabaseActive()) {
            try {
                const { data, error } = await this.supabase
                    .from('users')
                    .select('*')
                    .order('username', { ascending: true });
                if (error) throw error;
                return data;
            } catch (err) {
                console.error('Supabase getUsers error, falling back to local:', err);
            }
        }

        return JSON.parse(localStorage.getItem('db_users')) || [];
    }

    async addUser(username, password, role, firstName, lastName, nickname) {
        const id = 'usr_' + Math.random().toString(36).substr(2, 9);
        if (this.isSupabaseActive()) {
            try {
                const { data, error } = await this.supabase
                    .from('users')
                    .insert([{
                        id,
                        username,
                        password,
                        role,
                        first_name: firstName,
                        last_name: lastName,
                        nickname
                    }])
                    .select();
                if (error) throw error;
                return data[0];
            } catch (err) {
                console.error('Supabase addUser error, falling back to local:', err);
            }
        }

        const users = JSON.parse(localStorage.getItem('db_users')) || [];
        if (users.some(u => u.username === username)) {
            throw new Error('ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว');
        }
        const newUser = { id, username, password, role, first_name: firstName, last_name: lastName, nickname };
        users.push(newUser);
        localStorage.setItem('db_users', JSON.stringify(users));
        return newUser;
    }

    async editUser(id, username, password, role, firstName, lastName, nickname) {
        if (this.isSupabaseActive()) {
            try {
                const { data, error } = await this.supabase
                    .from('users')
                    .update({
                        username,
                        password,
                        role,
                        first_name: firstName,
                        last_name: lastName,
                        nickname
                    })
                    .eq('id', id)
                    .select();
                if (error) throw error;
                return data[0];
            } catch (err) {
                console.error('Supabase editUser error, falling back to local:', err);
            }
        }

        const users = JSON.parse(localStorage.getItem('db_users')) || [];
        const idx = users.findIndex(u => u.id === id);
        if (idx !== -1) {
            if (users.some((u, i) => u.username === username && i !== idx)) {
                throw new Error('ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว');
            }
            users[idx].username = username;
            users[idx].password = password;
            users[idx].role = role;
            users[idx].first_name = firstName;
            users[idx].last_name = lastName;
            users[idx].nickname = nickname;
            localStorage.setItem('db_users', JSON.stringify(users));
            return users[idx];
        }
        throw new Error('ไม่พบข้อมูลผู้ใช้งาน');
    }

    async deleteUser(id) {
        if (this.isSupabaseActive()) {
            try {
                const { error } = await this.supabase.from('users').delete().eq('id', id);
                if (error) throw error;
                return true;
            } catch (err) {
                console.error('Supabase deleteUser error, falling back to local:', err);
            }
        }

        let users = JSON.parse(localStorage.getItem('db_users')) || [];
        users = users.filter(u => u.id !== id);
        localStorage.setItem('db_users', JSON.stringify(users));
        return true;
    }
}

// Instantiate global database controller
const db = new Database();
window.db = db;

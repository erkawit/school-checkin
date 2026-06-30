// datepicker.js - Custom Thai Buddhist Era Datepicker
class ThaiDatePicker {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.input = this.container.querySelector('input[type="hidden"]');
        this.button = this.container.querySelector('button');
        this.dateText = this.container.querySelector('.date-text');
        
        this.options = {
            initialDate: options.initialDate || new Date().toISOString().split('T')[0],
            maxDate: options.maxDate || null,
            onChange: options.onChange || null
        };

        this.currentValue = this.options.initialDate;
        this.input.value = this.currentValue;

        // Parse current value
        const parts = this.currentValue.split('-');
        this.displayYear = parseInt(parts[0]);
        this.displayMonth = parseInt(parts[1]) - 1; // 0-indexed

        this.monthsFull = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        this.monthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        this.daysShort = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

        this.init();
    }

    init() {
        // Create popup elements
        this.popup = document.createElement('div');
        this.popup.className = 'thai-datepicker-popup glass-panel';
        this.container.appendChild(this.popup);

        // Update button text to Thai B.E. format
        this.updateButtonText();

        // Click handler to open/close
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePopup();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.closePopup();
            }
        });

        // Prevent closing when clicking inside popup
        this.popup.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    togglePopup() {
        const isActive = this.popup.classList.contains('active');
        if (isActive) {
            this.closePopup();
        } else {
            // Close all other datepickers first
            document.querySelectorAll('.thai-datepicker-popup').forEach(p => p.classList.remove('active'));
            this.renderCalendar();
            this.popup.classList.add('active');
        }
    }

    closePopup() {
        this.popup.classList.remove('active');
    }

    updateButtonText() {
        const parts = this.currentValue.split('-');
        const d = parseInt(parts[2]);
        const m = parseInt(parts[1]) - 1;
        const y = parseInt(parts[0]) + 543; // Convert to B.E.
        
        if (this.dateText) {
            this.dateText.innerText = `${d} ${this.monthsShort[m]} ${y}`;
        }
    }

    renderCalendar() {
        this.popup.innerHTML = '';

        // Create header
        const header = document.createElement('div');
        header.className = 'thai-datepicker-header';

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'text-pink-600 font-bold hover:bg-pink-50 h-8 w-8 rounded-full flex items-center justify-center transition';
        prevBtn.innerText = '‹';
        prevBtn.onclick = () => this.changeMonth(-1);

        const title = document.createElement('span');
        title.className = 'font-bold text-slate-800 text-sm';
        title.innerText = `${this.monthsFull[this.displayMonth]} ${this.displayYear + 543}`;

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'text-pink-600 font-bold hover:bg-pink-50 h-8 w-8 rounded-full flex items-center justify-center transition';
        nextBtn.innerText = '›';
        nextBtn.onclick = () => this.changeMonth(1);

        header.appendChild(prevBtn);
        header.appendChild(title);
        header.appendChild(nextBtn);

        this.popup.appendChild(header);

        // Create grid
        const grid = document.createElement('div');
        grid.className = 'thai-datepicker-grid';

        // Add day headers
        this.daysShort.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'thai-datepicker-day-header';
            dayEl.innerText = day;
            grid.appendChild(dayEl);
        });

        // Get calendar days
        const firstDayIndex = new Date(this.displayYear, this.displayMonth, 1).getDay();
        const lastDayDate = new Date(this.displayYear, this.displayMonth + 1, 0).getDate();
        const prevMonthLastDate = new Date(this.displayYear, this.displayMonth, 0).getDate();

        // Previous month filler days
        for (let i = firstDayIndex; i > 0; i--) {
            const dayNum = prevMonthLastDate - i + 1;
            const dayEl = document.createElement('div');
            dayEl.className = 'thai-datepicker-day other-month disabled';
            dayEl.innerText = dayNum;
            grid.appendChild(dayEl);
        }

        // Current month days
        const todayStr = new Date().toISOString().split('T')[0];
        
        for (let i = 1; i <= lastDayDate; i++) {
            const dateStr = `${this.displayYear}-${String(this.displayMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayEl = document.createElement('div');
            dayEl.className = 'thai-datepicker-day';
            dayEl.innerText = i;

            // Highlight selected
            if (dateStr === this.currentValue) {
                dayEl.classList.add('active');
            }

            // Check if disabled (future dates)
            if (this.options.maxDate && dateStr > this.options.maxDate) {
                dayEl.classList.add('disabled');
            } else {
                dayEl.onclick = () => this.selectDate(dateStr);
            }

            grid.appendChild(dayEl);
        }

        this.popup.appendChild(grid);
    }

    changeMonth(direction) {
        this.displayMonth += direction;
        if (this.displayMonth < 0) {
            this.displayMonth = 11;
            this.displayYear -= 1;
        } else if (this.displayMonth > 11) {
            this.displayMonth = 0;
            this.displayYear += 1;
        }
        this.renderCalendar();
    }

    selectDate(dateStr) {
        this.currentValue = dateStr;
        this.input.value = dateStr;
        this.updateButtonText();
        this.closePopup();

        // Trigger change event programmatically for compatibility
        const event = new Event('change', { bubbles: true });
        this.input.dispatchEvent(event);

        if (this.options.onChange) {
            this.options.onChange(dateStr);
        }
    }
}
window.ThaiDatePicker = ThaiDatePicker;

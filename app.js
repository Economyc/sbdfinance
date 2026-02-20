let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) || [
    { id: '1', name: 'Alimentación', icon: 'shopping-bag' },
    { id: '2', name: 'Transporte', icon: 'truck' },
    { id: '3', name: 'Servicios', icon: 'zap' },
    { id: '4', name: 'Ocio', icon: 'film' }
];
let currentPeriod = 'biweekly';

let currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

const periodBtns = document.querySelectorAll('.period-btn');
const totalAmountEl = document.getElementById('totalAmount');
const currentPeriodLabelEl = document.getElementById('currentPeriodLabel');
const currentDateLabelEl = document.getElementById('currentDateLabel');
const expensesContainer = document.getElementById('expensesContainer');

const addExpenseBtn = document.getElementById('addExpenseBtn');
const openCategoriesBtn = document.getElementById('openCategoriesBtn');
const modals = document.querySelectorAll('.modal-overlay');
const closeBtns = document.querySelectorAll('.close-modal');

const expenseModal = document.getElementById('expenseModal');
const expenseForm = document.getElementById('expenseForm');
const expenseTypeSelect = document.getElementById('expenseType');
const recurrencePeriodGroup = document.getElementById('recurrencePeriodGroup');
const expenseCategorySelect = document.getElementById('expenseCategory');

const categoriesModal = document.getElementById('categoriesModal');
const categoryForm = document.getElementById('categoryForm');
const categoriesListEl = document.getElementById('categoriesList');

feather.replace();

function init() {
    setupEventListeners();
    setupIconPicker();
    updateUI();
}

function setupIconPicker() {
    const availableIcons = [
        'tag', 'shopping-bag', 'shopping-cart', 'truck', 'home',
        'coffee', 'film', 'credit-card', 'zap', 'briefcase',
        'heart', 'gift', 'activity', 'bookmark', 'box'
    ];

    const picker = document.getElementById('iconPicker');
    picker.innerHTML = availableIcons.map(icon => `
        <div data-icon="${icon}">
            <i data-feather="${icon}"></i>
        </div>
    `).join('');

    const hiddenInput = document.getElementById('newCategoryIcon');
    const currentIcon = document.getElementById('currentCategoryIcon');
    const iconBtn = document.getElementById('categoryIconBtn');

    picker.querySelectorAll('div').forEach(div => {
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            const icon = div.dataset.icon;
            hiddenInput.value = icon;
            currentIcon.setAttribute('data-feather', icon);
            feather.replace();
            picker.classList.add('select-hide');
            picker.querySelectorAll('div').forEach(d => d.classList.remove('active'));
            div.classList.add('active');
        });
    });

    iconBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        picker.classList.toggle('select-hide');
        const expenseOpts = document.getElementById('expenseCategoryOptions');
        if (expenseOpts) expenseOpts.classList.add('select-hide');
    });
}

function setupEventListeners() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    if (currentTheme === 'dark') themeIcon.setAttribute('data-feather', 'sun');

    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        themeIcon.setAttribute('data-feather', currentTheme === 'light' ? 'moon' : 'sun');
        feather.replace();
    });

    periodBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            periodBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentPeriod = e.target.dataset.period;
            updateUI();
        });
    });

    addExpenseBtn.addEventListener('click', () => {
        document.getElementById('expenseModalTitle').innerText = 'Nuevo Gasto';
        expenseForm.reset();
        document.getElementById('expenseId').value = '';
        document.getElementById('expenseDate').valueAsDate = new Date();
        populateCategoriesDropdown();
        openModal(expenseModal);
    });

    openCategoriesBtn.addEventListener('click', () => {
        renderCategories();
        openModal(categoriesModal);
    });

    closeBtns.forEach(btn => btn.addEventListener('click', () => modals.forEach(m => closeModal(m))));

    expenseTypeSelect.addEventListener('change', (e) => {
        recurrencePeriodGroup.style.display = e.target.value === 'recurring' ? 'flex' : 'none';
    });

    expenseForm.addEventListener('submit', handleExpenseSubmit);
    categoryForm.addEventListener('submit', handleCategorySubmit);

    const expenseCategorySelected = document.getElementById('expenseCategorySelected');
    if (expenseCategorySelected) {
        expenseCategorySelected.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('expenseCategoryOptions').classList.toggle('select-hide');
            const iconPicker = document.getElementById('iconPicker');
            if (iconPicker) iconPicker.classList.add('select-hide');
        });
    }

    window.addEventListener('click', (e) => {
        modals.forEach(modal => { if (e.target === modal) closeModal(modal); });
        if (!e.target.closest('.custom-select')) {
            const expenseOpts = document.getElementById('expenseCategoryOptions');
            if (expenseOpts) expenseOpts.classList.add('select-hide');
        }
        if (!e.target.closest('#categoryForm')) {
            const iconPicker = document.getElementById('iconPicker');
            if (iconPicker) iconPicker.classList.add('select-hide');
        }
    });
}

function openModal(modal) { modal.classList.add('active'); }
function closeModal(modal) { modal.classList.remove('active'); }

function populateCategoriesDropdown() {
    const optionsContainer = document.getElementById('expenseCategoryOptions');
    const selectedContainer = document.getElementById('expenseCategorySelected');
    const hiddenInput = document.getElementById('expenseCategory');

    optionsContainer.innerHTML = categories.map(cat => `
        <div data-value="${cat.id}">
            <i data-feather="${cat.icon || 'tag'}"></i>
            <span>${cat.name}</span>
        </div>
    `).join('');

    feather.replace();

    const options = optionsContainer.querySelectorAll('div');
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            hiddenInput.value = opt.dataset.value;
            const cat = categories.find(c => c.id === hiddenInput.value);
            selectedContainer.innerHTML = `<span class="select-text" style="display: flex; align-items: center; gap: 8px;"><i data-feather="${cat.icon || 'tag'}" style="width: 16px; height: 16px;"></i> ${cat.name}</span><i data-feather="chevron-down" style="width: 16px; height: 16px;"></i>`;
            feather.replace();
            optionsContainer.classList.add('select-hide');
        });
    });

    if (categories.length > 0) {
        const defaultCatId = hiddenInput.value || categories[0].id;
        const defaultCat = categories.find(c => c.id === defaultCatId) || categories[0];
        hiddenInput.value = defaultCat.id;
        selectedContainer.innerHTML = `<span class="select-text" style="display: flex; align-items: center; gap: 8px;"><i data-feather="${defaultCat.icon || 'tag'}" style="width: 16px; height: 16px;"></i> ${defaultCat.name}</span><i data-feather="chevron-down" style="width: 16px; height: 16px;"></i>`;
        feather.replace();
    }
}

function updateUI() {
    const now = new Date();
    let dateStr = '';
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    if (currentPeriod === 'biweekly') {
        currentPeriodLabelEl.innerText = 'Quincenal';
        const isFirstHalf = now.getDate() <= 15;
        dateStr = isFirstHalf ? `${monthNames[now.getMonth()]} 1 - 15` : `${monthNames[now.getMonth()]} 16 - ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
    } else if (currentPeriod === 'monthly') {
        currentPeriodLabelEl.innerText = 'Mensual';
        dateStr = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    } else {
        currentPeriodLabelEl.innerText = 'Anual';
        dateStr = `${now.getFullYear()}`;
    }

    currentDateLabelEl.innerText = dateStr;

    const filteredExpenses = filterExpensesByPeriod(expenses, currentPeriod, now);
    const total = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    totalAmountEl.innerText = `$${total.toFixed(2)}`;
    renderExpenses(filteredExpenses);
}

function filterExpensesByPeriod(allExpenses, period, currentDate) {
    return allExpenses.filter(exp => {
        const expDate = new Date(exp.date);

        if (exp.type === 'recurring') {
            if (period === 'annual') return true;
            if (period === 'monthly' && (exp.recurrence === 'monthly' || exp.recurrence === 'biweekly')) return true;
            if (period === 'biweekly' && exp.recurrence === 'biweekly') return true;
        }

        if (period === 'annual') return expDate.getFullYear() === currentDate.getFullYear();
        if (period === 'monthly') return expDate.getFullYear() === currentDate.getFullYear() && expDate.getMonth() === currentDate.getMonth();
        if (period === 'biweekly') {
            return expDate.getFullYear() === currentDate.getFullYear() &&
                expDate.getMonth() === currentDate.getMonth() &&
                (expDate.getDate() <= 15) === (currentDate.getDate() <= 15);
        }
        return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderExpenses(expensesToRender) {
    if (expensesToRender.length === 0) {
        expensesContainer.innerHTML = `
            <div class="empty-state">
                <i data-feather="inbox" style="width: 48px; height: 48px; opacity: 0.2; margin-bottom: 1rem;"></i>
                <p>No hay gastos en este periodo.</p>
            </div>
        `;
        feather.replace();
        return;
    }

    // Agrupar por categoría
    const grouped = expensesToRender.reduce((acc, exp) => {
        if (!acc[exp.categoryId]) acc[exp.categoryId] = [];
        acc[exp.categoryId].push(exp);
        return acc;
    }, {});

    expensesContainer.innerHTML = Object.entries(grouped).map(([catId, items]) => {
        const cat = categories.find(c => c.id === catId) || { name: 'Sin categoría', icon: 'tag' };
        const catTotal = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

        return `
            <div class="category-group" id="group-${catId}">
                <div class="category-header" onclick="toggleCategoryGroup('${catId}')">
                    <div class="category-title">
                        <div class="category-icon-bg">
                            <i data-feather="${cat.icon || 'tag'}"></i>
                        </div>
                        <div class="category-name-wrap">
                            <span class="category-group-name">${cat.name}</span>
                            <span class="category-item-count">${items.length} movimientos</span>
                        </div>
                    </div>
                    <div class="category-total-wrap">
                        <span class="category-group-total">$${catTotal.toFixed(2)}</span>
                        <i data-feather="chevron-down" class="chevron-icon"></i>
                    </div>
                </div>
                <div class="category-content" id="content-${catId}">
                    ${items.map(exp => {
            const isRecurring = exp.type === 'recurring';
            return `
                            <div class="expense-item mini">
                                <div class="expense-info">
                                    <span class="expense-name">${exp.name}</span>
                                    <div class="expense-meta">
                                        <span>${new Date(exp.date + 'T12:00:00').toLocaleDateString()}</span>
                                        ${isRecurring ? `<span class="meta-dot"></span><span><i data-feather="refresh-cw" style="width:10px;height:10px;"></i> ${exp.recurrence}</span>` : ''}
                                    </div>
                                </div>
                                <div class="expense-amount-wrap">
                                    <span class="expense-item-amount">$${parseFloat(exp.amount).toFixed(2)}</span>
                                    <div class="expense-actions">
                                        <button class="icon-btn edit-btn" data-id="${exp.id}"><i data-feather="edit-2"></i></button>
                                        <button class="icon-btn delete-btn" data-id="${exp.id}"><i data-feather="trash-2"></i></button>
                                    </div>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }).join('');

    feather.replace();

    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        editExpense(e.currentTarget.dataset.id);
    }));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteExpense(e.currentTarget.dataset.id);
    }));
}

window.toggleCategoryGroup = function (catId) {
    const content = document.getElementById(`content-${catId}`);
    const group = document.getElementById(`group-${catId}`);
    const isOpen = group.classList.contains('open');

    // Cerrar otros si se desea (opcional)
    // document.querySelectorAll('.category-group').forEach(g => g.classList.remove('open'));

    if (isOpen) {
        group.classList.remove('open');
    } else {
        group.classList.add('open');
    }
};

function handleExpenseSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('expenseId').value;
    const expenseObj = {
        id: id || Date.now().toString(),
        name: document.getElementById('expenseName').value,
        amount: document.getElementById('expenseAmount').value,
        date: document.getElementById('expenseDate').value,
        categoryId: document.getElementById('expenseCategory').value,
        type: document.getElementById('expenseType').value,
        recurrence: document.getElementById('expenseType').value === 'recurring' ? document.getElementById('expenseRecurrence').value : null
    };

    expenses = id ? expenses.map(exp => exp.id === id ? expenseObj : exp) : [...expenses, expenseObj];
    saveData();
    closeModal(expenseModal);
    updateUI();
}

function editExpense(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;

    document.getElementById('expenseModalTitle').innerText = 'Editar Gasto';
    document.getElementById('expenseId').value = exp.id;
    document.getElementById('expenseName').value = exp.name;
    document.getElementById('expenseAmount').value = exp.amount;
    document.getElementById('expenseDate').value = exp.date;

    populateCategoriesDropdown();
    document.getElementById('expenseCategory').value = exp.categoryId;
    const cat = categories.find(c => c.id === exp.categoryId);
    if (cat) {
        document.getElementById('expenseCategorySelected').innerHTML = `<span class="select-text" style="display: flex; align-items: center; gap: 8px;"><i data-feather="${cat.icon || 'tag'}" style="width: 16px; height: 16px;"></i> ${cat.name}</span><i data-feather="chevron-down" style="width: 16px; height: 16px;"></i>`;
        feather.replace();
    }

    const typeSelect = document.getElementById('expenseType');
    typeSelect.value = exp.type;
    typeSelect.dispatchEvent(new Event('change'));

    if (exp.type === 'recurring') document.getElementById('expenseRecurrence').value = exp.recurrence;

    openModal(expenseModal);
}

function deleteExpense(id) {
    if (confirm('¿Seguro que deseas eliminar este gasto?')) {
        expenses = expenses.filter(e => e.id !== id);
        saveData();
        updateUI();
    }
}

function renderCategories() {
    categoriesListEl.innerHTML = categories.map(cat => `
        <div class="category-item">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="category-icon-bg mini">
                    <i data-feather="${cat.icon || 'tag'}" style="width: 14px; height: 14px;"></i>
                </div>
                <span>${cat.name}</span>
            </div>
            <button class="icon-btn delete-btn" data-id="${cat.id}"><i data-feather="trash-2"></i></button>
        </div>
    `).join('');
    feather.replace();
    categoriesListEl.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => deleteCategory(e.currentTarget.dataset.id)));
}

function handleCategorySubmit(e) {
    e.preventDefault();
    const input = document.getElementById('newCategoryName');
    const iconSelect = document.getElementById('newCategoryIcon');
    const name = input.value.trim();
    const icon = iconSelect.value;
    if (name) {
        categories.push({ id: Date.now().toString(), name, icon });
        saveData();
        input.value = '';
        renderCategories();
    }
}

function deleteCategory(id) {
    if (expenses.some(e => e.categoryId === id)) return alert('No puedes eliminar una categoría que está en uso.');
    categories = categories.filter(c => c.id !== id);
    saveData();
    renderCategories();
}

function saveData() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('categories', JSON.stringify(categories));
}

init();

const firebaseConfig = {
    apiKey: "AIzaSyDQ_2fFv3cR0pBUAG8-YKJDI_Cwld6tsgQ",
    authDomain: "control-de-gastos-personal.firebaseapp.com",
    projectId: "control-de-gastos-personal",
    storageBucket: "control-de-gastos-personal.firebasestorage.app",
    messagingSenderId: "261441660020",
    appId: "1:261441660020:web:bb15a95e19a5e913cfdd21",
    measurementId: "G-CCNWQK0CFK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let expenses = [];
let categories = [];
let unsubscribeExpenses = null;
let unsubscribeCategories = null;

let currentPeriod = 'biweekly';
let activeFilters = {
    search: '',
    category: 'all',
    type: 'all'
};

let currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

// DOM Elements
const authContainer = document.getElementById('authContainer');
const mainAppContainer = document.getElementById('mainAppContainer');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');

const periodBtns = document.querySelectorAll('.period-btn');
const totalAmountEl = document.getElementById('totalAmount');
const currentPeriodLabelEl = document.getElementById('currentPeriodLabel');
const currentDateLabelEl = document.getElementById('currentDateLabel');
const expensesContainer = document.getElementById('expensesContainer');

const addExpenseBtn = document.getElementById('addExpenseBtn');
const openCategoriesBtn = document.getElementById('openCategoriesBtn');
const filterBtn = document.getElementById('filterBtn');
const modals = document.querySelectorAll('.modal-overlay');
const closeBtns = document.querySelectorAll('.close-modal');

const expenseModal = document.getElementById('expenseModal');
const expenseForm = document.getElementById('expenseForm');
const expenseTypeSelect = document.getElementById('expenseType');
const recurrencePeriodGroup = document.getElementById('recurrencePeriodGroup');

const categoriesModal = document.getElementById('categoriesModal');
const categoryForm = document.getElementById('categoryForm');
const categoriesListEl = document.getElementById('categoriesList');

const filterModal = document.getElementById('filterModal');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');

// Auth State Monitor
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        authContainer.style.display = 'none';
        mainAppContainer.style.display = 'flex';
        initApp();
    } else {
        currentUser = null;
        authContainer.style.display = 'flex';
        mainAppContainer.style.display = 'none';
        stopSync();
    }
    feather.replace();
});

// Setup Auth Listeners Immediately
setupAuthEventListeners();

function initApp() {
    setupAppEventListeners();
    setupIconPicker();
    startSync();
}

function setupAuthEventListeners() {
    // Google Login Logic
    googleLoginBtn.addEventListener('click', async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            // Usamos Redirect en lugar de Popup para mayor compatibilidad
            await auth.signInWithRedirect(provider);
        } catch (err) {
            console.error(err);
            alert("Error al acceder con Google. Revisa tu conexión.");
        }
    });

    // Theme toggle (must work anywhere)
    if (currentTheme === 'dark') themeIcon.setAttribute('data-feather', 'sun');

    themeToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        themeIcon.setAttribute('data-feather', currentTheme === 'light' ? 'moon' : 'sun');
        feather.replace();
    });
}

function startSync() {
    if (!currentUser) return;
    const userRef = db.collection('users').doc(currentUser.uid);

    unsubscribeCategories = userRef.collection('categories')
        .onSnapshot(snapshot => {
            categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (categories.length === 0) {
                seedCategories();
            } else {
                updateUI();
                renderCategories();
                populateFilterCategories();
            }
        }, err => console.error("Categories sync error:", err));

    unsubscribeExpenses = userRef.collection('expenses')
        .onSnapshot(snapshot => {
            expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateUI();
        }, err => console.error("Expenses sync error:", err));
}

function stopSync() {
    if (unsubscribeCategories) unsubscribeCategories();
    if (unsubscribeExpenses) unsubscribeExpenses();
    unsubscribeCategories = null;
    unsubscribeExpenses = null;
    categories = [];
    expenses = [];
}

async function seedCategories() {
    const defaultCategories = [
        { name: 'Alimentación', icon: 'shopping-bag' },
        { name: 'Transporte', icon: 'truck' },
        { name: 'Servicios', icon: 'zap' },
        { name: 'Ocio', icon: 'film' }
    ];
    const batch = db.batch();
    const userRef = db.collection('users').doc(currentUser.uid);
    defaultCategories.forEach(cat => {
        const newRef = userRef.collection('categories').doc();
        batch.set(newRef, cat);
    });
    await batch.commit();
}

function setupAppEventListeners() {
    // Menu Toggle
    const menuBtn = document.getElementById('menuBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const appHeader = document.getElementById('appHeader');

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
    });

    // Sticky Header Scroll Effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            appHeader.classList.add('scrolled');
        } else {
            appHeader.classList.remove('scrolled');
        }
    });

    logoutBtn.addEventListener('click', () => {
        dropdownMenu.classList.remove('active');
        auth.signOut();
    });

    // Periods
    periodBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            periodBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentPeriod = e.target.dataset.period;
            updateUI();
        });
    });

    // Filters
    filterBtn.addEventListener('click', () => {
        openModal(filterModal);
    });
    applyFiltersBtn.addEventListener('click', () => {
        activeFilters.search = document.getElementById('filterSearch').value.toLowerCase();
        activeFilters.category = document.getElementById('filterCategory').value;
        activeFilters.type = document.getElementById('filterType').value;
        filterBtn.style.color = (activeFilters.search || activeFilters.category !== 'all' || activeFilters.type !== 'all') ? 'var(--primary)' : '';
        updateUI();
        closeModal(filterModal);
    });
    clearFiltersBtn.addEventListener('click', () => {
        document.getElementById('filterSearch').value = '';
        document.getElementById('filterCategory').value = 'all';
        document.getElementById('filterType').value = 'all';
        activeFilters = { search: '', category: 'all', type: 'all' };
        filterBtn.style.color = '';
        updateUI();
        closeModal(filterModal);
    });

    // Modals
    addExpenseBtn.addEventListener('click', () => {
        document.getElementById('expenseModalTitle').innerText = 'Nuevo Gasto';
        expenseForm.reset();
        document.getElementById('expenseId').value = '';
        document.getElementById('expenseDate').valueAsDate = new Date();
        populateCategoriesDropdown();
        openModal(expenseModal);
    });
    openCategoriesBtn.addEventListener('click', () => {
        dropdownMenu.classList.remove('active');
        renderCategories();
        openModal(categoriesModal);
    });
    themeToggleBtn.addEventListener('click', (e) => {
        dropdownMenu.classList.remove('active');
        // El resto del código del theme ya estaba definido o se invoca desde aquí si se movió abajo
        // Pero el listener original está en setupAuthEventListeners para que funcione en login
    });
    closeBtns.forEach(btn => btn.addEventListener('click', () => modals.forEach(m => closeModal(m))));
    expenseTypeSelect.addEventListener('change', (e) => {
        recurrencePeriodGroup.style.display = e.target.value === 'recurring' ? 'flex' : 'none';
    });
    expenseForm.addEventListener('submit', handleExpenseSubmit);
    categoryForm.addEventListener('submit', handleCategorySubmit);

    // Custom Select
    const expenseCategorySelected = document.getElementById('expenseCategorySelected');
    if (expenseCategorySelected) {
        expenseCategorySelected.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('expenseCategoryOptions').classList.toggle('select-hide');
            document.getElementById('iconPicker').classList.add('select-hide');
        });
    }

    window.addEventListener('click', (e) => {
        modals.forEach(modal => { if (e.target === modal) closeModal(modal); });
        if (!e.target.closest('.custom-select')) document.getElementById('expenseCategoryOptions').classList.add('select-hide');
        if (!e.target.closest('#categoryForm')) document.getElementById('iconPicker').classList.add('select-hide');
        if (!e.target.closest('.menu-container')) dropdownMenu.classList.remove('active');
    });
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

    let filtered = filterExpensesByPeriod(expenses, currentPeriod, now);
    if (activeFilters.search) filtered = filtered.filter(exp => exp.name.toLowerCase().includes(activeFilters.search));
    if (activeFilters.category !== 'all') filtered = filtered.filter(exp => exp.categoryId === activeFilters.category);
    if (activeFilters.type !== 'all') filtered = filtered.filter(exp => exp.type === activeFilters.type);

    const total = filtered.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    totalAmountEl.innerText = total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
    renderExpenses(filtered);
}

function filterExpensesByPeriod(allExpenses, period, currentDate) {
    return allExpenses.filter(exp => {
        const expDate = new Date(exp.date + 'T12:00:00');
        if (exp.type === 'recurring') {
            if (period === 'annual') return true;
            if (period === 'monthly' && (exp.recurrence === 'monthly' || exp.recurrence === 'biweekly')) return true;
            if (period === 'biweekly' && exp.recurrence === 'biweekly') return true;
        }
        if (period === 'annual') return expDate.getFullYear() === currentDate.getFullYear();
        if (period === 'monthly') return expDate.getFullYear() === currentDate.getFullYear() && expDate.getMonth() === currentDate.getMonth();
        if (period === 'biweekly') {
            return expDate.getFullYear() === currentDate.getFullYear() && expDate.getMonth() === currentDate.getMonth() && (expDate.getDate() <= 15) === (currentDate.getDate() <= 15);
        }
        return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderExpenses(expensesToRender) {
    if (expensesToRender.length === 0) {
        expensesContainer.innerHTML = `<div class="empty-state"><i data-feather="inbox" style="width:48px;height:48px;opacity:0.2;margin-bottom:1rem;"></i><p>No hay gastos registrados.</p></div>`;
        feather.replace();
        return;
    }
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
                        <div class="category-icon-bg"><i data-feather="${cat.icon || 'tag'}"></i></div>
                        <div class="category-name-wrap">
                            <span class="category-group-name">${cat.name}</span>
                            <span class="category-item-count">${items.length} movimientos</span>
                        </div>
                    </div>
                    <div class="category-total-wrap">
                        <span class="category-group-total">${catTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</span>
                        <i data-feather="chevron-down" class="chevron-icon"></i>
                    </div>
                </div>
                <div class="category-content" id="content-${catId}">
                    ${items.map(exp => `
                        <div class="expense-item mini">
                            <div class="expense-info">
                                <span class="expense-name">${exp.name}</span>
                                <div class="expense-meta">
                                    <span>${new Date(exp.date + 'T12:00:00').toLocaleDateString()}</span>
                                    ${exp.type === 'recurring' ? `<span class="meta-dot"></span><span><i data-feather="refresh-cw" style="width:10px;height:10px;"></i> ${exp.recurrence}</span>` : ''}
                                </div>
                                <div class="expense-actions">
                                    <button class="icon-btn edit-btn" data-id="${exp.id}"><i data-feather="edit-2"></i></button>
                                    <button class="icon-btn delete-btn" data-id="${exp.id}"><i data-feather="trash-2"></i></button>
                                </div>
                            </div>
                            <div class="expense-amount-wrap">
                                <span class="expense-item-amount">${parseFloat(exp.amount).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }).join('');
    feather.replace();
    expensesContainer.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); editExpense(btn.dataset.id); }));
    expensesContainer.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); deleteExpense(btn.dataset.id); }));
}

window.toggleCategoryGroup = function (catId) {
    const group = document.getElementById(`group-${catId}`);
    group.classList.toggle('open');
};

async function handleExpenseSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('expenseId').value;
    const expenseObj = {
        name: document.getElementById('expenseName').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        date: document.getElementById('expenseDate').value,
        categoryId: document.getElementById('expenseCategory').value,
        type: document.getElementById('expenseType').value,
        recurrence: document.getElementById('expenseType').value === 'recurring' ? document.getElementById('expenseRecurrence').value : null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const userRef = db.collection('users').doc(currentUser.uid);
    if (id) await userRef.collection('expenses').doc(id).update(expenseObj);
    else await userRef.collection('expenses').add(expenseObj);
    closeModal(expenseModal);
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

async function deleteExpense(id) {
    if (confirm('¿Seguro que deseas eliminar este gasto?')) {
        await db.collection('users').doc(currentUser.uid).collection('expenses').doc(id).delete();
    }
}

function populateFilterCategories() {
    const filterCatSelect = document.getElementById('filterCategory');
    const currentValue = filterCatSelect.value;
    filterCatSelect.innerHTML = '<option value="all">Todas las categorías</option>' + categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    filterCatSelect.value = currentValue || 'all';
}

function setupIconPicker() {
    const availableIcons = [
        'tag', 'dollar-sign', 'pie-chart', 'trending-up', 'credit-card', 'briefcase',
        'shopping-bag', 'shopping-cart', 'truck', 'home', 'coffee', 'film',
        'zap', 'heart', 'gift', 'activity', 'bookmark', 'box', 'tool', 'star'
    ];
    const picker = document.getElementById('iconPicker');
    picker.innerHTML = availableIcons.map(icon => `<div data-icon="${icon}"><i data-feather="${icon}"></i></div>`).join('');
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
        });
    });
    iconBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        picker.classList.toggle('select-hide');
    });
}

function openModal(modal) { modal.classList.add('active'); }
function closeModal(modal) { modal.classList.remove('active'); }

function populateCategoriesDropdown() {
    const optionsContainer = document.getElementById('expenseCategoryOptions');
    const selectedContainer = document.getElementById('expenseCategorySelected');
    const hiddenInput = document.getElementById('expenseCategory');
    optionsContainer.innerHTML = categories.map(cat => `<div data-value="${cat.id}"><i data-feather="${cat.icon || 'tag'}"></i><span>${cat.name}</span></div>`).join('');
    feather.replace();
    optionsContainer.querySelectorAll('div').forEach(opt => {
        opt.addEventListener('click', () => {
            hiddenInput.value = opt.dataset.value;
            const cat = categories.find(c => c.id === hiddenInput.value);
            selectedContainer.innerHTML = `<span class="select-text" style="display: flex; align-items: center; gap: 8px;"><i data-feather="${cat.icon || 'tag'}" style="width: 16px; height: 16px;"></i> ${cat.name}</span><i data-feather="chevron-down" style="width: 16px; height: 16px;"></i>`;
            feather.replace();
            optionsContainer.classList.add('select-hide');
        });
    });
    if (categories.length > 0 && !hiddenInput.value) {
        const defaultCat = categories[0];
        hiddenInput.value = defaultCat.id;
        selectedContainer.innerHTML = `<span class="select-text" style="display: flex; align-items: center; gap: 8px;"><i data-feather="${defaultCat.icon || 'tag'}" style="width: 16px; height: 16px;"></i> ${defaultCat.name}</span><i data-feather="chevron-down" style="width: 16px; height: 16px;"></i>`;
        feather.replace();
    }
}

function renderCategories() {
    categoriesListEl.innerHTML = categories.map(cat => `
        <div class="category-item">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="category-icon-bg mini"><i data-feather="${cat.icon || 'tag'}" style="width: 14px; height: 14px;"></i></div>
                <span>${cat.name}</span>
            </div>
            <div class="category-actions">
                <button class="icon-btn edit-cat-btn" data-id="${cat.id}"><i data-feather="edit-2"></i></button>
                <button class="icon-btn delete-btn" data-id="${cat.id}"><i data-feather="trash-2"></i></button>
            </div>
        </div>
    `).join('');
    feather.replace();
    categoriesListEl.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => deleteCategory(btn.dataset.id)));
    categoriesListEl.querySelectorAll('.edit-cat-btn').forEach(btn => btn.addEventListener('click', (e) => editCategory(btn.dataset.id)));
}

function editCategory(id) {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    document.getElementById('categoryId').value = cat.id;
    document.getElementById('newCategoryName').value = cat.name;
    document.getElementById('newCategoryIcon').value = cat.icon || 'tag';
    document.getElementById('currentCategoryIcon').setAttribute('data-feather', cat.icon || 'tag');
    feather.replace();
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('categoryId').value;
    const input = document.getElementById('newCategoryName');
    const icon = document.getElementById('newCategoryIcon').value;
    const name = input.value.trim();
    if (name) {
        const userRef = db.collection('users').doc(currentUser.uid);
        if (id) {
            await userRef.collection('categories').doc(id).update({ name, icon });
        } else {
            await userRef.collection('categories').add({ name, icon });
        }
        input.value = '';
        document.getElementById('categoryId').value = '';
        document.getElementById('newCategoryIcon').value = 'tag';
        document.getElementById('currentCategoryIcon').setAttribute('data-feather', 'tag');
        feather.replace();
    }
}

async function deleteCategory(id) {
    if (expenses.some(e => e.categoryId === id)) return alert('No puedes eliminar una categoría que está en uso.');
    await db.collection('users').doc(currentUser.uid).collection('categories').doc(id).delete();
}

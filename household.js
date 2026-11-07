const householdStorageKey = "life-quest-household-v1";
const cleaningTasks = [
    "Clean living room",
    "Clean kitchen",
    "Clean bathroom #1",
    "Clean bathroom #2",
    "Clean office",
    "Clean cat room"
];

const dailyCheck = document.querySelector("#daily-clean-check");
const dailyName = document.querySelector("#daily-clean-name");
const dailyDate = document.querySelector("#household-date");
const laundryCheck = document.querySelector("#laundry-check");
const carCheck = document.querySelector("#car-check");
const laundryWeek = document.querySelector("#household-week");
const rotationList = document.querySelector("#rotation-list");
const shoppingForm = document.querySelector("#shopping-form");
const shoppingName = document.querySelector("#shopping-name");
const shoppingList = document.querySelector("#shopping-list");
const shoppingCount = document.querySelector("#shopping-count");
const storageMessage = document.querySelector("#household-storage-message");
let householdStorageBlocked = false;

function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function localWeek(date = new Date()) {
    const thursday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
    const year = thursday.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
    return `${year}-W${String(week).padStart(2, "0")}`;
}

function dayNumber(date) {
    const [year, month, day] = date.split("-").map(Number);
    return Date.UTC(year, month - 1, day) / 86400000;
}

function dateFromDay(day) {
    return new Date(day * 86400000).toISOString().slice(0, 10);
}

function saveHousehold() {
    if (householdStorageBlocked) return false;
    try {
        localStorage.setItem(householdStorageKey, JSON.stringify(household));
        return true;
    } catch (error) {
        storageMessage.hidden = false;
        return false;
    }
}

function loadHousehold() {
    try {
        const saved = JSON.parse(localStorage.getItem(householdStorageKey) || "null");
        if (saved === null) return { startDate: localDate(), completedDays: [], laundryWeeks: [], carWeeks: [], shoppingItems: [] };
        if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved.startDate) &&
            Array.isArray(saved.completedDays) && Array.isArray(saved.laundryWeeks) &&
            (saved.carWeeks === undefined || Array.isArray(saved.carWeeks)) &&
            (saved.shoppingItems === undefined || (Array.isArray(saved.shoppingItems) &&
                saved.shoppingItems.every(item => item && typeof item.name === "string" && typeof item.completed === "boolean")))) {
            return { ...saved, carWeeks: saved.carWeeks || [], shoppingItems: saved.shoppingItems || [] };
        }
    } catch (error) {
    }
    householdStorageBlocked = true;
    storageMessage.hidden = false;
    return { startDate: localDate(), completedDays: [], laundryWeeks: [], carWeeks: [], shoppingItems: [] };
}

let household = loadHousehold();
let displayedDate = "";
let displayedWeek = "";
saveHousehold();

function taskForDay(day) {
    const offset = day - dayNumber(household.startDate);
    const index = ((offset % cleaningTasks.length) + cleaningTasks.length) % cleaningTasks.length;
    return cleaningTasks[index];
}

function render() {
    displayedDate = localDate();
    displayedWeek = localWeek();
    const today = dayNumber(displayedDate);
    dailyName.textContent = taskForDay(today);
    dailyDate.textContent = displayedDate;
    dailyDate.dateTime = displayedDate;
    dailyCheck.checked = household.completedDays.includes(displayedDate);
    laundryWeek.textContent = displayedWeek;
    laundryCheck.checked = household.laundryWeeks.includes(displayedWeek);
    carCheck.checked = household.carWeeks.includes(displayedWeek);

    rotationList.replaceChildren();
    for (let offset = 1; offset < cleaningTasks.length; offset += 1) {
        const day = today + offset;
        const item = document.createElement("li");
        item.className = "task-item";
        const task = document.createElement("span");
        task.textContent = taskForDay(day);
        const date = document.createElement("time");
        date.className = "task-date";
        date.dateTime = dateFromDay(day);
        date.textContent = date.dateTime;
        item.append(task, date);
        rotationList.append(item);
    }
}

function renderShoppingList() {
    shoppingList.replaceChildren();
    const remaining = household.shoppingItems.filter(item => !item.completed).length;
    shoppingCount.textContent = `${remaining} TO GET`;
    if (household.shoppingItems.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "Your shopping list is empty.";
        shoppingList.append(empty);
        return;
    }

    household.shoppingItems.forEach(item => {
        const row = document.createElement("li");
        row.className = "task-item";
        const label = document.createElement("label");
        label.className = "task-label";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = item.completed;
        checkbox.addEventListener("change", () => {
            item.completed = checkbox.checked;
            saveHousehold();
            shoppingCount.textContent = `${household.shoppingItems.filter(entry => !entry.completed).length} TO GET`;
        });
        const name = document.createElement("span");
        name.className = "task-title";
        name.textContent = item.name;
        label.append(checkbox, name);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "button button-secondary";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove ${item.name}`);
        remove.addEventListener("click", () => {
            if (!window.confirm(`Remove ${item.name} from the shopping list?`)) return;
            household.shoppingItems = household.shoppingItems.filter(entry => entry !== item);
            saveHousehold();
            renderShoppingList();
        });
        row.append(label, remove);
        shoppingList.append(row);
    });
}

dailyCheck.addEventListener("change", () => {
    if (displayedDate !== localDate()) {
        render();
        return;
    }
    household.completedDays = household.completedDays.filter(day => day !== displayedDate);
    if (dailyCheck.checked) household.completedDays.push(displayedDate);
    saveHousehold();
    render();
});

laundryCheck.addEventListener("change", () => {
    if (displayedWeek !== localWeek()) {
        render();
        return;
    }
    household.laundryWeeks = household.laundryWeeks.filter(week => week !== displayedWeek);
    if (laundryCheck.checked) household.laundryWeeks.push(displayedWeek);
    saveHousehold();
    render();
});

carCheck.addEventListener("change", () => {
    if (displayedWeek !== localWeek()) {
        render();
        return;
    }
    household.carWeeks = household.carWeeks.filter(week => week !== displayedWeek);
    if (carCheck.checked) household.carWeeks.push(displayedWeek);
    saveHousehold();
    render();
});

shoppingForm.addEventListener("submit", event => {
    event.preventDefault();
    const name = shoppingName.value.trim();
    if (!name) return;
    household.shoppingItems.push({ name, completed: false });
    saveHousehold();
    shoppingName.value = "";
    renderShoppingList();
    shoppingName.focus();
});

render();
renderShoppingList();
setInterval(render, 30000);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) render();
});
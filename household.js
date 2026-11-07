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
const laundryWeek = document.querySelector("#household-week");
const rotationList = document.querySelector("#rotation-list");
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
        if (saved === null) return { startDate: localDate(), completedDays: [], laundryWeeks: [] };
        if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved.startDate) &&
            Array.isArray(saved.completedDays) && Array.isArray(saved.laundryWeeks)) {
            return saved;
        }
    } catch (error) {
    }
    householdStorageBlocked = true;
    storageMessage.hidden = false;
    return { startDate: localDate(), completedDays: [], laundryWeeks: [] };
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

render();
setInterval(render, 30000);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) render();
});
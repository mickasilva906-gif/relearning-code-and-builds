const skills = ["Strength", "Mental", "Agility", "Logic", "Charisma"];
const storageKey = "life-quest-tasks-v1";
const eloStorageKey = "life-quest-chess-ratings-v1";
const experiencePerLevel = 1000;
let tasks = [];
let chessRatings = [];
let defaultEloWeek = "";
let journalEditorDate = "";
let journalSavedText = "";
let courseworkEditorDate = "";
let courseworkSavedText = "";
let previousSkillLevels = null;

const form = document.querySelector("#task-form");
const taskName = document.querySelector("#task-name");
const taskSkill = document.querySelector("#task-skill");
const taskList = document.querySelector("#task-list");
const workoutChecks = document.querySelectorAll(".workout-check");
const workoutList = document.querySelector("#workout-list");
const duolingoCheck = document.querySelector("#duolingo-check");
const duolingoDate = document.querySelector("#duolingo-date");
const chessCheck = document.querySelector("#chess-check");
const chessDate = document.querySelector("#chess-date");
const courseworkForm = document.querySelector("#coursework-form");
const courseworkEntry = document.querySelector("#coursework-entry");
const courseworkDate = document.querySelector("#coursework-date");
const courseworkCount = document.querySelector("#coursework-count");
const courseworkStatus = document.querySelector("#coursework-status");
const courseworkHistory = document.querySelector("#coursework-history");
const courseCompletionForm = document.querySelector("#course-completion-form");
const completedCourseName = document.querySelector("#completed-course-name");
const courseCompletionStatus = document.querySelector("#course-completion-status");
const courseCompletionHistory = document.querySelector("#course-completion-history");
const eloForm = document.querySelector("#elo-form");
const eloWeek = document.querySelector("#elo-week");
const eloRating = document.querySelector("#elo-rating");
const eloStatus = document.querySelector("#elo-status");
const eloHistory = document.querySelector("#elo-history");
const charismaChecks = document.querySelectorAll(".charisma-check");
const charismaWeek = document.querySelector("#charisma-week");
const journalForm = document.querySelector("#journal-form");
const journalEntry = document.querySelector("#journal-entry");
const journalDate = document.querySelector("#journal-date");
const journalStatus = document.querySelector("#journal-status");
const journalHistory = document.querySelector("#journal-history");
const skillTree = document.querySelector("#skill-tree");
const totalExperience = document.querySelector("#total-xp");
const completedCount = document.querySelector("#completed-count");
const openCount = document.querySelector("#open-count");
const storageMessage = document.querySelector("#storage-message");
const levelUpBanner = document.querySelector("#level-up-banner");
const levelUpMessage = document.querySelector("#level-up-message");
const levelUpDismiss = document.querySelector("#level-up-dismiss");

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

function taskExperience(task, today = localDate()) {
    const completed = Boolean(task.completedOn);
    if (task.courseCompletion) return completed ? 500 : 0;
    if (typeof task.courseworkText === "string") return completed ? 100 : 0;
    const missed = task.completedOn ? task.completedOn > task.dueOn : today > task.dueOn;
    return (completed ? 100 : 0) - (missed ? 100 : 0);
}

function saveTasks() {
    try {
        localStorage.setItem(storageKey, JSON.stringify(tasks));
        return true;
    } catch (error) {
        storageMessage.hidden = false;
        return false;
    }
}

function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
        if (Array.isArray(saved)) {
            tasks = saved.filter(task => task && typeof task.name === "string" &&
                skills.includes(task.skill) && typeof task.dueOn === "string" &&
                (task.completedOn === null || typeof task.completedOn === "string"));
        }
    } catch (error) {
        storageMessage.hidden = false;
    }
}

function loadChessRatings() {
    try {
        const saved = JSON.parse(localStorage.getItem(eloStorageKey) || "[]");
        if (Array.isArray(saved)) {
            chessRatings = saved.filter(entry => entry && typeof entry.week === "string" &&
                Number.isSafeInteger(entry.rating) && entry.rating >= 0);
        }
    } catch (error) {
        eloStatus.textContent = "Ratings could not be loaded from this browser.";
    }
}

function renderChessRatings() {
    const week = localWeek();
    if (!eloWeek.value || (eloWeek.value === defaultEloWeek && !eloRating.value)) {
        eloWeek.value = week;
        defaultEloWeek = week;
    }
    eloHistory.replaceChildren();
    if (chessRatings.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "No weekly ratings yet.";
        eloHistory.append(empty);
        return;
    }

    [...chessRatings].sort((first, second) => second.week.localeCompare(first.week)).forEach(entry => {
        const item = document.createElement("li");
        item.className = "task-item";
        const weekLabel = document.createElement("span");
        weekLabel.textContent = entry.week;
        const rating = document.createElement("strong");
        rating.textContent = `${entry.rating} ELO`;
        item.append(weekLabel, rating);
        eloHistory.append(item);
    });
}

function renderSkills(today) {
    skillTree.replaceChildren();
    const currentLevels = {};
    const levelUps = [];

    skills.forEach((skill, index) => {
        const experience = tasks.filter(task => task.skill === skill)
            .reduce((total, task) => total + taskExperience(task, today), 0);
        let progress = Math.max(0, experience);
        let level = 1;
        while (progress >= level * experiencePerLevel) {
            progress -= level * experiencePerLevel;
            level += 1;
        }
        const nextLevelExperience = level * experiencePerLevel;
        currentLevels[skill] = level;
        if (previousSkillLevels && level > previousSkillLevels[skill]) {
            levelUps.push(`${skill} reached level ${level}!`);
        }

        const branch = document.createElement("article");
        branch.className = "skill-branch";
        const heading = document.createElement("div");
        heading.className = "skill-heading";
        const name = document.createElement("h3");
        name.textContent = skill;
        const number = document.createElement("span");
        number.className = "skill-number";
        number.textContent = `0${index + 1}`;
        heading.append(name, number);

        const details = document.createElement("div");
        details.className = "skill-details";
        const levelLabel = document.createElement("span");
        levelLabel.textContent = `LEVEL ${String(level).padStart(2, "0")}`;
        const xpLabel = document.createElement("span");
        xpLabel.textContent = `${experience} XP`;
        details.append(levelLabel, xpLabel);

        const meter = document.createElement("progress");
        meter.max = nextLevelExperience;
        meter.value = progress;
        meter.setAttribute("aria-label", `${skill} progress to level ${level + 1}`);
        const nextLevel = document.createElement("p");
        nextLevel.className = "skill-next";
        nextLevel.textContent = `${progress} / ${nextLevelExperience} XP TO NEXT LEVEL`;
        branch.append(heading, details, meter, nextLevel);
        skillTree.append(branch);
    });
    previousSkillLevels = currentLevels;
    if (levelUps.length > 0) {
        levelUpMessage.textContent = levelUps.join(" ");
        levelUpBanner.hidden = false;
    }
}

function renderTasks(today, list, entries, emptyMessage) {
    list.replaceChildren();
    if (entries.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = emptyMessage;
        list.append(empty);
        return;
    }

    [...entries].reverse().forEach(task => {
        const item = document.createElement("li");
        item.className = "task-item";
        const label = document.createElement("label");
        label.className = "task-label";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(task.completedOn);
        checkbox.disabled = Boolean(task.dailyWorkout);
        checkbox.addEventListener("change", () => {
            task.completedOn = checkbox.checked ? localDate() : null;
            saveTasks();
            render();
        });
        const name = document.createElement("span");
        name.className = "task-title";
        name.textContent = task.name;
        label.append(checkbox, name);

        const meta = document.createElement("div");
        meta.className = "task-meta";
        const tag = document.createElement("span");
        tag.className = "skill-tag";
        tag.textContent = task.workoutType ? `${task.workoutType} / ${task.skill}` : task.skill;
        const status = document.createElement("span");
        status.className = "task-status";
        const missed = task.completedOn ? task.completedOn > task.dueOn : today > task.dueOn;
        status.textContent = task.completedOn ? (missed ? "COMPLETED LATE" : "COMPLETE") :
            (missed ? "MISSED" : "DUE TODAY");
        if (missed) status.classList.add("is-missed");
        const due = document.createElement("span");
        due.className = "task-date";
        due.textContent = task.dueOn;
        meta.append(tag, status, due);
        item.append(label, meta);
        list.append(item);
    });
}

function sentenceCount(text) {
    const normalized = text.replace(/([.!?])(\s*)(\p{L})/gu, (match, punctuation, spacing, letter, offset) => {
        const preceding = text.slice(0, offset + 1);
        if (punctuation === "." && /\b(?:mr|mrs|ms|dr|prof|sr|jr|vs|etc|e\.g|i\.e)\.$/i.test(preceding)) {
            return match;
        }
        if (!spacing && letter === letter.toLocaleLowerCase("en")) return match;
        return `${punctuation} ${letter.toLocaleUpperCase("en")}`;
    });
    const segments = typeof Intl.Segmenter === "function"
        ? Array.from(new Intl.Segmenter("en", { granularity: "sentence" }).segment(normalized), part => part.segment)
        : (normalized.replace(/\b(?:mr|mrs|ms|dr|prof|sr|jr|vs|etc|e\.g|i\.e)\./gi,
            abbreviation => abbreviation.replace(/\./g, "")).match(/[^.!?]+(?:[.!?]+|$)/g) || []);
    return segments.filter(sentence => /[\p{L}\p{N}]/u.test(sentence)).length;
}

function renderCoursework(today) {
    const entries = tasks.filter(task => typeof task.courseworkText === "string");
    if (!courseworkEditorDate || (courseworkEditorDate !== today && courseworkEntry.value === courseworkSavedText)) {
        courseworkEditorDate = today;
        const currentEntry = entries.find(entry => entry.dueOn === today);
        courseworkSavedText = currentEntry ? currentEntry.courseworkText : "";
        courseworkEntry.value = courseworkSavedText;
        courseworkDate.textContent = courseworkEditorDate;
        courseworkDate.dateTime = courseworkEditorDate;
    }
    courseworkCount.textContent = `${sentenceCount(courseworkEntry.value)} SENTENCES / 3 REQUIRED`;
    courseworkHistory.replaceChildren();
    const pastEntries = entries.filter(entry => entry.dueOn < today)
        .sort((first, second) => second.dueOn.localeCompare(first.dueOn));
    if (pastEntries.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "No past coursework yet.";
        courseworkHistory.append(empty);
        return;
    }

    pastEntries.forEach(entry => {
        const item = document.createElement("li");
        const date = document.createElement("time");
        date.dateTime = entry.dueOn;
        date.textContent = entry.completedOn ? entry.dueOn : `${entry.dueOn} / DRAFT`;
        const text = document.createElement("p");
        text.textContent = entry.courseworkText;
        item.append(date, text);
        courseworkHistory.append(item);
    });
}

function renderCourseCompletions() {
    const completions = tasks.filter(task => task.courseCompletion);
    courseCompletionHistory.replaceChildren();
    if (completions.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "No completed courses yet.";
        courseCompletionHistory.append(empty);
        return;
    }

    [...completions].reverse().forEach(completion => {
        const item = document.createElement("li");
        item.className = "task-item";
        const name = document.createElement("span");
        name.className = "task-title";
        name.textContent = completion.name;
        const details = document.createElement("div");
        details.className = "task-meta";
        const date = document.createElement("time");
        date.className = "task-date";
        date.dateTime = completion.completedOn;
        date.textContent = completion.completedOn;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "button button-secondary";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove ${completion.name} completion`);
        remove.addEventListener("click", () => {
            if (!window.confirm(`Remove the completion for ${completion.name} and its 500 XP?`)) return;
            const previousTasks = tasks;
            tasks = tasks.filter(task => task !== completion);
            if (!saveTasks()) {
                tasks = previousTasks;
                courseCompletionStatus.textContent = "The completion could not be removed from this browser.";
            } else {
                courseCompletionStatus.textContent = "Course completion removed.";
            }
            render();
        });
        details.append(date, remove);
        item.append(name, details);
        courseCompletionHistory.append(item);
    });
}

function renderJournal(today) {
    const entries = tasks.filter(task => typeof task.journalText === "string");
    if (!journalEditorDate || (journalEditorDate !== today && journalEntry.value === journalSavedText)) {
        journalEditorDate = today;
        const currentEntry = entries.find(entry => entry.dueOn === today);
        journalSavedText = currentEntry ? currentEntry.journalText : "";
        journalEntry.value = journalSavedText;
        journalDate.textContent = journalEditorDate;
        journalDate.dateTime = journalEditorDate;
    }

    journalHistory.replaceChildren();
    const pastEntries = entries.filter(entry => entry.dueOn < today)
        .sort((first, second) => second.dueOn.localeCompare(first.dueOn));
    if (pastEntries.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "No past reflections yet.";
        journalHistory.append(empty);
        return;
    }

    pastEntries.forEach(entry => {
        const item = document.createElement("li");
        const date = document.createElement("time");
        date.dateTime = entry.dueOn;
        date.textContent = entry.dueOn;
        const text = document.createElement("p");
        text.textContent = entry.journalText;
        item.append(date, text);
        journalHistory.append(item);
    });
}

function render() {
    const today = localDate();
    const experience = tasks.reduce((total, task) => total + taskExperience(task, today), 0);
    const regularTasks = tasks.filter(task => !task.workoutType && !task.duolingo && !task.chess &&
        !task.charismaActivity && !task.courseCompletion && typeof task.journalText !== "string" && typeof task.courseworkText !== "string");
    const workouts = tasks.filter(task => task.workoutType && (!task.dailyWorkout || task.dueOn !== today));
    totalExperience.textContent = `${experience} XP`;
    completedCount.textContent = regularTasks.filter(task => task.completedOn).length;
    openCount.textContent = regularTasks.filter(task => !task.completedOn && task.dueOn === today).length;
    duolingoCheck.checked = tasks.some(task => task.duolingo && task.dueOn === today && task.completedOn);
    duolingoDate.textContent = today;
    duolingoDate.dateTime = today;
    chessCheck.checked = tasks.some(task => task.chess && task.dueOn === today && task.completedOn);
    chessDate.textContent = today;
    chessDate.dateTime = today;
    const week = localWeek();
    charismaWeek.textContent = week;
    charismaChecks.forEach(checkbox => {
        checkbox.checked = tasks.some(task => task.charismaActivity === checkbox.value && task.week === week);
    });
    workoutChecks.forEach(checkbox => {
        checkbox.checked = tasks.some(task => task.dailyWorkout && task.workoutType === checkbox.value && task.dueOn === today);
    });
    renderSkills(today);
    renderTasks(today, taskList, regularTasks, "No tasks yet. Add your first objective above.");
    renderTasks(today, workoutList, workouts, "No previous workouts yet.");
    renderCoursework(today);
    renderCourseCompletions();
    renderJournal(today);
    renderChessRatings();
}

levelUpDismiss.addEventListener("click", () => {
    levelUpBanner.hidden = true;
});

form.addEventListener("submit", event => {
    event.preventDefault();
    const name = taskName.value.trim();
    if (!name || !skills.includes(taskSkill.value)) return;
    tasks.push({ name, skill: taskSkill.value, dueOn: localDate(), completedOn: null });
    saveTasks();
    taskName.value = "";
    render();
    taskName.focus();
});

workoutChecks.forEach(checkbox => {
    checkbox.addEventListener("change", () => {
        const today = localDate();
        const type = checkbox.value;
        const existing = tasks.find(task => task.dailyWorkout && task.workoutType === type && task.dueOn === today);
        if (checkbox.checked && !existing) {
            const skill = type === "Cardio" ? "Agility" : "Strength";
            tasks.push({ name: `${type} workout`, skill, workoutType: type, dailyWorkout: true,
                dueOn: today, completedOn: today });
        } else if (!checkbox.checked && existing) {
            tasks = tasks.filter(task => task !== existing);
        }
        saveTasks();
        render();
    });
});

duolingoCheck.addEventListener("change", () => {
    const today = localDate();
    const existing = tasks.find(task => task.duolingo && task.dueOn === today);
    if (duolingoCheck.checked && !existing) {
        tasks.push({ name: "Duolingo", skill: "Mental", duolingo: true, dueOn: today, completedOn: today });
    } else if (!duolingoCheck.checked && existing) {
        tasks = tasks.filter(task => task !== existing);
    }
    saveTasks();
    render();
});

chessCheck.addEventListener("change", () => {
    const today = localDate();
    const existing = tasks.find(task => task.chess && task.dueOn === today);
    if (chessCheck.checked && !existing) {
        tasks.push({ name: "Chess match", skill: "Logic", chess: true, dueOn: today, completedOn: today });
    } else if (!chessCheck.checked && existing) {
        tasks = tasks.filter(task => task !== existing);
    }
    saveTasks();
    render();
});

courseworkEntry.addEventListener("input", () => {
    courseworkCount.textContent = `${sentenceCount(courseworkEntry.value)} SENTENCES / 3 REQUIRED`;
});

courseworkForm.addEventListener("submit", event => {
    event.preventDefault();
    const text = courseworkEntry.value.trim();
    if (!text) return;
    const complete = sentenceCount(text) >= 3;
    let entry = tasks.find(task => typeof task.courseworkText === "string" && task.dueOn === courseworkEditorDate);
    if (!entry) {
        entry = { name: "Daily coursework", skill: "Logic", courseworkText: text,
            dueOn: courseworkEditorDate, completedOn: null };
        tasks.push(entry);
    }
    entry.courseworkText = text;
    entry.completedOn = complete ? (entry.completedOn || localDate()) : null;
    const saved = saveTasks();
    courseworkSavedText = text;
    courseworkEntry.value = text;
    courseworkStatus.textContent = saved
        ? (complete ? `Coursework saved for ${entry.dueOn}. +100 XP` : "Draft saved. Three sentences are required for XP.")
        : "Coursework could not be saved in this browser.";
    render();
});

courseCompletionForm.addEventListener("submit", event => {
    event.preventDefault();
    const name = completedCourseName.value.trim();
    if (!name) return;
    const today = localDate();
    tasks.push({ name, skill: "Logic", courseCompletion: true, dueOn: today, completedOn: today });
    if (saveTasks()) {
        completedCourseName.value = "";
        courseCompletionStatus.textContent = `Course completed: ${name}. +500 XP`;
    } else {
        tasks.pop();
        courseCompletionStatus.textContent = "The completion could not be saved in this browser.";
    }
    render();
});

charismaChecks.forEach(checkbox => {
    checkbox.addEventListener("change", () => {
        const today = localDate();
        const week = localWeek();
        const activity = checkbox.value;
        const existing = tasks.find(task => task.charismaActivity === activity && task.week === week);
        if (checkbox.checked && !existing) {
            const name = activity === "flowers" ? "Flowers for Soph" : "Date with Soph";
            tasks.push({ name, skill: "Charisma", charismaActivity: activity, week,
                dueOn: today, completedOn: today });
        } else if (!checkbox.checked && existing) {
            tasks = tasks.filter(task => task !== existing);
        }
        saveTasks();
        render();
    });
});

eloWeek.addEventListener("change", () => {
    defaultEloWeek = "";
});

eloForm.addEventListener("submit", event => {
    event.preventDefault();
    const week = eloWeek.value;
    const rating = Number(eloRating.value);
    if (!/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(week) || !eloRating.value ||
        !Number.isSafeInteger(rating) || rating < 0) {
        eloStatus.textContent = "Enter a valid week and a non-negative whole-number rating.";
        return;
    }
    const existing = chessRatings.find(entry => entry.week === week);
    if (existing) {
        existing.rating = rating;
    } else {
        chessRatings.push({ week, rating });
    }
    try {
        localStorage.setItem(eloStorageKey, JSON.stringify(chessRatings));
        eloStatus.textContent = `Rating saved for ${week}.`;
        eloRating.value = "";
    } catch (error) {
        eloStatus.textContent = "Rating could not be saved in this browser.";
    }
    renderChessRatings();
});

journalForm.addEventListener("submit", event => {
    event.preventDefault();
    const text = journalEntry.value.trim();
    if (!text) return;
    let entry = tasks.find(task => typeof task.journalText === "string" && task.dueOn === journalEditorDate);
    if (entry) {
        entry.journalText = text;
    } else {
        entry = { name: "Daily journal", skill: "Charisma", journalText: text,
            dueOn: journalEditorDate, completedOn: localDate() };
        tasks.push(entry);
    }
    const saved = saveTasks();
    journalSavedText = text;
    journalEntry.value = text;
    journalStatus.textContent = saved ? `Reflection saved for ${entry.dueOn}.` : "Reflection could not be saved in this browser.";
    render();
});

loadTasks();
loadChessRatings();
render();
setInterval(render, 30000);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) render();
});
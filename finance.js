const financeStorageKey = "life-quest-finance-v1";
const moneyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const financeStatus = document.querySelector("#finance-status");
const balanceForm = document.querySelector("#balance-form");
const checkingInput = document.querySelector("#checking-input");
const savingsInput = document.querySelector("#savings-input");
const checkingTotal = document.querySelector("#checking-total");
const savingsTotal = document.querySelector("#savings-total");
const cashTotal = document.querySelector("#cash-total");
const netPosition = document.querySelector("#net-position");
const debtTotal = document.querySelector("#debt-total");
const creditTotal = document.querySelector("#credit-total");
const studentTotal = document.querySelector("#student-total");
const payoffProgress = document.querySelector("#payoff-progress");
const payoffLabel = document.querySelector("#payoff-label");
const debtForm = document.querySelector("#debt-form");
const debtName = document.querySelector("#debt-name");
const debtType = document.querySelector("#debt-type");
const debtAmount = document.querySelector("#debt-amount");
const debtList = document.querySelector("#debt-list");
const expenseForm = document.querySelector("#expense-form");
const expenseName = document.querySelector("#expense-name");
const expenseAmount = document.querySelector("#expense-amount");
const expenseDate = document.querySelector("#expense-date");
const expenseTotal = document.querySelector("#expense-total");
const expenseList = document.querySelector("#expense-list");
const subscriptionForm = document.querySelector("#subscription-form");
const subscriptionName = document.querySelector("#subscription-name");
const subscriptionAmount = document.querySelector("#subscription-amount");
const subscriptionFrequency = document.querySelector("#subscription-frequency");
const subscriptionTotal = document.querySelector("#subscription-total");
const subscriptionList = document.querySelector("#subscription-list");
const investmentForm = document.querySelector("#investment-form");
const investmentSymbol = document.querySelector("#investment-symbol");
const investmentShares = document.querySelector("#investment-shares");
const investmentCost = document.querySelector("#investment-cost");
const investmentTotal = document.querySelector("#investment-total");
const investmentList = document.querySelector("#investment-list");
const investmentStatus = document.querySelector("#investment-status");
const marketForm = document.querySelector("#market-form");
const marketKeyInput = document.querySelector("#market-key");
const marketRefresh = document.querySelector("#market-refresh");
const moneyBanner = document.querySelector("#money-banner");
const moneyMessage = document.querySelector("#money-message");
const moneyDismiss = document.querySelector("#money-dismiss");
let financeStorageBlocked = false;
let marketKey = "";
let marketRefreshing = false;
const marketAttempts = new Map();
const marketErrors = new Set();

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

function parseMoney(value, allowNegative = false) {
    const text = value.trim();
    if (!/^-?\d{1,10}(?:\.\d{1,2})?$/.test(text) || (!allowNegative && text.startsWith("-"))) return null;
    const negative = text.startsWith("-");
    const [whole, fraction = ""] = (negative ? text.slice(1) : text).split(".");
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    return negative ? -cents : cents;
}

function formatMoney(cents) {
    return moneyFormatter.format(cents / 100);
}

function moneyInput(cents) {
    const sign = cents < 0 ? "-" : "";
    const amount = Math.abs(cents);
    return `${sign}${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}

function parseMicros(value) {
    const text = String(value).trim();
    if (!/^\d{1,8}(?:\.\d{1,6})?$/.test(text)) return null;
    const [whole, fraction = ""] = text.split(".");
    const result = Number(whole) * 1000000 + Number(fraction.padEnd(6, "0"));
    return Number.isSafeInteger(result) ? result : null;
}

function investmentValueCents(sharesMicros, priceMicros) {
    const cents = (BigInt(sharesMicros) * BigInt(priceMicros) + 5000000000n) / 10000000000n;
    return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}

function microsInput(micros) {
    const whole = Math.floor(micros / 1000000);
    const fraction = String(micros % 1000000).padStart(6, "0").replace(/0+$/, "");
    return fraction ? `${whole}.${fraction}` : String(whole);
}

function parseWeeklyPrices(data, symbol) {
    const series = data["Weekly Time Series"];
    const returnedSymbol = data["Meta Data"] && data["Meta Data"]["2. Symbol"];
    if (!series || typeof series !== "object" || !returnedSymbol || returnedSymbol.toUpperCase() !== symbol) {
        throw new Error("Weekly prices were unavailable. Check the symbol, API key, and provider limits.");
    }
    const prices = Object.keys(series).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
        .sort((first, second) => second.localeCompare(first)).slice(0, 2).map(date => ({
            date,
            priceMicros: parseMicros(series[date]["4. close"])
        }));
    if (!prices.length || prices.some(price => price.priceMicros === null || price.priceMicros <= 0)) {
        throw new Error("The market provider returned invalid weekly prices.");
    }
    return prices;
}

function emptyFinance() {
    return { balances: { checking: 0, savings: 0, initialized: false }, debts: [], expenses: [], investments: [], subscriptions: [] };
}

function loadFinance() {
    try {
        const raw = localStorage.getItem(financeStorageKey);
        if (raw === null) return emptyFinance();
        const saved = JSON.parse(raw);
        if (saved && saved.balances && Number.isSafeInteger(saved.balances.checking) &&
            Number.isSafeInteger(saved.balances.savings) && saved.balances.savings >= 0 &&
            typeof saved.balances.initialized === "boolean" && Array.isArray(saved.debts) &&
            saved.debts.every(debt => debt && typeof debt.name === "string" &&
                ["Credit card", "Student loan"].includes(debt.type) && Number.isSafeInteger(debt.starting) &&
                debt.starting > 0 && Number.isSafeInteger(debt.balance) && debt.balance >= 0 &&
                (debt.payoffAwarded === undefined || typeof debt.payoffAwarded === "boolean")) &&
            Array.isArray(saved.expenses) && saved.expenses.every(expense => expense &&
                typeof expense.name === "string" && Number.isSafeInteger(expense.amount) && expense.amount > 0 &&
                typeof expense.date === "string") &&
            (saved.investments === undefined || (Array.isArray(saved.investments) && saved.investments.every(holding =>
                holding && /^[A-Z]{1,5}(?:[.-][A-Z]{1,2})?$/.test(holding.symbol) &&
                Number.isSafeInteger(holding.sharesMicros) && holding.sharesMicros > 0 &&
                (holding.costCents === null || (Number.isSafeInteger(holding.costCents) && holding.costCents >= 0)) &&
                Array.isArray(holding.prices) && holding.prices.length <= 2 && holding.prices.every(price => price &&
                    /^\d{4}-\d{2}-\d{2}$/.test(price.date) && Number.isSafeInteger(price.priceMicros) && price.priceMicros > 0) &&
                typeof holding.checkedWeek === "string"))) &&
            (saved.subscriptions === undefined || (Array.isArray(saved.subscriptions) && saved.subscriptions.every(subscription =>
                subscription && typeof subscription.name === "string" && Number.isSafeInteger(subscription.amount) &&
                subscription.amount > 0 && ["Weekly", "Monthly", "Yearly"].includes(subscription.frequency))))) {
            const debts = saved.debts.map(debt => debt.payoffAwarded === undefined && debt.balance === 0
                ? { ...debt, payoffAwarded: true } : debt);
            return { ...saved, debts, investments: saved.investments || [], subscriptions: saved.subscriptions || [] };
        }
    } catch (error) {
    }
    financeStorageBlocked = true;
    financeStatus.textContent = "Finance data could not be loaded. Existing data has not been overwritten.";
    return emptyFinance();
}

let finance = loadFinance();

function saveFinance(next) {
    if (financeStorageBlocked) return false;
    try {
        localStorage.setItem(financeStorageKey, JSON.stringify(next));
        finance = next;
        financeStatus.textContent = "";
        return true;
    } catch (error) {
        financeStatus.textContent = "Changes could not be saved in this browser.";
        return false;
    }
}

function sumAmounts(entries, key) {
    return entries.reduce((total, entry) => total + entry[key], 0);
}

function debtSummary(debts) {
    const starting = sumAmounts(debts, "starting");
    const remaining = sumAmounts(debts, "balance");
    const paid = Math.max(0, starting - remaining);
    return { starting, remaining, paid, percent: starting ? Math.min(100, paid / starting * 100) : 0 };
}

function createText(tag, text, className = "") {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
}

function renderDebts() {
    debtList.replaceChildren();
    if (finance.debts.length === 0) {
        debtList.append(createText("li", "No debts added yet.", "empty-state"));
        return;
    }
    finance.debts.forEach(debt => {
        const item = document.createElement("li");
        item.className = "finance-debt";
        const heading = document.createElement("div");
        heading.className = "finance-row-heading";
        const title = document.createElement("div");
        const payoffLabel = debt.payoffAwarded ? " / +100 PLAYER XP EARNED" : "";
        title.append(createText("h3", debt.name), createText("p", `${debt.type} / Starting ${formatMoney(debt.starting)}${payoffLabel}`, "finance-caption"));
        const remove = createText("button", "Remove", "button button-secondary");
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove ${debt.name}`);
        remove.addEventListener("click", () => {
            if (!window.confirm(`Remove ${debt.name} and its payoff history?`)) return;
            if (saveFinance({ ...finance, debts: finance.debts.filter(entry => entry !== debt) })) renderFinance();
        });
        heading.append(title, remove);
        const form = document.createElement("form");
        form.className = "task-form finance-debt-form";
        const field = document.createElement("div");
        field.className = "field field-name";
        const label = createText("label", "CURRENT BALANCE");
        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "decimal";
        input.required = true;
        input.value = moneyInput(debt.balance);
        input.setAttribute("aria-label", `Current balance for ${debt.name}`);
        label.append(input);
        field.append(label);
        const update = createText("button", "UPDATE", "add-button");
        update.type = "submit";
        form.append(field, update);
        form.addEventListener("submit", event => {
            event.preventDefault();
            const balance = parseMoney(input.value);
            if (balance === null) {
                financeStatus.textContent = "Enter a valid non-negative balance with up to two decimal places.";
                return;
            }
            const debts = finance.debts.map(entry => entry === debt ? { ...entry, balance,
                payoffAwarded: Boolean(entry.payoffAwarded || (entry.balance > 0 && balance === 0)) } : entry);
            if (saveFinance({ ...finance, debts })) renderFinance();
        });
        item.append(heading, form);
        debtList.append(item);
    });
}

function renderExpenses() {
    expenseList.replaceChildren();
    expenseTotal.textContent = formatMoney(sumAmounts(finance.expenses, "amount"));
    if (finance.expenses.length === 0) {
        expenseList.append(createText("li", "No expenses recorded yet.", "empty-state"));
        return;
    }
    [...finance.expenses].reverse().forEach(expense => {
        const item = document.createElement("li");
        item.className = "task-item";
        const description = document.createElement("div");
        description.append(createText("span", expense.name, "task-title"), createText("p", expense.date, "finance-caption"));
        const details = document.createElement("div");
        details.className = "finance-expense-details";
        const amount = createText("strong", formatMoney(expense.amount));
        const remove = createText("button", "Remove", "button button-secondary");
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove ${expense.name} expense`);
        remove.addEventListener("click", () => {
            if (!window.confirm(`Remove the ${expense.name} expense?`)) return;
            if (saveFinance({ ...finance, expenses: finance.expenses.filter(entry => entry !== expense) })) renderFinance();
        });
        details.append(amount, remove);
        item.append(description, details);
        expenseList.append(item);
    });
}

function renderSubscriptions() {
    subscriptionList.replaceChildren();
    const annualCents = finance.subscriptions.reduce((total, subscription) => {
        const periods = subscription.frequency === "Weekly" ? 52 : subscription.frequency === "Monthly" ? 12 : 1;
        return total + BigInt(subscription.amount) * BigInt(periods);
    }, 0n);
    const monthlyCents = (annualCents + 6n) / 12n;
    subscriptionTotal.textContent = monthlyCents <= BigInt(Number.MAX_SAFE_INTEGER) ? formatMoney(Number(monthlyCents)) : "--";
    if (finance.subscriptions.length === 0) {
        subscriptionList.append(createText("li", "No subscriptions added yet.", "empty-state"));
        return;
    }
    finance.subscriptions.forEach(subscription => {
        const item = document.createElement("li");
        item.className = "task-item";
        const description = document.createElement("div");
        description.append(createText("span", subscription.name, "task-title"),
            createText("p", `${formatMoney(subscription.amount)} / ${subscription.frequency.toLowerCase()}`, "finance-caption"));
        const remove = createText("button", "Remove", "button button-secondary");
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove ${subscription.name} subscription`);
        remove.addEventListener("click", () => {
            if (!window.confirm(`Remove ${subscription.name} from subscriptions?`)) return;
            if (saveFinance({ ...finance, subscriptions: finance.subscriptions.filter(entry => entry !== subscription) })) renderSubscriptions();
        });
        item.append(description, remove);
        subscriptionList.append(item);
    });
}

function renderInvestments() {
    investmentList.replaceChildren();
    if (finance.investments.length === 0) {
        investmentTotal.textContent = "--";
        investmentList.append(createText("li", "No investments added yet.", "empty-state"));
        return;
    }
    let total = 0n;
    let allPriced = true;
    finance.investments.forEach(holding => {
        const [latest, previous] = holding.prices;
        const value = latest ? investmentValueCents(holding.sharesMicros, latest.priceMicros) : null;
        if (value === null) allPriced = false;
        else total += BigInt(value);
        const item = document.createElement("li");
        item.className = "finance-debt";
        const heading = document.createElement("div");
        heading.className = "finance-row-heading";
        const title = document.createElement("div");
        title.append(createText("h3", holding.symbol), createText("p", `${microsInput(holding.sharesMicros)} shares`, "finance-caption"));
        const remove = createText("button", "Remove", "button button-secondary");
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove ${holding.symbol} investment`);
        remove.addEventListener("click", () => {
            if (!window.confirm(`Remove ${holding.symbol} from investments?`)) return;
            if (saveFinance({ ...finance, investments: finance.investments.filter(entry => entry.symbol !== holding.symbol) })) renderInvestments();
        });
        heading.append(title, remove);
        item.append(heading);
        if (latest) {
            const price = (latest.priceMicros / 1000000).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
            item.append(createText("p", `Weekly close: $${price} / ${latest.date}`, "finance-caption"));
            item.append(createText("p", value === null ? "Estimated value exceeds supported range." : `Estimated value: ${formatMoney(value)}`, "finance-caption"));
            if (previous) {
                const change = (latest.priceMicros - previous.priceMicros) / previous.priceMicros * 100;
                item.append(createText("p", `Price change: ${change >= 0 ? "+" : ""}${change.toFixed(2)}% vs ${previous.date}`, "finance-caption"));
            }
            if (value !== null && holding.costCents !== null) {
                item.append(createText("p", `Estimated gain/loss vs cost: ${formatMoney(value - holding.costCents)}`, "finance-caption"));
            }
        } else {
            item.append(createText("p", "No weekly prices available.", "finance-caption"));
        }
        const form = document.createElement("form");
        form.className = "finance-entry-form finance-debt-form";
        const sharesField = document.createElement("div");
        sharesField.className = "field";
        const sharesLabel = createText("label", "SHARES");
        const sharesInput = document.createElement("input");
        sharesInput.type = "text";
        sharesInput.inputMode = "decimal";
        sharesInput.value = microsInput(holding.sharesMicros);
        sharesInput.required = true;
        sharesInput.setAttribute("aria-label", `Shares of ${holding.symbol}`);
        sharesLabel.append(sharesInput);
        sharesField.append(sharesLabel);
        const costField = document.createElement("div");
        costField.className = "field";
        const costLabel = createText("label", "TOTAL COST (OPTIONAL)");
        const costInput = document.createElement("input");
        costInput.type = "text";
        costInput.inputMode = "decimal";
        costInput.value = holding.costCents === null ? "" : moneyInput(holding.costCents);
        costInput.setAttribute("aria-label", `Total cost for ${holding.symbol}`);
        costLabel.append(costInput);
        costField.append(costLabel);
        const update = createText("button", "UPDATE HOLDING", "add-button");
        update.type = "submit";
        form.append(sharesField, costField, update);
        form.addEventListener("submit", event => {
            event.preventDefault();
            const shares = parseMicros(sharesInput.value);
            const cost = costInput.value.trim() ? parseMoney(costInput.value) : null;
            if (shares === null || shares <= 0 || (costInput.value.trim() && cost === null)) {
                investmentStatus.textContent = "Enter positive shares (up to six decimals) and a valid optional cost.";
                return;
            }
            const investments = finance.investments.map(entry => entry.symbol === holding.symbol
                ? { ...entry, sharesMicros: shares, costCents: cost } : entry);
            if (saveFinance({ ...finance, investments })) {
                investmentStatus.textContent = `${holding.symbol} updated.`;
                renderInvestments();
            }
        });
        item.append(form);
        investmentList.append(item);
    });
    investmentTotal.textContent = allPriced && total <= BigInt(Number.MAX_SAFE_INTEGER) ? formatMoney(Number(total)) : "--";
}

async function refreshInvestments(force = false) {
    if (!marketKey || marketRefreshing || financeStorageBlocked) return;
    const week = localWeek();
    const holdings = finance.investments.filter(holding => force ||
        (holding.checkedWeek !== week && marketAttempts.get(holding.symbol) !== week));
    if (holdings.length === 0) {
        if (force) investmentStatus.textContent = "Add an investment to refresh prices.";
        return;
    }
    marketRefreshing = true;
    marketRefresh.disabled = true;
    investmentStatus.textContent = "Updating weekly prices...";
    let updated = 0;
    const key = marketKey;
    for (const holding of holdings) {
        marketAttempts.set(holding.symbol, week);
        try {
            const url = new URL("https://www.alphavantage.co/query");
            url.searchParams.set("function", "TIME_SERIES_WEEKLY");
            url.searchParams.set("symbol", holding.symbol);
            url.searchParams.set("apikey", key);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            let prices;
            try {
                const response = await fetch(url, { cache: "no-store", referrerPolicy: "no-referrer", signal: controller.signal });
                if (!response.ok) throw new Error("Market request failed.");
                prices = parseWeeklyPrices(await response.json(), holding.symbol);
            } finally {
                clearTimeout(timeout);
            }
            const current = finance.investments.find(entry => entry.symbol === holding.symbol);
            if (!current) continue;
            if (current.prices.length && prices[0].date < current.prices[0].date) throw new Error("Older prices returned.");
            const investments = finance.investments.map(entry => entry.symbol === holding.symbol
                ? { ...entry, prices, checkedWeek: week } : entry);
            if (!saveFinance({ ...finance, investments })) throw new Error("Storage failed.");
            marketErrors.delete(holding.symbol);
            updated += 1;
        } catch (error) {
            marketErrors.add(holding.symbol);
        }
    }
    marketRefreshing = false;
    marketRefresh.disabled = false;
    const failed = finance.investments.filter(holding => marketErrors.has(holding.symbol)).map(holding => holding.symbol);
    investmentStatus.textContent = failed.length
        ? `Updated ${updated}. Could not update: ${failed.join(", ")}. Check the key, tickers, network, or provider limits.`
        : `Updated ${updated} investment${updated === 1 ? "" : "s"}.`;
    renderInvestments();
    const currentWeek = localWeek();
    if (finance.investments.some(holding => holding.checkedWeek !== currentWeek && marketAttempts.get(holding.symbol) !== currentWeek)) {
        refreshInvestments();
    }
}

function renderFinance() {
    const summary = debtSummary(finance.debts);
    const balances = finance.balances;
    checkingTotal.textContent = balances.initialized ? formatMoney(balances.checking) : "--";
    savingsTotal.textContent = balances.initialized ? formatMoney(balances.savings) : "--";
    cashTotal.textContent = balances.initialized ? formatMoney(balances.checking + balances.savings) : "--";
    netPosition.textContent = balances.initialized ? formatMoney(balances.checking + balances.savings - summary.remaining) : "--";
    debtTotal.textContent = formatMoney(summary.remaining);
    creditTotal.textContent = formatMoney(sumAmounts(finance.debts.filter(debt => debt.type === "Credit card"), "balance"));
    studentTotal.textContent = formatMoney(sumAmounts(finance.debts.filter(debt => debt.type === "Student loan"), "balance"));
    payoffProgress.value = summary.percent;
    payoffLabel.textContent = summary.starting
        ? `${formatMoney(summary.paid)} of ${formatMoney(summary.starting)} paid / ${Math.floor(summary.percent)}%`
        : "Add a debt to begin tracking payoff.";
    renderDebts();
    renderExpenses();
    renderSubscriptions();
    renderInvestments();
}

balanceForm.addEventListener("submit", event => {
    event.preventDefault();
    const checking = parseMoney(checkingInput.value, true);
    const savings = parseMoney(savingsInput.value);
    if (checking === null || savings === null) {
        financeStatus.textContent = "Enter valid balances with up to two decimal places; savings cannot be negative.";
        return;
    }
    const previous = finance.balances;
    const increased = previous.initialized && (checking > previous.checking || savings > previous.savings);
    if (!saveFinance({ ...finance, balances: { checking, savings, initialized: true } })) return;
    checkingInput.value = moneyInput(checking);
    savingsInput.value = moneyInput(savings);
    if (increased) {
        const accounts = [checking > previous.checking ? "Checking" : "", savings > previous.savings ? "Savings" : ""].filter(Boolean);
        moneyMessage.textContent = `${accounts.join(" and ")} increased!`;
        moneyBanner.hidden = false;
    }
    renderFinance();
});

debtForm.addEventListener("submit", event => {
    event.preventDefault();
    const name = debtName.value.trim();
    const type = debtType.value;
    const starting = parseMoney(debtAmount.value);
    if (!name || !["Credit card", "Student loan"].includes(type) || starting === null || starting <= 0) {
        financeStatus.textContent = "Enter a debt name and a starting balance greater than zero.";
        return;
    }
    const debt = { name, type, starting, balance: starting };
    if (!saveFinance({ ...finance, debts: [...finance.debts, debt] })) return;
    debtName.value = "";
    debtAmount.value = "";
    renderFinance();
    debtName.focus();
});

expenseForm.addEventListener("submit", event => {
    event.preventDefault();
    const name = expenseName.value.trim();
    const amount = parseMoney(expenseAmount.value);
    const date = expenseDate.value;
    if (!name || amount === null || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        financeStatus.textContent = "Enter an expense, a date, and an amount greater than zero.";
        return;
    }
    if (!saveFinance({ ...finance, expenses: [...finance.expenses, { name, amount, date }] })) return;
    expenseName.value = "";
    expenseAmount.value = "";
    renderFinance();
    expenseName.focus();
});

investmentForm.addEventListener("submit", event => {
    event.preventDefault();
    const symbol = investmentSymbol.value.trim().toUpperCase();
    const shares = parseMicros(investmentShares.value);
    const cost = investmentCost.value.trim() ? parseMoney(investmentCost.value) : null;
    if (!/^[A-Z]{1,5}(?:[.-][A-Z]{1,2})?$/.test(symbol) || shares === null || shares <= 0 ||
        (investmentCost.value.trim() && cost === null)) {
        investmentStatus.textContent = "Enter a US ticker, positive shares (up to six decimals), and a valid optional cost.";
        return;
    }
    if (finance.investments.some(entry => entry.symbol === symbol)) {
        investmentStatus.textContent = `${symbol} is already listed. Update its shares below.`;
        return;
    }
    const holding = { symbol, sharesMicros: shares, costCents: cost, prices: [], checkedWeek: "" };
    if (!saveFinance({ ...finance, investments: [...finance.investments, holding] })) return;
    investmentSymbol.value = "";
    investmentShares.value = "";
    investmentCost.value = "";
    investmentStatus.textContent = `${symbol} added.`;
    renderInvestments();
    investmentSymbol.focus();
    if (marketKey) refreshInvestments();
});

subscriptionForm.addEventListener("submit", event => {
    event.preventDefault();
    const name = subscriptionName.value.trim();
    const amount = parseMoney(subscriptionAmount.value);
    const frequency = subscriptionFrequency.value;
    if (!name || amount === null || amount <= 0 || !["Weekly", "Monthly", "Yearly"].includes(frequency)) {
        financeStatus.textContent = "Enter a subscription name, a valid frequency, and an amount greater than zero.";
        return;
    }
    if (!saveFinance({ ...finance, subscriptions: [...finance.subscriptions, { name, amount, frequency }] })) return;
    subscriptionName.value = "";
    subscriptionAmount.value = "";
    renderSubscriptions();
    subscriptionName.focus();
});

marketForm.addEventListener("submit", event => {
    event.preventDefault();
    const key = marketKeyInput.value.trim() || marketKey;
    if (!key) {
        investmentStatus.textContent = "Enter an Alpha Vantage API key to refresh prices.";
        return;
    }
    marketKey = key;
    marketKeyInput.value = "";
    refreshInvestments(true);
});

moneyDismiss.addEventListener("click", () => {
    moneyBanner.hidden = true;
});

if (finance.balances.initialized) {
    checkingInput.value = moneyInput(finance.balances.checking);
    savingsInput.value = moneyInput(finance.balances.savings);
}
expenseDate.value = localDate();
renderFinance();
setInterval(() => refreshInvestments(), 15 * 60 * 1000);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshInvestments();
});
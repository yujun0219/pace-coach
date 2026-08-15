const STORAGE_KEY = "paceCoach.v1";

const baseline = {
  "수학|문제": 3.8,
  "영어|단어": 0.45,
  "영어|페이지": 4.5,
  "국어|지문": 18,
  "국어|페이지": 5.5,
  "과학|페이지": 4,
  "과학|문제": 2.8,
  "사회|페이지": 3.8,
  "한국사|페이지": 3.2,
  default: 4
};

const state = loadState();
let isCalculating = false;
let timerInterval = null;

const $ = (selector) => document.querySelector(selector);
const formatMinutes = (minutes) => {
  const rounded = Math.max(0, Math.round(minutes || 0));
  if (rounded < 60) return `${rounded}분`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
};
const formatTimer = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const rest = safeSeconds % 60;
  if (hours) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return {
    availableMinutes: 360,
    tasks: [],
    records: [
      {
        id: crypto.randomUUID(),
        date: new Date(Date.now() - 86400000 * 3).toISOString(),
        subject: "수학",
        unit: "문제",
        amount: 25,
        actualMinutes: 105
      },
      {
        id: crypto.randomUUID(),
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        subject: "국어",
        unit: "지문",
        amount: 3,
        actualMinutes: 58
      }
    ]
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getElapsedSeconds(task) {
  const stored = Number(task.elapsedSeconds || 0);
  if (!task.timerStartedAt) return stored;
  return stored + Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000);
}

function pauseTaskTimer(task) {
  if (!task.timerStartedAt) return;
  task.elapsedSeconds = getElapsedSeconds(task);
  task.timerStartedAt = null;
}

function pauseOtherTimers(activeId) {
  state.tasks.forEach((task) => {
    if (task.id !== activeId) pauseTaskTimer(task);
  });
}

function speedKey(subject, unit) {
  return `${subject}|${unit}`;
}

function getSpeed(subject, unit) {
  const matching = state.records.filter((record) => record.subject === subject && record.unit === unit && record.amount > 0);
  if (!matching.length) return baseline[speedKey(subject, unit)] || baseline.default;
  const recent = matching.slice(-8);
  const totalAmount = recent.reduce((sum, record) => sum + Number(record.amount), 0);
  const totalMinutes = recent.reduce((sum, record) => sum + Number(record.actualMinutes), 0);
  return totalAmount ? totalMinutes / totalAmount : baseline.default;
}

function estimateTask(task) {
  return Number(task.amount) * getSpeed(task.subject, task.unit) * Number(task.difficulty);
}

function getTotals() {
  const activeTasks = state.tasks.filter((task) => !task.done);
  const estimate = activeTasks.reduce((sum, task) => sum + estimateTask(task), 0);
  const score = estimate ? Math.round((state.availableMinutes / estimate) * 100) : 0;
  return { activeTasks, estimate, score };
}

function getCoach(score, estimate) {
  if (!estimate) return ["계획 대기", "오늘 할 일을 넣으면 공부량이 현실적인지 바로 계산할게요.", "오늘은 먼저 과목 하나만 넣고 시작해도 좋아요."];
  if (score >= 105) return ["가능", "오늘 계획은 꽤 안정적이에요. 남는 시간은 오답 정리나 휴식으로 남겨둬도 좋아요.", "그대로 가기"];
  if (score >= 85) return ["빡빡함", "가능은 하지만 여유가 많지는 않아요. 어려운 과목을 먼저 처리하는 편이 좋아요.", "어려운 과목 먼저"];
  if (score >= 65) return ["무리", "지금 계획은 실제 기록 기준으로 조금 넘쳐요. 한 항목의 분량을 줄이면 훨씬 편해져요.", "분량 줄이기"];
  return ["다시 짜기", "오늘 가능한 시간보다 계획량이 많이 커요. 핵심 과목 1~2개만 남기는 게 좋아요.", "핵심만 남기기"];
}

function renderToday() {
  $("#availableMinutes").value = state.availableMinutes;
  const { activeTasks, estimate, score } = getTotals();
  const capped = Math.min(score || 0, 130);
  const displayScore = Math.min(score || 0, 100);
  const [status, line] = getCoach(score, estimate);
  const activeTimerTask = state.tasks.find((task) => task.timerStartedAt);
  const activeTimerText = activeTimerTask
    ? `지금 ${activeTimerTask.subject} 타이머가 ${formatTimer(getElapsedSeconds(activeTimerTask))}째 가고 있어요.`
    : line;

  $(".hero-panel").classList.toggle("calculating", isCalculating);
  $("#statusPill").textContent = isCalculating ? "계산 중" : status;
  $("#coachLine").textContent = isCalculating ? "최근 기록과 난이도를 맞춰보는 중이에요." : activeTimerText;
  $("#scoreValue").textContent = isCalculating ? "..." : estimate ? `${displayScore}%` : "--";
  $("#progressFill").style.width = `${Math.min(capped, 100)}%`;
  $("#availableStat").textContent = formatMinutes(state.availableMinutes);
  $("#estimateStat").textContent = formatMinutes(estimate);
  $("#taskCountStat").textContent = `${activeTasks.length}개`;
  $("#taskSummary").textContent = activeTasks.length
    ? `남은 예상 시간은 ${formatMinutes(estimate)}예요.`
    : "아직 계획이 비어 있어요.";

  const list = $("#taskList");
  list.innerHTML = "";
  if (!state.tasks.length) {
    list.innerHTML = `<div class="empty-state">오늘 공부할 항목을 추가해 보세요.</div>`;
    return;
  }

  state.tasks.forEach((task) => {
    const card = document.createElement("article");
    const elapsed = getElapsedSeconds(task);
    const isRunning = Boolean(task.timerStartedAt);
    card.className = `task-card${task.done ? " done" : ""}${isRunning ? " running" : ""}`;
    card.innerHTML = `
      <div>
        <div class="task-title">${task.subject} ${task.amount}${task.unit}</div>
        <div class="task-meta">${task.memo || "메모 없음"} · 난이도 ${difficultyName(task.difficulty)}</div>
        <div class="timer-line">
          <span class="timer-dot" aria-hidden="true"></span>
          <strong>${formatTimer(elapsed)}</strong>
          <span>${isRunning ? "진행 중" : elapsed ? "누적 시간" : "시작 전"}</span>
        </div>
      </div>
      <div class="estimate-badge">${formatMinutes(estimateTask(task))}</div>
      <div class="task-actions">
        <button class="start-button" data-action="timer" data-id="${task.id}" type="button">${isRunning ? "정지" : "시작"}</button>
        <button class="done-button" data-action="toggle" data-id="${task.id}" type="button">${task.done ? "되돌리기" : "완료"}</button>
        <button class="delete-button" data-action="delete" data-id="${task.id}" type="button">삭제</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function difficultyName(value) {
  const number = Number(value);
  if (number < 0.9) return "쉬움";
  if (number < 1.1) return "보통";
  if (number < 1.35) return "어려움";
  return "매우 어려움";
}

function renderRecordOptions() {
  const select = $("#recordTaskSelect");
  const previousValue = select.value;
  select.innerHTML = "";
  const candidates = state.tasks.filter((task) => !task.recorded);
  if (!candidates.length) {
    select.innerHTML = `<option value="">기록할 계획이 없어요</option>`;
    return;
  }
  candidates.forEach((task) => {
    const option = document.createElement("option");
    option.value = task.id;
    const elapsed = getElapsedSeconds(task);
    const elapsedText = elapsed ? ` · 타이머 ${formatTimer(elapsed)}` : "";
    option.textContent = `${task.subject} ${task.amount}${task.unit} · 예상 ${formatMinutes(estimateTask(task))}${elapsedText}`;
    select.appendChild(option);
  });
  if (candidates.some((task) => task.id === previousValue)) select.value = previousValue;
  syncActualInputWithTimer();
}

function renderRecords() {
  const list = $("#recordList");
  list.innerHTML = "";
  if (!state.records.length) {
    list.innerHTML = `<div class="empty-state">아직 실제 기록이 없어요.</div>`;
    return;
  }

  state.records.slice().reverse().slice(0, 12).forEach((record) => {
    const perUnit = record.actualMinutes / record.amount;
    const card = document.createElement("article");
    card.className = "record-card";
    card.innerHTML = `
      <div>
        <div class="record-title">${record.subject} ${record.amount}${record.unit}</div>
        <div class="record-meta">${new Date(record.date).toLocaleDateString("ko-KR")} · ${record.unit}당 ${perUnit.toFixed(1)}분</div>
      </div>
      <div class="estimate-badge">${formatMinutes(record.actualMinutes)}</div>
    `;
    list.appendChild(card);
  });
}

function renderInsights() {
  const grid = $("#insightGrid");
  const combos = Array.from(new Set([...Object.keys(baseline).filter((key) => key !== "default"), ...state.records.map((r) => speedKey(r.subject, r.unit))]));
  grid.innerHTML = "";
  combos.slice(0, 10).forEach((key) => {
    const [subject, unit] = key.split("|");
    const records = state.records.filter((record) => speedKey(record.subject, record.unit) === key).length;
    const card = document.createElement("article");
    card.className = "insight-card";
    card.innerHTML = `
      <span class="baseline-meta">${subject} · ${unit}</span>
      <strong>${getSpeed(subject, unit).toFixed(1)}분</strong>
      <span class="baseline-meta">${unit}당 평균 · 기록 ${records}개</span>
    `;
    grid.appendChild(card);
  });

  const { estimate, score } = getTotals();
  const [, line, action] = getCoach(score, estimate);
  $("#coachNotes").innerHTML = `
    <div class="note-card">${line}</div>
    <div class="note-card">추천 행동: ${action}</div>
    <div class="note-card">예측은 최근 같은 과목과 단위의 실제 기록을 우선 사용하고, 기록이 없으면 기본 속도를 써요.</div>
  `;
}

function renderBaselines() {
  const list = $("#baselineList");
  list.innerHTML = "";
  Object.entries(baseline).filter(([key]) => key !== "default").forEach(([key, minutes]) => {
    const [subject, unit] = key.split("|");
    const card = document.createElement("article");
    card.className = "baseline-card";
    card.innerHTML = `
      <div>
        <div class="baseline-title">${subject} · ${unit}</div>
        <div class="baseline-meta">기록이 쌓이면 자동으로 개인 평균이 우선돼요.</div>
      </div>
      <div class="estimate-badge">${minutes}분/${unit}</div>
    `;
    list.appendChild(card);
  });
}

function renderAll() {
  renderToday();
  renderRecordOptions();
  renderRecords();
  renderInsights();
  renderBaselines();
}

function triggerCalculation() {
  isCalculating = true;
  renderAll();
  window.setTimeout(() => {
    isCalculating = false;
    renderAll();
  }, 1300);
}

function syncActualInputWithTimer() {
  const task = state.tasks.find((item) => item.id === $("#recordTaskSelect").value);
  if (!task) return;
  const elapsedMinutes = Math.ceil(getElapsedSeconds(task) / 60);
  if (elapsedMinutes && !$("#actualMinutesInput").value) {
    $("#actualMinutesInput").value = elapsedMinutes;
  }
}

function ensureTimerLoop() {
  if (timerInterval) return;
  timerInterval = window.setInterval(() => {
    if (state.tasks.some((task) => task.timerStartedAt)) {
      renderToday();
      renderRecordOptions();
    }
  }, 1000);
}

$("#taskForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number($("#amountInput").value);
  if (!amount) return;
  state.tasks.push({
    id: crypto.randomUUID(),
    subject: $("#subjectInput").value,
    unit: $("#unitInput").value,
    amount,
    difficulty: Number($("#difficultyInput").value),
    memo: $("#memoInput").value.trim(),
    done: false,
    recorded: false,
    elapsedSeconds: 0,
    timerStartedAt: null,
    createdAt: new Date().toISOString()
  });
  $("#memoInput").value = "";
  saveState();
  triggerCalculation();
});

$("#availableMinutes").addEventListener("input", (event) => {
  state.availableMinutes = Math.max(0, Number(event.target.value) || 0);
  saveState();
  renderAll();
});

document.querySelectorAll("[data-time-step]").forEach((button) => {
  button.addEventListener("click", () => {
    state.availableMinutes = Math.max(0, state.availableMinutes + Number(button.dataset.timeStep));
    saveState();
    renderAll();
  });
});

$("#taskList").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const task = state.tasks.find((item) => item.id === button.dataset.id);
  if (!task) return;
  if (button.dataset.action === "timer") {
    if (task.timerStartedAt) {
      pauseTaskTimer(task);
    } else {
      pauseOtherTimers(task.id);
      task.done = false;
      task.timerStartedAt = new Date().toISOString();
    }
  }
  if (button.dataset.action === "toggle") {
    pauseTaskTimer(task);
    task.done = !task.done;
  }
  if (button.dataset.action === "delete") {
    pauseTaskTimer(task);
    state.tasks = state.tasks.filter((item) => item.id !== task.id);
  }
  saveState();
  renderAll();
});

$("#clearDoneButton").addEventListener("click", () => {
  state.tasks = state.tasks.filter((task) => !task.done);
  saveState();
  renderAll();
});

$("#recordForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const task = state.tasks.find((item) => item.id === $("#recordTaskSelect").value);
  const actualMinutes = Number($("#actualMinutesInput").value);
  if (!task || !actualMinutes) return;
  pauseTaskTimer(task);
  task.done = true;
  task.recorded = true;
  state.records.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    subject: task.subject,
    unit: task.unit,
    amount: task.amount,
    actualMinutes
  });
  $("#actualMinutesInput").value = "";
  saveState();
  renderAll();
});

$("#recordTaskSelect").addEventListener("change", () => {
  $("#actualMinutesInput").value = "";
  syncActualInputWithTimer();
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    tab.classList.add("active");
    $(`#${tab.dataset.view}`).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

let installPrompt;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
});

$("#installButton").addEventListener("click", async () => {
  if (installPrompt) {
    installPrompt.prompt();
    installPrompt = null;
    return;
  }
  alert("아이폰/아이패드에서는 Safari 공유 버튼을 누른 뒤 '홈 화면에 추가'를 선택하면 돼요.");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

renderAll();
ensureTimerLoop();

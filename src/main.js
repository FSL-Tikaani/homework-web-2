import "./style.css";
import { getCharacters } from "./api.js";

const $ = (id) => document.getElementById(id);

const els = {
  form: $("filters"),
  search: $("search"),
  status: $("status"),
  submitBtn: $("submit-btn"),
  refreshBtn: $("refresh-btn"),
  errorTestBtn: $("error-test-btn"),
  summary: $("summary"),
  loading: $("loading"),
  error: $("error"),
  errorText: $("error-text"),
  retryBtn: $("retry-btn"),
  empty: $("empty"),
  cards: $("cards"),
  pager: $("pager"),
  prevBtn: $("prev-btn"),
  nextBtn: $("next-btn"),
  pageInfo: $("page-info"),
};

const STATUS_LABELS = { Alive: "Живой", Dead: "Мёртвый", unknown: "Неизвестно" };

// Текущие параметры запроса. Из них же собирается повторный запрос.
const state = { name: "", status: "", page: 1, pages: 0, simulateError: false };

let controller = null; // контроллер последнего запроса

/** Показывает ровно одно состояние: loading | error | empty | list */
function show(view) {
  els.loading.hidden = view !== "loading";
  els.error.hidden = view !== "error";
  els.empty.hidden = view !== "empty";
  els.cards.hidden = view !== "list";
  els.pager.hidden = view !== "list" || state.pages <= 1;
}

function setBusy(busy) {
  for (const el of [els.submitBtn, els.refreshBtn, els.errorTestBtn, els.retryBtn, els.prevBtn, els.nextBtn]) {
    el.disabled = busy;
  }
}

function renderCards(characters) {
  els.cards.replaceChildren(
    ...characters.map((c) => {
      const li = document.createElement("li");
      li.className = "card";

      const img = document.createElement("img");
      img.src = c.image;
      img.alt = c.name;
      img.loading = "lazy";
      img.width = 300;
      img.height = 300;

      const body = document.createElement("div");
      body.className = "card-body";

      const title = document.createElement("h2");
      title.textContent = c.name;

      const badge = document.createElement("span");
      badge.className = "badge badge-" + String(c.status).toLowerCase();
      badge.textContent = STATUS_LABELS[c.status] ?? c.status;

      const meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = [c.species, c.gender].filter(Boolean).join(" · ");

      const place = document.createElement("p");
      place.className = "meta";
      place.textContent = "Локация: " + (c.location?.name ?? "—");

      body.append(title, badge, meta, place);
      li.append(img, body);
      return li;
    }),
  );
}

/** Загружает данные. simulateError: true — один раз запросить неверный адрес. */
async function load({ simulateError = false } = {}) {
  state.simulateError = simulateError;
  // Отменяем предыдущий запрос: ответ на устаревший поиск не должен перезаписать свежий.
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  show("loading");
  els.summary.textContent = "";
  setBusy(true);

  try {
    const data = await getCharacters(state, signal);
    state.pages = data.pages;

    if (data.results.length === 0) {
      show("empty");
      return;
    }

    renderCards(data.results);
    els.summary.textContent = `Найдено: ${data.count}`;
    els.pageInfo.textContent = `Страница ${state.page} из ${data.pages}`;
    els.prevBtn.hidden = state.page <= 1;
    els.nextBtn.hidden = state.page >= data.pages;
    show("list");
  } catch (error) {
    if (error.name === "AbortError") return; // запрос отменили мы сами, это не ошибка
    console.error(error);
    if (error instanceof TypeError) {
      // fetch отклонился: нет сети, CORS или недоступен сервер
      els.errorText.textContent =
        "Не удалось подключиться к серверу. Проверьте интернет и попробуйте ещё раз.";
    } else if (error instanceof SyntaxError) {
      // response.json() не смог разобрать тело ответа
      els.errorText.textContent = "Сервер прислал некорректные данные. Попробуйте ещё раз.";
    } else {
      els.errorText.textContent = `Сервер вернул ошибку (${error.message}). Попробуйте ещё раз.`;
    }
    show("error");
  } finally {
    // Если запрос отменён новым, кнопки разблокирует уже новый запрос.
    if (!signal.aborted) setBusy(false);
  }
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  state.name = els.search.value.trim();
  state.status = els.status.value;
  state.page = 1;
  load();
});

els.status.addEventListener("change", () => els.form.requestSubmit());

els.refreshBtn.addEventListener("click", () => load());
els.retryBtn.addEventListener("click", () => load()); // повтор уже без имитации ошибки
els.errorTestBtn.addEventListener("click", () => load({ simulateError: true }));

els.prevBtn.addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    load();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

els.nextBtn.addEventListener("click", () => {
  if (state.page < state.pages) {
    state.page += 1;
    load();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

load();

const BASE_URL = "https://rickandmortyapi.com/api/character";
// Несуществующий адрес для кнопки «Тест ошибки»: сервер ответит HTTP 404.
const BROKEN_URL = "https://rickandmortyapi.com/api/does-not-exist";

/**
 * Загружает одну страницу персонажей.
 *
 * Три этапа, на которых может случиться ошибка (слайд «На каком этапе произошла ошибка»):
 *  1. запрос: сеть, CORS или отмена — fetch отклоняется сам;
 *  2. HTTP-ответ: статус не 2xx — fetch НЕ отклоняется, поэтому проверяем response.ok;
 *  3. тело: невалидный JSON — отклоняется response.json().
 *
 * @param {{ name?: string, status?: string, page?: number, simulateError?: boolean }} params
 * @param {AbortSignal} [signal] нужен, чтобы отменять устаревшие запросы
 * @returns {Promise<{ results: object[], pages: number, count: number }>}
 */
export async function getCharacters(
  { name = "", status = "", page = 1, simulateError = false } = {},
  signal,
) {
  if (simulateError) {
    // Настоящий запрос на неверный адрес: fetch не отклонится,
    // ошибку поймает проверка response.ok.
    const response = await fetch(BROKEN_URL, { signal });
    if (!response.ok) throw new Error("HTTP " + response.status);
  }

  const url = new URL(BASE_URL);
  if (name) url.searchParams.set("name", name);
  if (status) url.searchParams.set("status", status);
  url.searchParams.set("page", String(page));

  const response = await fetch(url, { signal });

  // Это API на пустой поиск отвечает 404 {"error": "There is nothing here"}.
  // Для нас это не ошибка, а «Ничего не найдено».
  if (response.status === 404) {
    return { results: [], pages: 0, count: 0 };
  }

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  const data = await response.json();
  return {
    results: data.results,
    pages: data.info.pages,
    count: data.info.count,
  };
}

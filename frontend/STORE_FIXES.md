# STORE_FIXES — план исправлений MobX-сторов

Источник правды для исполнителя. Выполнять фазы по порядку, каждая фаза = отдельный коммит.
После каждой фазы: `npx tsc --noEmit` и `npm run build` должны проходить чисто.

## Контекст

Сторы живут в `frontend/shared/store/<name>Store/`:
- `<name>Store.ts` — фасад-класс с публичными неймспейсами `sync` / `async` и методами-шорткатами;
- `models/<name>State.ts` — observable-состояние (`makeAutoObservable`);
- `models/<name>Sync.ts` — синхронные мутации (всегда через `runInAction`);
- `models/<name>Async.ts` — API-операции, после успеха зовут sync-слой.

Архитектуру НЕ менять. Этот документ — точечные фиксы.

### Жёсткие ограничения

1. `shared/lib/axios/index.ts` зовёт `getRootStore()` вне React (интерцепторы) —
   функция `getRootStore()` должна остаться экспортированной с той же сигнатурой.
   React Context / Provider-паттерн НЕ вводить.
2. Call-sites в компонентах (`features/`, `app/`, `widgets/`) не трогать —
   они используют хуки из `StoreProvider.ts` и методы-шорткаты (`store.fetch()` и т.п.).
3. Неймспейсы `sync` / `async` в фасадах не переименовывать и не удалять
   (кроме одного метода в Фазе 3b).
4. `billingStore` не трогать.
5. Коммиты строго в стиле репо: `fix | <описание>` / `upd | ...` / `add | ...`,
   нижний регистр, без Co-Authored-By и любой атрибуции Claude (см. CLAUDE.md).

---

## Фаза 1 — SSR-утечка состояния (критично)

**Файл:** `shared/store/RootStore.ts`

**Проблема:** модульный синглтон `const rootStore = new RootStore()` создаётся при
импорте модуля. На сервере Next один процесс обслуживает все запросы — один инстанс
стора разделяется между запросами разных пользователей (утечка стейта). Плюс
конструктор `UserStore` выполняется в момент импорта модуля на сервере.

**Фикс:** заменить хвост файла (после объявления класса) на:

```ts
let clientStore: RootStore | null = null;

export function getRootStore(): RootStore {
  if (typeof window === "undefined") {
    // On the server, a fresh instance per call so state never leaks between requests.
    return new RootStore();
  }
  if (!clientStore) {
    clientStore = new RootStore();
  }
  return clientStore;
}
```

**Почему свежий инстанс на каждый вызов на сервере — ок:** серверные сторы всегда
пустые (данные грузятся в `useEffect`, на сервере он не выполняется;
`hydrateFromStorage` имеет guard `typeof window === "undefined"`). Рендер
детерминирован, расхождений гидрации нет.

**Внимание:** это возврат к поведению до коммита `83e5dde`. Фикс «double /me»
(коммит `22d67a4`) живёт в дедупликации `fetchMe` и от этой правки не зависит —
но см. Фазу 3a: дедупликацию надо перенести с уровня модуля на инстанс,
иначе на сервере она станет межзапросной.

**Коммит:** `fix | ssr-safe root store singleton`

---## Фаза 2 — тихое проглатывание ошибок fetch

**Файлы:** `communitiesStore/models/communitiesAsync.ts`, `competitorsStore/models/competitorsAsync.ts`

**Проблема:** в `fetch` обоих сторов ветка `catch` делает `setList(store, [])` —
это ставит `loaded: true`. Юзер видит пустой список без какой-либо ошибки, а
повторный `fetch()` без `force` не перезапросит (думает, что данные загружены).

**Фикс:** привести к паттерну reports/schedules. В `communitiesAsync.fetch`:

```ts
      } catch {
        store.root.uiStore.setError("Failed to load communities");
      } finally {
```

В `competitorsAsync.fetch` аналогично с текстом `"Failed to load competitors"`.
`loaded` остаётся `false` → следующий вызов `fetch()` повторит запрос.
Блоки `try` / `finally` и логику inflight не менять. Ветки `catch` в `add` /
`remove` не трогать — они возвращают результат вызывающему осознанно.

**Коммит:** `fix | surface fetch errors in communities and competitors stores`

---

## Фаза 3 — userStore

### 3a. Дедупликация fetchMe — с модуля на инстанс

**Файлы:** `userStore/models/userAsync.ts`, `userStore/userStore.ts`

**Проблема:** `let fetchMeInFlight` — переменная уровня модуля
(`userAsync.ts:8`). Общая для всех инстансов UserStore; после Фазы 1 на сервере
это межзапросное состояние. Остальные сторы держат `inflight` полем класса.

**Фикс:**
1. В классе `UserStore` добавить поле `meInflight: Promise<void> | null = null;`
   (рядом со `state`).
2. В `userAsync.ts` удалить модульную переменную `fetchMeInFlight`, в `fetchMe`
   использовать `store.meInflight` (присваивание, проверка, сброс в `finally`) —
   зеркально тому, как `schedulesAsync.fetch` работает со `store.inflight`.

### 3b. Закрыть частичный logout

**Файл:** `userStore/userStore.ts`

**Проблема:** публичный `userStore.sync.logout()` чистит только user-стейт, но не
зовёт `root.reset()` — данные остальных сторов (отчёты, расписания и т.д.)
остаются в памяти после «выхода». Кривой путь не должен быть публичным.

**Фикс:** удалить ключ `logout` из объекта `sync` в фасаде `UserStore`. Метод
фасада `logout()` оставить, но он должен звать модель напрямую:

```ts
  logout(): void {
    userSync.logout(this);
    this.root.reset();
  }
```

`userSync.logout` в модели не трогать — его использует `userAsync` внутри
(login-fail, fetchMe-fail, deleteAccount) и там полный reset не нужен/делается выше.

**Коммит (3a+3b вместе):** `fix | user store inflight dedupe and logout encapsulation`

---

## Фаза 4 — MobX enforceActions

**Файл:** `shared/store/RootStore.ts` (верх файла)

**Проблема:** observable-стейт публичен, мутации вне actions ничем не запрещены —
компонент может написать `store.state.list = []` в обход слоёв.

**Фикс:** в начале `RootStore.ts` (до импортов сторов):

```ts
import { configure } from "mobx";

configure({ enforceActions: "always" });
```

Все существующие мутации уже идут через `runInAction` — должно пройти без правок.
Поля фасадов (`inflight`, `meInflight`) не observable, на них enforceActions
не распространяется.

**Проверка обязательна:** `npm run dev`, в браузере пройти: логин → дашборд →
создать/удалить отчёт → создать/переключить расписание → переключить тему →
страница конкурентов → logout. В консоли не должно быть ошибок вида
`"...is not allowed outside actions"` / `[MobX]`. Если ошибка появилась — обернуть
конкретную мутацию в `runInAction` в соответствующем sync/async файле,
НЕ ослаблять configure.

**Коммит:** `upd | enable mobx enforceactions`

---

## Фаза 5 (опционально, по команде юзера) — unit-тесты сторов

Тест-инфры нет (`"test": "npm run build"`). Если юзер скажет делать:

1. `npm i -D vitest` (jsdom не нужен — стора работают в node, window-зависимости
   за guard'ами).
2. Скрипт `"test:unit": "vitest run"` в package.json (скрипт `test` не менять).
3. `shared/store/__tests__/schedulesStore.test.ts`:
   - `fetch` дедуплицирует параллельные вызовы (мок `schedulesService.getSchedules`
     через `vi.mock`, счётчик вызовов = 1);
   - `fetch` после `loaded` без `force` не перезапрашивает;
   - `create` при 403 + `{ upgrade: true }` возвращает `{ upgrade: true }`;
   - `sync.setList` / `sync.removeById` / `reset` мутируют state корректно.
4. `shared/store/__tests__/communitiesStore.test.ts`:
   - `fetch` при ошибке API: `loaded === false`, `uiStore.state.error` установлен,
     повторный `fetch()` делает новый запрос.

**Коммит:** `add | unit tests for stores`

---

## Финальная проверка (после всех фаз)

```bash
npx tsc --noEmit        # чисто
npm run build           # собирается
```

Плюс ручной прогон из Фазы 4. В диффе не должно быть изменений в `features/`,
`app/`, `widgets/`, `entities/` — только `shared/store/` и (Фаза 5) package.json.

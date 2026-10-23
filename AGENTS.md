# Praca nad Facebook Unhook

## Projekt i struktura

Rozszerzenie Manifest V3 dla komputerowej wersji Facebooka w Microsoft Edge. Czysty JavaScript i CSS, bez bundlera i zależności produkcyjnych. Katalog `extension/` jest kompletnym rozszerzeniem do załadowania w przeglądarce.

- `extension/core.js`: ustawienia domyślne, rozpoznawanie tras, źródeł postów i grup.
- `extension/content.js` i `content.css`: integracja ze stroną, filtrowanie dynamicznego DOM i synchronizacja listy.
- `extension/joined-data.js`: czytnik danych członkostw w kontekście MAIN strony „Twoje grupy”.
- `extension/background.js`: zapis stanu, obsługa wiadomości i sesji synchronizacji.
- `extension/layout.js`, `post-controls.js`, `loading.js`: wygląd strony, przełączniki przy postach i wskaźnik ładowania.
- `extension/popup.*`: menu rozszerzenia; `i18n.js` i `_locales/`: tłumaczenia interfejsu i metadanych.
- `tests/*.test.cjs`: testy Node.js, w tym syntetyczny DOM przez jsdom.
- `scripts/package.py`: deterministyczna paczka ZIP z jawnej listy plików produkcyjnych.
- `store/`: opisy sklepu, instrukcje dla recenzentów, grafiki i kopia polityki prywatności.

## Uruchamianie i sprawdzanie zmian

Wymagania: Node.js 22 lub nowszy, npm oraz Python 3 ze standardową biblioteką.

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run package
```

`npm run verify` wykonuje kontrolę składni, testy i pakowanie; tego polecenia używa też CI. Po zmianach kodu rozszerzenia lub sposobu pakowania uruchom pełną weryfikację. Przy zmianach wyłącznie dokumentacji sprawdź treść, odnośniki i `git diff --check`.

Do ręcznego sprawdzenia załaduj `extension/` przez `edge://extensions`. Po zmianie kodu przeładuj rozszerzenie i odśwież karty Facebooka. Sprawdzaj zachowanie, którego dotyczy zmiana; testy syntetyczne nie potwierdzają zgodności z aktualnym DOM Facebooka.

## Zasady przetwarzania danych

- Zachowuj dane w `chrome.storage.local`. Utrzymuj brak serwera, analityki, zdalnego kodu i zależności produkcyjnych oraz obecny zakres dostępu do Facebooka.
- Nie zapisuj w repo prywatnych postów, rzeczywistych list członkostw, kontaktów, zrzutów konta, danych logowania ani tokenów. Do testów używaj syntetycznych danych.
- Czytnik MAIN ma działać tylko na trasie `/groups/joins/`. Może odczytywać osadzony JSON i istniejące odpowiedzi Facebooka, ale nie tworzyć, odtwarzać ani modyfikować żądań.
- Z danych strony wybieraj tylko `all_joined_groups.tab_groups_list`, rekordy typu `Group` ze statusem `MEMBER` i pola ID, URL, nazwa. JSON parsuj jako dane, nigdy jako kod.
- Dane z mostka strony traktuj jako niezaufane: zachowaj kontrolę źródła i origin wiadomości, kształtu rekordów, zgodności URL z widoczną listą oraz karty i sesji synchronizacji w workerze.
- Zastępuj listę dopiero po kompletnym odczycie z jednoznacznymi numerycznymi ID. Przerwanie, brakujące ID i konflikty muszą pozostawiać poprzednią listę. Nazwa grupy służy do wyświetlania, nie do ustalania tożsamości.
- Zachowuj wyłączenia grup i aliasy przy aktualizacji oraz przejściu na numeryczne ID. Uczenie aliasów z nagłówków postów pozostaje pomocnicze; podstawą członkostwa jest kompletna lista „Twoje grupy”. Zachowuj serializację zapisów workera.

## Zasady działania interfejsu

- Filtruj posty wyłącznie na trasach aktualności określonych w `core.js`. Link w treści lub komentarzu nie może wystarczać do rozpoznania źródła posta.
- Zachowuj ukrycie rozpoznanych kontenerów do wczytania ustawień i klasyfikacji. Obsługuj nowe i ponownie używane kontenery oraz nawigację SPA bez migania ukrywanej treści.
- Ukrywaj pojedyncze posty bez pustych pasków. Pozostawiaj kontenery doładowywania Facebooka; nie przewijaj automatycznie feedu ani nie pobieraj postów w tle. Automatyczne przewijanie dotyczy tylko odczytu listy grup.
- Opcje wyglądu działają niezależnie od filtra grup. Główny wyłącznik przywraca zmienione elementy. Panel boczny nie może zasłaniać feedu na wąskim ekranie; zachowuj jasny i ciemny motyw.
- Licznik ładowania obejmuje również ukryte posty, liczy każdy nowy kontener z nagłówkiem raz i nie maleje po usunięciu starszych kontenerów. Zeruje się po zmianie widoku. Wskaźnik znika po 20 sekundach bez postępu i respektuje ograniczenie ruchu.
- Utrzymuj polski i angielski interfejs oraz rozpoznawanie obu języków Facebooka niezależnie od języka menu. Nowe teksty dodawaj do obu wersji w `i18n.js`; metadane rozszerzenia są w `_locales/`.
- Ręczny wybór języka zapisuje się lokalnie i aktualizuje menu oraz już zamontowane kontrolki. Tryb automatyczny korzysta z języka przeglądarki: polski dla `pl`, angielski dla pozostałych.

## Pakowanie i dokumentacja

- Przy zmianie wersji zachowuj zgodność `extension/manifest.json`, `package.json` i metadanych w `package-lock.json`.
- Dodając lub usuwając plik produkcyjny, aktualizuj listę w `scripts/package.py` oraz zależne od niej testy. Paczka zawiera wyłącznie pliki rozszerzenia, z manifestem w katalogu głównym; bez dokumentacji, testów, `.git` i danych użytkownika.
- Wynik pakowania trafia do `dist/facebook-unhook-<wersja>-edge.zip` wraz z plikiem SHA-256. `dist/` i archiwa ZIP pozostają poza Gitem.
- Przy zmianie zachowania lub przetwarzania danych aktualizuj opis użytkowy i odpowiednie materiały sklepu. Zachowuj spójność polskiej i angielskiej polityki w `extension/` oraz `store/site/`.
- README opisuje produkt, instalację, obsługę i ograniczenia. Instrukcje pracy nad kodem utrzymuj tutaj, a materiały publikacyjne w `store/`. Nie przywracaj usuniętych raportów walidacji ani zapisów sesji z prywatnego konta.
